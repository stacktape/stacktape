import { BatchClient, DescribeJobDefinitionsCommand } from '@aws-sdk/client-batch';
import { createFetchHandler } from 'src/aws/fetch-handler';

/** The AWS Batch job a step of a batch job's state machine submitted, as Batch reports it. */
export type BatchJobDetails = {
  jobId: string;
  status?: string;
  statusReason?: string;
  /** The CloudWatch log stream of the job's container, in the job's log group. */
  logStream?: string;
  exitCode?: number;
  /** Why the container stopped, such as an image that could not be pulled. */
  containerReason?: string;
  startedAt?: string;
  stoppedAt?: string;
};

type HistoryEvent = {
  type?: string;
  taskSubmittedEventDetails?: { resourceType?: string; output?: string };
  taskSucceededEventDetails?: { resourceType?: string; output?: string };
  taskFailedEventDetails?: { resourceType?: string; cause?: string };
};

const readJobId = (json: string | undefined): string | undefined => {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as { JobId?: unknown };
    return typeof parsed.JobId === 'string' ? parsed.JobId : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The ID of the Batch job that a state machine execution submitted last, from its history, newest event first. The
 * execution's own status says only that the state machine waits: the job can be queued for capacity, pulling its image
 * or running the application.
 */
export const findSubmittedBatchJobId = (eventsNewestFirst: HistoryEvent[]): string | undefined => {
  for (const event of eventsNewestFirst) {
    const details = event.taskSubmittedEventDetails ?? event.taskSucceededEventDetails;
    if (details?.resourceType === 'batch') {
      const jobId = readJobId(details.output);
      if (jobId) return jobId;
    }
    // A failed job's cause is the job description, with its ID.
    if (event.taskFailedEventDetails?.resourceType === 'batch') {
      const jobId = readJobId(event.taskFailedEventDetails.cause);
      if (jobId) return jobId;
    }
  }
  return undefined;
};

const toIso = (milliseconds: unknown) =>
  typeof milliseconds === 'number' ? new Date(milliseconds).toISOString() : undefined;

/** What diagnosing a job needs from Batch's `DescribeJobs` entry for it. */
export const describeBatchJob = (job: Record<string, unknown>): BatchJobDetails => {
  const container = (job.container ?? {}) as { logStreamName?: string; exitCode?: number; reason?: string };
  const details: BatchJobDetails = {
    jobId: String(job.jobId),
    status: job.status as string | undefined,
    statusReason: job.statusReason as string | undefined,
    logStream: container.logStreamName,
    exitCode: container.exitCode,
    containerReason: container.reason,
    startedAt: toIso(job.startedAt),
    stoppedAt: toIso(job.stoppedAt)
  };
  return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined)) as BatchJobDetails;
};

/**
 * The environment a deployed batch job's container gets from its job definition, as AWS has it. Returns null when the
 * job definition does not exist.
 */
export const getBatchJobEnvVars = async ({
  jobDefinitionArn,
  region,
  credentials
}: {
  jobDefinitionArn: string;
  region: string;
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
}): Promise<Record<string, string> | null> => {
  const client = new BatchClient({ region, credentials, requestHandler: createFetchHandler() });
  try {
    const { jobDefinitions } = await client.send(
      new DescribeJobDefinitionsCommand({ jobDefinitions: [jobDefinitionArn] })
    );
    const [definition] = jobDefinitions ?? [];
    if (!definition) return null;
    return Object.fromEntries(
      (definition.containerProperties?.environment ?? []).flatMap(({ name, value }) =>
        name ? [[name, value ?? '']] : []
      )
    );
  } finally {
    client.destroy();
  }
};

/** The AWS Batch queues and job definitions a stack deployed, from its resource list. */
export type BatchScope = {
  queueArns: Set<string>;
  jobDefinitionNames: Set<string>;
  region?: string;
  accountId?: string;
};

const BATCH_ARN = /^arn:aws[\w-]*:batch:([\w-]+):(\d{12}):(job-queue|job-definition)\/([^:/]+)(?::(\d+))?$/;

/**
 * The scope of Batch reads for a stack: its job queues by ARN and its job definitions by name, all in the region and
 * account of the stack. Physical IDs of `AWS::Batch::JobQueue` are queue ARNs, those of `AWS::Batch::JobDefinition` are
 * definition ARNs with a revision.
 */
