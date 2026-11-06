import { createHash } from 'node:crypto';
import { globalStateManager } from '@application-services/global-state-manager';
import { operationReporter } from '@application-services/operation-manager';
import { tuiManager } from '@application-services/tui-manager';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { configManager } from '@domain-services/config-manager';
import type { ResolvedReleaseCommand } from '@domain-services/config-manager/utils/release-commands';
import {
  getReleaseCommandLogGroupName,
  getReleaseImageContainerName
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads/release-command';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getJobName, RELEASE_IMAGE_CONTAINER_NAME } from '@stacktape/naming/workload-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { hashReleasePath } from './hash-path';
import {
  findReleaseTaskOfAnotherOperation,
  releaseTaskStartedBy,
  startReleaseTask,
  stopReleaseTask,
  waitForReleaseTask
} from 'src/aws/ecs-release-task';

const STATE_KEY_PREFIX = 'release-commands';
const LOG_POLL_INTERVAL_MS = 2000;
/** CloudWatch can show the last lines a few seconds after the container ended. */
const LOG_DRAIN_MS = 6000;
const LOG_QUIET_MS = 2500;

type PlannedReleaseCommand = {
  release: ResolvedReleaseCommand;
  key: string;
  due: boolean;
};

let plan: PlannedReleaseCommand[] = [];
let skipped = false;

/**
 * What decides whether the command has anything new to do. With `runWhenChanged`, the listed paths (names, contents and
 * deletions); otherwise the image, because any code change could contain a migration.
 */
const computeKey = async (release: ResolvedReleaseCommand) => {
  const hash = createHash('sha256').update(`${release.command}\0`);
  if (release.runWhenChanged.length) {
    for (const path of [...release.runWhenChanged].sort()) {
      await hashReleasePath({ root: globalStateManager.workingDir, path, hash });
    }
    return hash.digest('hex');
  }
  const { workload, containerName } = release;
  const container = workload.containers.find(({ name }) => name === containerName)!;
  const prebuiltImage =
    container.packaging.type === 'prebuilt-image' ? container.packaging.properties.image : undefined;
  const digest =
    prebuiltImage ??
    packagingManager.getPackagingOutputForJob(
      getJobName({
        workloadName: workload.name,
        workloadType: workload.configParentResourceType,
        containerName
      })
    )?.digest;
  return hash.update(String(digest)).digest('hex');
};

const stateKeyOf = (workloadName: string) => `${STATE_KEY_PREFIX}/${workloadName}.json`;

type ReleaseCommandState = {
  key?: string;
  /** The release image that ran the command on a `js-bundle` service. */
  releaseImage?: { tag: string; digest: string };
};

const readState = async (bucketName: string, workloadName: string): Promise<ReleaseCommandState> => {
  const state = await awsSdkManager.s3
    .getObjectIfExists({ bucketName, s3Key: stateKeyOf(workloadName) })
    .catch(() => undefined);
  if (!state) return {};
  try {
    return JSON.parse(state.body) as ReleaseCommandState;
  } catch {
    return {};
  }
};

const releaseImageJobOf = ({ workload }: ResolvedReleaseCommand) =>
  getJobName({
    workloadName: workload.name,
    workloadType: workload.configParentResourceType,
    containerName: RELEASE_IMAGE_CONTAINER_NAME
  });

const usesReleaseImage = (release: ResolvedReleaseCommand) =>
  getReleaseImageContainerName({ release, containerName: release.containerName }) === RELEASE_IMAGE_CONTAINER_NAME;

const builtReleaseImageOf = (release: ResolvedReleaseCommand) => {
  const jobName = releaseImageJobOf(release);
  const tag = deploymentArtifactManager.getImageUploadInfoForJob({ jobName })?.tag;
  const digest = packagingManager.getPackagingOutputForJob(jobName)?.digest;
  return tag && digest ? { tag, digest } : undefined;
};

/**
 * A deploy builds a `js-bundle` service's release image only when the command is due. A skipped command keeps the image
 * the last run used. That needs the key before anything is packaged, which `runWhenChanged` allows. Without it, the key
 * depends on the bundle, so the image is built on each deploy, and the user is told.
 */
export const decideReleaseImages = async ({
  stackExists,
  bucketName
}: {
  stackExists: boolean;
  bucketName: string;
}): Promise<{ jobsToSkip: string[] }> => {
  const kept = new Map<string, { tag: string; digest: string }>();
  for (const release of configManager.releaseCommands.filter(usesReleaseImage)) {
    if (!release.runWhenChanged.length) {
      tuiManager.warn(
        `${release.workload.nameChain[0]} uses js-bundle packaging, so each code change builds a second image for its release command and runs the command. Set \`runWhenChanged\` to do that only when your migrations change.`
      );
      continue;
    }
    if (!stackExists) continue;
    const { key, releaseImage } = await readState(bucketName, release.workload.name);
    if (releaseImage && key === (await computeKey(release))) kept.set(releaseImageJobOf(release), releaseImage);
  }
  deploymentArtifactManager.setKeptImages(kept);
  return { jobsToSkip: [...kept.keys()] };
};

/** Decides which commands this deploy runs. A command that can't be proven unchanged runs: it has to be idempotent. */
export const planReleaseCommands = async ({
  skip,
  stackExists,
  bucketName
}: {
  skip: boolean;
  stackExists: boolean;
  bucketName: string;
}) => {
  skipped = skip;
  plan = await Promise.all(
    configManager.releaseCommands.map(async (release) => {
      const key = await computeKey(release);
      const lastKey = stackExists ? (await readState(bucketName, release.workload.name)).key : undefined;
      return { release, key, due: !skip && lastKey !== key };
    })
  );
};

export const dueReleaseCommands = () => plan.filter(({ due }) => due);

/**
 * Sets what each custom resource does in this CloudFormation operation. A fast deployment ignores this and runs the due
 * commands itself.
 */
export const applyReleaseCommandPlan = (template: CloudFormationTemplate) => {
  for (const { release, due } of plan) {
    const resource = template.Resources[cfLogicalNames.releaseCommandCustomResource(release.workload.name)];
    const properties = resource?.Properties as { releaseCommand?: { run?: unknown } } | undefined;
    if (!properties?.releaseCommand) continue;
    properties.releaseCommand.run = skipped
      ? 'never'
      : due
        ? { attemptId: globalStateManager.invocationId }
        : 'if-target-changed';
  }
};

/** Written only after the whole deployment succeeded, so a failed deploy runs the command again. */
export const recordCompletedReleaseCommands = async ({ bucketName }: { bucketName: string }) => {
  await Promise.all(
    dueReleaseCommands().map(({ release, key }) =>
      awsSdkManager.s3
        .putObject({
          bucketName,
          s3Key: stateKeyOf(release.workload.name),
          body: JSON.stringify({
            key,
            ...(usesReleaseImage(release) ? { releaseImage: builtReleaseImageOf(release) } : {})
          } satisfies ReleaseCommandState),
          contentType: 'application/json'
        })
        .catch((error: unknown) =>
          // The next deploy runs the command again, which a release command has to allow.
          tuiManager.warn(
            `Could not record that the release command of ${release.workload.nameChain[0]} ran, so the next deploy runs it again: ${error}`
          )
        )
    )
  );
};

/**
 * Prints the output of the commands while they run. A fast deployment and a CloudFormation operation both use it, so the
 * output looks the same.
 */
export const startReleaseCommandLogs = async () => {
  const { stackName } = globalStateManager.targetStack;
  const groups = plan
    .filter(() => !skipped)
    .map(({ release }) => ({
      label: release.workload.nameChain[0],
      logGroupName: getReleaseCommandLogGroupName(release.workload.name, stackName)
    }));
  if (!groups.length) return { stop: async () => {} };
  // The container's clock is AWS's, and this machine's can be off.
  const startTime = (await getAwsSynchronizedTime()).getTime() - 5000;
  const seen = new Set<string>();
  const poll = async () => {
    await Promise.all(
      groups.map(async ({ label, logGroupName }) => {
        let nextToken: string | undefined;
        do {
          const page = await awsSdkManager.observability
            .filterLogEventsPage({ logGroupName, startTime, nextToken })
            // The log group of a first deploy does not exist yet, and a passing error must not fail the deploy.
            .catch(() => ({ events: [], nextToken: undefined }));
          for (const { eventId, message } of page.events) {
            if (eventId && !seen.has(eventId)) {
              seen.add(eventId);
              tuiManager.info(`[release ${label}] ${(message ?? '').trimEnd()}`);
            }
          }
          nextToken = page.nextToken;
        } while (nextToken);
      })
    );
  };
  const stopping = new AbortController();
  const loop = (async () => {
    while (!stopping.signal.aborted) {
      await poll();
      await new Promise((done) => setTimeout(done, LOG_POLL_INTERVAL_MS));
    }
  })();
  return {
    stop: async () => {
      // Nothing ran, so nothing is on its way.
      if (seen.size || dueReleaseCommands().length) {
        const deadline = Date.now() + LOG_DRAIN_MS;
        let lastCount = -1;
        while (Date.now() < deadline && lastCount !== seen.size) {
          lastCount = seen.size;
          await new Promise((done) => setTimeout(done, LOG_QUIET_MS));
        }
      }
      stopping.abort();
      await loop;
    }
  };
};

/**
 * Runs the due commands from this machine, for a deployment that doesn't go through CloudFormation. The stack lock takes
 * the place of CloudFormation's one update at a time. An interrupted CLI leaves the task running; the next deploy refuses
 * to start until it has finished.
 */
export const runReleaseCommandsDirectly = async ({
  registerTaskDefinition
}: {
  /** Registers the release task definition with this deploy's image and returns the network the task runs in. */
  registerTaskDefinition: (release: ResolvedReleaseCommand) => Promise<{
    taskDefinitionArn: string;
    cluster: string;
    awsvpcConfiguration?: Parameters<typeof startReleaseTask>[0]['awsvpcConfiguration'];
    capacityProviderStrategy?: Parameters<typeof startReleaseTask>[0]['capacityProviderStrategy'];
  }>;
}) => {
  const due = dueReleaseCommands();
  if (!due.length) return;
  const { stackName } = globalStateManager.targetStack;
  const ecs = awsSdkManager.ecs.client();
  await operationReporter.startEvent({
    eventType: 'RUN_RELEASE_COMMAND',
    description: `Running release command${due.length === 1 ? '' : 's'}`
  });
  const logs = await startReleaseCommandLogs();
  const startedBy = releaseTaskStartedBy(globalStateManager.invocationId);
  try {
    for (const { release } of due) {
      const { workload, containerName, timeoutSeconds } = release;
      const name = workload.nameChain[0];
      const { taskDefinitionArn, cluster, awsvpcConfiguration, capacityProviderStrategy } =
        await registerTaskDefinition(release);
      const otherTask = await findReleaseTaskOfAnotherOperation({
        ecs,
        cluster,
        family: awsResourceNames.ecsReleaseTaskDefinitionFamily(workload.name, stackName),
        startedBy
      });
      if (otherTask) {
        throw new ExpectedError(
          'STACK',
          `An earlier release command of ${name} is still running (task ${otherTask}).`,
          ['Wait for it to finish or stop it, then deploy again.']
        );
      }
      const taskArn = await startReleaseTask({
        ecs,
        cluster,
        taskDefinition: taskDefinitionArn,
        startedBy,
        clientToken: `${globalStateManager.invocationId}-${workload.name}`.slice(0, 64),
        awsvpcConfiguration,
        capacityProviderStrategy
      });
      const result = await waitForReleaseTask({
        ecs,
        cluster,
        taskArn,
        containerName,
        stopWaitingAtMs: Date.now() + timeoutSeconds * 1000
      });
      if (result.outcome === 'succeeded') continue;
      if (result.outcome === 'still-running') {
        await stopReleaseTask({
          ecs,
          cluster,
          taskArn,
          reason: `The release command exceeded its ${timeoutSeconds} s timeout.`
        });
      }
      throw new ExpectedError(
        'STACK',
        result.outcome === 'failed'
          ? `${name}: ${result.message}`
          : `${name}: The release command exceeded its ${timeoutSeconds} s timeout.`,
        ['No function or service was changed. Fix the problem and deploy again.']
      );
    }
  } finally {
    await logs.stop();
  }
  await operationReporter.finishEvent({ eventType: 'RUN_RELEASE_COMMAND', finalMessage: 'Release command finished' });
};
