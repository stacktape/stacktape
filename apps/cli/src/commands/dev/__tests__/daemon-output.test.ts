import { afterAll, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnAgentDaemon } from '../agent-daemon';

const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
const directory = mkdtempSync(join(tmpdir(), 'stacktape-daemon-output-'));
process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
  if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
});

/** The output file of the latest daemon start on `port`. */
const outputFile = (port: number, stream: 'stdout' | 'stderr') => {
  const file = readdirSync(join(directory, 'tokens')).find(
    (name) => name.startsWith(`${port}.`) && name.endsWith(`.daemon-${stream}.log`)
  );
  if (!file) throw new Error(`No ${stream} file of the daemon on port ${port}`);
  return join(directory, 'tokens', file);
};

// A stand-in for the dev agent daemon. After it reports ready it does what a Python rebuild does: it pipes the output
// of a child process (the Docker build) into its own stdout and stderr, and writes to them itself.
const daemonScript = `
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
const result = process.argv[2];
const record = (line) => appendFileSync(result, line + '\\n');
process.stdout.on('error', (error) => record('stdout error ' + error.code));
process.stderr.on('error', (error) => record('stderr error ' + error.code));
process.stdout.write(JSON.stringify({ type: 'event', eventType: 'DEV_STEP', status: 'started', message: 'Starting' }) + '\\n');
process.stdout.write('AGENT_READY ' + JSON.stringify({ port: 7399, projectName: 'p', stage: 's', region: 'r', workloads: [], databases: [], logFile: '', tokenFile: '' }) + '\\n');
setTimeout(() => {
  const build = spawn('sh', ['-c', 'for i in 1 2 3 4 5; do echo "step $i"; echo "warn $i" >&2; done'], { stdio: ['ignore', 'pipe', 'pipe'] });
  build.stdout.pipe(process.stdout);
  build.stderr.pipe(process.stderr);
  build.on('close', (code) => {
    process.stdout.write('rebuild complete\\n');
    console.error('after the rebuild');
    setTimeout(() => {
      record('build exited ' + code);
      process.exit(0);
    }, 300);
  });
}, 500);
`;

