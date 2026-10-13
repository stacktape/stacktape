import { CloudFormationClient, CreateStackCommand, UpdateStackCommand } from '@aws-sdk/client-cloudformation';
import type { MiniStackAccount } from '@stacktape/ministack/fixture';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import stripAnsi from 'strip-ansi';
import packageJson from '../../package.json';
import { createStacktapeOpenTuiBuildPlugin } from '../support/opentui-loader';
import { developerIdentity, LOOPBACK_API_KEY, startLoopbackConsole } from './loopback-console';
import { startLoopbackAws, toQueryXml } from './loopback-aws';
import type { StackInfoMap } from '@stacktape/stack-info/contracts';

const accounts: MiniStackAccount[] = JSON.parse(process.env.J9_MINISTACK_ACCOUNTS ?? '[]');
const cliDirectory = resolve(import.meta.dir, '../..');

const terminateProcessTree = async (child: ReturnType<typeof Bun.spawn>) => {
  if (process.platform === 'win32') {
    const result = Bun.spawnSync(['taskkill', '/PID', String(child.pid), '/T', '/F'], {
      stdout: 'ignore',
      stderr: 'ignore'
    });
    if (result.exitCode !== 0 && child.exitCode === null) {
      // A process the test has just interrupted can be gone before Bun observes its exit: taskkill then reports
      // failure for a tree that no longer exists. Wait briefly for that exit before calling the tree stuck.
      const exited = await Promise.race([child.exited.then(() => true), Bun.sleep(2_000).then(() => false)]);
      if (!exited) throw new Error(`Could not terminate CLI tree ${child.pid}`);
    }
    return;
  }
  try {
    // detached gives this invocation its own process group; this also reaches unregistered grandchildren.
    process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
};

/** Builds the real process entrypoint once. External native modules resolve from this worktree's node_modules. */
export const buildOperationsCli = async () => {
  const directory = await mkdtemp(join(cliDirectory, 'node_modules/.j9-cli-'));
  try {
    const build = await Bun.build({
      entrypoints: [join(cliDirectory, 'src/entrypoints/cli.ts')],
      outdir: directory,
      target: 'bun',
      plugins: [createStacktapeOpenTuiBuildPlugin()],
      external: ['@opentui/core-*', 'web-tree-sitter', 'web-tree-sitter/*'],
      tsconfig: join(cliDirectory, 'tsconfig.json'),
      define: { STACKTAPE_VERSION: JSON.stringify(packageJson.version) }
    });
    if (!build.success) throw new Error(build.logs.map(({ message }) => message).join('\n'));
    return { path: build.outputs[0].path, close: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
};

export const createOperationsFixture = async (cliPath: string, extraEnvironment: Record<string, string> = {}) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-j9-'));
  const endpoint = process.env.J9_MINISTACK_ENDPOINT;
  const account = endpoint ? accounts.shift() : undefined;
  if (endpoint && !account) throw new Error('Operations runner did not allocate a MiniStack account.');
  const accountId = account?.accountId;
  const aws = await startLoopbackAws(endpoint);
  const api = await startLoopbackConsole({
    identity: developerIdentity({ projectName: 'j9-operations', ...(endpoint ? { accountId } : {}) })
  });
  const children = new Map<ReturnType<typeof Bun.spawn>, Promise<unknown>>();
  const home = join(directory, 'home');
  await mkdir(home, { recursive: true });
  // These commands never invoke helper Lambdas. An empty artifact directory satisfies the startup inventory.
  await mkdir(join(directory, '__stacktape-dist/dev/helper-lambdas'), { recursive: true });
  if (!endpoint)
    aws.on('sts.GetCallerIdentity', () => ({
      kind: 'xml',
      operation: 'GetCallerIdentity',
      result: toQueryXml({ Account: '111122223333', Arn: 'arn:aws:iam::111122223333:user/j9', UserId: 'j9' })
    }));
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    USERPROFILE: home,
    TERM: 'xterm-256color',
    STP_DEV_MODE: 'true',
    STP_DISABLE_TELEMETRY: '1',
    STACKTAPE_API_KEY: LOOPBACK_API_KEY,
    STP_CUSTOM_TRPC_API_ENDPOINT: api.endpoint,
    AWS_EC2_METADATA_DISABLED: 'true',
    J9_AWS_ENDPOINT: aws.endpoint,
    ...(endpoint ? { J9_ACCOUNT_ID: accountId, J9_SECRET_ACCESS_KEY: account!.credentials.secretAccessKey } : {}),
    ...extraEnvironment
  };
  const start = (args: string[], { tty = false, timeoutMs = 30_000 }: { tty?: boolean; timeoutMs?: number } = {}) => {
    let stdout = '';
    let stderr = '';
    const decoder = new TextDecoder();
    const child = Bun.spawn({
      cmd: [
        process.execPath,
        '--no-env-file',
        '--preload',
        join(import.meta.dir, 'offline-preload.ts'),
        cliPath,
        ...args
      ],
      cwd: directory,
      env,
      detached: true,
      stdin: tty ? undefined : 'pipe',
      ...(tty
        ? {
            terminal: {
              cols: 110,
              rows: 35,
              data: (_terminal, data) => {
                stdout += decoder.decode(data, { stream: true });
              }
            }
          }
        : { stdout: 'pipe', stderr: 'pipe' })
    });
    const collect = async (stream: ReadableStream<Uint8Array>, append: (value: string) => void) => {
      const reader = stream.getReader();
      const streamDecoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        append(streamDecoder.decode(value, { stream: true }));
      }
      append(streamDecoder.decode());
    };
    const out = tty
      ? Promise.resolve()
      : collect(child.stdout, (value) => {
          stdout += value;
        });
    const err = tty
      ? Promise.resolve()
      : collect(child.stderr, (value) => {
          stderr += value;
        });
    // On timeout the tree is killed in the background; `finished` reports the exit, and teardown reports a tree that
    // outlived the kill.
    const deadline = setTimeout(() => void terminateProcessTree(child).catch(() => undefined), timeoutMs);
    const finished = Promise.all([child.exited, out, err])
      .then(([exitCode]) => ({ exitCode, stdout, stderr }))
      .catch(async (error: unknown) => {
        await terminateProcessTree(child).catch(() => undefined);
        await child.exited;
        await Promise.allSettled([out, err]);
        throw error;
      })
      .finally(() => {
        clearTimeout(deadline);
        // Retain ownership after CLI exit: a script can leave live descendants in this group.
        // Product assertions run before teardown so the fixture does not hide command cleanup failures.
        if (process.platform !== 'win32') {
          try {
            process.kill(-child.pid, 0);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
            // An empty group no longer belongs to this fixture; do not retain an ID which could be reused.
            children.delete(child);
          }
        }
        child.terminal?.close();
      });
    children.set(child, finished);
    return {
      child,
      finished,
      output: () => stdout,
      write: (input: string) => (tty ? child.terminal?.write(input) : child.stdin?.write(input)),
      waitFor: async (text: string, from = 0, timeoutMs = 15_000) => {
        const deadlineAt = Date.now() + timeoutMs;
        while (!stripAnsi(stdout.slice(from)).includes(text)) {
          if (child.exitCode !== null || Date.now() > deadlineAt) {
            throw new Error(`CLI did not show ${text}; status ${child.exitCode}: ${stripAnsi(stdout).slice(-2000)}`);
          }
          await Bun.sleep(20);
        }
      }
    };
  };
  return {
    directory,
    home,
    // Setup clients bypass the fault proxy; assertions can inspect independently stored emulator state.
    clientConfig: () => {
      if (!endpoint)
        throw new Error('Run this scenario through test:operations or test:operations:db (MiniStack required).');
      return { endpoint, region: 'eu-west-1' as const, credentials: account!.credentials, forcePathStyle: true };
    },
    aws,
    api,
    start,
    run: (args: string[]) => start(args).finished,
    close: async () => {
      const owned = [...children];
      try {
        const results = await Promise.allSettled(
          owned.map(async ([child, finished]) => {
            await terminateProcessTree(child);
            await finished;
          })
        );
        const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
        if (failures.length) throw new AggregateError(failures, 'CLI fixture teardown failed');
      } finally {
        children.clear();
        await Promise.all([aws.close(), api.close()]);
        await rm(directory, { recursive: true, force: true });
      }
    }
  };
};

