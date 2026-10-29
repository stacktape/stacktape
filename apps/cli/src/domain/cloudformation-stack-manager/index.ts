import { publicCommandName } from '../../config/cli/public-names';
import { codeSwapIntegration } from '@domain-services/code-swap/integration';
import type { IamRoleStatement } from '@domain-services/cloudformation-stack-manager/types';
import type {
  AwsCallerIdentity,
  EnrichedStackResourceInfo,
  StackActionType,
  StackDetails
} from '@domain-services/cloudformation-stack-manager/types';
import type {
  CloudFormationProgressDetail,
  CloudFormationResourceProgress,
  LoggableEventType,
  ProgressReporter as ProgressLogger
} from '@application-services/operation-manager';
import type {
  Capability,
  RollbackConfiguration,
  StackEvent,
  StackResourceSummary
} from '@aws-sdk/client-cloudformation';
import type { MonitoredStackEvent } from 'src/aws/cloudformation-stacks';
import type { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { ResourceImpact } from '@aws-cdk/cloudformation-diff';
import type { Tag } from '@aws-sdk/client-ecs';
import { operationReporter } from '@application-services/operation-manager';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { OnFailure, ResourceStatus, StackStatus } from '@aws-sdk/client-cloudformation';
import { isAgentMode } from 'src/commands/_utils/agent-mode';
import { DeploymentRolloutState } from '@aws-sdk/client-ecs';
import { MONITORING_FREQUENCY_SECONDS } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToAlarm } from '@domain-services/config-manager/utils/alarms';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import {
  STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS,
  STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS,
  STACK_OPERATION_IN_PROGRESS_STATUS
} from 'src/aws/cloudformation';
import {
  EcsServiceDeploymentStatusPoller,
  isEcsServiceCreateOrUpdateCloudformationEvent
} from 'src/aws/ecs-deployment-monitoring';
import {
  isLambdaAliasProvisionedConcurrencyEvent,
  LambdaProvisionedConcurrencyPoller
} from 'src/aws/lambda-provisioned-concurrency-monitoring';
import { arns } from '@stacktape/naming/arns';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { consoleLinks } from '@stacktape/naming/console-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { wait } from '@utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import type { EarlyDataStoreDelete } from './early-data-store-deletes';
import {
  describeEarlyDataStoreDelete,
  planEarlyDataStoreDeletes,
  startEarlyDataStoreDeletes
} from './early-data-store-deletes';
import compose from '@utils/compose';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { ExpectedError } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { getNextVersionString, getNumericVersion } from '@utils/versioning';
import isEqual from 'lodash/isEqual';
import uniqBy from 'lodash/uniqBy';
import { getEstimatedRemainingPercent, getStackDeploymentEstimate } from './duration-estimation';
import { isFailedStackStatus, resolveAutoRollback } from './auto-rollback';
import { isFirstDeployOfStack } from './first-deploy';
import { getPlannedResources } from './progress-plan';
import {
  cfFailedEventHandlers,
  formatPreDeploymentValidationErrors,
  getHintsAfterStackFailureOperation,
  isPreDeploymentValidationFailure
} from './utils';
import type { CloudformationTag } from '@stacktape/config/shared';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';

/** Convert CloudFormation stack status to human-readable form */
const getHumanReadableStackStatus = (status?: string): string => {
  if (!status) return 'unknown';
  const statusMap: Record<string, string> = {
    CREATE_IN_PROGRESS: 'creating',
    DELETE_IN_PROGRESS: 'deleting',
    UPDATE_IN_PROGRESS: 'updating',
    ROLLBACK_IN_PROGRESS: 'rolling back',
    UPDATE_ROLLBACK_IN_PROGRESS: 'rolling back',
    UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS: 'rollback cleanup',
    UPDATE_COMPLETE_CLEANUP_IN_PROGRESS: 'deleting old resources of the last update',
    REVIEW_IN_PROGRESS: 'review',
    IMPORT_IN_PROGRESS: 'importing',
    IMPORT_ROLLBACK_IN_PROGRESS: 'import rollback'
  };
  return statusMap[status] || status.toLowerCase().replace(/_/g, ' ');
};

const formatChangeSummary = ({
  cfStackAction,
  templateDiff,
  createResourcesCount,
  deleteResourcesCount
}: {
  cfStackAction: 'create' | 'update' | 'delete' | 'rollback';
  templateDiff?: ReturnType<typeof templateManager.getOldTemplateDiff>;
  createResourcesCount?: number;
  deleteResourcesCount?: number;
}) => {
  const emptyLists = { created: [], updated: [], deleted: [] as string[] };
  if (cfStackAction === 'create') {
    return {
      text: `Creating ${createResourcesCount || 0} resources`,
      counts: { created: createResourcesCount || 0, updated: 0, deleted: 0 },
      lists: emptyLists
    };
  }
  if (cfStackAction === 'delete' || cfStackAction === 'rollback') {
    return {
      text: `Deleting ${deleteResourcesCount || 0} resources`,
      counts: { created: 0, updated: 0, deleted: deleteResourcesCount || 0 },
      lists: emptyLists
    };
  }
  if (!templateDiff) {
    return {
      text: 'Updating resources',
      counts: { created: 0, updated: 0, deleted: 0 },
      lists: emptyLists
    };
  }

  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];
  templateDiff.resources?.forEachDifference((logicalId, diff) => {
    if (diff.isAddition) added.push(logicalId);
    else if (diff.isRemoval) removed.push(logicalId);
    else if (diff.isUpdate) updated.push(logicalId);
  });
  return {
    text: 'Updating resources',
    counts: { created: added.length, updated: updated.length, deleted: removed.length },
    lists: { created: added, updated, deleted: removed }
  };
};

const formatResourceList = (resources: string[], maxItems: number) => {
  if (!resources.length) return 'none';
  const visible = resources.slice(0, maxItems);
  const overflow = resources.length - visible.length;
  return `${visible.join(', ')}${overflow > 0 ? ` +${overflow}` : ''}`;
};

type StackProgressUpdate = {
  message: string;
  detail?: CloudFormationProgressDetail;
};

/**
 * The deletions that failed in the cleanup of the stack's last update, newest first, one per resource. `events` are the
 * stack's events since that update started.
 */
export const findFailedCleanupDeletions = (events: MonitoredStackEvent[]): MonitoredStackEvent[] => {
  const isStackEvent = (event: MonitoredStackEvent) =>
    event.ResourceType === 'AWS::CloudFormation::Stack' && event.StackName === event.LogicalResourceId;
  const cleanupStart = events
    .filter(
      (event) =>
        isStackEvent(event) && (event.ResourceStatus as string) === StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS
    )
    .reduce<MonitoredStackEvent | undefined>(
      (latest, event) => (!latest || event.Timestamp > latest.Timestamp ? event : latest),
      undefined
    );
  if (!cleanupStart) return [];
  const latestDeletionEvents = uniqBy(
    events
      .filter(
        (event) =>
          !isStackEvent(event) &&
          (event.ResourceStatus === ResourceStatus.DELETE_FAILED ||
            event.ResourceStatus === ResourceStatus.DELETE_COMPLETE) &&
          event.Timestamp >= cleanupStart.Timestamp
      )
      .toSorted((first, second) => second.Timestamp.getTime() - first.Timestamp.getTime()),
    ({ LogicalResourceId }) => LogicalResourceId
  );
  return latestDeletionEvents.filter(({ ResourceStatus: status }) => status === ResourceStatus.DELETE_FAILED);
};

/** The deployment bucket object that lists the failed cleanup deletions already reported to the user. */
export const REPORTED_CLEANUP_FAILURES_S3_KEY = 'reported-cleanup-failures.json';

/**
 * The failed cleanup deletions not reported before. Fast deploys leave no stack events, so without this record every
 * command until the next stack update would report the same failures again. The record lives in the stack's deployment
 * bucket, so it is shared by every machine and CI runner that deploys the stack. Best effort: when the record cannot be
 * read, every failure is reported.
 */
export const takeUnreportedCleanupFailures = async ({
  failures,
  deploymentBucketName
}: {
  failures: MonitoredStackEvent[];
  deploymentBucketName: string | undefined;
}): Promise<MonitoredStackEvent[]> => {
  if (!failures.length || !deploymentBucketName) return failures;
  const location = { bucketName: deploymentBucketName, s3Key: REPORTED_CLEANUP_FAILURES_S3_KEY };
  const reportedEventIds = await awsSdkManager.s3
    .getObjectText(location)
    .then((text) => {
      const parsed: unknown = JSON.parse(text);
      return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    })
    .catch(() => new Set<string>());
  const unreported = failures.filter(({ EventId }) => !reportedEventIds.has(EventId));
  if (unreported.length) {
    // Only the last update's failures can be reported again, so they replace the earlier record.
    await awsSdkManager.s3
      .putObject({
        ...location,
        body: JSON.stringify(failures.map(({ EventId }) => EventId)),
        contentType: 'application/json'
      })
      .catch(() => {});
  }
  return unreported;
};

type StackMonitoringResult = {
  warningMessages?: string[];
  /** The update finished while CloudFormation was still deleting about this many removed or replaced resources. */
  resourcesDeletedInBackground?: number;
};

/** Resources CloudFormation deletes in the cleanup after an update: those removed from the template and replaced ones. */
export const countResourcesDeletedDuringCleanup = (templateDiff: TemplateDiff | undefined) => {
  let count = 0;
  templateDiff?.resources?.forEachDifference((_logicalId, diff) => {
    // A removed resource with a Retain policy is only orphaned.
    if (
      diff.changeImpact === ResourceImpact.WILL_DESTROY ||
      diff.changeImpact === ResourceImpact.WILL_REPLACE ||
      diff.changeImpact === ResourceImpact.MAY_REPLACE
    ) {
      count++;
    }
  });
  return count;
};

class StackManager {
  callerIdentity: AwsCallerIdentity;
  existingStackDetails: StackDetails;
  existingStackResources: EnrichedStackResourceInfo[] = [];
  stackMonitoringInterval: NodeJS.Timeout;
  #stackName: string;
  /**
   * Optional physical identity for mutations of an existing stack.
   *
   * Ordinary commands retain the historical name target. The init wizard binds this to the
   * user-approved StackId so a delete/recreate with the same name cannot redirect a long build to
   * a different stack between consent and UpdateStack.
   */
  #stackMutationTarget?: string;
  #latestRecordedRelease: string | null = null;
  /**
   * The resources this invocation's update removed. The stack keeps listing them while CloudFormation still deletes
   * them, but they are no longer the stack's resources.
   */
  #resourcesRemovedByUpdate: Set<string> | undefined;
  #nextVersionAfterRefetch: string | null = null;

