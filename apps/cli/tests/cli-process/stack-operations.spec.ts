/**
 * Source-CLI command safety and recovery. Healthy CloudFormation, STS, S3 and Logs requests use MiniStack;
 * the CloudFormation wire observer injects only chosen failed states and a rejected recovery. Each command runs
 * with an isolated HOME, synthetic credentials and the network guard, and artifacts are observed through real S3.
 * Successful deploy/diff/version rollback/delete effects are covered by the offline deploy loop.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterAll, afterEach, beforeAll, describe, expect, test as bunTest } from 'bun:test';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  UpdateTerminationProtectionCommand
} from '@aws-sdk/client-cloudformation';
import { CreateRepositoryCommand, ECRClient } from '@aws-sdk/client-ecr';
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
const observers: AwsFake[] = [];
afterEach(async () => {
  const unexpected = observers.splice(0).flatMap((observer) => observer.unexpectedRequests);
  for (const resource of resources.splice(0).reverse()) await resource.close();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  expect(unexpected).toEqual([]);
});

/** One emulator for the file; scenarios clean their seeded stack and buckets between runs. */
let ministack: MiniStack;
beforeAll(async () => {
  ministack = await startMiniStack({ label: 'cli-process' });
  // A real deployed stack owns this repository even when it has no container images.
  const ecr = new ECRClient(ministack.clientConfig());
  try {
    await ecr.send(
      new CreateRepositoryCommand({
        repositoryName: awsResourceNames.deploymentEcrRepo(
          getGloballyUniqueStackHash({ region, stackName, accountId: ministack.defaultAccount.accountId })
        )
      })
    );
  } finally {
    ecr.destroy();
  }
}, 120_000);
afterAll(async () => {
  await ministack?.stop();
});

/** The bucket the CLI derives for this stack, as Stacktape names it from region, stack name and account. */
const deploymentBucketName = awsResourceNames.deploymentBucket(
  getGloballyUniqueStackHash({ region, stackName, accountId: '000000000000' })
);
/** The customer's bucket in the deployed template, which a delete must empty before the stack can go. */
const filesBucketName = `${stackName}-filesbucket`;
const bucketPhysicalIds = { StpDeploymentBucket: deploymentBucketName, FilesBucket: filesBucketName };

