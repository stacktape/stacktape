import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  const stdoutFile = join(directory, 'tokens', '7399.daemon-stdout.log');
  expect(readFileSync(stdoutFile, 'utf8')).toContain('step 5\nrebuild complete');
  expect(readFileSync(join(directory, 'tokens', '7399.daemon-stderr.log'), 'utf8')).toContain('after the rebuild');
});