export const targetArgs = ['--projectName', 'j9-operations', '--stage', 'test', '--region', 'eu-west-1'];

/** Seed a deployed stack in MiniStack. Its reads and CLI log writes use the real SDK and service state. */
export const seedDeployedStack = async (
  fixture: Awaited<ReturnType<typeof createOperationsFixture>>,
  resources: StackInfoMap['resources'] = {},
  templateResources: Record<string, unknown> = { FixtureBucket: { Type: 'AWS::S3::Bucket' } }
) => {
  const client = new CloudFormationClient(fixture.clientConfig());
  const input = {
    StackName: 'j9-operations-test',
    TemplateBody: JSON.stringify({
      Description: 'STP-stack_j9-operations_test_fixture',
      Resources: templateResources,
      Outputs: { StpStackInfoMap: { Value: JSON.stringify({ resources, metadata: {}, customOutputs: {} }) } }
    })
  };
  try {
    try {
      await client.send(new CreateStackCommand(input));
    } catch (error) {
      if ((error as Error).name !== 'AlreadyExistsException') throw error;
      await client.send(new UpdateStackCommand(input)).catch((failure: unknown) => {
        if (!(failure instanceof Error) || !failure.message.includes('No updates are to be performed')) throw failure;
      });
    }
  } finally {
    client.destroy();
  }
  fixture.api.on('reportEvent', () => ({ success: true }));
  fixture.api.on('globalConfig', () => ({ alarms: [], deploymentNotifications: [], guardrails: [] }));
};
