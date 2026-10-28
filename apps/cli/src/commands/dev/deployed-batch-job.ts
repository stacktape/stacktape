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

const belongsToStack = (nameOrArn: unknown, stackName: string, kind: 'job-queue' | 'job-definition') =>
  typeof nameOrArn === 'string' &&
  (nameOrArn.startsWith(`${stackName}-`) || nameOrArn.includes(`:${kind}/${stackName}-`));

/**
 * Batch reads are scoped to the stage's own queues, job definitions and jobs. IAM cannot scope them (Batch's describe
 * and list actions accept only `*`), and the caller's credentials can be the developer's own, so this is the scope.
 * Returns why a call is refused, or how to filter its response: `DescribeJobs` names jobs by ID only, so the jobs of
 * other queues are left out of its result.
 */
export const scopeBatchCall = ({
  command,
  input,
  stackName
}: {
  command: string;
  input: Record<string, unknown>;
  stackName: string;
}): { refusal: string } | { filterResponse?: (data: unknown) => unknown } => {
  const operation = command.endsWith('Command') ? command.slice(0, -'Command'.length) : command;
  if (operation === 'ListJobs') {
    return belongsToStack(input.jobQueue, stackName, 'job-queue')
      ? {}
      : { refusal: `ListJobs needs jobQueue: one of the job queues of ${stackName} (status lists them as jobQueue).` };
  }
  if (operation === 'DescribeJobDefinitions') {
    const definitions = Array.isArray(input.jobDefinitions) ? input.jobDefinitions : [];
    const scoped = input.jobDefinitionName
      ? belongsToStack(input.jobDefinitionName, stackName, 'job-definition') && !definitions.length
      : definitions.length > 0 &&
        definitions.every((definition) => belongsToStack(definition, stackName, 'job-definition'));
    return scoped
      ? {}
      : {
          refusal: `DescribeJobDefinitions needs jobDefinitionName or jobDefinitions of ${stackName} (status lists them as jobDefinitionArn).`
        };
  }
  if (operation === 'DescribeJobs') {
    return {
      filterResponse: (data) => {
        const { jobs, ...rest } = (data ?? {}) as { jobs?: { jobQueue?: unknown }[] };
        return {
          ...rest,
          jobs: (jobs ?? []).filter(({ jobQueue }) => belongsToStack(jobQueue, stackName, 'job-queue'))
        };
      }
    };
  }
  return {};
};
