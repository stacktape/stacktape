/**
 * Diff, rollback and delete choose the right operation (J2.6), through the CLI process.
 *
 * The source CLI (`scripts/dev.ts`) runs as a child process against a loopback control plane, a loopback
 * CloudFormation/STS fake that holds one stack in a chosen state (states such as a failed rollback cannot be produced
 * on demand otherwise), and MiniStack for the deployment bucket, so what the CLI uploads and reads is real S3 state.
 * The tests observe the process exit code and machine-readable output, and what the CLI asked AWS to do: an absent or
 * failed stack must stop the command before any mutation, a destructive command in a non-interactive shell must demand
 * explicit confirmation, and a confirmed delete must delete the stack exactly once and wait for completion.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterAll, afterEach, beforeAll, describe, expect, test as bunTest } from 'bun:test';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { startMiniStack, type MiniStack, type MiniStackAccount } from '@stacktape/ministack/fixture';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 180_000);
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stringifyToYaml } from '@utils/yaml';
import { getCfTemplateS3Key } from '../../src/domain/deployment-artifact-manager/artifact-names';
import { startAwsFake, outputsFromTemplate, type AwsFake, type FakeStackState } from './aws-fake';
import { FAKE_AWS_ACCOUNT_ID, startControlPlaneFake, type ControlPlaneFake } from './control-plane-fake';

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

/** One emulator for the file; each scenario gets its own account namespace and deployment bucket in it. */
let ministack: MiniStack;
beforeAll(async () => {
  ministack = await startMiniStack({ label: 'cli-process' });
}, 120_000);
afterAll(async () => {
  await ministack?.stop();
});

/** The bucket the CLI derives for this stack, as Stacktape names it from region, stack name and account. */
const deploymentBucketName = awsResourceNames.deploymentBucket(
  getGloballyUniqueStackHash({ region, stackName, accountId: FAKE_AWS_ACCOUNT_ID })
);
/** The customer's bucket in the deployed template, which a delete must empty before the stack can go. */
const filesBucketName = `${stackName}-filesbucket`;
const bucketPhysicalIds = { StpDeploymentBucket: deploymentBucketName, FilesBucket: filesBucketName };