// r2p dogfood, finding 4: the daemon's stdout and stderr were pipes whose reader had gone, and a rebuild that wrote to
// them failed with "EPIPE: broken pipe, write".
test('the daemon keeps writing its output, and its children theirs, after the starting process let go of it', async () => {
  const script = join(directory, 'daemon.mjs');
  const result = join(directory, 'result.txt');
  writeFileSync(script, daemonScript);
  writeFileSync(result, '');
  const records: string[] = [];
  const spawned = await spawnAgentDaemon({
    explicitArgs: {},
    customArgs: [],
    agentPort: 7399,
    timeoutMs: 10_000,
    onChildRecord: (forwarded) => records.push(JSON.stringify(forwarded)),
    command: { executable: process.execPath, args: [script, result], cwd: directory }
  });
  expect(spawned).toMatchObject({ success: true, port: 7399 });
  expect(records.join('\n')).toContain('Starting');

  const deadline = Date.now() + 10_000;
  while (!readFileSync(result, 'utf8').includes('build exited') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(readFileSync(result, 'utf8').trim()).toBe('build exited 0');
  expect(readFileSync(outputFile(7399, 'stdout'), 'utf8')).toContain('step 5\nrebuild complete');
  expect(readFileSync(outputFile(7399, 'stderr'), 'utf8')).toContain('after the rebuild');
});

// A stand-in daemon that writes more than the cap with `console.log` (which Bun writes to the descriptor directly), with
// `process.stdout.write` and through a child process that inherits its output, then reports where the files stand.
const chattyDaemonScript = (agentDaemonModule: string) => `
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { capDaemonOutputFiles } from ${JSON.stringify(agentDaemonModule)};
const result = process.argv[2];
process.stdout.write('AGENT_READY ' + JSON.stringify({ port: 7398, projectName: 'p', stage: 's', region: 'r', workloads: [], databases: [], logFile: '', tokenFile: '' }) + '\\n', () => {
  const stop = capDaemonOutputFiles({ maxBytes: 20_000, intervalMs: 20 });
  let round = 0;
  const timer = setInterval(() => {
    round++;
    for (let line = 0; line < 20; line++) console.log('console round ' + round + ' line ' + line + ' ' + 'x'.repeat(80));
    process.stdout.write('write round ' + round + '\\n');
    console.error('stderr round ' + round + ' ' + 'y'.repeat(2_000));
    spawnSync(process.execPath, ['-e', 'console.log("child round " + process.env.ROUND)'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, ROUND: String(round) }
    });
    if (round === 40) {
      clearInterval(timer);
      setTimeout(() => {
        stop();
        appendFileSync(result, 'done\\n');
        process.exit(0);
      }, 100);
    }
  }, 10);
});
`;

// #343 review: under Bun `console.*` bypassed the muted `process.stdout.write`, and nothing bounded the files. #346
// review: on Windows a file opened for appending cannot be truncated through that handle, so the files grew anyway.
test('all daemon output reaches its files, which stay below the cap during a long session', async () => {
  const script = join(directory, 'chatty-daemon.mjs');
  const result = join(directory, 'chatty-result.txt');
  writeFileSync(script, chattyDaemonScript(join(import.meta.dir, '..', 'agent-daemon.ts')));
  writeFileSync(result, '');
  const spawned = await spawnAgentDaemon({
    explicitArgs: {},
    customArgs: [],
    agentPort: 7398,
    timeoutMs: 10_000,
    command: { executable: process.execPath, args: [script, result], cwd: directory }
  });
  expect(spawned).toMatchObject({ success: true, port: 7398 });

  const deadline = Date.now() + 20_000;
  while (!readFileSync(result, 'utf8').includes('done') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(readFileSync(result, 'utf8')).toBe('done\n');
  const stdoutFile = outputFile(7398, 'stdout');
  const stdout = readFileSync(stdoutFile, 'utf8');
  const previous = readFileSync(`${stdoutFile}.1`, 'utf8');
  // Written about 170 kB, each check allows up to one round more than the cap.
  expect(stdout.length).toBeLessThan(40_000);
  expect(previous.length).toBeLessThan(40_000);
  // The file was emptied and written again from its start, with no gap of zero bytes.
  expect(stdout).not.toContain('\0');
  expect(stdout).not.toContain('AGENT_READY');
  for (const kind of ['console round 40 line 19', 'write round 40', 'child round 40']) expect(stdout).toContain(kind);
  const stderr = readFileSync(outputFile(7398, 'stderr'), 'utf8');
  expect(stderr).toContain('stderr round 40');
  expect(stderr.length).toBeLessThan(40_000);
});

// A daemon that a `/stop` ended and that is still cleaning up: it reports ready, waits until the next start on its port
// has begun (the marker file), then writes the result an interrupted session ends with, and exits.
const stoppingDaemonScript = `
import { existsSync } from 'node:fs';
const marker = process.argv[2];
process.stdout.write('AGENT_READY ' + JSON.stringify({ port: 7397, projectName: 'p', stage: 's', region: 'r', workloads: [], databases: [], logFile: '', tokenFile: '' }) + '\\n');
const timer = setInterval(() => {
  if (!existsSync(marker)) return;
  clearInterval(timer);
  process.stdout.write(JSON.stringify({ type: 'result', ok: false, code: 'USER_INTERRUPTION', message: 'Operation interrupted by user' }) + '\\n', () => process.exit(0));
}, 20);
`;
// The next start's daemon, which needs a second to start.
const startingDaemonScript = `
import { writeFileSync } from 'node:fs';
writeFileSync(process.argv[2], '');
setTimeout(() => {
  process.stdout.write('AGENT_READY ' + JSON.stringify({ port: 7397, projectName: 'p', stage: 's', region: 'r', workloads: [], databases: [], logFile: '', tokenFile: '' }) + '\\n', () => process.exit(0));
}, 1000);
`;

// r2mm dogfood: right after a `/stop`, a start on the same port reported USER_INTERRUPTION after a second while its
// daemon went on and started the session. Both daemons wrote to the same per-port files.
test('a start on the port of a stopping daemon reports its own daemon, not the stopping one', async () => {
  const marker = join(directory, 'second-start-began');
  const stopping = join(directory, 'stopping-daemon.mjs');
  const starting = join(directory, 'starting-daemon.mjs');
  writeFileSync(stopping, stoppingDaemonScript);
  writeFileSync(starting, startingDaemonScript);
  const first = await spawnAgentDaemon({
    explicitArgs: {},
    customArgs: [],
    agentPort: 7397,
    timeoutMs: 10_000,
    command: { executable: process.execPath, args: [stopping, marker], cwd: directory }
  });
  expect(first).toMatchObject({ success: true, port: 7397 });
  const firstFiles = readdirSync(join(directory, 'tokens')).filter((name) => name.startsWith('7397.'));

  const second = await spawnAgentDaemon({
    explicitArgs: {},
    customArgs: [],
    agentPort: 7397,
    timeoutMs: 10_000,
    command: { executable: process.execPath, args: [starting, marker], cwd: directory }
  });
  expect(existsSync(marker)).toBeTrue();
  expect(second).toMatchObject({ success: true, port: 7397 });
  expect(second.pid).not.toBe(first.pid);
  // Each start has its own files, and the second start does not delete the first's.
  expect(firstFiles).toHaveLength(2);
  const files = readdirSync(join(directory, 'tokens')).filter((name) => name.startsWith('7397.'));
  expect(files).toHaveLength(4);
  expect(files).toEqual(expect.arrayContaining(firstFiles));
});