type StackBuckets = {
  account: MiniStackAccount;
  keys: (bucket?: string) => Promise<string[]>;
  object: (key: string) => Promise<string>;
  put: (bucket: string, key: string, body: string) => Promise<void>;
  enableVersioning: (bucket: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  close: () => Promise<void>;
};

/** The stack's buckets in MiniStack, the deployment bucket seeded with the objects a deployed stack left there. */
const createStackBuckets = async (objects: Record<string, string>, create = true): Promise<StackBuckets> => {
  const account = ministack.defaultAccount;
  const client = new S3Client(ministack.clientConfig(account));
  for (const Bucket of create ? Object.values(bucketPhysicalIds) : []) {
    await client.send(new CreateBucketCommand({ Bucket, CreateBucketConfiguration: { LocationConstraint: region } }));
  }
  for (const [key, body] of Object.entries(objects)) {
    await client.send(new PutObjectCommand({ Bucket: deploymentBucketName, Key: key, Body: body }));
  }
  // Every object version and delete marker: a versioned bucket is empty only when these are gone as well.
  const versions = async (Bucket: string) => {
    const listed = await client.send(new ListObjectVersionsCommand({ Bucket }));
    return [...(listed.Versions ?? []), ...(listed.DeleteMarkers ?? [])].map(({ Key, VersionId }) => ({
      Key: Key ?? '',
      ...(VersionId && VersionId !== 'null' ? { VersionId } : {})
    }));
  };
  const keys = async (bucket = deploymentBucketName) => (await versions(bucket)).map(({ Key }) => Key).toSorted();
  return {
    account,
    keys,
    object: async (key) =>
      (await client.send(new GetObjectCommand({ Bucket: deploymentBucketName, Key: key }))).Body!.transformToString(),
    put: async (bucket, key, body) => {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
    },
    enableVersioning: async (Bucket) => {
      await client.send(new PutBucketVersioningCommand({ Bucket, VersioningConfiguration: { Status: 'Enabled' } }));
    },
    remove: async (key) => {
      await client.send(
        new DeleteObjectsCommand({ Bucket: deploymentBucketName, Delete: { Objects: [{ Key: key }] } })
      );
    },
    close: async () => {
      // The next scenario needs these names again in the same fixture account.
      for (const Bucket of Object.values(bucketPhysicalIds)) {
        const remaining = await versions(Bucket).catch(() => []);
        if (remaining.length > 0) {
          await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: remaining } }));
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
  // Only CloudFormation uses the wire observer; every other service uses MiniStack.
  AWS_ENDPOINT_URL: ministack.endpoint,
  AWS_ENDPOINT_URL_CLOUDFORMATION: aws.endpoint,
  AWS_ENDPOINT_URL_S3: ministack.endpoint,
  STACKTAPE_API_KEY: 'cli-process-fake-do-not-use',
  STP_CUSTOM_TRPC_API_ENDPOINT: controlPlane.endpoint,
  SKIP_LOADING_ENV: '1',
  STP_DISABLE_TELEMETRY: '1',
  STP_SKIP_COST_DISCOVERY: '1'
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

const stackStatusInMiniStack = async () => {
  const client = new CloudFormationClient(ministack.clientConfig());
  try {
    return (await client.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0]?.StackStatus;
  } catch (error) {
    if (/does not exist/.test(String(error))) return 'DELETE_COMPLETE';
    throw error;
  } finally {
    client.destroy();
  }
};

const startFakes = async (stack?: FakeStackState, objects: Record<string, string> = {}) => {
  const controlPlane = await startControlPlaneFake({ projectName, awsAccountId: ministack.defaultAccount.accountId });
  resources.push(controlPlane);
  const healthy = stack?.status === 'UPDATE_COMPLETE';
  if (healthy) {
    // Only the prerequisites are seeded. The command under test uses the real CloudFormation service.
    const client = new CloudFormationClient(ministack.clientConfig());
    resources.push({
      close: async () => {
        await client
          .send(new UpdateTerminationProtectionCommand({ StackName: stackName, EnableTerminationProtection: false }))
          .catch(() => undefined);
        await client.send(new DeleteStackCommand({ StackName: stackName })).catch(() => undefined);
        client.destroy();
      }
    });
    await client.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateBody: JSON.stringify({
          Resources: {
            StpDeploymentBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: deploymentBucketName } },
            FilesBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: filesBucketName } }
          },
          Outputs: Object.fromEntries(Object.entries(stack.outputs).map(([key, value]) => [key, { Value: value }]))
        })
      })
    );
    for (const deadline = Date.now() + 20_000; ;) {
      const status = (await client.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0]?.StackStatus;
      if (status === 'CREATE_COMPLETE') break;
      if (Date.now() >= deadline) throw new Error(`Seed stack failed to complete: ${status}`);
      await Bun.sleep(100);
    }
    if (stack.terminationProtection)
      await client.send(
        new UpdateTerminationProtectionCommand({ StackName: stackName, EnableTerminationProtection: true })
      );
  }
  const bucket = await createStackBuckets(objects, !healthy);
  resources.push(bucket);
  const aws = await startAwsFake({
    ...(healthy || !stack ? { forwardEndpoint: ministack.endpoint } : {}),
    region,
    stack,
    beforeDelete: async () => ({ deployment: await bucket.keys(), customer: await bucket.keys(filesBucketName) })
  });
  resources.push(aws);
  observers.push(aws);
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
    expect(JSON.stringify(run.result)).toContain('--yes');
    expect(aws.mutations).toEqual([]);
    expect(aws.stack?.status).toBe('CREATE_COMPLETE');
  });

  test('confirmed deletion empties customer and deployment buckets, including old versions, before CloudFormation removes them', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_COMPLETE'), {
      [getCfTemplateS3Key('v000002')]: 'template'
    });
    await bucket.enableVersioning(filesBucketName);
    await bucket.put(filesBucketName, 'uploads/customer-file.txt', 'customer-data');
    await bucket.put(filesBucketName, 'uploads/customer-file.txt', 'customer-data-v2');
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws, bucket });
    expect(printable(run)).toBe('');
    expect(run.exitCode).toBe(0);
    // Observe real S3 state before the emulator's CloudFormation provider removes the buckets.
    expect(aws.bucketsBeforeDelete).toEqual([{ deployment: [], customer: [] }]);
    expect(aws.mutations.map(({ action }) => action)).toEqual(['DeleteStack']);
    expect(aws.mutations[0].parameters.StackName).toBe(stackName);
    expect(aws.unexpectedRequests).toEqual([]);
    // The proxy only sees the statuses the CLI happened to request, so ask the emulator itself.
    expect(await stackStatusInMiniStack()).toBe('DELETE_COMPLETE');
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
    expect(aws.mutations).toEqual([]);
    expect(aws.stack?.status).toBe('CREATE_COMPLETE');
  });

  test('Ctrl+C at the delete confirmation leaves the stack and deployment artifacts untouched', async () => {
    const { controlPlane, aws, bucket } = await startFakes(await deployedStack('UPDATE_COMPLETE'), {
      [getCfTemplateS3Key('v000002')]: 'keep'
    });
    const run = await runCliInTerminal({
      args: ['delete'],
      controlPlane,
      aws,
      bucket,
      promptText: `Delete stack ${stackName} and all of its resources?`,
      answer: '\x03'
    });
    expect([0, 130, 143]).toContain(run.exitCode);
    expect(aws.mutations).toEqual([]);
    expect(aws.stack?.status).toBe('CREATE_COMPLETE');
    expect(await bucket.object(getCfTemplateS3Key('v000002'))).toBe('keep');
  });

  test('termination protection retains deployment artifacts and refuses deletion', async () => {
    const { controlPlane, aws, bucket } = await startFakes(
      { ...(await deployedStack('UPDATE_COMPLETE')), terminationProtection: true },
      { [getCfTemplateS3Key('v000002')]: 'keep' }
    );
    const run = await runCli({ args: ['delete', '--autoConfirmOperation'], controlPlane, aws, bucket });
    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/termination protection/i);
    expect(aws.mutations).toEqual([]);
    expect(await bucket.object(getCfTemplateS3Key('v000002'))).toBe('keep');
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
    expect(JSON.stringify(run.result)).toContain('stack recover');
    expect(aws.mutations).toEqual([]);
  });

  test('a rollback whose target template is missing from the deployment bucket stops before any update', async () => {
    const history = await deployedStackWithHistory();
    const { controlPlane, aws, bucket } = await startFakes(
      { ...history.stack, status: 'UPDATE_ROLLBACK_COMPLETE' },
      history.objects
    );
    await bucket.remove(getCfTemplateS3Key('v000001'));
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/v000001/);
    expect(aws.mutations).toEqual([]);
    expect(await bucket.keys()).toEqual([getCfTemplateS3Key('v000002')]);
  });

  for (const desiredCount of [0, 1]) {
    test(`a rollback with a missing ECS digest and desired count ${desiredCount} warns and proceeds`, async () => {
      const history = await deployedStackWithHistory();
      const target = getCfTemplateS3Key('v000001');
      const template: CloudFormationTemplate = {
        Resources: {
          StpDeploymentBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: deploymentBucketName } },
          FilesBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: filesBucketName } }
        },
        Outputs: Object.fromEntries(
          Object.entries(history.stack.outputs).map(([key, value]) => [key, { Value: value }])
        )
      };
      const accountId = ministack.defaultAccount.accountId;
      const repositoryName = awsResourceNames.deploymentEcrRepo(
        getGloballyUniqueStackHash({ region, stackName, accountId })
      );
      const image = `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}@sha256:${'a'.repeat(64)}`;
      template.Resources.Task = {
        Type: 'AWS::ECS::TaskDefinition',
        Properties: {
          ContainerDefinitions: [
            { Name: 'app', Image: 'busybox:latest' },
            { Name: 'stp-cloudmap-drain', Image: image }
          ]
        }
      };
      template.Resources.ApiService = {
        Type: 'AWS::ECS::Service',
        Properties: { DesiredCount: desiredCount, TaskDefinition: { Ref: 'Task' } }
      };
      history.objects[target] = stringifyToYaml(template);
      const { controlPlane, aws, bucket } = await startFakes(
        { ...history.stack, status: 'UPDATE_COMPLETE' },
        history.objects
      );
      const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });
      expect(run.exitCode).toBe(0);
      const warnings = run.records
        .filter(({ level }) => level === 'warn')
        .map(({ message }) => message)
        .join('\n');
      expect(warnings).toContain('Rollback service ApiService');
      expect(warnings).toContain(image);
      expect(warnings).toContain('will fail to start');
      expect(warnings).not.toContain('busybox:latest');
      expect(aws.mutations.some(({ action }) => action === 'UpdateStack')).toBe(true);
    });
  }

  test('an absent stack cannot be rolled back', async () => {
    const { controlPlane, aws, bucket } = await startFakes(undefined);
    const run = await runCli({ args: ['rollback', '--targetVersion', 'v000001'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(aws.mutations).toEqual([]);
  });
});

describe('diff', () => {
  test('an absent stack is reported as not deployed before anything is uploaded', async () => {
    const { controlPlane, aws, bucket } = await startFakes(undefined);
    const run = await runCli({ args: ['diff'], controlPlane, aws, bucket });

    expect(run.exitCode).not.toBe(0);
    expect(printable(run)).toMatch(/not deployed|does not exist/i);
    expect(aws.mutations).toEqual([]);
    expect(await bucket.keys()).toEqual([]);
  });
});

describe('cf:rollback', () => {
  for (const { status, failure, action } of [
    { status: 'UPDATE_ROLLBACK_FAILED', failure: false, action: 'ContinueUpdateRollback' },
    { status: 'UPDATE_ROLLBACK_FAILED', failure: true, action: 'ContinueUpdateRollback' },
    // A stack deployed with automatic rollback disabled stops in UPDATE_FAILED.
    { status: 'UPDATE_FAILED', failure: false, action: 'RollbackStack' }
  ]) {
    test(
      failure
        ? 'failed recovery retains every deployment artifact'
        : `recovery from ${status} rolls back and removes only failed-version artifacts`,
      async () => {
        const stack = await deployedStack(status);
        stack.outputs.StpDeploymentVersion = 'v000002';
        stack.rollbackFailure = failure;
        const objects = {
          [getCfTemplateS3Key('v000002')]: 'live-template',
          [getCfTemplateS3Key('v000003')]: 'failed-template'
        };
        const { controlPlane, aws, bucket } = await startFakes(stack, objects);
        const run = await runCli({
          args: ['cf:rollback', '--resourcesToSkip', 'ApiFunction', 'ApiFunction'],
          controlPlane,
          aws,
          bucket
        });
        expect(
          aws.mutations.map((mutation) => mutation.action),
          printable(run)
        ).toEqual([action]);
        if (action === 'ContinueUpdateRollback') {
          expect(aws.mutations[0].parameters['ResourcesToSkip.member.1']).toBe('ApiFunction');
          expect(aws.mutations[0].parameters['ResourcesToSkip.member.2']).toBeUndefined();
        }
        if (failure) {
          expect(run.exitCode).not.toBe(0);
          expect(printable(run)).toContain('Injected rollback refusal');
          expect(await bucket.keys()).toEqual(Object.keys(objects).toSorted());
        } else {
          expect(printable(run)).toBe('');
          expect(run.exitCode).toBe(0);
          expect(aws.stack?.status).toBe('UPDATE_ROLLBACK_COMPLETE');
          expect(await bucket.keys()).toEqual([getCfTemplateS3Key('v000002')]);
        }
        expect(await bucket.object(getCfTemplateS3Key('v000002'))).toBe('live-template');
        expect(aws.unexpectedRequests).toEqual([]);
      }
    );
  }
});