  // for polling ECS Service statuses during deploy
  #ecsDeploymentStatusPoller: { [serviceCfLogicalName: string]: EcsServiceDeploymentStatusPoller } = {};

  // for polling Lambda provisioned concurrency statuses during deploy
  #lambdaProvisionedConcurrencyPoller: { [aliasCfLogicalName: string]: LambdaProvisionedConcurrencyPoller } = {};

  init = async ({
    stackName,
    commandModifiesStack,
    commandRequiresDeployedStack,
    parentEventType,
    whileLoadingResourceDetails
  }: {
    stackName: string;
    commandModifiesStack: boolean;
    commandRequiresDeployedStack: boolean;
    /** Optional parent event for grouping (e.g., LOAD_METADATA_FROM_AWS) */
    parentEventType?: LoggableEventType;
    /**
     * Work that needs the stack's details and resource list but not the resources' details, such as function tags.
     * It runs while those load.
     */
    whileLoadingResourceDetails?: () => Promise<unknown>;
  }) => {
    await operationReporter.startEvent({
      eventType: 'FETCH_STACK_DATA',
      description: 'Fetching stack data',
      parentEventType,
      instanceId: parentEventType ? 'Stack data' : undefined
    });
    this.#stackName = stackName;
    this.#stackMutationTarget = undefined;
    this.#latestRecordedRelease = null;
    this.#nextVersionAfterRefetch = null;
    this.#resourcesRemovedByUpdate = undefined;

    // The resources are listed together with the details. A stack that first had to finish another operation is
    // listed again once it has.
    const [fetchedDetails, listedResources] = await Promise.allSettled([
      awsSdkManager.cloudFormation.getDetails(stackName),
      awsSdkManager.cloudFormation.getResources(stackName)
    ]);
    if (fetchedDetails.status === 'rejected') {
      throw fetchedDetails.reason;
    }
    const instanceId = parentEventType ? 'Stack data' : undefined;
    const { stackDetails } = await this.waitForStackToBeReadyForOperation({
      stackDetails: fetchedDetails.value,
      commandModifiesStack,
      commandRequiresDeployedStack,
      progressLogger: operationReporter,
      eventContext: { parentEventType, instanceId }
    });
    const stackResources =
      stackDetails === fetchedDetails.value && listedResources.status === 'fulfilled'
        ? listedResources.value
        : await awsSdkManager.cloudFormation.getResources(stackName);

    this.existingStackDetails = stackDetails;
    this.existingStackResources = this.#filterNonExistentResources(stackResources);
    const [detailedResources, , failedCleanupDeletions] = await Promise.all([
      this.#getDetailOfSelectedResources(this.existingStackResources),
      whileLoadingResourceDetails?.(),
      commandModifiesStack && globalStateManager.command !== 'dev'
        ? this.#getUnreportedFailedCleanupDeletionsOfLastUpdate(stackDetails)
        : ([] as MonitoredStackEvent[])
    ]);
    this.existingStackResources = detailedResources;
    if (failedCleanupDeletions.length) {
      const failures = await this.#handleFailedEvents({
        potentialErrorCausingEvents: Object.fromEntries(
          failedCleanupDeletions.map((event) => [event.LogicalResourceId, event])
        )
      }).catch(() =>
        failedCleanupDeletions.map(({ LogicalResourceId, ResourceStatusReason }) => ({
          errorMessage: `${LogicalResourceId}: ${ResourceStatusReason ?? 'deletion failed'}`
        }))
      );
      const plural = failedCleanupDeletions.length > 1;
      tuiManager.warn(
        `The last update of this stack could not delete ${plural ? `${failedCleanupDeletions.length} old resources` : 'an old resource'}. ${plural ? 'They are' : 'It is'} no longer part of the stack and ${plural ? 'stay' : 'stays'} in your AWS account until deleted manually:\n${tuiManager.formatComplexStackErrors(failures, 2)}`
      );
    }

    await operationReporter.finishEvent({
      eventType: 'FETCH_STACK_DATA',
      data: { stackDetails, stackResources: detailedResources },
      parentEventType,
      instanceId: parentEventType ? 'Stack data' : undefined
    });
  };

  bindExistingStackMutationsToId = (stackId: string): void => {
    this.#stackMutationTarget = stackId;
  };

  /**
   * Records the newest release found in the deployment bucket. Fast deployments create releases without updating
   * CloudFormation, so the stack's deployment version output can be older than the release that is running.
   */
  setLatestRecordedRelease = (version: string | null) => {
    this.#latestRecordedRelease = version;
  };

  /** The release this operation creates. It stays the same after the stack details are fetched again. */
  get nextVersion() {
    return this.#nextVersionAfterRefetch ?? codeSwapIntegration.nextVersion(getNextVersionString(this.lastVersion));
  }

  get lastDeploymentStackOutput(): { [name: string]: string } {
    return this.existingStackDetails?.stackOutput || {};
  }

  /** The release that runs now: the newer of CloudFormation's deployment version and the latest recorded release. */
  get lastVersion() {
    const deployedVersion = this.lastDeploymentStackOutput[outputNames.deploymentVersion()] || null;
    if (!this.#latestRecordedRelease) return deployedVersion;
    if (!deployedVersion) return this.#latestRecordedRelease;
    return getNumericVersion(this.#latestRecordedRelease) > getNumericVersion(deployedVersion)
      ? this.#latestRecordedRelease
      : deployedVersion;
  }

  get stackActionType(): StackActionType {
    const command = globalStateManager.command;
    if (command === 'delete') {
      return 'delete';
    }
    if (command === 'cf:rollback') {
      return 'rollback';
    }
    if (command === 'rollback') {
      return 'update';
    }
    if (command === 'dev') {
      return 'dev';
    }
    if (command === 'deploy') {
      // A deploy that failed without rollback is continued by updating the stack, even when nothing was created.
      return this.existingStackDetails &&
        (this.existingStackResources.length || isFailedStackStatus(this.existingStackDetails.StackStatus))
        ? 'update'
        : 'create';
    }
    if (command === 'diff') {
      return 'update';
    }
  }

  /**
   * Whether this deploy is the stage's first. Unlike `stackActionType`, it is also true for a stack an earlier first
   * deploy left with only its artifact resources (see {@link isFirstDeployOfStack}).
   */
  get isFirstDeploy() {
    return isFirstDeployOfStack(this.existingStackDetails);
  }

  /** Whether a failed deploy rolls back, as configured. See {@link resolveAutoRollback}. */
  get isAutoRollbackEnabled() {
    return resolveAutoRollback({
      deploymentConfig: configManager.config?.deploymentConfig,
      cliValue: globalStateManager.args.autoRollback,
      isDevCommand: globalStateManager.command === 'dev'
    });
  }

  /**
   * Whether this operation continues a stack that an earlier deploy without automatic rollback left in CREATE_FAILED or
   * UPDATE_FAILED. CloudFormation updates such a stack only with rollback disabled. Dev mode keeps its own handling.
   */
  get continuesFailedStack() {
    return this.stackActionType !== 'dev' && isFailedStackStatus(this.existingStackDetails?.StackStatus);
  }

  /** Whether CloudFormation rolls this operation back when it fails. */
  get rollsBackOnFailure() {
    return this.isAutoRollbackEnabled && !this.continuesFailedStack;
  }

  /**
   * Why this deploy must go through CloudFormation although only code changed: a direct code update would leave the
   * failed resources and the stack status as they are.
   */
  get reasonToContinueFailedStack(): string | undefined {
    return this.continuesFailedStack
      ? `the last deploy failed and left the stack in ${this.existingStackDetails.StackStatus}; this deploy continues from there`
      : undefined;
  }

  refetchStackDetails = async (stackName: string) => {
    // The refetched details carry the version this operation deployed; keep reporting it as this operation's release.
    this.#nextVersionAfterRefetch ??= this.nextVersion;
    await operationReporter.startEvent({ eventType: 'REFETCH_STACK_DATA', description: 'Fetching stack data' });
    const [existingStackDetails, existingStackResources] = await Promise.all([
      awsSdkManager.cloudFormation.getDetails(stackName),
      awsSdkManager.cloudFormation
        .getResources(stackName)
        .then(this.#filterNonExistentResources)
        .then(this.#withoutResourcesBeingCleanedUp)
        .then(this.#getDetailOfSelectedResources)
    ]);
    this.existingStackDetails = existingStackDetails;
    this.existingStackResources = existingStackResources;
    await operationReporter.finishEvent({
      eventType: 'REFETCH_STACK_DATA',
      finalMessage: 'Stack data refreshed',
      data: { stackDetails: existingStackDetails, stackResources: existingStackResources }
    });
  };

  getExistingResourceDetails = (cfLogicalName: string) => {
    return this.existingStackResources.find((resource) => resource.LogicalResourceId === cfLogicalName);
  };

  getExistingResourceDetailsByPhysicalResourceId = (physicalResourceName: string) => {
    return this.existingStackResources.find((resource) => resource.PhysicalResourceId === physicalResourceName);
  };

  getExistingStackOutput = (outputName: string) => {
    return this.existingStackDetails?.Outputs?.find(({ OutputKey }) => OutputKey === outputName);
  };

  getStatementsForDatabaseDeleteProtection = () => {
    // CloudFormation rejects a policy naming a resource the template does not contain. A dev stack leaves its
    // databases out because they run on the developer's machine, so their protection has nothing to apply to.
    const templateResources = templateManager.template.Resources ?? {};
    return (
      configManager.cfLogicalNamesToBeProtected
        ?.filter((cfLogicalName) => cfLogicalName in templateResources)
        .map(
          (cfLogicalName) =>
            ({
              Effect: 'Deny',
              Action: ['Update:Replace', 'Update:Delete'],
              Principal: '*',
              Resource: [`LogicalResourceId/${cfLogicalName}`]
            }) as IamRoleStatement
        ) || []
    );
  };

  getStatementToAllowBasicUpdate = () => {
    return {
      Effect: 'Allow',
      Action: 'Update:*',
      Principal: '*',
      Resource: ['*']
    } as IamRoleStatement;
  };

  getStackParams = () => {
    const {
      cloudformationRoleArn,
      publishEventsToArn,
      monitoringTimeAfterDeploymentInMinutes,
      triggerRollbackOnAlarms,
      terminationProtection
    } = configManager.deploymentConfig;
    const stackPolicy = []; // configManager.guardrails?.cloudformationStackPolicies
    // `dev` creates and updates the dev stack, which needs the same configured and Stacktape tags as a deployed stack.
    const operationRequiresTags = ['create', 'update', 'dev'].includes(this.stackActionType);
    const rollbackAlarmArns = (triggerRollbackOnAlarms || [])
      .map((alarmNameOrArn) => {
        // if alarm is arn we use the arn
        if (alarmNameOrArn.startsWith('arn:')) {
          return alarmNameOrArn;
        }
        // if we got here, it means we are referencing alarm name defined in alarms section
        const alarmFromConfig = resolveReferenceToAlarm({
          activeConfig: configManager,
          stpAlarmReference: alarmNameOrArn,
          referencedFrom: 'deployment configuration'
        });
        // only if alarm is already created it can be used as rollback trigger alarm
        // newly created alarms cannot be used as rollback alarms (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html)
        if (
          this.existingStackResources.find(
            ({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.cloudwatchAlarm(alarmFromConfig.name)
          )
        ) {
          return arns.cloudwatchAlarm({
            accountId: globalStateManager.targetAwsAccount.awsAccountId,
            region: globalStateManager.region,
            alarmAwsName: awsResourceNames.cloudwatchAlarm(this.#stackName, alarmFromConfig.name)
          });
        }
        return undefined;
      })
      .filter(Boolean);
    return {
      StackName: this.#stackMutationTarget ?? this.#stackName,
      Tags: operationRequiresTags ? this.getTags() : [],
      Parameters: [],
      Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'] as Capability[],
      ...(!this.rollsBackOnFailure && { DisableRollback: true }),
      ...(terminationProtection && { EnableTerminationProtection: true }),
      ...(cloudformationRoleArn && { RoleARN: cloudformationRoleArn as string }),
      ...(publishEventsToArn && { NotificationARNs: publishEventsToArn as string[] }),
      ...{
        StackPolicyBody: JSON.stringify({
          Statement: [
            this.getStatementToAllowBasicUpdate(),
            ...this.getStatementsForDatabaseDeleteProtection(),
            ...stackPolicy
          ]
        })
      },

      RollbackConfiguration: {
        MonitoringTimeInMinutes: monitoringTimeAfterDeploymentInMinutes || 0,
        RollbackTriggers: rollbackAlarmArns.map((arn) => ({
          Type: 'AWS::CloudWatch::Alarm',
          Arn: arn as string
        }))
      }
    };
  };

  /** Creates a dev stack's first version: the deployment bucket, image repository and service log group. */
  createResourcesForArtifacts = async () => {
    const template = templateManager.initialTemplate;
    await operationReporter.startEvent({
      eventType: 'CREATE_RESOURCES_FOR_ARTIFACTS',
      description: 'Creating AWS resources for deployment artifacts (S3, ECR...)'
    });
    const stackParams = this.getStackParams();
    // stack policy body includes information about protected resources
    // these are not created during "creation" of the stack, rather at the first update.
    // therefore this policy is not valid during stack creation.
    // eslint-disable-next-line
    const { StackPolicyBody, ...onCreateParams } = stackParams;
    const { StackId } = await awsSdkManager.cloudFormation.create(template, {
      ...onCreateParams,
      ...(this.rollsBackOnFailure && { OnFailure: OnFailure.DELETE })
    });
    await this.monitorStack(
      'create',
      StackId,
      (progress) => {
        operationReporter.updateEvent({
          eventType: 'CREATE_RESOURCES_FOR_ARTIFACTS',
          additionalMessage: progress.message,
          detail: progress.detail
        });
      },
      { createdTemplate: template }
    );
    await operationReporter.finishEvent({
      eventType: 'CREATE_RESOURCES_FOR_ARTIFACTS',
      data: { stackParams, template }
    });
  };

  waitForStackToBeReadyForOperation = async ({
    progressLogger,
    commandModifiesStack,
    commandRequiresDeployedStack,
    stackDetails: currentStackDetails,
    eventContext
  }: {
    progressLogger: ProgressLogger;
    commandModifiesStack: boolean;
    commandRequiresDeployedStack: boolean;
    stackDetails: StackDetails;
    eventContext?: { parentEventType?: LoggableEventType; instanceId?: string };
  }) => {
    const stackName = this.#stackName;
    const command = globalStateManager.command;

    let stackDetails: StackDetails = currentStackDetails;
    if (!stackDetails) {
      if (commandRequiresDeployedStack) {
        throw stpErrors.e32({
          stackName,
          stage: globalStateManager.targetStack.stage,
          organizationName: globalStateManager.organizationData?.name,
          awsAccountName: globalStateManager.targetAwsAccount.name
        });
      }
      return { stackDetails };
    }
    if (commandModifiesStack) {
      // wait for stack to be stable
      while (STACK_OPERATION_IN_PROGRESS_STATUS.includes(stackDetails?.StackStatus as any)) {
        const humanStatus = getHumanReadableStackStatus(stackDetails?.StackStatus);
        progressLogger.updateEvent({
          eventType: 'FETCH_STACK_DATA',
          description: `Waiting for stack to be ready for ${publicCommandName(globalStateManager.command)} (current state: ${humanStatus})`,
          parentEventType: eventContext?.parentEventType,
          instanceId: eventContext?.instanceId
        });
        await wait(4000);
        stackDetails = await awsSdkManager.cloudFormation.getDetails(stackName);
      }
      // A failed first deploy deletes its stack. Once that finishes, the stack no longer exists.
      if (!stackDetails) return { stackDetails };
      // check state after stack was stabilized
      const stackIsNotReadyForOperation =
        ((command === 'deploy' || command === 'dev' || command === 'deployment-script:run' || command === 'rollback') &&
          !STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS.includes(stackDetails.StackStatus as any)) ||
        (command === 'cf:rollback' &&
          !STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS.includes(stackDetails.StackStatus as any));
      if (stackIsNotReadyForOperation) {
        throw stpErrors.e100({
          command: command as 'deploy' | 'delete' | 'dev' | 'rollback' | 'cf:rollback' | 'deployment-script:run',
          stackName,
          stackStatus: stackDetails.StackStatus as StackStatus
        });
      }
    }
    return { stackDetails };
  };

  validateTemplate = async ({ templateBody, templateUrl }: { templateUrl?: string; templateBody?: string }) => {
    await operationReporter.startEvent({
      eventType: 'VALIDATE_TEMPLATE',
      description: 'Validating template'
    });
    await awsSdkManager.cloudFormation.validateTemplate({ templateBody, templateUrl });
    await operationReporter.finishEvent({
      eventType: 'VALIDATE_TEMPLATE',
      finalMessage: 'CloudFormation template validated'
    });
  };

  getChangeSet = async ({
    templateBody,
    templateUrl,
    includePropertyValues
  }: {
    templateUrl?: string;
    templateBody?: string;
    includePropertyValues?: boolean;
  }) => {
    await operationReporter.startEvent({
      eventType: 'CALCULATE_CHANGES',
      description: 'Calculating changes'
    });
    const res = await awsSdkManager.cloudFormation.createChangeSet({
      ...this.getStackParams(),
      ChangeSetName: `${this.#stackName}-${Date.now()}-${this.nextVersion}`,
      includePropertyValues,
      ...(templateUrl && { TemplateURL: templateUrl }),
      ...(templateBody && { TemplateBody: templateBody })
    });
    await operationReporter.finishEvent({ eventType: 'CALCULATE_CHANGES', data: { changesToBeMade: res.changes } });
    return res;
  };

  /** Stack settings live outside the template, so a template diff misses them. Returns the first one that changed. */
  findChangedStackSetting = (): string | undefined => {
    const current = this.existingStackDetails;
    if (!current) return undefined;
    const desired = this.getStackParams();
    const tags = (list: { Key?: string; Value?: string }[] = []) =>
      list.map(({ Key, Value }) => `${Key}=${Value}`).toSorted();
    if (!isEqual(tags(desired.Tags), tags(current.Tags))) return 'the stack tags changed';
    if (!!desired.EnableTerminationProtection !== !!current.EnableTerminationProtection) {
      return 'termination protection changed';
    }
    // UpdateStack keeps the notification targets and the role when the request omits them.
    if (
      desired.NotificationARNs &&
      !isEqual(desired.NotificationARNs.toSorted(), (current.NotificationARNs ?? []).toSorted())
    ) {
      return 'the stack notification targets changed';
    }
    if (desired.RoleARN && desired.RoleARN !== current.RoleARN) return 'the CloudFormation role changed';
    const rollbackSettings = ({ MonitoringTimeInMinutes = 0, RollbackTriggers = [] }: RollbackConfiguration = {}) => ({
      MonitoringTimeInMinutes,
      triggers: RollbackTriggers.map(({ Arn }) => Arn).toSorted()
    });
    if (!isEqual(rollbackSettings(desired.RollbackConfiguration), rollbackSettings(current.RollbackConfiguration))) {
      return 'the rollback triggers changed';
    }
    return undefined;
  };

  getTags = (
    customTags?: CloudformationTag[]
  ): {
    Key: string;
    Value: string;
  }[] => {
    const configTags = configManager.config ? configManager.stackConfig.tags || [] : [];
    return uniqBy(
      configTags
        .concat(customTags || [])
        .map(({ name, value }) => ({ Key: name, Value: value }))
        .concat([
          { Key: tagNames.stackName(), Value: this.#stackName },
          { Key: tagNames.projectName(), Value: globalStateManager.targetStack.projectName },
          { Key: tagNames.stage(), Value: globalStateManager.targetStack.stage },
          { Key: tagNames.globallyUniqueStackHash(), Value: globalStateManager.targetStack.globallyUniqueStackHash },
          ...(this.stackActionType === 'dev' ? [{ Key: tagNames.devStack(), Value: 'true' }] : [])
        ]),
      (el) => el.Key
    );
  };

  /** The stack this command created with `createStack`, so a failed first deploy only ever ends its own creation. */
  createdStackId: string | undefined;

  /**
   * Creates a new stack with its whole template in one operation. Its deployment bucket and image repository exist
   * before it (see `deploymentArtifactManager.createArtifactStore`). With automatic rollback, a failed creation deletes
   * the stack.
   */
  createStack = async (templateUrl: string) => {
    await this.validateTemplate({ templateUrl });
    const stackParams = this.getStackParams();
    await operationReporter.startEvent({
      eventType: 'UPDATE_STACK',
      description: 'Deploying infrastructure resources'
    });
    const { StackId } = await awsSdkManager.cloudFormation.createFromUrl(templateUrl, {
      ...stackParams,
      ...(this.rollsBackOnFailure && { OnFailure: OnFailure.DELETE })
    });
    this.createdStackId = StackId;
    const result = await this.monitorStack(
      'create',
      StackId,
      (progress) => {
        operationReporter.updateEvent({
          eventType: 'UPDATE_STACK',
          additionalMessage: progress.message,
          detail: progress.detail
        });
      },
      { createdTemplate: templateManager.template }
    );
    await operationReporter.finishEvent({
      eventType: 'UPDATE_STACK',
      finalMessage: 'Deployment successful.'
    });
    return result;
  };

  deployStack = async (templateUrl: string, { finishWhenCleanupStarts = false } = {}) => {
    await this.validateTemplate({ templateUrl });
    const stackParams = this.getStackParams();
    await operationReporter.startEvent({
      eventType: 'UPDATE_STACK',
      description: 'Deploying infrastructure resources'
    });
    const { skipped } = await awsSdkManager.cloudFormation.update(templateUrl, stackParams);
    if (!skipped) codeSwapIntegration.teardownAccepted(stackParams.StackName);
    if (!skipped) {
      const result = await this.monitorStack(
        'update',
        stackParams.StackName,
        (progress) => {
          operationReporter.updateEvent({
            eventType: 'UPDATE_STACK',
            additionalMessage: progress.message,
            detail: progress.detail
          });
        },
        { finishWhenCleanupStarts }
      );
      if (finishWhenCleanupStarts) {
        this.#resourcesRemovedByUpdate = new Set(
          Object.keys(templateManager.oldTemplate.Resources ?? {}).filter(
            (logicalId) => !(logicalId in templateManager.template.Resources)
          )
        );
      }
      // UpdateStack has already set the stack policy from `StackPolicyBody`. SetStackPolicy would fail while
      // CloudFormation still deletes old resources. Termination protection can be changed in any state.
      await awsSdkManager.cloudFormation.setTerminationProtection(
        !!stackParams.EnableTerminationProtection,
        stackParams.StackName
      );
      await operationReporter.finishEvent({
        eventType: 'UPDATE_STACK',
        finalMessage: 'Deployment successful.'
      });
      return result;
    }
    await operationReporter.finishEvent({
      eventType: 'UPDATE_STACK',
      finalMessage: 'No updates needed.'
    });
    return {};
  };

  deployStackForRollback = async (templateUrl: string) => {
    await this.validateTemplate({ templateUrl });
    const stackName = this.#stackName;
    const roleArn =
      configManager.deploymentConfig?.cloudformationRoleArn ||
      (deployedStackOverviewManager.getStackMetadata(stackMetadataNames.cloudformationRoleArn()) as string);
    const stackParams = {
      StackName: stackName,
      Tags: this.getTags(),
      Parameters: [] as { ParameterKey: string; ParameterValue: string }[],
      Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'] as Capability[],
      ...(this.continuesFailedStack && { DisableRollback: true }),
      ...(roleArn && { RoleARN: roleArn })
    };
    await operationReporter.startEvent({
      eventType: 'UPDATE_STACK',
      description: 'Deploying infrastructure resources'
    });
    const { skipped } = await awsSdkManager.cloudFormation.update(templateUrl, stackParams);
    if (!skipped) codeSwapIntegration.teardownAccepted(stackParams.StackName);
    if (!skipped) {
      const result = await this.monitorStack('update', stackName, (progress) => {
        operationReporter.updateEvent({
          eventType: 'UPDATE_STACK',
          additionalMessage: progress.message,
          detail: progress.detail
        });
      });
      await operationReporter.finishEvent({
        eventType: 'UPDATE_STACK',
        finalMessage: 'Deployment successful.'
      });
      return result;
    }
    await operationReporter.finishEvent({
      eventType: 'UPDATE_STACK',
      finalMessage: 'No updates needed.'
    });
    return {};
  };

  /**
   * Deletes the stack. `beforeDelete` is work that must finish before CloudFormation starts, such as emptying the
   * buckets and the image repository. It runs alongside the steps below, which start slow AWS-side work early.
   */
  deleteStack = async ({ beforeDelete }: { beforeDelete?: () => Promise<unknown> } = {}) => {
    await operationReporter.startEvent({ eventType: 'DELETE_STACK', description: 'Deleting infrastructure resources' });
    const roleArn =
      configManager.deploymentConfig?.cloudformationRoleArn ||
      (deployedStackOverviewManager.getStackMetadata(stackMetadataNames.cloudformationRoleArn()) as string);

    const disabledDistributionIds: string[] = [];
    const scaledDownServiceArns: string[] = [];
    const earlyDeletedDataStores: EarlyDataStoreDelete[] = [];
    let disabling: Promise<unknown> | undefined;
    let deletingDataStores: Promise<unknown> | undefined;
    let deleteRequested = false;
    // When the delete never reaches CloudFormation (an error or Ctrl+C before that), the stack stays and its
    // distributions are enabled again, so the site comes back.
    applicationManager.registerCleanUpHook(async (outcome) => {
      await disabling;
      if (!deleteRequested && disabledDistributionIds.length) {
        await this.#enableDistributionsAfterAbortedDelete(disabledDistributionIds);
      }
      if (!deleteRequested && scaledDownServiceArns.length) {
        tuiManager.warn(
          `The stack delete did not start, but these ECS services were already scaled to 0 tasks: ${scaledDownServiceArns.join(', ')}. Set their desired count again in the AWS console, or run the delete again.`
        );
      }
      await deletingDataStores;
      if (!outcome?.success && earlyDeletedDataStores.length) {
        const list = earlyDeletedDataStores.map((item) => `- ${describeEarlyDataStoreDelete(item)}`).join('\n');
        tuiManager.warn(
          outcome?.interrupted
            ? `Stacktape stopped watching, but CloudFormation keeps deleting the stack in AWS. Stacktape had already started deleting these resources itself, without final snapshots:\n${list}`
            : `The stack delete did not finish. Stacktape had already started deleting these resources itself, without final snapshots:\n${list}\nRun the delete again after fixing the error; CloudFormation skips resources that no longer exist.`
        );
      }
    });
    disabling = this.#disableDistributionsBeforeDelete(disabledDistributionIds);
    const [beforeDeleteResult] = await Promise.allSettled([
      beforeDelete?.(),
      this.#scaleDownEcsServicesBeforeDelete(scaledDownServiceArns),
      disabling
    ]);
    if (beforeDeleteResult.status === 'rejected') {
      throw beforeDeleteResult.reason;
    }

    // Set before the request: once it may have reached CloudFormation, enabling a distribution would race its delete.
    deleteRequested = true;
    try {
      await awsSdkManager.cloudFormation.delete(this.#stackName, {
        roleArn
      });
    } catch (err) {
      deleteRequested = false;
      throw err;
    }
    codeSwapIntegration.teardownAccepted(this.#stackName);
    // Started only now: a DeleteStack request that CloudFormation refused (termination protection, a stack that is
    // busy) leaves every data store untouched.
    deletingDataStores = this.#startEarlyDataStoreDeletes({ earlyDeletedDataStores, roleArn }).catch((err) =>
      tuiManager.debug(`Could not start deleting data stores early: ${err}`)
    );
    const result = await this.monitorStack('delete', this.existingStackDetails.StackId, (progress) =>
      operationReporter.updateEvent({
        eventType: 'DELETE_STACK',
        additionalMessage: progress.message,
        detail: progress.detail
      })
    );
    await deletingDataStores;
    await operationReporter.finishEvent({ eventType: 'DELETE_STACK', data: {} });
    return result;
  };

  /**
   * Starts deleting the stack's databases, caches and search domains right after CloudFormation accepted the DeleteStack
   * request, so they delete in parallel with the workloads that reference them instead of after them. See
   * `early-data-store-deletes.ts` for which resources qualify.
   */
  #startEarlyDataStoreDeletes = async ({
    earlyDeletedDataStores,
    roleArn
  }: {
    earlyDeletedDataStores: EarlyDataStoreDelete[];
    roleArn?: string;
  }) => {
    // A stack deleted through a CloudFormation service role is deleted with that role's permissions, which may forbid
    // deleting data stores on purpose. The CLI's own credentials must not get around that.
    if (roleArn || this.existingStackDetails.RoleARN) return;
    // Plan from the template CloudFormation is deleting now, not the one loaded before the confirmation prompt: a deploy
    // in between may have changed a DeletionPolicy.
    let template: CloudFormationTemplate;
    try {
      template = await awsSdkManager.cloudFormation.getTemplate(this.existingStackDetails.StackId);
    } catch (err) {
      tuiManager.debug(`Leaving all data stores to CloudFormation: could not read the deployed template: ${err}`);
      return;
    }
    const items = planEarlyDataStoreDeletes({ resources: this.existingStackResources || [], template });
    // Ctrl+C while the DeleteStack request was in flight: the cleanup has already reported what was started.
    if (!items.length || applicationManager.isInterrupted) return;
    const started = await startEarlyDataStoreDeletes({ items, onDebug: (message) => tuiManager.debug(message) });
    earlyDeletedDataStores.push(...started);
    if (started.length) {
      tuiManager.info(
        `Deleting these data stores now, in parallel with the resources that use them:\n${started.map((item) => `- ${describeEarlyDataStoreDelete(item)}`).join('\n')}`
      );
    }
  };

  /**
   * Physical IDs of the deployed resources of these types that CloudFormation deletes with the stack. A resource whose
   * deployed template sets another DeletionPolicy (possible in `cloudformationResources`) outlives the stack and must
   * keep working, so the delete leaves it alone. Without the deployed template nothing is known to be deleted.
   */
  #resourcesDeletedWithStack = (resourceTypes: string[]) =>
    (this.existingStackResources || [])
      .filter(({ ResourceType, PhysicalResourceId, LogicalResourceId }) => {
        if (!resourceTypes.includes(ResourceType) || !PhysicalResourceId) return false;
        const deployed = templateManager.oldTemplate?.Resources?.[LogicalResourceId] as
          | { DeletionPolicy?: unknown }
          | undefined;
        return !!deployed && (deployed.DeletionPolicy === undefined || deployed.DeletionPolicy === 'Delete');
      })
      .map(({ PhysicalResourceId }) => PhysicalResourceId);

  /**
   * Asks ECS to stop every service's tasks, without waiting for them. CloudFormation's own service delete waits for the
   * drain, in parallel with the stack's other long deletes (CloudFront, databases, NAT gateways) instead of before all
   * of them. Starting the drain here shortens that wait, which once ran into CloudFormation's "Resource timed out
   * waiting for completion" when tasks drained slowly. Best effort: a failure leaves the work to CloudFormation.
   */
  #scaleDownEcsServicesBeforeDelete = async (scaledDownServiceArns: string[]) => {
    const ecsServiceArns = this.#resourcesDeletedWithStack(['AWS::ECS::Service', 'Stacktape::ECSBlueGreenV1::Service']);

    if (!ecsServiceArns.length) {
      return;
    }

    operationReporter.updateEvent({
      eventType: 'DELETE_STACK',
      additionalMessage: `Scaling down ${ecsServiceArns.length} ECS service${ecsServiceArns.length > 1 ? 's' : ''} before delete...`
    });

    await Promise.all(
      ecsServiceArns.map(async (ecsServiceArn) => {
        const cluster = ecsServiceArn.split('/')[1];
        if (!cluster) return;
        try {
          await awsSdkManager.ecs.startRollingUpdate({ service: ecsServiceArn, cluster, desiredCount: 0 });
          scaledDownServiceArns.push(ecsServiceArn);
        } catch (err) {
          tuiManager.debug(`Could not scale down ECS service ${ecsServiceArn} before delete: ${err}`);
        }
      })
    );
  };

  /**
   * CloudFormation deletes a distribution only after disabling it and waiting until every edge location has the change
   * (minutes), and it starts only when it reaches the distribution. Disabling it here lets that propagation overlap
   * emptying the buckets and deleting the resources that depend on the distribution. The user has already confirmed
   * the delete, so the site stops serving a little earlier. Best effort: a failure leaves the work to CloudFormation.
   */
  #disableDistributionsBeforeDelete = async (disabledDistributionIds: string[]) => {
    const distributionIds = this.#resourcesDeletedWithStack(['AWS::CloudFront::Distribution']);
    await Promise.all(
      distributionIds.map(async (distributionId) => {
        try {
          if (await awsSdkManager.cloudFront.setDistributionEnabled({ distributionId, enabled: false })) {
            disabledDistributionIds.push(distributionId);
          }
        } catch (err) {
          tuiManager.debug(`Could not disable CloudFront distribution ${distributionId} before delete: ${err}`);
        }
      })
    );
    if (disabledDistributionIds.length) {
      operationReporter.updateEvent({
        eventType: 'DELETE_STACK',
        additionalMessage: `Disabled ${disabledDistributionIds.length} CloudFront distribution${disabledDistributionIds.length > 1 ? 's' : ''} before delete...`
      });
    }
  };

  #enableDistributionsAfterAbortedDelete = async (distributionIds: string[]) => {
    await Promise.all(
      distributionIds.map(async (distributionId) => {
        try {
          await awsSdkManager.cloudFront.setDistributionEnabled({ distributionId, enabled: true });
          tuiManager.info(
            `The stack delete did not start, so CloudFront distribution ${distributionId} is enabled again.`
          );
        } catch (err) {
          tuiManager.warn(
            `CloudFront distribution ${distributionId} was disabled for a stack delete that did not start. Enable it in the AWS console, or run the delete again. (${err})`
          );
        }
      })
    );
  };

  rollbackStack = async () => {
    await operationReporter.startEvent({ eventType: 'ROLLBACK_STACK', description: 'Rolling back stack resources' });
    const roleArn =
      configManager.deploymentConfig?.cloudformationRoleArn ||
      (deployedStackOverviewManager.getStackMetadata(stackMetadataNames.cloudformationRoleArn()) as string);
    const resourcesToSkip = globalStateManager.args.resourcesToSkip
      ? [...new Set(globalStateManager.args.resourcesToSkip)]
      : undefined;
    if (
      this.existingStackDetails.StackStatus === StackStatus.UPDATE_FAILED ||
      this.existingStackDetails.StackStatus === StackStatus.CREATE_FAILED
    ) {
      await awsSdkManager.cloudFormation.rollback(this.#stackName, {
        roleArn
      });
    } else if (this.existingStackDetails.StackStatus === StackStatus.UPDATE_ROLLBACK_FAILED) {
      await awsSdkManager.cloudFormation.continueRollback(this.#stackName, {
        roleArn,
        resourcesToSkip
      });
    }
    const result = await this.monitorStack('rollback', this.existingStackDetails.StackId, (progress) =>
      operationReporter.updateEvent({
        eventType: 'ROLLBACK_STACK',
        additionalMessage: progress.message,
        detail: progress.detail
      })
    );
    await operationReporter.finishEvent({ eventType: 'ROLLBACK_STACK', data: {} });
    return result;
  };

  monitorStack = async (
    cfStackAction: 'create' | 'update' | 'delete' | 'rollback',
    stackId: string,
    onProgress: (progress: StackProgressUpdate) => any,
    {
      finishWhenCleanupStarts = false,
      createdTemplate = templateManager.initialTemplate
    }: {
      /** The template a `create` operation creates the stack from. */
      createdTemplate?: CloudFormationTemplate;
      /**
       * An update is finished for the user once CloudFormation starts deleting the resources it removed or replaced:
       * the stack can no longer roll back and the new resources serve traffic. The cleanup continues in AWS, and the
       * next command that modifies the stack waits for it.
       */
      finishWhenCleanupStarts?: boolean;
    } = {}
  ): Promise<StackMonitoringResult> => {
    const handledEvents: string[] = [];
    const potentialErrorCausingEvents: { [logicalResourceId: string]: StackEvent } = {};
    const inProgressResources = new Set<string>();
    const inProgressMeta = new Map<string, { resourceType?: string; since: number }>();
    const completeResources = new Set<string>();
    const recentlyCompletedResources: CloudFormationResourceProgress[] = [];
    const seenResources = new Set<string>();
    let resourcesToHandleCount: number;
    let _isResourceToHandleCountPossiblyInaccurate = false;
    if (cfStackAction === 'create') {
      // when we are creating, we know exactly what amount of resources we need to create
      resourcesToHandleCount = Object.keys(createdTemplate.Resources).length;
    } else if (cfStackAction === 'delete' || cfStackAction === 'rollback') {
      // when we are removing, we know what amount of resources we need to remove
      resourcesToHandleCount = this.existingStackResources.length;
    } else {
      // when running update command we do not know accurately how many resources need to be updated
      _isResourceToHandleCountPossiblyInaccurate = true;
      resourcesToHandleCount = Object.keys(templateManager.template.Resources).length;
    }
    const templateDiff = cfStackAction === 'update' ? templateManager.getOldTemplateDiff() : undefined;
    const updatedResourceLogicalNames =
      cfStackAction === 'update' ? templateDiff?.resources?.logicalIds.filter(Boolean) : undefined;
    const { totalSeconds } = getStackDeploymentEstimate({
      cfStackAction,
      template: cfStackAction === 'create' ? createdTemplate : templateManager.template,
      oldTemplate: templateManager.oldTemplate,
      existingStackResources: this.existingStackResources,
      resourceLogicalNames: updatedResourceLogicalNames
    });

    let fetchSince = await getAwsSynchronizedTime();
    fetchSince.setSeconds(fetchSince.getSeconds() - 20);
    let lastStackActionTimestamp: Date;
    let eventBatchEvaluationInProgress = false;
    let cleanupAfterSuccessfulUpdateInProgress = false;

    let fetchNumber = 0;
    // Events are polled every second during updates, where a code change finishes in seconds.
    const eventPollingIntervalMs = (cfStackAction === 'update' ? 1 : MONITORING_FREQUENCY_SECONDS) * 1000;
    // The stack status is a fallback for missed completion events. DescribeStacks can take several seconds, so it runs
    // beside event polling instead of holding up the next batch of events. It is requested only after this operation's
    // start event was seen: an earlier request could still return the previous operation's final status.
    let latestStackStatus: StackStatus | undefined;
    let stackStatusRequestInFlight = false;
    let failedStackStatusRequests = 0;
    let stackStatusError: unknown;
    const refreshStackStatus = () => {
      if (stackStatusRequestInFlight || !lastStackActionTimestamp) return;
      stackStatusRequestInFlight = true;
      awsSdkManager.cloudFormation
        .getDetails(stackId)
        .then((stackDetails) => {
          latestStackStatus = stackDetails?.StackStatus as StackStatus;
          failedStackStatusRequests = 0;
        })
        .catch((err) => {
          // A single failure is retried on a later poll; repeated failures stop the monitoring.
          if (++failedStackStatusRequests >= 3) stackStatusError = err;
        })
        .finally(() => {
          stackStatusRequestInFlight = false;
        });
    };
    let cancelRequested = false;
    let cancelBannerShown = false;

    const cleanupMonitoring = () => {
      clearInterval(this.stackMonitoringInterval);
      Object.values(this.#ecsDeploymentStatusPoller).forEach((statusPoller) => statusPoller.stopPolling());
      Object.values(this.#lambdaProvisionedConcurrencyPoller).forEach((poller) => poller.stopPolling());
      tuiManager.clearCancelDeployment();
    };

    const getEarlyStartupFailureMessage = () => {
      const failedEcsPoller = Object.values(this.#ecsDeploymentStatusPoller).find((poller) => poller.hasFailedTask);
      if (failedEcsPoller) {
        const details = failedEcsPoller.getFailureMessage();
        return details
          ? `Service failed to start\n\n${details}`
          : 'Service failed to start. Check ECS task logs for details.';
      }

      const failedLambdaPoller = Object.values(this.#lambdaProvisionedConcurrencyPoller).find(
        (poller) => poller.hasFailure
      );
      if (failedLambdaPoller) {
        const details = failedLambdaPoller.getFailureMessage();
        return details
          ? `Lambda provisioned concurrency failed\n\n${details}`
          : 'Lambda provisioned concurrency failed. Check CloudWatch logs for details.';
      }

      return undefined;
    };

    // Function to show cancel banner when ECS task failure is detected
    const showCancelBannerIfNeeded = (resolveFn: (result: { warningMessages?: string[] }) => void) => {
      if (cancelBannerShown || cancelRequested) return;
      if (cfStackAction !== 'create' && cfStackAction !== 'update') return;

      // Check if any ECS poller has a failed task or Lambda poller has a failure
      const hasFailedEcsTask = Object.values(this.#ecsDeploymentStatusPoller).some((poller) => poller.hasFailedTask);
      const hasFailedLambdaProvisionedConcurrency = Object.values(this.#lambdaProvisionedConcurrencyPoller).some(
        (poller) => poller.hasFailure
      );
      if (hasFailedEcsTask || hasFailedLambdaProvisionedConcurrency) {
        cancelBannerShown = true;
        const outcome = this.rollsBackOnFailure
          ? 'CloudFormation will eventually time out and roll back.'
          : 'CloudFormation will eventually time out and keep the stack in a failed state.';
        const message = `${hasFailedEcsTask ? 'Container startup failed.' : 'Lambda provisioned concurrency failed.'} ${outcome}`;
        tuiManager.setCancelDeployment({
          message,
          onCancel: async () => {
            if (cancelRequested) return;
            cancelRequested = true;
            tuiManager.updateCancelDeployment({ isCancelling: true });
            try {
              await awsSdkManager.cloudFormation.cancelUpdate(this.#stackName);
              // Don't continue monitoring - just resolve and let the user know rollback is happening
              // The rollback will continue in AWS even after we exit
              cleanupMonitoring();
              resolveFn({
                warningMessages: [
                  'Deployment was cancelled. The stack is being rolled back in AWS. You can monitor the rollback progress in the AWS CloudFormation console.'
                ]
              });
            } catch (err) {
              tuiManager.warn(`Failed to cancel deployment: ${err.message}`);
              cancelRequested = false;
              tuiManager.updateCancelDeployment({ isCancelling: false });
            }
          }
        });
      }
    };

    const handleProgress = () => {
      const completedAmount = completeResources.size;
      const recentlyCompleted = recentlyCompletedResources.splice(0);

      // Get change summary (needed for both normal and cleanup progress)
      const changeSummary = formatChangeSummary({
        cfStackAction,
        templateDiff,
        createResourcesCount: resourcesToHandleCount,
        deleteResourcesCount: resourcesToHandleCount
      });

      // Agent mode: simplified progress output
      if (isAgentMode()) {
        const plannedSet = getPlannedResources({ updatedResourceLogicalNames, changeLists: changeSummary.lists });
        const completedCount = plannedSet
          ? Array.from(completeResources).filter((name) => plannedSet.has(name)).length
          : completeResources.size;
        const totalPlanned = plannedSet?.size || resourcesToHandleCount;
        const percent = totalPlanned > 0 ? Math.round((completedCount / totalPlanned) * 100) : 0;
        const activeResources = plannedSet
          ? Array.from(inProgressResources).filter((name) => plannedSet.has(name))
          : Array.from(inProgressResources);
        const activePart = activeResources.length > 0 ? ` | updating: ${formatResourceList(activeResources, 3)}` : '';
        const changeSummaryPart = ` | changes: +${changeSummary.counts.created} ~${changeSummary.counts.updated} -${changeSummary.counts.deleted}`;
        onProgress({
          message: `${completedCount}/${totalPlanned} resources (${percent}%)${activePart}${changeSummaryPart}`,
          detail: {
            kind: 'cloudformation-progress',
            stackAction: cfStackAction,
            completedCount,
            totalPlanned,
            percent,
            inProgressResources: activeResources,
            changeCounts: {
              created: changeSummary.counts.created,
              updated: changeSummary.counts.updated,
              deleted: changeSummary.counts.deleted
            },
            recentlyCompleted
          }
        });
        return;
      }

      // Human mode: detailed progress output
      const inProgressAmount = inProgressResources.size;

      // During cleanup phase, show a different message indicating main deployment is done
      if (cleanupAfterSuccessfulUpdateInProgress) {
        const cleanupInProgress =
          inProgressAmount > 0
            ? `Removing ${inProgressAmount} old resource${inProgressAmount === 1 ? '' : 's'}`
            : 'Finishing cleanup';
        const cleanupFinished = completedAmount > 0 ? `Removed: ${completedAmount}` : '';
        const progressMessage = `Status: Cleaning up. ${cleanupInProgress}.${cleanupFinished ? ` ${cleanupFinished}.` : ''} Estimate: ~100%`;
        // Include summary/details even during cleanup so TUI can show accurate counts
        const summaryPart = `Summary: created=${changeSummary.counts.created} updated=${changeSummary.counts.updated} deleted=${changeSummary.counts.deleted}`;
        const detailsPart = `Details: created=${changeSummary.lists.created.join(', ') || 'none'}; updated=${changeSummary.lists.updated.join(', ') || 'none'}; deleted=${changeSummary.lists.deleted.join(', ') || 'none'}.`;
        onProgress({
          message: `${progressMessage} ${summaryPart} ${detailsPart}`,
          detail: {
            kind: 'cloudformation-progress',
            stackAction: cfStackAction,
            status: 'cleanup',
            completedCount: completedAmount,
            inProgressCount: inProgressAmount,
            changeCounts: {
              created: changeSummary.counts.created,
              updated: changeSummary.counts.updated,
              deleted: changeSummary.counts.deleted
            },
            recentlyCompleted
          }
        });
        return;
      }

      const remainingPercent = getEstimatedRemainingPercent({
        totalSeconds,
        startTime: lastStackActionTimestamp,
        now: new Date()
      });
      const plannedSet = getPlannedResources({ updatedResourceLogicalNames, changeLists: changeSummary.lists });
      const completedCount = plannedSet
        ? Array.from(completeResources).filter((name) => plannedSet.has(name)).length
        : completeResources.size;
      const inProgressCount = plannedSet
        ? Array.from(inProgressResources).filter((name) => plannedSet.has(name)).length
        : inProgressResources.size;
      const totalSeen = seenResources.size;
      const totalPlannedBase =
        cfStackAction === 'update' ? Math.max(totalSeen, plannedSet?.size || 0) : resourcesToHandleCount;
      const totalPlanned = Math.max(totalPlannedBase, completedCount + inProgressCount);
      const activeResources = plannedSet
        ? Array.from(inProgressResources).filter((name) => plannedSet.has(name))
        : Array.from(inProgressResources);
      const resourceAction = (name: string): 'CREATE' | 'UPDATE' | 'DELETE' =>
        changeSummary.lists.created.includes(name)
          ? 'CREATE'
          : changeSummary.lists.deleted.includes(name)
            ? 'DELETE'
            : cfStackAction === 'create'
              ? 'CREATE'
              : cfStackAction === 'delete'
                ? 'DELETE'
                : 'UPDATE';
      const inProgressDetails = activeResources.map((name) => ({
        name,
        action: resourceAction(name),
        resourceType: inProgressMeta.get(name)?.resourceType,
        since: inProgressMeta.get(name)?.since
      }));
      const waitingCandidates = plannedSet
        ? Array.from(plannedSet).filter((name) => !inProgressResources.has(name) && !completeResources.has(name))
        : [];
      // Build changes part - only show non-zero counts with resource names if available
      const changesParts: string[] = [];
      if (changeSummary.counts.created > 0) {
        const resources =
          changeSummary.lists.created.length > 0 ? ` (${formatResourceList(changeSummary.lists.created, 3)})` : '';
        changesParts.push(`Creating: ${changeSummary.counts.created}${resources}`);
      }
      if (changeSummary.counts.updated > 0) {
        const resources =
          changeSummary.lists.updated.length > 0 ? ` (${formatResourceList(changeSummary.lists.updated, 3)})` : '';
        changesParts.push(`Updating: ${changeSummary.counts.updated}${resources}`);
      }
      if (changeSummary.counts.deleted > 0) {
        const resources =
          changeSummary.lists.deleted.length > 0 ? ` (${formatResourceList(changeSummary.lists.deleted, 3)})` : '';
        changesParts.push(`Deleting: ${changeSummary.counts.deleted}${resources}`);
      }
      const changesPart = cfStackAction === 'update' && changesParts.length > 0 ? `${changesParts.join('. ')}.` : '';
      // Add machine-readable summary and details for TUI parsing
      const summaryPart = `Summary: created=${changeSummary.counts.created} updated=${changeSummary.counts.updated} deleted=${changeSummary.counts.deleted}`;
      const detailsPart = `Details: created=${changeSummary.lists.created.join(', ') || 'none'}; updated=${changeSummary.lists.updated.join(', ') || 'none'}; deleted=${changeSummary.lists.deleted.join(', ') || 'none'}.`;
      const statusText =
        inProgressAmount > 0
          ? cfStackAction === 'delete'
            ? 'Deleting resources'
            : cfStackAction === 'create'
              ? 'Creating resources'
              : 'Updating resources'
          : completedAmount > 0
            ? 'Finalizing stack operation'
            : `Starting ${cfStackAction}`;
      const progressParts: string[] = [`Status: ${statusText}`];
      if (totalPlanned > 0) {
        progressParts.push(`Progress: ${completedCount}/${totalPlanned}`);
      }
      if (activeResources.length > 0) {
        progressParts.push(`Currently updating: ${formatResourceList(activeResources, 3)}`);
      }
      if (waitingCandidates.length > 0) {
        const waitingList = formatResourceList(waitingCandidates, 3);
        progressParts.push(`Waiting: ${waitingList}`);
      }
      if (remainingPercent !== null) {
        progressParts.push(`Estimate: ~${remainingPercent === 100 ? '<1' : 100 - remainingPercent}%`);
      }
      const progressMessage = progressParts.join('. ');
      onProgress({
        message: `${progressMessage}.${changesPart ? ` ${changesPart}` : ''} ${summaryPart} ${detailsPart}`.trim(),
        detail: {
          kind: 'cloudformation-progress',
          stackAction: cfStackAction,
          status: 'active',
          completedCount,
          totalPlanned,
          inProgressCount,
          inProgressResources: activeResources,
          inProgressDetails,
          waitingResources: waitingCandidates,
          changeCounts: {
            created: changeSummary.counts.created,
            updated: changeSummary.counts.updated,
            deleted: changeSummary.counts.deleted
          },
          recentlyCompleted
        }
      });
    };

    const result: StackMonitoringResult = await new Promise((resolve, reject) => {
      const finishWhileCleanupRuns = () => {
        cleanupMonitoring();
        const resourcesToDelete = countResourcesDeletedDuringCleanup(templateDiff);
        resolve(resourcesToDelete ? { resourcesDeletedInBackground: resourcesToDelete } : {});
      };
      const signalsEarlyFinish = (stackStatus: StackStatus | undefined) =>
        finishWhenCleanupStarts &&
        cfStackAction === 'update' &&
        stackStatus === StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS;

      // operations to be executed after we detect stack operation success
      const afterStackOperationSuccess = async () => {
        cleanupMonitoring();
        // add warning message if there were failed deletions during CLEANUP after UPDATE_COMPLETE
        if (cleanupAfterSuccessfulUpdateInProgress && Object.keys(potentialErrorCausingEvents).length) {
          const handledStackErrors = await this.#handleFailedEvents({
            potentialErrorCausingEvents
          });
          const formattedStackErrorText = tuiManager.formatComplexStackErrors(handledStackErrors, 2);
          return resolve({
            warningMessages: [
              `Stack was successfully updated, but errors occurred during old resources CLEANUP:\n${formattedStackErrorText}`
            ]
          });
        }
        return resolve({});
      };

      const afterStackOperationFailure = async (failedStackStatus?: StackStatus) => {
        cleanupMonitoring();

        const handledFailedEvents = await this.#handleFailedEvents({ potentialErrorCausingEvents });
        tuiManager.debug(`Processed ${handledFailedEvents.length} failed stack event(s)`);
        const formattedStackErrorText = tuiManager.formatComplexStackErrors(handledFailedEvents, 2);
        // Collect hints from individual error handlers
        const errorSpecificHints = handledFailedEvents.flatMap((event) => event.hints || []);
        const generalHints =
          cfStackAction === 'create' || cfStackAction === 'update'
            ? getHintsAfterStackFailureOperation({
                cfStackAction,
                stackId,
                // An update CloudFormation could not keep in UPDATE_FAILED (for example a failed replacement) rolls back.
                rolledBack: this.rollsBackOnFailure || failedStackStatus === StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
                isFirstDeploy: this.isFirstDeploy
              })
            : getHintsAfterStackFailureOperation({ cfStackAction, stackId, rolledBack: false, isFirstDeploy: false });
        // Merge all hints - error-specific hints first, then general hints
        const allHints = [...errorSpecificHints, ...generalHints];
        return reject(
          new ExpectedError(
            'STACK',
            `Stack action ${this.stackActionType} failed.\n\n${formattedStackErrorText}\n`,
            allHints
          )
        );
      };

      this.stackMonitoringInterval = setInterval(async () => {
        // if the operation in previous iteration of interval did not finish yet, we will not even try to fetch events (instant return).
        if (eventBatchEvaluationInProgress) {
          return;
        }
        // as we are about to fetch and evaluate event batch
        eventBatchEvaluationInProgress = true;
        try {
          if (stackStatusError) throw stackStatusError;
          const stackStatus = latestStackStatus;
          latestStackStatus = undefined;
          // we are only fetching for new events "fetchSince"
          const stackEvents = await awsSdkManager.cloudFormation.getEvents(stackId, fetchSince).catch((err) => {
            // if there was an error when fetching stack events we cancel entire interval
            cleanupMonitoring();
            reject(err);
            throw err;
          });
          // A quiet stack may have finished without us seeing the completion event, so check its status more often.
          if (!stackEvents.length || fetchNumber % 4 === 0) refreshStackStatus();
          ++fetchNumber;
          // we are reversing to go from oldest to newest
          stackEvents.reverse();
          // if there are no new events, check stack status as fallback to detect if operation completed
          // this is critical - without this check, the monitoring could hang indefinitely if completion events are missed
          if (!stackEvents.length) {
            if (lastStackActionTimestamp) handleProgress();
            if (signalsEarlyFinish(stackStatus)) return finishWhileCleanupRuns();
            if (this.#stackStatusSignalsStackOperationSuccess({ stackStatus, cfStackAction })) {
              return afterStackOperationSuccess();
            }
            if (this.#stackStatusSignalsStackOperationFailure({ stackStatus, cfStackAction })) {
              return afterStackOperationFailure(stackStatus);
            }
            eventBatchEvaluationInProgress = false;
            return;
          }
          if (!lastStackActionTimestamp) {
            // we are searching for event which denotes beginning of action that should take place (i.e CREATE_IN_PROGRESS UPDATE_IN_PROGRESS...)
            const lastStackEvent = stackEvents.find((stackEvent) => {
              return (
                this.#isCloudformationStackEvent({ stackEvent }) &&
                this.#stackStatusSignalsStackOperationStart({
                  stackStatus: stackEvent.ResourceStatus as StackStatus,
                  cfStackAction
                })
              );
            });
            // if we were not able to find last stack action, the action have not started yet.
            if (!lastStackEvent) {
              eventBatchEvaluationInProgress = false;
              return;
            }
            lastStackActionTimestamp = lastStackEvent.Timestamp;
          }
          // setting new fetch since to the time of the newest fetched event
          fetchSince = new Date(stackEvents[stackEvents.length - 1].Timestamp);
          // we are extending the fetch since window to avoid potentially missing events (this is based on some hanging deployments, but was never confirmed)
          fetchSince.setSeconds(fetchSince.getSeconds() - 2);
          // filter handled events and events which are older than event that denotes beginning of action
          const filteredEvents = stackEvents.filter(
            (e) => !handledEvents.includes(e.EventId) && e.Timestamp > lastStackActionTimestamp
          );
          // handle new events
          for (const event of filteredEvents) {
            // arbitrary reaction to event (used for i.e detecting where to start polling for ecs service status)
            this.#reactToEvent({ stackEvent: event });
            const { ResourceStatus: status, LogicalResourceId } = event;
            // cloudformation stack resource gets special treatment
            if (this.#isCloudformationStackEvent({ stackEvent: event })) {
              // if event signals that desired operation is complete
              if (
                this.#stackStatusSignalsStackOperationSuccess({
                  stackStatus: event.ResourceStatus as StackStatus,
                  cfStackAction
                })
              ) {
                handleProgress();
                return afterStackOperationSuccess();
              }
              // if event signals that desired stack operation failed
              if (
                this.#stackStatusSignalsStackOperationFailure({
                  stackStatus: event.ResourceStatus as StackStatus,
                  cfStackAction
                })
              ) {
                // if there are no potential errors associated with specific resources, then the error is probably for stack as a whole (i.e when stack update is canceled)
                // in this case the error message included in stack error event is relevant
                if (!Object.keys(potentialErrorCausingEvents).length) {
                  potentialErrorCausingEvents[LogicalResourceId] = event;
                }
                handleProgress();
                return afterStackOperationFailure(event.ResourceStatus as StackStatus);
              }
              // if we are performing update and cleanup is happening after successful update
              if (
                cfStackAction === 'update' &&
                event.ResourceStatus === (StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS as any)
              ) {
                // When the same batch already holds the end of the cleanup, its failures can still be reported here.
                const cleanupAlreadyFinished = filteredEvents.some(
                  (laterEvent) =>
                    this.#isCloudformationStackEvent({ stackEvent: laterEvent }) &&
                    laterEvent.ResourceStatus === StackStatus.UPDATE_COMPLETE
                );
                if (signalsEarlyFinish(event.ResourceStatus as StackStatus) && !cleanupAlreadyFinished) {
                  handleProgress();
                  return finishWhileCleanupRuns();
                }
                cleanupAfterSuccessfulUpdateInProgress = true;
                _isResourceToHandleCountPossiblyInaccurate = true;
                inProgressResources.clear();
                inProgressMeta.clear();
                completeResources.clear();
                recentlyCompletedResources.length = 0;
              }
            }
            // if the new event says that some resource is in progress, we add event into inProgressResources
            else if (status.endsWith('IN_PROGRESS')) {
              inProgressResources.add(LogicalResourceId);
              if (!inProgressMeta.has(LogicalResourceId)) {
                inProgressMeta.set(LogicalResourceId, {
                  resourceType: event.ResourceType,
                  since: event.Timestamp?.getTime() ?? Date.now()
                });
              }
              seenResources.add(LogicalResourceId);
            }
            // if the new event says that some resource is complete, we add event into completedResources
            // however if some resource
            else if (
              status.endsWith('COMPLETE') &&
              // if we get UPDATE_ROLLBACK_COMPLETE during update operation we ignore it
              // it is only information that the resource whose update failed was rolled back - however it was still the cause for update failure and error remains
              (status !== ResourceStatus.UPDATE_ROLLBACK_COMPLETE || cfStackAction !== 'update')
            ) {
              const wasAlreadyComplete = completeResources.has(LogicalResourceId);
              completeResources.add(LogicalResourceId);
              if (!wasAlreadyComplete) {
                recentlyCompletedResources.push({
                  name: LogicalResourceId,
                  action: status.startsWith('CREATE') ? 'CREATE' : status.startsWith('DELETE') ? 'DELETE' : 'UPDATE',
                  ...(event.ResourceType ? { resourceType: event.ResourceType } : {})
                });
              }
              inProgressResources.delete(LogicalResourceId);
              inProgressMeta.delete(LogicalResourceId);
              seenResources.add(LogicalResourceId);
              delete potentialErrorCausingEvents[LogicalResourceId];
            }
            // if status of resource is failed, we should not fail entire operation
            // cloudformation can and does successfully retry a lot of operations which fail on first try
            else if (status && status.endsWith('FAILED')) {
              // we collect all potential error events
              // we only deal with them if the entire operation fails ^^^
              potentialErrorCausingEvents[LogicalResourceId] = event;
            }
            handledEvents.push(event.EventId);
          }
          handleProgress();
          // additional checking for stack status
          // if we somehow missed a cloudformation event signaling stack operation end, then operation might be hanging
          if (signalsEarlyFinish(stackStatus)) return finishWhileCleanupRuns();
          if (this.#stackStatusSignalsStackOperationSuccess({ stackStatus, cfStackAction })) {
            return afterStackOperationSuccess();
          }
          if (this.#stackStatusSignalsStackOperationFailure({ stackStatus, cfStackAction })) {
            return afterStackOperationFailure(stackStatus);
          }
          const earlyFailureMessage = getEarlyStartupFailureMessage();
          if (earlyFailureMessage) {
            cleanupMonitoring();
            return reject(
              new ExpectedError(
                'STACK',
                `Stack action ${this.stackActionType} failed.\n\n  1.\n     ${earlyFailureMessage}`,
                cfStackAction === 'create' || cfStackAction === 'update'
                  ? getHintsAfterStackFailureOperation({
                      cfStackAction,
                      stackId,
                      rolledBack: this.rollsBackOnFailure,
                      isFirstDeploy: this.isFirstDeploy,
                      stillRunning: true
                    })
                  : undefined
              )
            );
          }

          // Check if we should show the cancel banner (ECS task failed)
          showCancelBannerIfNeeded(resolve);
        } catch (err) {
          cleanupMonitoring();
          reject(
            new ExpectedError('STACK_MONITORING', `Error occurred while monitoring stack: ${err}`, [
              `You can monitor the process in console ${consoleLinks.stackUrl(
                globalStateManager.region,
                stackId,
                'events'
              )}.`
            ])
          );
        }
        eventBatchEvaluationInProgress = false;
      }, eventPollingIntervalMs);
    });
    cleanupMonitoring();
    return result;
  };

  #reactToEvent = ({ stackEvent }: { stackEvent: MonitoredStackEvent }) => {
    if (isEcsServiceCreateOrUpdateCloudformationEvent(stackEvent)) {
      const stpParentResourceName = calculatedStackOverviewManager.findStpParentNameOfCfResource({
        cfLogicalName: stackEvent.LogicalResourceId
      });
      this.#ecsDeploymentStatusPoller[stackEvent.LogicalResourceId] = new EcsServiceDeploymentStatusPoller({
        ecsServiceArn: stackEvent.PhysicalResourceId,
        pollerPrintName: stpParentResourceName,
        // time of event minus 10 seconds
        inspectDeploymentsCreatedAfterDate: new Date(new Date(stackEvent.Timestamp).getTime() - 10000),
        ecs: awsSdkManager.ecs,
        observability: awsSdkManager.observability,
        printer: awsSdkManager.printer,
        region: awsSdkManager.region
      });
    }
    // Monitor Lambda alias provisioned concurrency configuration
    if (isLambdaAliasProvisionedConcurrencyEvent(stackEvent) && stackEvent.PhysicalResourceId) {
      // Physical resource ID is the alias ARN: arn:aws:lambda:region:account:function:function-name:alias-name
      const arnParts = stackEvent.PhysicalResourceId.split(':');
      if (arnParts.length >= 8) {
        const functionName = arnParts[6];
        const aliasName = arnParts[7];
        const stpParentResourceName = calculatedStackOverviewManager.findStpParentNameOfCfResource({
          cfLogicalName: stackEvent.LogicalResourceId
        });
        // Derive log group name from function name
        const logGroupName = `/aws/lambda/${functionName}`;
        this.#lambdaProvisionedConcurrencyPoller[stackEvent.LogicalResourceId] = new LambdaProvisionedConcurrencyPoller(
          {
            functionName,
            aliasName,
            pollerPrintName: stpParentResourceName,
            lambda: awsSdkManager.lambda,
            observability: awsSdkManager.observability,
            printer: awsSdkManager.printer,
            region: awsSdkManager.region,
            logGroupName
          }
        );
      }
    }
  };

  #isCloudformationStackEvent = ({ stackEvent }: { stackEvent: StackEvent }) => {
    return (
      stackEvent.ResourceType === 'AWS::CloudFormation::Stack' && stackEvent.StackName === stackEvent.LogicalResourceId
    );
  };

  #stackStatusSignalsStackOperationStart = ({
    stackStatus,
    cfStackAction
  }: {
    stackStatus: StackStatus;
    cfStackAction: 'create' | 'update' | 'delete' | 'rollback';
  }) => {
    return (
      (cfStackAction === 'create' && stackStatus === StackStatus.CREATE_IN_PROGRESS) ||
      (cfStackAction === 'update' && stackStatus === StackStatus.UPDATE_IN_PROGRESS) ||
      // @todo - this is just workaround because sometimes we don't get UPDATE_IN_PROGRESS event for some reason
      // (cfStackAction === 'update' && stackStatus === StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS) ||
      // I believe this problem was solved (it was related to Matus' retarded computer which had un-synced clock multiple minutes) - fixed by syncing clocks with AWS
      (cfStackAction === 'delete' && stackStatus === StackStatus.DELETE_IN_PROGRESS) ||
      (cfStackAction === 'rollback' &&
        (stackStatus === StackStatus.UPDATE_ROLLBACK_IN_PROGRESS ||
          stackStatus === StackStatus.ROLLBACK_IN_PROGRESS ||
          stackStatus === StackStatus.DELETE_IN_PROGRESS))
    );
  };

  #stackStatusSignalsStackOperationSuccess = ({
    stackStatus,
    cfStackAction
  }: {
    stackStatus: StackStatus;
    cfStackAction: 'create' | 'update' | 'delete' | 'rollback';
  }) => {
    return (
      (cfStackAction === 'create' && stackStatus === StackStatus.CREATE_COMPLETE) ||
      (cfStackAction === 'update' && stackStatus === StackStatus.UPDATE_COMPLETE) ||
      (cfStackAction === 'delete' && stackStatus === StackStatus.DELETE_COMPLETE) ||
      (cfStackAction === 'rollback' &&
        (stackStatus === StackStatus.UPDATE_ROLLBACK_COMPLETE ||
          stackStatus === StackStatus.DELETE_COMPLETE ||
          stackStatus === StackStatus.ROLLBACK_COMPLETE ||
          stackStatus === StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS))
    );
  };

  #stackStatusSignalsStackOperationFailure = ({
    stackStatus,
    cfStackAction
  }: {
    stackStatus: StackStatus;
    cfStackAction: 'create' | 'update' | 'delete' | 'rollback';
  }) => {
    return (
      (cfStackAction === 'create' &&
        (stackStatus === StackStatus.CREATE_FAILED || stackStatus === StackStatus.DELETE_IN_PROGRESS)) ||
      (cfStackAction === 'update' &&
        (stackStatus === StackStatus.UPDATE_FAILED || stackStatus === StackStatus.UPDATE_ROLLBACK_IN_PROGRESS)) ||
      (cfStackAction === 'delete' && stackStatus === StackStatus.DELETE_FAILED) ||
      (cfStackAction === 'rollback' &&
        (stackStatus === StackStatus.UPDATE_ROLLBACK_FAILED ||
          stackStatus === StackStatus.ROLLBACK_FAILED ||
          stackStatus === StackStatus.DELETE_FAILED))
    );
  };

  #handleFailedEvents = async ({
    // cfStackOperation,
    potentialErrorCausingEvents
  }: {
    // cfStackOperation: 'create' | 'update' | 'remove';
    potentialErrorCausingEvents: { [logicalResourceId: string]: StackEvent };
  }): Promise<{ errorMessage: string; hints?: string[] }[]> => {
    // not all off the error events are relevant
    // we filter out those which are relevant for the user
    const relevantErrorEvents = Object.values(potentialErrorCausingEvents).filter(({ ResourceStatusReason }) => {
      // Cancellation is only a collateral from something else failing during create/update - we can ignore
      if (ResourceStatusReason.includes('cancelled')) {
        return false;
      }
      return true;
    });
    const handled = await Promise.all(
      relevantErrorEvents.map(async (event) => {
        if (isPreDeploymentValidationFailure(event) && event.OperationId) {
          const validationErrors = await awsSdkManager.cloudFormation
            .getValidationErrors({ stackName: event.StackId ?? this.#stackName, operationId: event.OperationId })
            .catch((error) => {
              tuiManager.debug(`Could not fetch the validation errors: ${error}`);
              return [];
            });
          if (validationErrors.length) return formatPreDeploymentValidationErrors(validationErrors);
        }
        const { handlerFunction } = cfFailedEventHandlers.find(({ eventMatchFunction }) => eventMatchFunction(event));
        return [
          await handlerFunction(event, {
            ecsDeploymentStatusPollers: this.#ecsDeploymentStatusPoller,
            lambdaProvisionedConcurrencyPollers: this.#lambdaProvisionedConcurrencyPoller
          })
        ];
      })
    );
    return handled.flat();
  };

  #getDetailOfSelectedResources = (resources: StackResourceSummary[]): Promise<EnrichedStackResourceInfo[]> => {
    return Promise.all(
      resources.map(async (resource) => {
        try {
          if (
            resource.ResourceType === 'AWS::ECS::Service' ||
            resource.ResourceType === 'Stacktape::ECSBlueGreenV1::Service'
          ) {
            const ecsService = await awsSdkManager.ecs.getService({
              serviceArn: resource.PhysicalResourceId
            });
            if (!ecsService) {
              return {
                ...resource,
                ecsService: undefined,
                ecsServiceTaskDefinition: {},
                ecsServiceTaskDefinitionTags: []
              };
            }
            const taskDefinitionInUse =
              ecsService.deployments?.find(
                ({ status, rolloutState }) => status === 'PRIMARY' && rolloutState !== DeploymentRolloutState.FAILED
              )?.taskDefinition ||
              ecsService.deployments
                ?.filter(
                  ({ status, rolloutState }) => status === 'ACTIVE' && rolloutState !== DeploymentRolloutState.FAILED
                )
                ?.sort(({ createdAt: ca1 }, { createdAt: ca2 }) => new Date(ca2).getTime() - new Date(ca1).getTime())
                ?.at(0)?.taskDefinition ||
              ecsService.taskSets?.find(({ status }) => status === 'PRIMARY')?.taskDefinition;

            const { tags = [], taskDefinition = {} } = taskDefinitionInUse
              ? await awsSdkManager.ecs.getTaskDefinition({
                  ecsTaskDefinitionFamily: taskDefinitionInUse
                })
              : {};
            return {
              ...resource,
              ecsService,
              ecsServiceTaskDefinition: taskDefinition,
              ecsServiceTaskDefinitionTags: tags
            };
          }
          if (resource.ResourceType === 'AWS::Lambda::Function') {
            const lambdaArn = arns.lambdaFromFullName({
              accountId: globalStateManager.targetAwsAccount.awsAccountId,
              region: globalStateManager.region,
              lambdaAwsName: resource.PhysicalResourceId
            });
            const resourceTags: Tag[] = Object.entries(
              await awsSdkManager.lambda.listTags({
                lambdaArn
              })
            ).map(([key, value]) => ({ key, value }));
            return { ...resource, tags: resourceTags };
          }
          if (resource.ResourceType === 'AWS::AutoScaling::AutoScalingGroup') {
            const asgDetail = await awsSdkManager.autoScaling.getGroup({
              name: resource.PhysicalResourceId
            });
            return { ...resource, asgDetail };
          }
          if (resource.ResourceType === 'AWS::RDS::DBInstance') {
            const rdsInstanceDetail = await awsSdkManager.rds.getInstance({
              identifier: resource.PhysicalResourceId
            });
            return { ...resource, rdsInstanceDetail };
          }
          if (resource.ResourceType === 'AWS::RDS::DBCluster') {
            const auroraClusterDetail = await awsSdkManager.rds.getCluster({
              identifier: resource.PhysicalResourceId
            });
            return { ...resource, auroraClusterDetail };
          }
          return resource;
        } catch (error) {
          tuiManager.debug(
            `[STP_DEBUG] Unable to enrich resource details for ${resource.LogicalResourceId} (${resource.ResourceType}): ${error}`
          );
          return resource;
        }
      })
    );
  };

  /**
   * A deploy finishes when CloudFormation starts deleting old resources (see `monitorStack`), so a deletion that fails
   * after that is reported by the next command that modifies the stack. Best effort: it never fails the command.
   */
  #getFailedCleanupDeletionsOfLastUpdate = async (stackDetails: StackDetails | undefined) => {
    if (stackDetails?.StackStatus !== StackStatus.UPDATE_COMPLETE || !stackDetails.LastUpdatedTime) return [];
    const updateStart = new Date(stackDetails.LastUpdatedTime.getTime() - 1000);
    return awsSdkManager.cloudFormation
      .getEvents(stackDetails.StackId ?? this.#stackName, updateStart)
      .then(findFailedCleanupDeletions)
      .catch(() => []);
  };

  #getUnreportedFailedCleanupDeletionsOfLastUpdate = async (
    stackDetails: StackDetails | undefined
  ): Promise<MonitoredStackEvent[]> =>
    takeUnreportedCleanupFailures({
      failures: await this.#getFailedCleanupDeletionsOfLastUpdate(stackDetails),
      deploymentBucketName: this.existingStackResources.find(
        ({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.deploymentBucket()
      )?.PhysicalResourceId
    });

  #withoutResourcesBeingCleanedUp = (resources: StackResourceSummary[]) => {
    const removedResources = this.#resourcesRemovedByUpdate;
    if (!removedResources) return resources;
    return resources.filter(({ LogicalResourceId }) => !removedResources.has(LogicalResourceId));
  };

  #filterNonExistentResources = (resources: StackResourceSummary[]) => {
    return resources.filter((resource) => {
      const resourceExists =
        resource.ResourceStatus !== ResourceStatus.DELETE_COMPLETE &&
        resource.ResourceStatus !== ResourceStatus.CREATE_FAILED;
      return resourceExists;
    });
  };
}

export const stackManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new StackManager());