type StackBuckets = {
  account: MiniStackAccount;
  keys: (bucket?: string) => Promise<string[]>;
  object: (key: string) => Promise<string>;
  put: (bucket: string, key: string, body: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  close: () => Promise<void>;
};

/** The stack's buckets in MiniStack, the deployment bucket seeded with the objects a deployed stack left there. */
const createStackBuckets = async (objects: Record<string, string>): Promise<StackBuckets> => {
  const account = ministack.account();
  const client = new S3Client(ministack.clientConfig(account));
  for (const Bucket of Object.values(bucketPhysicalIds)) {
    await client.send(new CreateBucketCommand({ Bucket, CreateBucketConfiguration: { LocationConstraint: region } }));
  }
  for (const [key, body] of Object.entries(objects)) {
    await client.send(new PutObjectCommand({ Bucket: deploymentBucketName, Key: key, Body: body }));
  }
  const keys = async (bucket = deploymentBucketName) =>
    ((await client.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents ?? [])
      .map(({ Key }) => Key ?? '')
      .toSorted();
  return {
    account,
    keys,
    object: async (key) =>
      (await client.send(new GetObjectCommand({ Bucket: deploymentBucketName, Key: key }))).Body!.transformToString(),
    put: async (bucket, key, body) => {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
    },
    remove: async (key) => {
      await client.send(
        new DeleteObjectsCommand({ Bucket: deploymentBucketName, Delete: { Objects: [{ Key: key }] } })
      );
    },
    close: async () => {
      // Bucket names are global in the emulator as in AWS; the next scenario needs these names again.
      for (const Bucket of Object.values(bucketPhysicalIds)) {
        const remaining = await keys(Bucket).catch(() => []);
        if (remaining.length > 0) {
          await client.send(
            new DeleteObjectsCommand({ Bucket, Delete: { Objects: remaining.map((Key) => ({ Key })) } })
          );
        }
        await client.send(new DeleteBucketCommand({ Bucket })).catch(() => undefined);
      }
      client.destroy();
    }
  };
};

const deployedTemplate = async (): Promise<CloudFormationTemplate> =>
  JSON.parse(
    await readFile(join(cliRoot, 'tests', 'data-safety', 'baselines', 'serverless-api', 'v4.template.json'), 'utf8')
  );

const deployedStack = async (status: string): Promise<FakeStackState> => {
  const template = await deployedTemplate();
  return {
    stackName,
    status,
    template,
    outputs: outputsFromTemplate(template),
    // The CLI reads bucket names from the stack, and those buckets exist in the emulator.
    physicalIds: bucketPhysicalIds
  };
};

/** A stack at version v000002 whose deployment bucket still holds the v000001 and v000002 templates. */
const deployedStackWithHistory = async (): Promise<{ stack: FakeStackState; objects: Record<string, string> }> => {
  const stack = await deployedStack('UPDATE_COMPLETE');
  const previous = structuredClone(stack.template);
  (previous.Outputs!.StpDeploymentVersion as { Value: unknown }).Value = 'v000001';
  (previous.Resources.ApiFunction as { Properties: { MemorySize?: number } }).Properties.MemorySize = 256;
  (stack.template.Outputs!.StpDeploymentVersion as { Value: unknown }).Value = 'v000002';
  stack.outputs.StpDeploymentVersion = 'v000002';
  return {
    stack,
    objects: {
      [getCfTemplateS3Key('v000001')]: stringifyToYaml(previous),
      [getCfTemplateS3Key('v000002')]: stringifyToYaml(stack.template)
    }
  };
};

const cliEnvironment = ({
  home,
  controlPlane,
  aws,
  bucket,
  tty
}: {
  home: string;
  controlPlane: ControlPlaneFake;
  aws: AwsFake;
  bucket: StackBuckets;
  tty: boolean;
}) => ({
  PATH: process.env.PATH ?? '',
  HOME: home,
  XDG_CONFIG_HOME: join(home, '.config'),
  XDG_CACHE_HOME: join(home, '.cache'),
  TMPDIR: join(home, 'tmp'),
  ...(tty ? { TERM: 'xterm-256color' } : { CI: '1' }),
  NO_COLOR: '1',
  // The scenario's emulator account: the same key the test's own S3 client uses, so both see one bucket.
  ...ministack.childEnvironment(bucket.account, { region }),
  // Everything but S3 goes to the CloudFormation/STS fake; the fake refuses S3, so misrouting shows up.
  AWS_ENDPOINT_URL: aws.endpoint,
  AWS_ENDPOINT_URL_STS: aws.endpoint,
  AWS_ENDPOINT_URL_S3: ministack.endpoint,
  STACKTAPE_API_KEY: 'cli-process-fake-do-not-use',
  STP_CUSTOM_TRPC_API_ENDPOINT: controlPlane.endpoint,
  SKIP_LOADING_ENV: '1',
  STP_DISABLE_TELEMETRY: '1'
});

/**
 * The child loads the network guard before anything else: environment variables point its SDKs at the fakes and
 * the emulator, but only the guard stops a request whose endpoint is set in code from leaving the machine.
 */
const cliArguments = (args: string[]) => [
  '--preload',
  join(cliRoot, 'scripts', 'network-guard-preload.ts'),
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
  projectDir
];

const stripAnsi = (text: string) =>
  text
    .split(String.fromCharCode(27))
    .map((part, index) => (index === 0 ? part : part.replace(/^\[[0-9;?]*[A-Za-z]/, '')))
    .join('');

/** Runs one CLI command in a pseudo-terminal and answers its confirmation prompt. */
const runCliInTerminal = async ({
  args,
  controlPlane,
  aws,
  bucket,
  promptText,
  answer
}: {
  args: string[];
  controlPlane: ControlPlaneFake;
  aws: AwsFake;
  bucket: StackBuckets;
  promptText: string;
  answer: string;
}) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-cli-process-home-'));
  temporaryDirectories.push(home);
  let screen = '';
  const decoder = new TextDecoder();
  const child = Bun.spawn(['bun', ...cliArguments(args)], {
    cwd: cliRoot,
    env: cliEnvironment({ home, controlPlane, aws, bucket, tty: true }),
    terminal: {
      cols: 120,
      rows: 40,
      data: (_terminal, data) => {
        screen += decoder.decode(data, { stream: true });
      }
    }
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 150_000);
  try {
    for (const deadline = Date.now() + 120_000; !stripAnsi(screen).includes(promptText); await Bun.sleep(100)) {
      if (child.exitCode !== null || Date.now() > deadline) {
        throw new Error(`The CLI did not show "${promptText}":\n${stripAnsi(screen).slice(-3_000)}`);
      }
    }
    child.terminal?.write(answer);
    const exitCode = await child.exited;
    return { exitCode, screen: stripAnsi(screen) };
  } finally {
    clearTimeout(timeout);
    child.kill();
    child.terminal?.close();
  }
};

const startFakes = async (stack?: FakeStackState, objects: Record<string, string> = {}) => {
  const controlPlane = await startControlPlaneFake({ projectName });
  resources.push(controlPlane);
  const bucket = await createStackBuckets(objects);
  resources.push(bucket);
  const aws = await startAwsFake({
    region,
    stack,
    // CloudFormation reads the uploaded template from the URL the CLI passed; here that URL is the emulator's bucket.
    readTemplate: async (templateUrl) => {
      if (!templateUrl.startsWith(`${ministack.endpoint}/${deploymentBucketName}/`)) return undefined;
      return bucket.object(new URL(templateUrl).pathname.replace(`/${deploymentBucketName}/`, ''));
    }
  });
  resources.push(aws);
  return { controlPlane, aws, bucket };
};

/** Runs one CLI command as a child process with isolated HOME and loopback endpoints only. */
const runCli = async ({
  args,
  controlPlane,
  aws,
  bucket,
  tty = false,
  environment = {}
}: {
  args: string[];
  controlPlane: ControlPlaneFake;
  aws: AwsFake;
  bucket: StackBuckets;
  tty?: boolean;
  /** Overrides for one scenario, such as an endpoint that must be refused. */
  environment?: Record<string, string>;
}): Promise<CliRun> => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-cli-process-home-'));
  temporaryDirectories.push(home);
  const env = { ...cliEnvironment({ home, controlPlane, aws, bucket, tty }), ...environment };
  const child = Bun.spawn(['bun', ...cliArguments(args), '--outputFormat', 'jsonl'], {
    cwd: cliRoot,
    env,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe'
  });
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

describe('offline guard', () => {
  test('a child whose SDK is pointed at real AWS is stopped by the network guard before any request leaves', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_COMPLETE'));
    const run = await runCli({
      args: ['diff'],
      controlPlane,
      aws,
      bucket,
      environment: { AWS_ENDPOINT_URL_STS: 'https://sts.amazonaws.com' }
    });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toContain('Tests cannot access external network target: sts.amazonaws.com');
    expect(aws.mutations).toEqual([]);
    expect(await bucket.keys()).toEqual([]);
  });
});

describe('delete', () => {
  test('an absent stack is reported as not deployed and nothing is deleted', async () => {
    const { controlPlane, aws, bucket } = await startFakes(undefined);
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(printable(run)).toContain(stackName);
    expect(aws.mutations).toEqual([]);
    expect(await bucket.keys()).toEqual([]);
    expect(aws.unexpectedRequests).toEqual([]);
  });

  test('a non-interactive delete without explicit confirmation stops before touching the stack', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_COMPLETE'));
    const run = await runCli({ args: ['delete'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(run.result?.code).toContain('CONFIRMATION_REQUIRED');
    expect(JSON.stringify(run.result)).toContain('autoConfirmOperation');
    expect(aws.mutations).toEqual([]);
    expect(aws.stack?.status).toBe('UPDATE_COMPLETE');
  });

  test('a confirmed delete empties the stack\u2019s buckets, deletes the stack once, waits for completion and records the operation', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_COMPLETE'));
    await bucket.put(filesBucketName, 'uploads/customer-file.txt', 'kept until the stack goes');
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws, bucket });

    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    // CloudFormation cannot delete a bucket with objects; the CLI empties the stack's buckets first.
    expect(await bucket.keys(filesBucketName)).toEqual([]);
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

  test('declining the confirmation in a terminal cancels the delete and leaves the stack untouched', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_COMPLETE'));
    const run = await runCliInTerminal({
      args: ['delete'],
      controlPlane,
      aws,
      bucket,
      promptText: `Delete stack ${stackName} and all of its resources?`,
      answer: 'n\r'
    });

    expect(run.screen).toContain('Operation canceled');
    // The CLI ends a cancelled operation by signalling its own process tree, so the parent observes SIGTERM (143)
    // rather than status 0 in this source-run wrapper.
    expect([0, 143]).toContain(run.exitCode);
    expect(aws.mutations.filter(({ action }) => action === 'DeleteStack')).toEqual([]);
    expect(aws.stack?.status).toBe('UPDATE_COMPLETE');
  });

  test('a stack whose previous delete failed can be deleted again', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('DELETE_FAILED'));
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws, bucket });

    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    expect(aws.mutations.filter(({ action }) => action === 'DeleteStack')).toHaveLength(1);
    expect(aws.stack?.status).toBe('DELETE_COMPLETE');
  });
});

