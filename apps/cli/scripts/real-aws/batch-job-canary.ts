/**
 * Real-AWS check that a batch job deploys, runs on a message of its queue, and that a deploy CloudFormation rejects in
 * its pre-deployment validation names the reason. In the r2gg dogfood AWS Batch refused Stacktape's Amazon Linux 2
 * compute environments as end-of-life, so no stack with a batch job could deploy, and nothing caught it before.
 *
 * It deploys `_test-stacks/batch-job` through the source-built CLI, then:
 * 1. checks that every compute environment of the stack is valid and uses an Amazon Linux 2023 image;
 * 2. sends a message to the job's queue and waits until the job succeeds. The job is a js-bundle image in the stack's
 *    private ECR repository, which the instance pulls with the job's execution role. Its log must hold the message,
 *    and its root file system the launch template's 100 GB;
 * 3. deploys again with an invalid queue (`DelaySeconds: 1.5`); the CLI must fail with the resource, the property path
 *    and CloudFormation's reason, and the stack must roll back;
 * 4. deletes the stack with the CLI, then confirms with AWS that the stack, compute environments, job queues, state
 *    machines, functions, roles, queues, buckets, the image repository, the VPC and the log groups are gone.
 *
 * A run takes about 10 minutes and one small EC2 instance for a few minutes. The guardrails are those of
 * `source-cli-canary.ts` and docs/testing/live-aws.md.
 *
 *   STP_AWS_BATCH_CANARY_DEPLOY=1 STP_AWS_BATCH_CANARY_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_BATCH_CANARY_PROFILE=<name> STP_AWS_BATCH_CANARY_OWNER=<run id>
 *   STP_AWS_BATCH_CANARY_STATE_FILE=<absolute path> [STP_AWS_BATCH_CANARY_REPORT=<absolute path>]
 *   [STP_AWS_BATCH_CANARY_PROJECT_NAME=v4batchcanary-…] [STP_AWS_BATCH_CANARY_REGION=eu-west-1]
 *   pnpm --filter @stacktape/cli run test:real-aws-batch-canary [-- --cleanup-only]
 */
