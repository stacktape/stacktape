/**
 * Diff, rollback and delete choose the right operation (J2.6), through the CLI process.
 *
 * The source CLI (`scripts/dev.ts`) runs as a child process against a loopback control plane and a loopback AWS
 * endpoint that holds one stack in a chosen state. The tests observe the process exit code and machine-readable
 * output, and what the CLI asked AWS to do: an absent or failed stack must stop the command before any mutation, a
 * destructive command in a non-interactive shell must demand explicit confirmation, and a confirmed delete must
 * delete the stack exactly once and wait for completion.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterEach, describe, expect, test as bunTest } from 'bun:test';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 180_000);
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startAwsFake, outputsFromTemplate, type AwsFake, type FakeStackState } from './aws-fake';
import { startControlPlaneFake, type ControlPlaneFake } from './control-plane-fake';

const cliRoot = resolve(import.meta.dir, '..', '..');
const projectDir = join(import.meta.dir, 'fixtures', 'project');
const projectName = 'cliproc';
const stage = 'test';
const stackName = `${projectName}-${stage}`;
const region = 'eu-west-1';

type JsonlRecord = { type?: string; ok?: boolean; code?: string; message?: string; level?: string; data?: unknown };

type CliRun = {
  exitCode: number;
  records: JsonlRecord[];
  result: JsonlRecord | undefined;
  errors: JsonlRecord[];
  stderr: string;
};

const resources: { close: () => Promise<void> }[] = [];
const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(resources.splice(0).map((resource) => resource.close()));
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const deployedTemplate = async (): Promise<CloudFormationTemplate> =>
  JSON.parse(
    await readFile(join(cliRoot, 'tests', 'data-safety', 'baselines', 'serverless-api', 'v4.template.json'), 'utf8')
  );

const deployedStack = async (status: string): Promise<FakeStackState> => {
  const template = await deployedTemplate();
  return { stackName, status, template, outputs: outputsFromTemplate(template) };
};

const startFakes = async (stack?: FakeStackState) => {
  const controlPlane = await startControlPlaneFake({ projectName });
  resources.push(controlPlane);
  const aws = await startAwsFake({ region, stack });
  resources.push(aws);
  return { controlPlane, aws };
};

/** Runs one CLI command as a child process with isolated HOME and loopback endpoints only. */
const runCli = async ({
  args,
  controlPlane,
  aws,
  tty = false
}: {
  args: string[];
  controlPlane: ControlPlaneFake;
  aws: AwsFake;
  tty?: boolean;
}): Promise<CliRun> => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-cli-process-home-'));
  temporaryDirectories.push(home);
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: home,
    XDG_CONFIG_HOME: join(home, '.config'),
    XDG_CACHE_HOME: join(home, '.cache'),
    TMPDIR: join(home, 'tmp'),
    CI: tty ? '' : '1',
    NO_COLOR: '1',
    AWS_ACCESS_KEY_ID: 'cli-process-fake',
    AWS_SECRET_ACCESS_KEY: 'cli-process-fake',
    AWS_REGION: region,
    AWS_DEFAULT_REGION: region,
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_SDK_LOAD_CONFIG: '0',
    AWS_ENDPOINT_URL: aws.endpoint,
    AWS_ENDPOINT_URL_STS: aws.endpoint,
    STACKTAPE_API_KEY: 'cli-process-fake-do-not-use',
    STP_CUSTOM_TRPC_API_ENDPOINT: controlPlane.endpoint,
    SKIP_LOADING_ENV: '1',
    STP_DISABLE_TELEMETRY: '1'
  };
  const child = Bun.spawn(
    [
      'bun',
      'run',
      join(cliRoot, 'scripts', 'dev.ts'),
      ...args,
      '--stage',
      stage,
      '--region',
      region,
      '--projectName',
      projectName,
      '--awsAccount',
      'cli-process-account',
      '--currentWorkingDirectory',
      projectDir,
      '--outputFormat',
      'jsonl'
    ],
    { cwd: cliRoot, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' }
  );
  const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  clearTimeout(timeout);
  const records = stdout
    .split('\n')
    .filter((line) => line.trim().startsWith('{'))
    .map((line) => {
      try {
        return JSON.parse(line) as JsonlRecord;
      } catch {
        return undefined;
      }
    })
    .filter((record): record is JsonlRecord => record !== undefined);
  return {
    exitCode,
    records,
    result: records.find((record) => record.type === 'result'),
    errors: records.filter((record) => record.level === 'error' || record.ok === false),
    stderr
  };
};

