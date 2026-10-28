import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AGENT_LOG_ROTATE_BYTES, agentLog, initAgentLogger, stopAgentLogger } from './agent-logger';

let directory: string | undefined;
afterEach(async () => {
  stopAgentLogger();
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

const readEntries = async (file: string) =>
  (await readFile(file, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { ts: string; source: string; level: string; msg: string; session?: unknown });

// A restart must keep the previous session's errors: an agent that restarts dev mode after a failure still has to read
// why it failed. Each session starts with a marker line, so the agent can tell the sessions apart.
test('a new session appends to the log after a marker instead of erasing the previous session', async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-log-'));
  const file = join(directory, '7331-logs.txt');
  initAgentLogger(file, { sessionId: 'first', stage: 'dev' });
  agentLog('api', 'TypeError: x is undefined', 'error');
  stopAgentLogger();
  initAgentLogger(file, { sessionId: 'second', stage: 'dev' });
  agentLog('dev', 'Rebuild started: api');

  const entries = await readEntries(file);
  expect(entries.map(({ source, msg }) => `${source}: ${msg}`)).toEqual([
    'dev: Dev session started',
    'api: TypeError: x is undefined',
    'dev: Dev session stopped',
    'dev: Dev session started',
    'dev: Rebuild started: api'
  ]);
  expect(entries[0].session).toEqual({ sessionId: 'first', stage: 'dev' });
  expect(entries[3].session).toEqual({ sessionId: 'second', stage: 'dev' });
});

test('lines keep the time they were produced at and lose terminal colors', async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-log-'));
  const file = join(directory, '7331-logs.txt');
  initAgentLogger(file);
  const cloudwatchEventTime = Date.parse('2026-10-24T11:59:49.123Z');
  agentLog('api', '\u001b[33m10/24/2026, 1:59:49 PM\u001b[39m START', 'info', cloudwatchEventTime);
  agentLog('web', '\u001b[32m\u001b[1mVITE\u001b[22m\u001b[39m ready');

  const [, lambdaLine, viteLine] = await readEntries(file);
  expect(lambdaLine).toMatchObject({ ts: '2026-10-24T11:59:49.123Z', msg: '10/24/2026, 1:59:49 PM START' });
  expect(viteLine.msg).toBe('VITE ready');
});

test('a log over the size limit moves to <file>.1 when the next session starts', async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-log-'));
  const file = join(directory, '7331-logs.txt');
  await writeFile(`${file}.1`, 'oldest\n');
  await writeFile(file, `${'x'.repeat(AGENT_LOG_ROTATE_BYTES)}\n`);
  initAgentLogger(file, { sessionId: 'next' });

  expect((await stat(`${file}.1`)).size).toBe(AGENT_LOG_ROTATE_BYTES + 1);
  const entries = await readEntries(file);
  expect(entries).toHaveLength(1);
  expect(entries[0].session).toEqual({ sessionId: 'next' });
});

// r2rr bug hunt: a noisy session that ran for days grew its log without limit, and every MCP logs call read it whole.
test('a session whose lines reach the size limit continues in a new file, with the earlier lines in <file>.1', async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-log-'));
  const file = join(directory, '7331-logs.txt');
  initAgentLogger(file, { sessionId: 'noisy' });
  const chunk = 'y'.repeat(256 * 1024);
  for (let line = 0; line * chunk.length < AGENT_LOG_ROTATE_BYTES * 2.5; line++) agentLog('api', `${line} ${chunk}`);
  agentLog('api', 'last line', 'error');

  expect((await stat(file)).size).toBeLessThanOrEqual(AGENT_LOG_ROTATE_BYTES);
  expect((await stat(`${file}.1`)).size).toBeLessThanOrEqual(AGENT_LOG_ROTATE_BYTES);
  const entries = await readEntries(file);
  // The first line counts the lines of the earlier copies, so a reader's cursor stays valid across rotations.
  const archived = await readEntries(`${file}.1`);
  expect(entries[0]).toMatchObject({
    source: 'dev',
    msg: 'Earlier lines of this session are in 7331-logs.txt.1',
    lineOffset: (archived[0] as { lineOffset?: number }).lineOffset! + archived.length
  });
  expect(entries.at(-1)).toMatchObject({ source: 'api', level: 'error', msg: 'last line' });
});