import { Sha256 } from '@aws-crypto/sha256-js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
  type StackResource
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeVpcsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { DescribeRepositoriesCommand, ECRClient } from '@aws-sdk/client-ecr';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { DescribeStateMachineCommand, SFNClient } from '@aws-sdk/client-sfn';
import { GetQueueAttributesCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { writeFile } from 'node:fs/promises';
import { stripVTControlCharacters } from 'node:util';
import {
  assert,
  assertOwned,
  type BaseState,
  type CanaryOptions,
  cleanupCommand,
  createSourceCliRunner,
  deleteLogGroups,
  describeStack,
  emptyBucket,
  gone,
  hasDevApiKey,
  isMissing,
  readStackResources,
  readState,
  resolveCanaryOptions,
  sleep,
  writeState
} from './source-cli-canary';

type Owned = {
  computeEnvironments?: string[];
  jobQueues?: string[];
  stateMachines?: string[];
  functionNames?: string[];
  roleNames?: string[];
  queueUrls?: string[];
  buckets?: string[];
  vpcIds?: string[];
  repositories?: string[];
  logGroupNames?: string[];
};
type State = BaseState & Owned;
type ComputeEnvironment = {
  computeEnvironmentName?: string;
  status?: string;
  state?: string;
  computeResources?: { ec2Configuration?: { imageType?: string }[] };
};
type JobQueue = { jobQueueName?: string; status?: string };
type Job = {
  jobId?: string;
  status?: string;
  statusReason?: string;
  container?: { logStreamName?: string; reason?: string; image?: string };
};
/** The AWS Batch operations the canary uses. The CLI has no Batch SDK client, so they are signed REST calls. */
type Batch = {
  describeComputeEnvironments: (arns: string[]) => Promise<ComputeEnvironment[]>;
  describeJobQueues: (arns: string[]) => Promise<JobQueue[]>;
  listJobs: (jobQueue: string, jobStatus: string) => Promise<{ jobId?: string; createdAt?: number }[]>;
  describeJobs: (jobIds: string[]) => Promise<Job[]>;
  destroy: () => void;
};
type Clients = {
  batch: Batch;
  cloudFormation: CloudFormationClient;
  ec2: EC2Client;
  ecr: ECRClient;
  iam: IAMClient;
  lambda: LambdaClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  sfn: SFNClient;
  sqs: SQSClient;
  sts: STSClient;
};
type Runner = ReturnType<typeof createSourceCliRunner>;

const PREFIX = 'STP_AWS_BATCH_CANARY_';
const SCRIPT = 'test:real-aws-batch-canary';
const STAGE = 'canary';
const CONFIG_PATH = '_test-stacks/batch-job/stacktape.ts';
/** An instance has to start for the job, then pull the image. */
const JOB_TIMEOUT_MS = 15 * 60 * 1000;
/** The launch template gives each instance a 100 GB root volume; the container sees a little less. */
const MIN_ROOT_FILESYSTEM_KB = 90 * 1024 * 1024;
/** What the CLI must report for the invalid queue, from CloudFormation's validation findings. */
export const EXPECTED_VALIDATION_FAILURE = [
  'CanaryInvalidQueue',
  'Property [DelaySeconds] expected type: Integer, found: Float',
  '/Resources/CanaryInvalidQueue/Properties/DelaySeconds'
];

export const resolveOptions = (env = process.env) =>
  resolveCanaryOptions(env, { prefix: PREFIX, projectPrefix: 'v4batchcanary-' });

const createBatch = ({ credentials, region }: { credentials: ReturnType<typeof fromIni>; region: string }): Batch => {
  const signer = new SignatureV4({ credentials, region, service: 'batch', sha256: Sha256 });
  const hostname = `batch.${region}.amazonaws.com`;
  const call = async <Response>(operation: string, input: Record<string, unknown>) => {
    const body = JSON.stringify(input);
    const request = await signer.sign(
      new HttpRequest({
        protocol: 'https:',
        hostname,
        path: `/v1/${operation}`,
        method: 'POST',
        headers: { host: hostname, 'content-type': 'application/json' },
        body
      })
    );
    const response = await fetch(`https://${hostname}/v1/${operation}`, {
      method: 'POST',
      headers: request.headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(30_000)
    });
    const text = await response.text();
    assert(response.ok, `Batch ${operation} failed with ${response.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as Response;
  };
  return {
    describeComputeEnvironments: async (computeEnvironments) =>
      (
        await call<{ computeEnvironments?: ComputeEnvironment[] }>('describecomputeenvironments', {
          computeEnvironments
        })
      ).computeEnvironments ?? [],
    describeJobQueues: async (jobQueues) =>
      (await call<{ jobQueues?: JobQueue[] }>('describejobqueues', { jobQueues })).jobQueues ?? [],
    listJobs: async (jobQueue, jobStatus) =>
      (await call<{ jobSummaryList?: { jobId?: string; createdAt?: number }[] }>('listjobs', { jobQueue, jobStatus }))
        .jobSummaryList ?? [],
    describeJobs: async (jobs) => (await call<{ jobs?: Job[] }>('describejobs', { jobs })).jobs ?? [],
    destroy: () => undefined
  };
};

const createClients = ({ profile, region }: CanaryOptions): Clients => {
  const credentials = fromIni({ profile });
  const config = { credentials, region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    batch: createBatch({ credentials, region }),
    cloudFormation: new CloudFormationClient(config),
    ec2: new EC2Client(config),
    ecr: new ECRClient(config),
    iam: new IAMClient(config),
    lambda: new LambdaClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    sfn: new SFNClient(config),
    sqs: new SQSClient(config),
    sts: new STSClient(config)
  };
};

const describeOwned = (resources: StackResource[]): Owned => {
  const physical = (type: string) =>
    resources
      .filter(({ ResourceType }) => ResourceType === type)
      .flatMap(({ PhysicalResourceId }) => PhysicalResourceId ?? []);
  return {
    computeEnvironments: physical('AWS::Batch::ComputeEnvironment'),
    jobQueues: physical('AWS::Batch::JobQueue'),
    stateMachines: physical('AWS::StepFunctions::StateMachine'),
    functionNames: physical('AWS::Lambda::Function'),
    roleNames: physical('AWS::IAM::Role'),
    queueUrls: physical('AWS::SQS::Queue'),
    buckets: physical('AWS::S3::Bucket'),
    vpcIds: physical('AWS::EC2::VPC'),
    // The deployment repository is the CLI's, not a stack resource; the run adds it from the job's image.
    repositories: physical('AWS::ECR::Repository'),
    logGroupNames: physical('AWS::Logs::LogGroup')
  };
};

const mergeOwned = (state: State, owned: Owned) => {
  for (const [key, values] of Object.entries(owned) as [keyof Owned, string[]][]) {
    state[key] = [...new Set([...(state[key] ?? []), ...values])];
  }
};

/** Every compute environment must be usable and on Amazon Linux 2023; Batch refuses new Amazon Linux 2 ones. */
const checkComputeEnvironments = async (clients: Clients, arns: string[]) => {
  const computeEnvironments = await clients.batch.describeComputeEnvironments(arns);
  const found = computeEnvironments.map(({ computeEnvironmentName, status, state, computeResources }) => ({
    name: computeEnvironmentName,
    status,
    state,
    imageTypes: (computeResources?.ec2Configuration ?? []).map(({ imageType }) => imageType)
  }));
  assert(found.length === arns.length && arns.length > 0, `Expected ${arns.length} compute environments.`);
  for (const environment of found) {
    assert(
      environment.status === 'VALID' && environment.state === 'ENABLED',
      `Compute environment ${environment.name} is ${environment.status}/${environment.state}.`
    );
    assert(
      environment.imageTypes.length > 0 && environment.imageTypes.every((type) => type?.startsWith('ECS_AL2023')),
      `Compute environment ${environment.name} uses ${environment.imageTypes.join(', ') || 'no explicit image type'}.`
    );
  }
  return found;
};

const JOB_STATUSES = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const;

/**
 * The ids of every job the queues list. A queue keeps its name, and so its ARN, across runs with the same project name,
 * and Batch lists the jobs of a deleted queue of that ARN for a while, so the run's job is the one not listed before
 * the message. Comparing creation times with the local clock missed the job when this machine's clock ran ahead.
 */
const listJobIds = async (clients: Clients, jobQueues: string[]) => {
  const ids = new Set<string>();
  for (const jobQueue of jobQueues) {
    for (const jobStatus of JOB_STATUSES) {
      for (const { jobId } of await clients.batch.listJobs(jobQueue, jobStatus)) if (jobId) ids.add(jobId);
    }
  }
  return ids;
};

/** Waits for the one job the message starts, on any of the stack's queues, and returns it once it ended. */
const awaitJob = async (clients: Clients, jobQueues: string[], earlierJobIds: Set<string>) => {
  const startedAt = Date.now();
  for (;;) {
    for (const jobQueue of jobQueues) {
      for (const jobStatus of ['SUCCEEDED', 'FAILED'] as const) {
        const summary = (await clients.batch.listJobs(jobQueue, jobStatus)).find(
          ({ jobId }) => jobId && !earlierJobIds.has(jobId)
        );
        if (summary?.jobId) {
          const [job] = await clients.batch.describeJobs([summary.jobId]);
          return { job: job!, waitedMs: Date.now() - startedAt };
        }
      }
    }
    assert(Date.now() - startedAt < JOB_TIMEOUT_MS, 'The batch job did not finish within 15 minutes.');
    await sleep(15_000);
  }
};

const readJobLog = async (clients: Clients, logGroupName: string, logStreamName: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const { events = [] } = await clients.logs.send(
        new GetLogEventsCommand({ logGroupName, logStreamName, startFromHead: true })
      );
      if (events.length || attempt >= 12) return events.map(({ message }) => message ?? '');
    } catch (error) {
      if (!isMissing(error, ['ResourceNotFoundException']) || attempt >= 12) throw error;
    }
    await sleep(5000);
  }
};

/** The CLI's failure text, without colors, as the deploy that CloudFormation's validation rejected reported it. */
export const validationFailureGaps = (failureText: string) => {
  const text = stripVTControlCharacters(failureText);
  return EXPECTED_VALIDATION_FAILURE.filter((part) => !text.includes(part));
};

const cleanup = async (clients: Clients, options: CanaryOptions, runner: Runner, stackName: string) => {
  const state = await readState<State>(options, stackName);
  const stack = await describeStack(clients.cloudFormation, stackName);
  const verification: Record<string, unknown> = {};
  if (stack) {
    assertOwned(stack, options.owner, state.stackId);
    mergeOwned(state, describeOwned(await readStackResources(clients.cloudFormation, stackName)));
    await writeState(options, state);
    try {
      const deletion = await runner.runStackCommand('delete', {
        configPath: CONFIG_PATH,
        stage: STAGE,
        awsAccountName: state.awsAccountName,
        invocationId: `batch-canary-delete-${Date.now()}`
      });
      verification.deletedBy = 'stacktape delete';
      verification.deleteDurationMs = deletion.durationMs;
    } catch (cliError) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${String(cliError).slice(0, 600)}`);
      verification.cliDeleteError = String(cliError).slice(0, 600);
      for (const bucket of state.buckets ?? []) {
        await emptyBucket(clients.s3, bucket).catch((error: unknown) => {
          if (!isMissing(error, ['NoSuchBucket', 'NotFound'])) throw error;
        });
      }
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stack.StackId }));
      verification.deletedBy = 'CloudFormation DeleteStack after a failed stacktape delete';
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 40 * 60, minDelay: 10, maxDelay: 30 },
      { StackName: stack.StackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, stackName)), `${stackName} still exists.`);
  verification.stack = 'absent';

  // Batch lists a deleted compute environment or job queue for a while with status DELETED.
  const remainingComputeEnvironments = state.computeEnvironments?.length
    ? (await clients.batch.describeComputeEnvironments(state.computeEnvironments)).filter(
        ({ status }) => status !== 'DELETED'
      )
    : [];
  const remainingJobQueues = state.jobQueues?.length
    ? (await clients.batch.describeJobQueues(state.jobQueues)).filter(({ status }) => status !== 'DELETED')
    : [];
  const leftovers = [
    ...remainingComputeEnvironments.map(
      ({ computeEnvironmentName }) => `compute environment ${computeEnvironmentName}`
    ),
    ...remainingJobQueues.map(({ jobQueueName }) => `job queue ${jobQueueName}`)
  ];
  const checks: [string, string[], (name: string) => Promise<unknown>, string[]][] = [
    [
      'state machine',
      state.stateMachines ?? [],
      (arn) => clients.sfn.send(new DescribeStateMachineCommand({ stateMachineArn: arn })),
      ['StateMachineDoesNotExist']
    ],
    [
      'function',
      state.functionNames ?? [],
      (name) => clients.lambda.send(new GetFunctionCommand({ FunctionName: name })),
      ['ResourceNotFoundException']
    ],
    [
      'role',
      state.roleNames ?? [],
      (name) => clients.iam.send(new GetRoleCommand({ RoleName: name })),
      ['NoSuchEntityException', 'NoSuchEntity']
    ],
    [
      'queue',
      state.queueUrls ?? [],
      (url) => clients.sqs.send(new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['QueueArn'] })),
      ['QueueDoesNotExist', 'AWS.SimpleQueueService.NonExistentQueue']
    ],
    [
      'bucket',
      state.buckets ?? [],
      (name) => clients.s3.send(new HeadBucketCommand({ Bucket: name })),
      ['NotFound', 'NoSuchBucket']
    ],
    [
      'image repository',
      state.repositories ?? [],
      (name) => clients.ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [name] })),
      ['RepositoryNotFoundException']
    ],
    [
      'vpc',
      state.vpcIds ?? [],
      (id) => clients.ec2.send(new DescribeVpcsCommand({ VpcIds: [id] })),
      ['InvalidVpcID.NotFound']
    ]
  ];
  const absent: Record<string, number> = {
    'compute environment': state.computeEnvironments?.length ?? 0,
    'job queue': state.jobQueues?.length ?? 0
  };
  for (const [kind, names, describe, missingErrors] of checks) {
    for (const name of new Set(names)) {
      if (!(await gone(() => describe(name), missingErrors))) leftovers.push(`${kind} ${name}`);
    }
    absent[kind] = new Set(names).size;
  }
  assert(leftovers.length === 0, `Stack deletion left owned resources: ${leftovers.join(', ')}.`);
  verification.stackResourcesAbsent = absent;
  verification.logGroups = await deleteLogGroups(clients.logs, [
    ...(state.logGroupNames ?? []),
    ...(state.functionNames ?? []).map((name) => `/aws/lambda/${name}`)
  ]);
  state.cleanupVerifiedAt = new Date().toISOString();
  await writeState(options, state);
  return verification;
};

