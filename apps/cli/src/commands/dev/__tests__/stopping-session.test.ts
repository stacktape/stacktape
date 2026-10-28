import { afterAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
