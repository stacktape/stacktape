import type {
  ServiceLambdaResolver,
  StpServiceCustomResourceReleaseCommandProps
} from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { CloudFormationClient, DescribeStacksCommand, StackStatus } from '@aws-sdk/client-cloudformation';
import { DescribeTaskDefinitionCommand, ECSClient } from '@aws-sdk/client-ecs';
import { consoleLinks } from '@stacktape/naming/console-links';
import {
  findReleaseTaskOfAnotherOperation,
  releaseTaskStartedBy,
  startReleaseTask,
  stopReleaseTask,
  waitForReleaseTask
} from 'src/aws/ecs-release-task';

const ROLLBACK_STATES: string[] = [
  StackStatus.ROLLBACK_IN_PROGRESS,
  StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
  StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS
];

/** Enough time to save the wait for the next invocation, or to stop the task and answer CloudFormation. */
const LAMBDA_TIME_RESERVE_MS = 60_000;
/** A cancelled stack update shows up in the stack status. Reading it on each poll would be needlessly many calls. */
const STACK_STATUS_CHECK_INTERVAL_MS = 15_000;

type ChainState = { taskArn: string; deadlineMs: number };

const cfClient = new CloudFormationClient({});
const ecsClient = new ECSClient({});

const physicalIdOf = (props: StpServiceCustomResourceReleaseCommandProps) =>
  `stp-release-command-${String(props.taskDefinition).split('/').pop()?.split(':')[0]}`;

const failure = (message: string, physicalResourceId: string, props: StpServiceCustomResourceReleaseCommandProps) =>
  Object.assign(
    new Error(`${message}\n\nCommand logs:\n${consoleLinks.logGroup(process.env.AWS_REGION, props.logGroupName)}`),
    { physicalResourceId }
  );

const stackIsRollingBack = async () => {
  const stack = (await cfClient.send(new DescribeStacksCommand({ StackName: process.env.STACK_NAME }))).Stacks?.[0];
  return ROLLBACK_STATES.includes(stack?.StackStatus ?? '');
};

/** What the command sees of the target. The image is left out: a code change alone is decided by the CLI. */
const targetOf = async (taskDefinition: string) => {
  const definition = (await ecsClient.send(new DescribeTaskDefinitionCommand({ taskDefinition }))).taskDefinition;
  return JSON.stringify(
    (definition?.containerDefinitions ?? [])
      .map(({ name, environment = [], secrets = [] }) => ({
        name,
        environment: [...environment].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        secrets: [...secrets].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  );
};

const targetChanged = async (current: string, previous: string | undefined) => {
  if (!previous || previous === current) return false;
  // A revision that no longer exists still describes; only a failed read means the comparison is impossible, and
  // running the command on a target that may have changed is the safe answer.
  try {
    return (await targetOf(current)) !== (await targetOf(previous));
  } catch (error) {
    console.warn(`Could not compare ${previous} with ${current}: ${error}. Running the command.`);
    return true;
  }
};

/**
 * Runs the release command in a one-off task and answers CloudFormation when it finished. Workloads depend on this
 * resource, so none of them changes before that. A rollback or a stack delete never runs it: an old command must not
 * run against a newer database.
 */
export const releaseCommand: ServiceLambdaResolver<StpServiceCustomResourceReleaseCommandProps> = async (
  props,
  previousProps,
  operation,
  existingPhysicalId,
  lambdaContext,
  invocation
) => {
  const physicalResourceId = existingPhysicalId ?? physicalIdOf(props);
  const done = { data: {}, physicalResourceId };
  if (operation === 'Delete' || props.run === 'never') return done;

  const cluster = String(props.cluster);
  const taskDefinition = String(props.taskDefinition);
  const timeoutSeconds = Number(props.timeoutSeconds);
  const chained = invocation?.chainState as ChainState | undefined;

  let state: ChainState;
  if (chained) {
    state = chained;
  } else {
    if (await stackIsRollingBack()) {
      console.info('The stack is rolling back. The release command does not run.');
      return done;
    }
    if (
      operation === 'Update' &&
      props.run === 'if-target-changed' &&
      !(await targetChanged(taskDefinition, previousProps?.taskDefinition as string | undefined))
    ) {
      console.info('The release command has nothing new to do.');
      return done;
    }

    const requestId = invocation?.requestId ?? physicalResourceId;
    const startedBy = releaseTaskStartedBy(requestId);
    const family = taskDefinition.split('/').pop()!.split(':')[0]!;
    const otherTask = await findReleaseTaskOfAnotherOperation({ ecs: ecsClient, cluster, family, startedBy });
    if (otherTask) {
      throw failure(
        `An earlier release command is still running (task ${otherTask}). Wait for it to finish or stop it, then deploy again.`,
        physicalResourceId,
        props
      );
    }
    let taskArn: string;
    try {
      taskArn = await startReleaseTask({
        ecs: ecsClient,
        cluster,
        taskDefinition,
        startedBy,
        clientToken: requestId,
        capacityProviderStrategy: props.capacityProviderStrategy?.map(({ capacityProvider, weight }) => ({
          capacityProvider: String(capacityProvider),
          weight: Number(weight)
        })),
        awsvpcConfiguration: props.awsvpcConfiguration
          ? {
              subnets: props.awsvpcConfiguration.subnets as string[],
              securityGroups: props.awsvpcConfiguration.securityGroups as string[],
              assignPublicIp: props.awsvpcConfiguration.assignPublicIp
            }
          : undefined
      });
    } catch (error) {
      throw failure(error instanceof Error ? error.message : String(error), physicalResourceId, props);
    }
    console.info(`Started release command task ${taskArn}.`);
    state = { taskArn, deadlineMs: Date.now() + timeoutSeconds * 1000 };
  }

  let lastStatusCheck = Date.now();
  let rollingBack = false;
  const remainingLambdaMs = lambdaContext?.getRemainingTimeInMillis() ?? 840_000;
  const lambdaLimitMs = Date.now() + remainingLambdaMs - LAMBDA_TIME_RESERVE_MS;
  const result = await waitForReleaseTask({
    ecs: ecsClient,
    cluster,
    taskArn: state.taskArn,
    containerName: props.containerName,
    stopWaitingAtMs: Math.min(lambdaLimitMs, state.deadlineMs),
    shouldStopWaiting: async () => {
      if (Date.now() - lastStatusCheck < STACK_STATUS_CHECK_INTERVAL_MS) return false;
      lastStatusCheck = Date.now();
      rollingBack = await stackIsRollingBack();
      return rollingBack;
    }
  });

  if (result.outcome === 'succeeded') return done;
  if (result.outcome === 'failed') throw failure(result.message, physicalResourceId, props);
  if (rollingBack) {
    // The update was cancelled. The rollback should not wait. Stopping a running migration can leave the database half
    // migrated, so the task finishes on its own, and the next deploy refuses to start until it has.
    console.warn(`The stack is rolling back. Release command task ${state.taskArn} keeps running.`);
    return done;
  }
  if (Date.now() >= state.deadlineMs) {
    await stopReleaseTask({
      ecs: ecsClient,
      cluster,
      taskArn: state.taskArn,
      reason: `The release command exceeded its ${timeoutSeconds} s timeout.`
    });
    throw failure(`The release command exceeded its ${timeoutSeconds} s timeout.`, physicalResourceId, props);
  }
  return { ...done, chainInvocation: true, chainState: state };
};