export const runBatchJobCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const runner = createSourceCliRunner(options, `${PREFIX}OWNER`);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-batch-job-canary',
    startedAt: new Date().toISOString(),
    region: options.region,
    projectName: options.projectName,
    stage: STAGE,
    stackName,
    owner: options.owner
  };
  const writeReport = () =>
    options.reportFile ? writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`) : Promise.resolve();
  let deployAttempted = false;
  let bodyError: unknown;
  let cleanupError: unknown;

  try {
    const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
    assert(
      identity.Account === options.expectedAccountId,
      `AWS credentials resolved to account ${identity.Account}, not the expected ${options.expectedAccountId}.`
    );
    report.accountId = identity.Account;
    if (cleanupOnly) {
      report.cleanup = await cleanup(clients, options, runner, stackName);
      return;
    }
    assert(await hasDevApiKey(), 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
    const run = options.owner.replace(/[^\w-]/g, '-');
    const awsAccountName = await runner.resolveAwsAccountName(`batch-canary-whoami-${run}`);
    report.awsAccountName = awsAccountName;
    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    const state: State = {
      accountId: options.expectedAccountId,
      region: options.region,
      projectName: options.projectName,
      stage: STAGE,
      stackName,
      owner: options.owner,
      awsAccountName
    };
    await writeState(options, state);

    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    deployAttempted = true;
    const first = await runner.runStackCommand('deploy', {
      configPath: CONFIG_PATH,
      stage: STAGE,
      awsAccountName,
      invocationId: `batch-canary-1-${run}`
    });
    report.deployDurationMs = first.durationMs;
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the first deploy.`);
    assertOwned(stack, options.owner);
    state.stackId = stack.StackId;
    const resources = await readStackResources(clients.cloudFormation, stackName);
    mergeOwned(state, describeOwned(resources));
    await writeState(options, state);
    report.resources = resources.map(({ LogicalResourceId, ResourceType }) => `${LogicalResourceId} ${ResourceType}`);
    report.computeEnvironments = await checkComputeEnvironments(clients, state.computeEnvironments ?? []);
    await writeReport();

    const queueUrl = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.sqsQueue('jobs')
    )?.PhysicalResourceId;
    assert(queueUrl, 'The jobs queue is missing from the stack.');
    const message = `canary-${run}`;
    const earlierJobIds = await listJobIds(clients, state.jobQueues ?? []);
    await clients.sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: message }));
    const { job, waitedMs } = await awaitJob(clients, state.jobQueues ?? [], earlierJobIds);
    const logGroupName = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.batchJobLogGroup('report')
    )?.PhysicalResourceId;
    const repository = job.container?.image?.match(/^\d{12}\.dkr\.ecr\.[\w-]+\.amazonaws\.com\/([^:@]+)/)?.[1];
    assert(repository, `The job's image ${job.container?.image} is not in the account's private ECR.`);
    mergeOwned(state, { repositories: [repository] });
    await writeState(options, state);
    const logStreamName = job.container?.logStreamName;
    report.job = { status: job.status, statusReason: job.statusReason, waitedMs, logStreamName };
    await writeReport();
    assert(job.status === 'SUCCEEDED', `The batch job ended ${job.status}: ${job.statusReason ?? 'no reason'}.`);
    report.job = { ...(report.job as object), logGroupName };
    const log =
      logGroupName && logStreamName
        ? await readJobLog(clients, logGroupName, logStreamName).catch(async (error: unknown) => {
            const { logStreams = [] } = await clients.logs.send(
              new DescribeLogStreamsCommand({ logGroupName, limit: 10 })
            );
            report.job = {
              ...(report.job as object),
              streamsInGroup: logStreams.map(({ logStreamName: name }) => name)
            };
            await writeReport();
            throw error;
          })
        : [];
    const rootFilesystemKb = Number(
      log
        .find((line) => line.startsWith('rootfs '))
        ?.trim()
        .split(/\s+/)[1]
    );
    report.job = { ...(report.job as object), log };
    await writeReport();
    assert(
      log.some((line) => line.startsWith('batch-canary-ok') && line.includes(message)),
      'The job log does not hold the queue message.'
    );
    assert(
      rootFilesystemKb >= MIN_ROOT_FILESYSTEM_KB,
      `The job's root file system has ${rootFilesystemKb} KB, not the launch template's 100 GB.`
    );

    const rejected = await runner
      .runStackCommand('deploy', {
        configPath: CONFIG_PATH,
        stage: STAGE,
        awsAccountName,
        fixture: { [`${PREFIX}BREAK`]: '1' },
        invocationId: `batch-canary-2-${run}`
      })
      .then(
        () => undefined,
        (error: unknown) => String(error)
      );
    report.validationFailure = rejected?.slice(0, 4000) ?? 'the deploy succeeded';
    await writeReport();
    assert(rejected, 'The deploy with an invalid queue succeeded.');
    const gaps = validationFailureGaps(rejected);
    assert(gaps.length === 0, `The validation failure does not name: ${gaps.join('; ')}.`);
    // The CLI reports the failure as soon as the update fails; CloudFormation rolls back afterwards.
    let afterRejection = await describeStack(clients.cloudFormation, stackName);
    for (
      let waited = 0;
      afterRejection?.StackStatus?.endsWith('_IN_PROGRESS') && waited < 10 * 60_000;
      waited += 10_000
    ) {
      await sleep(10_000);
      afterRejection = await describeStack(clients.cloudFormation, stackName);
    }
    report.stackStatusAfterRejection = afterRejection?.StackStatus;
    assert(
      afterRejection?.StackStatus === 'UPDATE_ROLLBACK_COMPLETE',
      `The stack is ${afterRejection?.StackStatus} after the rejected deploy.`
    );
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly && deployAttempted) {
      try {
        report.cleanup = await cleanup(clients, options, runner, stackName);
      } catch (error) {
        cleanupError = error;
        report.cleanup = { failed: String(error), recoveryCommand: cleanupCommand(options, PREFIX, SCRIPT) };
      }
    }
    await runner.dispose();
    report.finishedAt = new Date().toISOString();
    report.result = bodyError || cleanupError ? 'failed' : 'passed';
    if (bodyError) report.error = String(bodyError);
    await writeReport();
    for (const client of Object.values(clients)) client.destroy();
  }

  if (cleanupError) {
    console.error(
      `Cleanup did not finish. Keep ${options.stateFile} and run:\n${cleanupCommand(options, PREFIX, SCRIPT)}`
    );
  }
  if (bodyError && cleanupError) {
    throw new AggregateError([bodyError, cleanupError], 'The canary and its cleanup failed.');
  }
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Batch job canary passed for ${stackName}, and its deletion was verified.`);
};

if (import.meta.main) {
  runBatchJobCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