const printable = (run: CliRun) =>
  [...run.errors.map((record) => `${record.code ?? ''} ${record.message ?? ''}`), run.stderr].join('\n');

describe('delete', () => {
  test('an absent stack is reported as not deployed and nothing is deleted', async () => {
    const { controlPlane, aws } = await startFakes(undefined);
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(printable(run)).toContain(stackName);
    expect(aws.mutations).toEqual([]);
    expect(aws.unexpectedRequests).toEqual([]);
  });

  test('a non-interactive delete without explicit confirmation stops before touching the stack', async () => {
    const { controlPlane, aws } = await startFakes(await deployedStack('UPDATE_COMPLETE'));
    const run = await runCli({ args: ['delete'], controlPlane, aws });

    expect(run.exitCode).not.toBe(0);
    expect(run.result?.code).toContain('CONFIRMATION_REQUIRED');
    expect(JSON.stringify(run.result)).toContain('autoConfirmOperation');
    expect(aws.mutations).toEqual([]);
    expect(aws.stack?.status).toBe('UPDATE_COMPLETE');
  });

  test('a confirmed delete deletes the stack once, waits for completion and records the operation', async () => {
    const { controlPlane, aws } = await startFakes(await deployedStack('UPDATE_COMPLETE'));
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws });

    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    const deleteCalls = aws.mutations.filter(({ action }) => action === 'DeleteStack');
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].parameters.StackName).toBe(stackName);
    expect(aws.stack?.status).toBe('DELETE_COMPLETE');
    // The CLI waited for the deletion: it described the stack again after asking for the delete.
    const deleteIndex = aws.actions.indexOf('DeleteStack');
    expect(aws.actions.slice(deleteIndex + 1)).toContain('DescribeStacks');
    expect(aws.mutations.filter(({ action }) => /^(UpdateStack|CreateStack|CreateChangeSet)$/.test(action))).toEqual(
      []
    );
    expect(aws.unexpectedRequests).toEqual([]);
    const recorded = controlPlane.calls.filter(({ procedure }) => procedure === 'recordStackOperation');
    expect(recorded.length).toBeGreaterThanOrEqual(2);
    expect(controlPlane.unexpectedProcedures).toEqual([]);
  });

  test('a stack whose previous delete failed can be deleted again', async () => {
    const { controlPlane, aws } = await startFakes(await deployedStack('DELETE_FAILED'));
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws });

    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    expect(aws.mutations.filter(({ action }) => action === 'DeleteStack')).toHaveLength(1);
    expect(aws.stack?.status).toBe('DELETE_COMPLETE');
  });
});

describe('rollback', () => {
  test('a stack stuck in a failed rollback is refused with the recovery command, without an update', async () => {
    const { controlPlane, aws } = await startFakes(await deployedStack('UPDATE_ROLLBACK_FAILED'));
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toContain('UPDATE_ROLLBACK_FAILED');
    expect(JSON.stringify(run.result)).toContain('cf:rollback');
    expect(aws.mutations).toEqual([]);
  });

  test('an absent stack cannot be rolled back', async () => {
    const { controlPlane, aws } = await startFakes(undefined);
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(aws.mutations).toEqual([]);
  });
});

describe('diff', () => {
  test('an absent stack is reported as not deployed before anything is uploaded', async () => {
    const { controlPlane, aws } = await startFakes(undefined);
    const run = await runCli({ args: ['diff'], controlPlane, aws });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(aws.mutations).toEqual([]);
  });
});
