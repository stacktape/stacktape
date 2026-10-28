import { afterAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import {
  getLockFilePath,
  markOwnAgentLockStopping,
  waitForStoppingSession,
  writeAgentLockFile,
  type AgentLockFile
} from '../agent-daemon';

const directory = mkdtempSync(join(tmpdir(), 'stacktape-stopping-session-'));
const originalArgs = globalStateManager.rawArgs;
globalStateManager.rawArgs = { currentWorkingDirectory: directory };
afterAll(() => {
  globalStateManager.rawArgs = originalArgs;
  rmSync(directory, { recursive: true, force: true });
});

const lock = (pid: number, phase: AgentLockFile['phase'], stage: string): AgentLockFile => ({
  pid,
  port: 7396,
  phase,
  projectName: 'shop',
  stage,
  region: 'eu-west-1',
  startedAt: new Date().toISOString(),
  workloads: [],
  databases: []
});

/** A process that stands for a session in its cleanup and exits after `ms`. */
const sessionProcess = (ms: number) => {
  const child = spawn(process.execPath, ['-e', `setTimeout(() => {}, ${ms})`], { stdio: 'ignore' });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  return { pid: child.pid!, exited, kill: () => child.kill('SIGKILL') };
};

// r2mm dogfood: a start right after a `/stop` ran next to the session that was still stopping.
test('a start waits for the stopping session of its stage to exit', async () => {
  const session = sessionProcess(800);
  writeAgentLockFile(lock(session.pid, 'stopping', 'waits'));
  const waitedFor: number[] = [];
  const startedAt = Date.now();
  const stillStopping = await waitForStoppingSession({
    projectName: 'shop',
    stage: 'waits',
    timeoutMs: 10_000,
    onWait: ({ pid }) => waitedFor.push(pid)
  });
  expect(stillStopping).toBeNull();
  expect(waitedFor).toEqual([session.pid]);
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(500);
  await session.exited;
});

test('a session that is still stopping after the wait is reported', async () => {
  const session = sessionProcess(60_000);
  try {
    writeAgentLockFile(lock(session.pid, 'stopping', 'hangs'));
    const stillStopping = await waitForStoppingSession({ projectName: 'shop', stage: 'hangs', timeoutMs: 400 });
    expect(stillStopping).toMatchObject({ pid: session.pid, phase: 'stopping' });
  } finally {
    session.kill();
  }
});

test('a running or a dead session is not waited for', async () => {
  const session = sessionProcess(60_000);
  try {
    writeAgentLockFile(lock(session.pid, 'ready', 'runs'));
    expect(await waitForStoppingSession({ projectName: 'shop', stage: 'runs', timeoutMs: 5_000 })).toBeNull();
  } finally {
    session.kill();
  }
  await session.exited;
  writeAgentLockFile(lock(session.pid, 'stopping', 'crashed'));
  expect(await waitForStoppingSession({ projectName: 'shop', stage: 'crashed', timeoutMs: 5_000 })).toBeNull();
});

// A stop during the start: the start's later writes must not record the session as ready while it stops.
test('once its session stops, this process keeps its lock file marked as stopping', () => {
  writeAgentLockFile(lock(process.pid, 'starting', 'own'));
  markOwnAgentLockStopping();
  writeAgentLockFile(lock(process.pid, 'ready', 'own'));
  expect(JSON.parse(readFileSync(getLockFilePath('shop', 'own'), 'utf8'))).toMatchObject({ phase: 'stopping' });
});

const CLI_DIRECTORY = join(import.meta.dir, '../../../..');
const source = (path: string) => JSON.stringify(join(CLI_DIRECTORY, 'src', path));

// A session that a `/stop` ended, with the real lock cleanup and a slow cleanup hook (containers, Lambda environments).
const stoppingSessionScript = `
import { applicationManager } from ${source('app/application-manager/index.ts')};
import { globalStateManager } from ${source('app/global-state-manager/index.ts')};
import { capDaemonOutputFiles, markOwnAgentLockStopping, registerOwnLockCleanup, writeAgentLockFile } from ${source('commands/dev/agent-daemon.ts')};
globalStateManager.rawCommands = ['dev'];
globalStateManager.rawArgs = { currentWorkingDirectory: ${JSON.stringify(directory)} };
writeAgentLockFile({ pid: process.pid, port: 7395, phase: 'ready', projectName: 'shop', stage: 'overlap', region: 'eu-west-1', startedAt: new Date().toISOString(), workloads: [], databases: [] });
registerOwnLockCleanup({ projectName: 'shop', stage: 'overlap' });
capDaemonOutputFiles();
applicationManager.registerCleanUpHook(() => new Promise((resolve) => setTimeout(resolve, 1500)));
markOwnAgentLockStopping();
console.log('stopping');
await applicationManager.handleExitSignal('SIGINT');
`;

// Review of #385: the session's cleanup deleted its lock file at once, and later deleted a successor's.
test("a stopping session keeps its lock file through its cleanup and never deletes a successor's", async () => {
  const script = join(directory, 'stopping-session.ts');
  writeFileSync(script, stoppingSessionScript);
  const outputFiles = { stdout: join(directory, 'daemon-stdout.log'), stderr: join(directory, 'daemon-stderr.log') };
  for (const file of Object.values(outputFiles)) writeFileSync(file, '');
  const stopping = spawn(
    process.execPath,
    ['--no-env-file', '--preload', join(CLI_DIRECTORY, 'scripts/test-preload.ts'), script],
    {
      cwd: CLI_DIRECTORY,
      env: {
        PATH: process.env.PATH,
        HOME: directory,
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1',
        STACKTAPE_AGENT_DAEMON: '1',
        STACKTAPE_AGENT_DAEMON_OUTPUT_FILES: JSON.stringify(outputFiles)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let output = '';
  stopping.stderr!.on('data', (data) => (output += data));
  const exited = new Promise<number | null>((resolve) => stopping.once('exit', resolve));
  await new Promise<void>((resolve, reject) => {
    stopping.stdout!.on('data', (data) => {
      output += data;
      if (output.includes('stopping')) resolve();
    });
    stopping.once('exit', () => reject(new Error(`the session exited early: ${output}`)));
  });

  // The cleanup runs: the lock file stays, marked as stopping.
  await new Promise((resolve) => setTimeout(resolve, 400));
  const lockPath = getLockFilePath('shop', 'overlap');
  expect(JSON.parse(readFileSync(lockPath, 'utf8'))).toMatchObject({ pid: stopping.pid, phase: 'stopping' });

  // A successor that did not wait starts now and writes its own lock file.
  const successor = sessionProcess(60_000);
  try {
    writeAgentLockFile(lock(successor.pid, 'starting', 'overlap'));
    // The whole cleanup ran, final hooks included.
    expect(await exited, output).toBe(0);
    expect(JSON.parse(readFileSync(lockPath, 'utf8'))).toMatchObject({ pid: successor.pid, phase: 'starting' });
  } finally {
    successor.kill();
  }
  // A ready daemon deletes its own output files when it exits.
  expect(
    Object.values(outputFiles).filter((file) => existsSync(file)),
    output
  ).toEqual([]);
}, 30_000);