export const getBatchScope = (stackResources: { ResourceType?: string; PhysicalResourceId?: string }[]): BatchScope => {
  const scope: BatchScope = { queueArns: new Set(), jobDefinitionNames: new Set() };
  for (const { ResourceType, PhysicalResourceId } of stackResources) {
    const match = PhysicalResourceId && BATCH_ARN.exec(PhysicalResourceId);
    if (!match) continue;
    const [, region, accountId, kind, name] = match;
    scope.region = region;
    scope.accountId = accountId;
    if (ResourceType === 'AWS::Batch::JobQueue' && kind === 'job-queue') scope.queueArns.add(PhysicalResourceId!);
    if (ResourceType === 'AWS::Batch::JobDefinition' && kind === 'job-definition') scope.jobDefinitionNames.add(name);
  }
  return scope;
};

/** A queue of the stack, by name or by ARN in the stack's region and account. */
const isStackQueue = (queue: unknown, scope: BatchScope) =>
  typeof queue === 'string' &&
  [...scope.queueArns].some(
    (arn) => arn === queue || (!queue.startsWith('arn:') && arn.endsWith(`:job-queue/${queue}`))
  );

/** A job definition of the stack: its name, `name:revision`, or its ARN in the stack's region and account. */
const isStackJobDefinition = (definition: unknown, scope: BatchScope) => {
  if (typeof definition !== 'string') return false;
  if (definition.startsWith('arn:')) {
    const match = BATCH_ARN.exec(definition);
    return Boolean(
      match &&
      match[3] === 'job-definition' &&
      match[1] === scope.region &&
      match[2] === scope.accountId &&
      scope.jobDefinitionNames.has(match[4])
    );
  }
  const [name, revision, ...rest] = definition.split(':');
  return !rest.length && (revision === undefined || /^\d+$/.test(revision)) && scope.jobDefinitionNames.has(name);
};

/**
 * Batch reads are scoped to the stack's own queues, job definitions and jobs. IAM cannot scope them (Batch's describe
 * and list actions accept only `*`), and the caller's credentials can be the developer's own, so this is the scope.
 * Returns why a call is refused, or how to filter its response: `DescribeJobs` names jobs by ID only, so jobs outside
 * the stack's queues and job definitions are left out of its result.
 */
export const scopeBatchCall = ({
  command,
  input,
  scope
}: {
  command: string;
  input: Record<string, unknown>;
  scope: BatchScope;
}): { refusal: string } | { filterResponse?: (data: unknown) => unknown } => {
  const operation = command.endsWith('Command') ? command.slice(0, -'Command'.length) : command;
  if (operation === 'ListJobs') {
    return isStackQueue(input.jobQueue, scope)
      ? {}
      : { refusal: 'ListJobs needs jobQueue: one of the job queues of this stack (status lists them as jobQueue).' };
  }
  if (operation === 'DescribeJobDefinitions') {
    const definitions = Array.isArray(input.jobDefinitions) ? input.jobDefinitions : [];
    const scoped = input.jobDefinitionName
      ? !definitions.length && isStackJobDefinition(input.jobDefinitionName, scope)
      : definitions.length > 0 && definitions.every((definition) => isStackJobDefinition(definition, scope));
    if (!scoped) {
      return {
        refusal:
          'DescribeJobDefinitions needs jobDefinitionName or jobDefinitions of this stack (status lists them as jobDefinitionArn).'
      };
    }
    return {
      filterResponse: (data) => {
        const { jobDefinitions, ...rest } = (data ?? {}) as { jobDefinitions?: { jobDefinitionArn?: unknown }[] };
        return {
          ...rest,
          jobDefinitions: (jobDefinitions ?? []).filter(({ jobDefinitionArn }) =>
            isStackJobDefinition(jobDefinitionArn, scope)
          )
        };
      }
    };
  }
  if (operation === 'DescribeJobs') {
    return {
      filterResponse: (data) => {
        const { jobs, ...rest } = (data ?? {}) as { jobs?: { jobQueue?: unknown; jobDefinition?: unknown }[] };
        return {
          ...rest,
          jobs: (jobs ?? []).filter(
            ({ jobQueue, jobDefinition }) => isStackQueue(jobQueue, scope) && isStackJobDefinition(jobDefinition, scope)
          )
        };
      }
    };
  }
  return {};
};