describe('rollback', () => {
  test('a stack stuck in a failed rollback is refused with the recovery command, without an update', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_ROLLBACK_FAILED'));
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toContain('UPDATE_ROLLBACK_FAILED');
    expect(JSON.stringify(run.result)).toContain('cf:rollback');
    expect(aws.mutations).toEqual([]);
  });

  test("rolling back to the previous version redeploys that version's template and waits for completion", async () => {
    const history = await deployedStackWithHistory();
    const { controlPlane, aws, bucket } = await startFakes(history.stack, history.objects);
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });

    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    const updates = aws.mutations.filter(({ action }) => action === 'UpdateStack');
    expect(updates).toHaveLength(1);
    expect(updates[0].parameters.StackName).toBe(stackName);
    // The rollback uploads the v000001 template as the new version v000003 and deploys exactly that.
    const uploadedTemplateKey = getCfTemplateS3Key('v000003');
    expect(await bucket.keys()).toContain(uploadedTemplateKey);
    expect(updates[0].parameters.TemplateURL).toBe(
      `${ministack.endpoint}/${deploymentBucketName}/${uploadedTemplateKey}`
    );
    const uploaded = await bucket.object(uploadedTemplateKey);
    expect(uploaded).toContain('MemorySize: 256');
    expect(uploaded).toContain('v000003');
    expect(aws.stack?.status).toBe('UPDATE_COMPLETE');
    expect(aws.stack?.outputs.StpDeploymentVersion).toBe('v000003');
    expect(aws.unexpectedRequests).toEqual([]);
  });

  test('a rollback whose target template is missing from the deployment bucket stops before any update', async () => {
    const history = await deployedStackWithHistory();
    const { controlPlane, aws, bucket } = await startFakes(history.stack, history.objects);
    await bucket.remove(getCfTemplateS3Key('v000001'));
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/v000001/);
    expect(aws.mutations.filter(({ action }) => action === 'UpdateStack')).toEqual([]);
    expect(await bucket.keys()).toEqual([getCfTemplateS3Key('v000002')]);
  });

  test('an absent stack cannot be rolled back', async () => {
    const { controlPlane, aws, bucket } = await startFakes(undefined);
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(aws.mutations).toEqual([]);
  });
});

