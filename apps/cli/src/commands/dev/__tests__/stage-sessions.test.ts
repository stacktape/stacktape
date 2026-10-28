import { afterAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { getLockFilePath, writeAgentLockFile } from '../agent-daemon';
import { startAgentServer, stopAgentServer } from '../agent-server';
import { findReusableAgent, refuseStageRunningHere } from '../index';

const directory = mkdtempSync(join(tmpdir(), 'stacktape-session-target-'));
const originalArgs = globalStateManager.rawArgs;
const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
// The process the lock file names; the agent itself answers from this test process.
const session = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], { stdio: 'ignore' });
afterAll(() => {
  stopAgentServer();
  session.kill('SIGKILL');
  globalStateManager.rawArgs = originalArgs;
  if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
  rmSync(directory, { recursive: true, force: true });
});

const freePort = async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  return port;
};

// r2rr item 4: a start for another region, profile or account of the same project and stage reused the running session.
test('a start reuses the running agent of its stage only for the same region, profile and account', async () => {
  const project = join(directory, 'project');
  const args = { currentWorkingDirectory: project, projectName: 'shop', stage: 'dev' };
  globalStateManager.rawArgs = { ...args, region: 'eu-west-1' };
  const port = await freePort();
  await startAgentServer(port, join(directory, 'logs'), undefined, {
    sessionId: 'shop-dev',
    projectDirectory: project,
    projectName: 'shop',
    stage: 'dev',
    region: 'eu-west-1'
  });
  writeAgentLockFile({
    pid: session.pid!,
    port,
    phase: 'ready',
    projectName: 'shop',
    stage: 'dev',
    region: 'eu-west-1',
    profile: 'shop-dev',
    awsAccountName: 'shop-staging',
    startedAt: new Date().toISOString(),
    workloads: [],
    databases: []
  });

  expect(await findReusableAgent()).toMatchObject({ pid: session.pid, region: 'eu-west-1' });

  globalStateManager.rawArgs = { ...args, region: 'eu-west-3' };
  await expect(findReusableAgent()).rejects.toMatchObject({
    code: 'DEV_SESSION_TARGET_MISMATCH',
    message: expect.stringContaining('region eu-west-1 (this start: eu-west-3)')
  });
  globalStateManager.rawArgs = { ...args, region: 'eu-west-1', profile: 'shop-prod' };
  await expect(findReusableAgent()).rejects.toMatchObject({
    message: expect.stringContaining('AWS profile shop-dev (this start: shop-prod)')
  });
  globalStateManager.rawArgs = { ...args, region: 'eu-west-1', awsAccount: 'shop-production' };
  await expect(findReusableAgent()).rejects.toMatchObject({
    message: expect.stringContaining('AWS account shop-staging (this start: shop-production)'),
    hints: [`Stop it first with \`stacktape dev stop --agent-port ${port}\`, or run this target under another stage.`]
  });
});

// r2rr item 6: a second terminal start of the stage overwrote the running session's lock file and, refused, deleted it;
// `dev stop --cleanup-containers` then removed the live session's databases.
test('a second start of a running stage is refused before it touches the lock file', async () => {
  globalStateManager.rawArgs = {
    currentWorkingDirectory: join(directory, 'project'),
    projectName: 'shop',
    stage: 'qa'
  };
  const lock = {
    pid: session.pid!,
    port: 0,
    phase: 'ready' as const,
    projectName: 'shop',
    stage: 'qa',
    region: 'eu-west-1',
    startedAt: new Date().toISOString(),
    workloads: [],
    databases: ['mainDatabase']
  };
  writeAgentLockFile(lock);
  const before = readFileSync(getLockFilePath('shop', 'qa'), 'utf8');

  await expect(refuseStageRunningHere({ projectName: 'shop', stage: 'qa' })).rejects.toMatchObject({
    code: 'DEV_STAGE_RUNNING_HERE',
    message: `Dev mode for stage qa already runs in this directory (process ${session.pid}).`
  });
  expect(readFileSync(getLockFilePath('shop', 'qa'), 'utf8')).toBe(before);
});
