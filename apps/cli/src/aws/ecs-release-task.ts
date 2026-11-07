import {
  DescribeTasksCommand,
  ListTasksCommand,
  RunTaskCommand,
  StopTaskCommand,
  type CapacityProviderStrategyItem,
  type AwsVpcConfiguration,
  type ECSClient
} from '@aws-sdk/client-ecs';

/**
 * The one-off task of a release command. The CloudFormation custom resource and a fast deployment both run it through
 * these functions, so they behave the same. Both only need these ECS calls.
 */
type EcsSender = Pick<ECSClient, 'send'>;

/** ECS allows 128 characters in `startedBy`. The request or invocation ID identifies who started a task. */
export const releaseTaskStartedBy = (operationId: string) => `stp-release:${operationId}`.slice(0, 128);

export const RELEASE_TASK_POLL_INTERVAL_MS = 2000;
/** A task can be missing from `DescribeTasks` right after `RunTask`. */
const MISSING_TASK_POLLS_ALLOWED = 15;
const DESCRIBE_TASKS_LIMIT = 100;

/**
 * A task of this family that another operation started and whose command has not ended. CloudFormation allows one update
 * at a time, and the stack lock covers fast deployments, but a cancelled operation leaves its task running. Running a
 * second migration next to it could corrupt the database.
 *
 * A stopped task's desired status is STOPPED while its container still runs through its stop timeout, so both lists count.
 * A task whose command ended is no reason to wait: ECS takes about 20 more seconds to report it as stopped.
 */
export const findReleaseTaskOfAnotherOperation = async ({
  ecs,
  cluster,
  family,
  startedBy,
  containerName
}: {
  ecs: EcsSender;
  cluster: string;
  family: string;
  startedBy: string;
  containerName: string;
}): Promise<string | undefined> => {
  const taskArns: string[] = [];
  for (const desiredStatus of ['RUNNING', 'STOPPED'] as const) {
    let nextToken: string | undefined;
    do {
      const page = await ecs.send(new ListTasksCommand({ cluster, family, desiredStatus, nextToken }));
      taskArns.push(...(page.taskArns ?? []));
      nextToken = page.nextToken;
    } while (nextToken);
  }
  for (let index = 0; index < taskArns.length; index += DESCRIBE_TASKS_LIMIT) {
    const { tasks } = await ecs.send(
      new DescribeTasksCommand({ cluster, tasks: taskArns.slice(index, index + DESCRIBE_TASKS_LIMIT) })
    );
    const blocking = tasks?.find(
      (task) =>
        task.startedBy !== startedBy &&
        task.lastStatus !== 'STOPPED' &&
        task.containers?.find(({ name }) => name === containerName)?.exitCode === undefined
    );
    if (blocking) return blocking.taskArn;
  }
  return undefined;
};

export const startReleaseTask = async ({
  ecs,
  cluster,
  taskDefinition,
  startedBy,
  clientToken,
  capacityProviderStrategy,
  awsvpcConfiguration
}: {
  ecs: EcsSender;
  cluster: string;
  taskDefinition: string;
  startedBy: string;
  /** The same token returns the same task, so a repeated delivery of a request cannot start a second one. */
  clientToken: string;
  capacityProviderStrategy?: CapacityProviderStrategyItem[];
  awsvpcConfiguration?: AwsVpcConfiguration;
}): Promise<string> => {
  const { tasks, failures } = await ecs.send(
    new RunTaskCommand({
      cluster,
      taskDefinition,
      count: 1,
      startedBy,
      clientToken,
      enableECSManagedTags: true,
      propagateTags: 'TASK_DEFINITION',
      ...(capacityProviderStrategy?.length
        ? { capacityProviderStrategy }
        : { launchType: 'FARGATE', platformVersion: 'LATEST' }),
      ...(awsvpcConfiguration ? { networkConfiguration: { awsvpcConfiguration } } : {})
    })
  );
  const taskArn = tasks?.[0]?.taskArn;
  if (!taskArn) {
    const reasons = (failures ?? []).map(({ reason, detail }) => [reason, detail].filter(Boolean).join(': '));
    throw new Error(`ECS did not start the release command task: ${reasons.join('; ') || 'no reason given'}.`);
  }
  return taskArn;
};

export type ReleaseTaskResult =
  | { outcome: 'succeeded' }
  | { outcome: 'failed'; message: string }
  /** `stopWaitingAtMs` passed, and the task has not finished. */
  | { outcome: 'still-running' };

export const waitForReleaseTask = async ({
  ecs,
  cluster,
  taskArn,
  containerName,
  stopWaitingAtMs,
  now = Date.now,
  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  pollIntervalMs = RELEASE_TASK_POLL_INTERVAL_MS,
  shouldStopWaiting
}: {
  ecs: EcsSender;
  cluster: string;
  taskArn: string;
  containerName: string;
  stopWaitingAtMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
  pollIntervalMs?: number;
  /** Checked on each poll. It ends the wait with `still-running`. */
  shouldStopWaiting?: () => Promise<boolean> | boolean;
}): Promise<ReleaseTaskResult> => {
  let missingPolls = 0;
  while (now() < stopWaitingAtMs) {
    const { tasks } = await ecs.send(new DescribeTasksCommand({ cluster, tasks: [taskArn] }));
    const task = tasks?.[0];
    if (!task) {
      missingPolls += 1;
      if (missingPolls > MISSING_TASK_POLLS_ALLOWED) {
        return { outcome: 'failed', message: `ECS no longer knows the release command task ${taskArn}.` };
      }
    } else {
      missingPolls = 0;
      const container = task.containers?.find(({ name }) => name === containerName);
      // ECS reports the exit code before the task reaches STOPPED, about 20 seconds earlier.
      if (container?.exitCode === 0) return { outcome: 'succeeded' };
      if (container?.exitCode !== undefined) {
        return { outcome: 'failed', message: `The release command failed with exit code ${container.exitCode}.` };
      }
      if (task.lastStatus === 'STOPPED') {
        const reason = [task.stoppedReason, container?.reason].filter(Boolean).join(': ');
        return {
          outcome: 'failed',
          message: `The release command task stopped before the command finished: ${reason || 'no reason given'}.`
        };
      }
    }
    if (await shouldStopWaiting?.()) return { outcome: 'still-running' };
    await sleep(pollIntervalMs);
  }
  return { outcome: 'still-running' };
};

export const stopReleaseTask = async ({
  ecs,
  cluster,
  taskArn,
  reason
}: {
  ecs: EcsSender;
  cluster: string;
  taskArn: string;
  reason: string;
}) => {
  await ecs.send(new StopTaskCommand({ cluster, task: taskArn, reason: reason.slice(0, 255) }));
};