describe('diff', () => {
  test('a deployed stack gets a change set from the uploaded template and nothing is executed', async () => {
    const history = await deployedStackWithHistory();
    const { controlPlane, aws, bucket } = await startFakes(history.stack, history.objects);
    const run = await runCli({ args: ['diff'], controlPlane, aws, bucket });

    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    expect(aws.changeSets).toHaveLength(1);
    const uploadedTemplateKey = getCfTemplateS3Key('v000003');
    expect(aws.changeSets[0].parameters.StackName).toBe(stackName);
    expect(aws.changeSets[0].parameters.TemplateURL).toContain(uploadedTemplateKey);
    expect(await bucket.keys()).toContain(uploadedTemplateKey);
    expect(aws.mutations.filter(({ action }) => /^(UpdateStack|DeleteStack|ExecuteChangeSet)$/.test(action))).toEqual(
      []
    );
    expect(aws.stack?.status).toBe('UPDATE_COMPLETE');
    expect(JSON.stringify(run.result)).toContain('ApiFunction');
  });

  test('an absent stack is reported as not deployed before anything is uploaded', async () => {
    const { controlPlane, aws, bucket } = await startFakes(undefined);
    const run = await runCli({ args: ['diff'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(aws.mutations).toEqual([]);
    expect(await bucket.keys()).toEqual([]);
  });
});
