import { afterAll, expect, test } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { acquireAgentLockFile, getLockFilePath, writeAgentLockFile, type AgentLockFile } from '../agent-daemon';
import { startAgentServer, stopAgentServer } from '../agent-server';
import { refuseStageRunningHere } from '../index';

const CLI_DIRECTORY = join(import.meta.dir, '../../../..');
const source = (path: string) => JSON.stringify(join(CLI_DIRECTORY, 'src', path));
const directory = mkdtempSync(join(tmpdir(), 'stacktape-stage-sessions-'));
const project = join(directory, 'project');
mkdirSync(project, { recursive: true });
const originalArgs = globalStateManager.rawArgs;
const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
globalStateManager.rawArgs = { currentWorkingDirectory: project, projectName: 'shop', stage: 'dev' };

const sleepers: ReturnType<typeof spawn>[] = [];
/** A process that stands for a running session. */
const sessionProcess = () => {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], { stdio: 'ignore' });
  sleepers.push(child);
  return child.pid!;
};
/** The ID of a process that ran and exited. */
const deadPid = () =>
  Number(spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8' }).stdout);

afterAll(() => {
  stopAgentServer();
  for (const sleeper of sleepers) sleeper.kill('SIGKILL');
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

const lockOf = (fields: Partial<AgentLockFile> & Pick<AgentLockFile, 'pid' | 'stage'>): AgentLockFile => ({
  port: 0,
  phase: 'ready',
  projectName: 'shop',
  region: 'eu-west-1',
  startedAt: new Date().toISOString(),
  workloads: [],
  databases: ['mainDatabase'],
  ...fields
});

/**
 * Runs `body` in a fresh CLI process of `project`, with the network guard. The AWS files are this test's: profiles
 * that name their account (SSO), and no credentials of the machine.
 */
const runCli = (body: string, env: Record<string, string> = {}) => {
  const script = join(directory, `cli-${Math.random().toString(36).slice(2)}.ts`);
  writeFileSync(
    script,
    `import { globalStateManager } from ${source('app/global-state-manager/index.ts')};
${body}`
  );
  return spawn(
    process.execPath,
    ['--no-env-file', '--preload', join(CLI_DIRECTORY, 'scripts/network-guard-preload.ts'), script],
    {
      cwd: CLI_DIRECTORY,
      env: {
        PATH: process.env.PATH,
        HOME: directory,
        STACKTAPE_DEV_AGENT_TOKEN_DIR: process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR,
        AWS_CONFIG_FILE: join(directory, 'aws-config'),
        AWS_SHARED_CREDENTIALS_FILE: join(directory, 'aws-credentials'),
        AWS_EC2_METADATA_DISABLED: 'true',
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1',
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
};

const outputOf = async (child: ReturnType<typeof spawn>) => {
  let output = '';
  child.stdout!.on('data', (data) => (output += data));
  child.stderr!.on('data', (data) => (output += data));
  await new Promise((resolve) => child.once('exit', resolve));
  const line = output.split('\n').find((candidate) => candidate.startsWith('{"result"'));
  if (!line) throw new Error(`no result: ${output}`);
  return JSON.parse(line).result;
};

writeFileSync(
  join(directory, 'aws-config'),
  ['account-a', 'account-b', 'unused-a', 'unused-b']
    .map((name) =>
      [
        `[profile ${name}]`,
        'region = eu-west-1',
        'sso_session = review',
        `sso_account_id = ${name === 'account-b' ? '222222222222' : '111111111111'}`,
        'sso_role_name = Developer'
      ].join('\n')
    )
    .join('\n\n') +
    '\n\n[sso-session review]\nsso_start_url = https://example.awsapps.com/start\nsso_region = eu-west-1\n'
);
writeFileSync(join(directory, 'aws-credentials'), '');

// Review of #385, target-matrix.ts: the target was compared only where both sides had a value, so default credentials
// of account A, then `--profile` of account B, reused A's agent; and so did `--aws-account` after local credentials.
test.each([
  ['default credentials of A, then a profile of B', {}, { profile: 'account-b' }, 'mismatch'],
  [
    'a profile of A, then the default credentials, whose account is unknown before they load',
    { profile: 'account-a' },
    {},
    'start'
  ],
  [
    'local credentials of A, then a Console account',
    { profile: 'account-a' },
    { awsAccount: 'other-account' },
    'mismatch'
  ],
  [
    'a profile that now selects account B',
    { profile: 'account-a', awsAccountId: '222222222222' },
    { profile: 'account-a' },
    'mismatch'
  ],
  ['another region', { profile: 'account-a' }, { profile: 'account-a', region: 'eu-west-3' }, 'mismatch'],
  ['the same profile', { profile: 'account-a' }, { profile: 'account-a' }, 'reuse'],
  // An ignored profile does not count with a Console account, which supplies the credentials itself.
  [
    'the same Console account with another ignored profile',
    { awsAccountName: 'console-account', profile: undefined },
    { profile: 'unused-b', awsAccount: 'console-account' },
    'reuse'
  ]
] as const)(
  'a running agent is reused only for its own target: %s',
  async (_case, session, start, expected) => {
    const port = await freePort();
    await startAgentServer(port, join(directory, 'logs'), undefined, {
      sessionId: `target-${port}`,
      projectDirectory: project,
      projectName: 'shop',
      stage: 'targets',
      region: 'eu-west-1'
    });
    try {
      writeAgentLockFile(
        lockOf({
          pid: sessionProcess(),
          port,
          stage: 'targets',
          awsAccountId: '111111111111',
          sessionId: `target-${port}`,
          ...session
        })
      );
      const result = await outputOf(
        runCli(`import { findReusableAgent } from ${source('commands/dev/index.ts')};
globalStateManager.rawArgs = ${JSON.stringify({ currentWorkingDirectory: project, projectName: 'shop', stage: 'targets', region: 'eu-west-1', ...start })};
const result = await findReusableAgent().then((agent) => (agent ? 'reuse' : 'start'), (error) => error.code === 'DEV_SESSION_TARGET_MISMATCH' ? 'mismatch' : error.message);
console.log(JSON.stringify({ result }));
process.exit(0);
`)
      );
      expect(result).toBe(expected);
    } finally {
      stopAgentServer();
    }
  },
  30_000
);

// r2rr item 6: a second terminal start of the stage overwrote the running session's lock file and, refused, deleted it;
// `dev stop --cleanup-containers` then removed the live session's databases.
test('a second start of a running stage is refused before it touches the lock file', async () => {
  writeAgentLockFile(lockOf({ pid: sessionProcess(), stage: 'qa' }));
  const before = readFileSync(getLockFilePath('shop', 'qa'), 'utf8');

  await expect(refuseStageRunningHere({ projectName: 'shop', stage: 'qa' })).rejects.toMatchObject({
    code: 'DEV_STAGE_RUNNING_HERE'
  });
  expect(readFileSync(getLockFilePath('shop', 'qa'), 'utf8')).toBe(before);
});

const racingStart = (stage: string, go: string) =>
  runCli(`import { acquireAgentLockFile } from ${source('commands/dev/agent-daemon.ts')};
import { existsSync } from 'node:fs';
globalStateManager.rawArgs = ${JSON.stringify({ currentWorkingDirectory: project, projectName: 'shop', stage })};
while (!existsSync(${JSON.stringify(go)})) await new Promise((resolve) => setTimeout(resolve, 5));
const holder = await acquireAgentLockFile({ pid: process.pid, port: 0, phase: 'starting', projectName: 'shop', stage: ${JSON.stringify(stage)}, region: 'eu-west-1', startedAt: new Date().toISOString(), workloads: [], databases: ['mainDatabase'] });
console.log(JSON.stringify({ result: holder === null ? 'acquired' : 'refused' }));
// Holds the lock file like a running session until the test ends.
setTimeout(() => {}, 30_000);
`);

// Review of #385, lock-race.py: two starts that both passed the stage checks both wrote the lock file.
test.each([
  ['no lock file', undefined],
  ['the lock file of a session that died', () => lockOf({ pid: deadPid(), stage: 'race-stale' })]
] as const)(
  'of two starts at the same moment, one gets the lock file: %s',
  async (_case, existing) => {
    const stage = existing ? 'race-stale' : 'race';
    if (existing) writeAgentLockFile(existing());
    const go = join(directory, `${stage}.go`);
    const starts = [racingStart(stage, go), racingStart(stage, go)];
    sleepers.push(...starts);
    const results = starts.map((start) => {
      let output = '';
      start.stdout!.on('data', (data) => (output += data));
      return new Promise<string>((resolve) => {
        const timer = setInterval(() => {
          const line = output.split('\n').find((candidate) => candidate.startsWith('{"result"'));
          if (line) {
            clearInterval(timer);
            resolve(JSON.parse(line).result);
          }
        }, 10);
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    writeFileSync(go, '');
    expect((await Promise.all(results)).toSorted()).toEqual(['acquired', 'refused']);
    const owner = JSON.parse(readFileSync(getLockFilePath('shop', stage), 'utf8')).pid;
    expect(starts.map(({ pid }) => pid)).toContain(owner);
    expect(existsSync(`${getLockFilePath('shop', stage)}.takeover`)).toBeFalse();
  },
  30_000
);

// Review of #385: a process ID the system gave to another program after the session died is not the session.
test('a lock file whose process ID now belongs to another program is replaced', async () => {
  const port = await freePort();
  writeAgentLockFile(lockOf({ pid: sessionProcess(), port, stage: 'recycled', sessionId: 'gone' }));

  expect(await acquireAgentLockFile(lockOf({ pid: process.pid, stage: 'recycled', phase: 'starting' }))).toBeNull();
  expect(JSON.parse(readFileSync(getLockFilePath('shop', 'recycled'), 'utf8')).pid).toBe(process.pid);
});

// Review of #385, crash-adoption.ts: after `kill -9`, the next session took over the running PostgreSQL container,
// which keeps the dead session's process ID in its labels, and cleanup removed the new session's database.
test("cleanup keeps a container that the stage's live session took over from a killed one", async () => {
  const killed = deadPid();
  const result = await outputOf(
    runCli(`import { mock } from 'bun:test';
const calls = [];
let lockFile = '';
mock.module(${source('utils/docker.ts')}, () => ({
  inspectDockerContainer: async () => ({ Id: 'db', State: { Running: true }, NetworkSettings: { Ports: { '5432/tcp': [{ HostPort: '5432' }] } } }),
  execDocker: async (args) => {
    calls.push(args[0]);
    if (args[0] === 'ps') return { stdout: 'stp-shop-adopt-db\\trunning\\t' + lockFile + '\\t${killed}\\tadopt\\n', stderr: '', exitCode: 0 };
    if (args[0] === 'inspect') return { stdout: args.join(' ').includes('State.Running') ? 'true' : '[]', stderr: '', exitCode: 0 };
    if (args[0] === 'port') return { stdout: '127.0.0.1:5432', stderr: '', exitCode: 0 };
    return { stdout: '', stderr: '', exitCode: 0 };
  }
}));
const { getLockFilePath, writeAgentLockFile } = await import(${source('commands/dev/agent-daemon.ts')});
const { cleanupOrphanedContainers, setDevSessionOwner } = await import(${source('commands/dev/cleanup-utils.ts')});
const { startLocalPostgres } = await import(${source('commands/dev/local-resources/postgres.ts')});
globalStateManager.rawArgs = ${JSON.stringify({ currentWorkingDirectory: project, projectName: 'shop', stage: 'adopt' })};
lockFile = getLockFilePath('shop', 'adopt');
writeAgentLockFile({ pid: process.pid, port: 0, phase: 'ready', projectName: 'shop', stage: 'adopt', region: 'eu-west-1', startedAt: new Date().toISOString(), workloads: [], databases: ['db'] });
setDevSessionOwner({ lockFile, pid: process.pid, stage: 'adopt' });
const instance = await startLocalPostgres({ name: 'db', containerName: 'stp-shop-adopt-db', version: '16', port: 5432, dataDir: ${JSON.stringify(join(directory, 'adopt-data'))}, credentials: { password: 'synthetic' }, type: 'postgres' });
const removed = await cleanupOrphanedContainers();
console.log(JSON.stringify({ result: { adopted: instance.containerName, removed, stopped: calls.includes('stop') } }));
process.exit(0);
`)
  );
  expect(result).toEqual({ adopted: 'stp-shop-adopt-db', removed: [], stopped: false });
}, 30_000);
