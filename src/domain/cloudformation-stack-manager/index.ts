import type { Capability, StackEvent, StackResourceSummary } from '@aws-sdk/client-cloudformation';
import type { Tag } from '@aws-sdk/client-ecs';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { OnFailure, ResourceStatus, StackStatus } from '@aws-sdk/client-cloudformation';
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
} from '@shared/aws/cloudformation';
import {
  EcsServiceDeploymentStatusPoller,
  isEcsServiceCreateOrUpdateCloudformationEvent
} from '@shared/aws/ecs-deployment-monitoring';
import { arns } from '@shared/naming/arns';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { outputNames } from '@shared/naming/stack-output-names';
import { tagNames } from '@shared/naming/tag-names';
import { wait } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { ExpectedError } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { getNextVersionString } from '@utils/versioning';
import uniqBy from 'lodash/uniqBy';
import { getEstimatedRemainingPercent, getStackDeploymentEstimate } from './duration-estimation';
import { cfFailedEventHandlers, getHintsAfterStackFailureOperation } from './utils';

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

export class StackManager {
  callerIdentity: AwsCallerIdentity;
  existingStackDetails: StackDetails;
  existingStackResources: EnrichedStackResourceInfo[] = [];
  stackMonitoringInterval: NodeJS.Timeout;
  #stackName: string;

  // for polling ECS Service statuses during deploy
  #ecsDeploymentStatusPoller: { [serviceCfLogicalName: string]: EcsServiceDeploymentStatusPoller } = {};

  init = async ({
    stackName,
    commandModifiesStack,
    commandRequiresDeployedStack,
    parentEventType
  }: {
    stackName: string;
    commandModifiesStack: boolean;
    commandRequiresDeployedStack: boolean;
    /** Optional parent event for grouping (e.g., LOAD_METADATA_FROM_AWS) */
    parentEventType?: LoggableEventType;
  }) => {
    await eventManager.startEvent({
      eventType: 'FETCH_STACK_DATA',
      description: 'Fetching stack data',
      parentEventType,
      instanceId: parentEventType ? 'stack-data' : undefined
    });
    this.#stackName = stackName;

    let stackDetails = await awsSdkManager.getStackDetails(stackName);
    ({ stackDetails } = await this.waitForStackToBeReadyForOperation({
      stackDetails,
      commandModifiesStack,
      commandRequiresDeployedStack,
      progressLogger: eventManager
    }));

    // globalStateManager.args.disableDriftDetection ? [] : awsSdkManager.getStackDriftInformation(stackName),

    const stackResources = await awsSdkManager
      .getStackResources(stackName)
      .then(this.#filterNonExistentResources)
      .then(this.#getDetailOfSelectedResources);

    this.existingStackDetails = stackDetails;
    // this.stackDriftInformation = stackDriftInformation;
    this.existingStackResources = stackResources;

    await eventManager.finishEvent({
      eventType: 'FETCH_STACK_DATA',
      data: { stackDetails, stackResources },
      parentEventType,
      instanceId: parentEventType ? 'stack-data' : undefined
    });
  };

  get nextVersion() {
    return getNextVersionString(this.lastVersion);
  }

  get lastDeploymentStackOutput(): { [name: string]: string } {
    return this.existingStackDetails?.stackOutput || {};
  }

  get lastVersion() {
    return this.lastDeploymentStackOutput[outputNames.deploymentVersion()] || null;
  }

  get stackActionType(): StackActionType {
    if (globalStateManager.command === 'delete') {
      return 'delete';
    }
    if (globalStateManager.command === 'rollback') {
      return 'rollback';
    }
    if (globalStateManager.command === 'dev') {
      return 'dev';
    }
    if (globalStateManager.command === 'deploy' || globalStateManager.command === 'codebuild:deploy') {
      return this.existingStackDetails && this.existingStackResources.length ? 'update' : 'create';
    }
  }

  get isAutoRollbackEnabled() {
    const isDisabled =
      globalStateManager.args.disableAutoRollback === true ||
      configManager.deploymentConfig?.disableAutoRollback === true;
    return !isDisabled;
  }

  refetchStackDetails = async (stackName: string) => {
    await eventManager.startEvent({ eventType: 'REFETCH_STACK_DATA', description: 'Fetching stack data' });
    const [existingStackDetails, existingStackResources] = await Promise.all([
      awsSdkManager.getStackDetails(stackName),
      awsSdkManager
        .getStackResources(stackName)
        .then(this.#filterNonExistentResources)
        .then(this.#getDetailOfSelectedResources)
    ]);
    this.existingStackDetails = existingStackDetails;
    this.existingStackResources = existingStackResources;
    await eventManager.finishEvent({
      eventType: 'REFETCH_STACK_DATA',
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
    return (
      configManager.cfLogicalNamesToBeProtected?.map(
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
    const operationRequiresTags = this.stackActionType === 'create' || this.stackActionType === 'update';
    const rollbackAlarmArns = (triggerRollbackOnAlarms || [])
      .map((alarmNameOrArn) => {
        // if alarm is arn we use the arn
        if (alarmNameOrArn.startsWith('arn:')) {
          return alarmNameOrArn;
        }
        // if we got here, it means we are referencing alarm name defined in alarms section
        const alarmFromConfig = resolveReferenceToAlarm({
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
      StackName: this.#stackName,
      Tags: operationRequiresTags ? this.getTags() : [],
      Parameters: [],
      Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'] as Capability[],
      ...(!this.isAutoRollbackEnabled && { DisableRollback: true }),
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

  createResourcesForArtifacts = async () => {
    await eventManager.startEvent({
      eventType: 'CREATE_RESOURCES_FOR_ARTIFACTS',
      description: 'Creating resources for deployment artifacts'
    });
    const stackParams = this.getStackParams();
    // stack policy body includes information about protected resources
    // these are not created during "creation" of the stack, rather at the first update.
    // therefore this policy is not valid during stack creation.
    // eslint-disable-next-line
    const { StackPolicyBody, ...onCreateParams } = stackParams;
    const { StackId } = await awsSdkManager.createStack(templateManager.initialTemplate, {
      ...onCreateParams,
      ...(this.isAutoRollbackEnabled && { OnFailure: OnFailure.DELETE })
    });
    await this.monitorStack('create', StackId, (message) => {
      eventManager.updateEvent({
        eventType: 'CREATE_RESOURCES_FOR_ARTIFACTS',
        additionalMessage: message
      });
    });
    await eventManager.finishEvent({
      eventType: 'CREATE_RESOURCES_FOR_ARTIFACTS',
      data: { stackParams, template: templateManager.initialTemplate }
    });
  };

  waitForStackToBeReadyForOperation = async ({
    progressLogger,
    commandModifiesStack,
    commandRequiresDeployedStack,
    stackDetails: currentStackDetails
  }: {
    progressLogger: ProgressLogger;
    commandModifiesStack: boolean;
    commandRequiresDeployedStack: boolean;
    stackDetails: StackDetails;
  }) => {
    const stackName = this.#stackName;
    const { command } = globalStateManager;

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
        progressLogger.updateEvent({
          eventType: 'FETCH_STACK_DATA',
          additionalMessage: `Waiting for stack to reach stable state before proceeding. Current stack state: ${tuiManager.makeBold(
            stackDetails?.StackStatus
          )}`
        });
        await wait(4000);
        stackDetails = await awsSdkManager.getStackDetails(stackName);
      }
      // check state after stack was stabilized
      const stackIsNotReadyForOperation =
        ((command === 'deploy' || command === 'dev' || command === 'deployment-script:run') &&
          !STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS.includes(stackDetails.StackStatus as any)) ||
        (command === 'rollback' &&
          !STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS.includes(stackDetails.StackStatus as any));
      if (stackIsNotReadyForOperation) {
        throw stpErrors.e100({
          command,
          stackName,
          stackStatus: stackDetails.StackStatus as StackStatus
        });
      }
    }
    return { stackDetails };
  };

  validateTemplate = async ({ templateBody, templateUrl }: { templateUrl?: string; templateBody?: string }) => {
    await eventManager.startEvent({
      eventType: 'VALIDATE_TEMPLATE',
      description: 'Validating template'
    });
    await awsSdkManager.validateCloudformationTemplate({ templateBody, templateUrl });
    await eventManager.finishEvent({ eventType: 'VALIDATE_TEMPLATE' });
  };

  getChangeSet = async ({ templateBody, templateUrl }: { templateUrl?: string; templateBody?: string }) => {
    await eventManager.startEvent({
      eventType: 'CALCULATE_CHANGES',
      description: 'Calculating changes'
    });
    const res = await awsSdkManager.createCloudformationChangeSet({
      ...this.getStackParams(),
      ChangeSetName: `${this.#stackName}-${Date.now()}-${this.nextVersion}`,
      ...(templateUrl && { TemplateURL: templateUrl }),
      ...(templateBody && { TemplateBody: templateBody })
    });
    await eventManager.finishEvent({ eventType: 'CALCULATE_CHANGES', data: { changesToBeMade: res.changes } });
    return res;
  };

  getTags = (
    customTags?: CloudformationTag[]
  ): {
    Key: string;
    Value: string;
  }[] => {
    // @toto validate tags
    return uniqBy(
      (configManager.stackConfig.tags || [])
        .concat(customTags || [])
        .map(({ name, value }) => ({ Key: name, Value: value }))
        .concat([
          { Key: tagNames.stackName(), Value: this.#stackName },
          { Key: tagNames.projectName(), Value: globalStateManager.targetStack.projectName },
          { Key: tagNames.stage(), Value: globalStateManager.targetStack.stage },
          { Key: tagNames.globallyUniqueStackHash(), Value: globalStateManager.targetStack.globallyUniqueStackHash }
        ]),
      (el) => el.Key
    );
  };

  deployStack = async (templateUrl: string) => {
    await this.validateTemplate({ templateUrl });
    const stackParams = this.getStackParams();
    await eventManager.startEvent({
      eventType: 'UPDATE_STACK',
      description: 'Deploying infrastructure resources'
    });
    const { skipped } = await awsSdkManager.updateStack(templateUrl, stackParams);
    if (!skipped) {
      const result = await this.monitorStack('update', stackParams.StackName, (message) => {
        eventManager.updateEvent({ eventType: 'UPDATE_STACK', additionalMessage: message });
      });
      if (stackParams.StackPolicyBody) {
        await awsSdkManager.setStackPolicy(stackParams);
      }
      await awsSdkManager.setTerminationProtection(!!stackParams.EnableTerminationProtection, this.#stackName);
      await eventManager.finishEvent({
        eventType: 'UPDATE_STACK'
      });
      return result;
    }
    await eventManager.finishEvent({
      eventType: 'UPDATE_STACK',
      additionalMessage: 'Skipped. No updates need to be performed.'
    });
    return {};
  };

  deleteStack = async () => {
    await eventManager.startEvent({ eventType: 'DELETE_STACK', description: 'Deleting infrastructure resources' });
    const roleArn =
      configManager.deploymentConfig?.cloudformationRoleArn ||
      (deployedStackOverviewManager.getStackMetadata(stackMetadataNames.cloudformationRoleArn()) as string);

    // Best-effort: scale down ECS services before CloudFormation delete.
    // This helps avoid CloudFormation timeouts like:
    // "Resource <EcsServiceLogicalId>: Resource timed out waiting for completion"
    // which commonly happens when ECS tasks take a long time to drain/stop.
    await this.#scaleDownEcsServicesBeforeDelete().catch(() => {});

    await awsSdkManager.deleteStack(this.#stackName, {
      roleArn
    });
    const result = await this.monitorStack('delete', this.existingStackDetails.StackId, (message) =>
      eventManager.updateEvent({ eventType: 'DELETE_STACK', additionalMessage: message })
    );
    await eventManager.finishEvent({ eventType: 'DELETE_STACK', data: {} });
    return result;
  };

  #scaleDownEcsServicesBeforeDelete = async () => {
    const ecsServiceArns = (this.existingStackResources || [])
      .filter(
        ({ ResourceType, PhysicalResourceId }) =>
          (ResourceType === 'AWS::ECS::Service' || ResourceType === 'Stacktape::ECSBlueGreenV1::Service') &&
          PhysicalResourceId
      )
      .map(({ PhysicalResourceId }) => PhysicalResourceId);

    if (!ecsServiceArns.length) {
      return;
    }

    // Ask ECS to scale all services to 0
    await Promise.all(
      ecsServiceArns.map(async (ecsServiceArn) => {
        const cluster = ecsServiceArn.split('/')[1];
        if (!cluster) return;
        await awsSdkManager.startEcsServiceRollingUpdate({
          service: ecsServiceArn,
          cluster,
          desiredCount: 0
        });
      })
    );

    // Wait briefly for tasks to drain (best-effort; don't block forever)
    const maxWaitMs = 10 * 60 * 1000;
    const pollMs = 5000;
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const services = await Promise.all(
        ecsServiceArns.map(async (ecsServiceArn) => {
          try {
            return await awsSdkManager.getEcsService({ serviceArn: ecsServiceArn });
          } catch {
            // If the service is already gone, treat it as drained.
            return null;
          }
        })
      );
      const allDrained = services.every((svc) => !svc || (svc.runningCount || 0) === 0);
      if (allDrained) {
        return;
      }
      await wait(pollMs);
    }
  };

  rollbackStack = async () => {
    await eventManager.startEvent({ eventType: 'ROLLBACK_STACK', description: 'Rollback stack resources' });
    const roleArn =
      configManager.deploymentConfig?.cloudformationRoleArn ||
      (deployedStackOverviewManager.getStackMetadata(stackMetadataNames.cloudformationRoleArn()) as string);
    if (
      this.existingStackDetails.StackStatus === StackStatus.UPDATE_FAILED ||
      this.existingStackDetails.StackStatus === StackStatus.CREATE_FAILED
    ) {
      await awsSdkManager.rollbackStack(this.#stackName, {
        roleArn
      });
    } else if (this.existingStackDetails.StackStatus === StackStatus.UPDATE_ROLLBACK_FAILED) {
      await awsSdkManager.continueUpdateRollback(this.#stackName, {
        roleArn
      });
    }
    const result = await this.monitorStack('rollback', this.existingStackDetails.StackId, (message) =>
      eventManager.updateEvent({ eventType: 'ROLLBACK_STACK', additionalMessage: message })
    );
    await eventManager.finishEvent({ eventType: 'ROLLBACK_STACK', data: {} });
    return result;
  };

  monitorStack = async (
    cfStackAction: 'create' | 'update' | 'delete' | 'rollback',
    stackId: string,
    onProgress: (message: string) => any
  ): Promise<{ warningMessages?: string[] }> => {
    const handledEvents: string[] = [];
    const potentialErrorCausingEvents: { [logicalResourceId: string]: StackEvent } = {};
    const inProgressResources = new Set<string>();
    const completeResources = new Set<string>();
    const seenResources = new Set<string>();
    let resourcesToHandleCount: number;
    let isResourceToHandleCountPossiblyInaccurate = false;
    if (cfStackAction === 'create') {
      // when we are creating, we know exactly what amount of resources we need to create
      resourcesToHandleCount = Object.keys(templateManager.initialTemplate.Resources).length;
    } else if (cfStackAction === 'delete' || cfStackAction === 'rollback') {
      // when we are removing, we know what amount of resources we need to remove
      resourcesToHandleCount = this.existingStackResources.length;
    } else {
      // when running update command we do not know accurately how many resources need to be updated
      isResourceToHandleCountPossiblyInaccurate = true;
      resourcesToHandleCount = Object.keys(templateManager.template.Resources).length;
    }
    const templateDiff = cfStackAction === 'update' ? templateManager.getOldTemplateDiff() : undefined;
    const updatedResourceLogicalNames =
      cfStackAction === 'update' ? templateDiff?.resources?.logicalIds.filter(Boolean) : undefined;
    const { totalSeconds } = getStackDeploymentEstimate({
      cfStackAction,
      template: cfStackAction === 'create' ? templateManager.initialTemplate : templateManager.template,
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

    const cleanupMonitoring = () => {
      clearInterval(this.stackMonitoringInterval);
      Object.values(this.#ecsDeploymentStatusPoller).forEach((statusPoller) => statusPoller.stopPolling());
    };

    const handleProgress = () => {
      // printing updating progress
      const inProgressAmount = inProgressResources.size;
      const completedAmount = completeResources.size;
      const inProgressPart =
        inProgressAmount === 0 && completedAmount === 0
          ? `Performing ${cfStackAction}`
          : `${
              cleanupAfterSuccessfulUpdateInProgress ? 'Cleaning up old resources in progress' : 'In progress'
            }: ${inProgressAmount}`;
      const finishedPart =
        cfStackAction === 'create'
          ? `Finished: ${completedAmount}/${isResourceToHandleCountPossiblyInaccurate ? '~' : ''}${resourcesToHandleCount}`
          : `Finished: ${completedAmount}`;
      const remainingPercent = getEstimatedRemainingPercent({
        totalSeconds,
        startTime: lastStackActionTimestamp,
        now: new Date()
      });
      const remainingPart =
        cleanupAfterSuccessfulUpdateInProgress || remainingPercent === null
          ? ''
          : ` Est. remaining: ~${remainingPercent === 0 ? '<1' : remainingPercent}%`;
      const changeSummary = formatChangeSummary({
        cfStackAction,
        templateDiff,
        createResourcesCount: resourcesToHandleCount,
        deleteResourcesCount: resourcesToHandleCount
      });
      const plannedResources =
        updatedResourceLogicalNames && updatedResourceLogicalNames.length > 0
          ? new Set(updatedResourceLogicalNames)
          : undefined;
      const completedPlanned = plannedResources
        ? Array.from(completeResources).filter((name) => plannedResources.has(name)).length
        : completeResources.size;
      const inProgressPlanned = plannedResources
        ? Array.from(inProgressResources).filter((name) => plannedResources.has(name)).length
        : inProgressResources.size;
      const totalPlannedBase = plannedResources ? plannedResources.size : resourcesToHandleCount;
      const totalSeen = seenResources.size;
      const totalPlanned = Math.max(totalPlannedBase, totalSeen);
      const waitingPlanned = Math.max(0, totalPlanned - completedPlanned - inProgressPlanned);
      const activeList = formatResourceList(Array.from(inProgressResources), 3);
      const waitingList =
        waitingPlanned > 0
          ? formatResourceList(
              plannedResources
                ? Array.from(plannedResources).filter(
                    (name) => !inProgressResources.has(name) && !completeResources.has(name)
                  )
                : Array.from(seenResources).filter(
                    (name) => !inProgressResources.has(name) && !completeResources.has(name)
                  ),
              3
            )
          : 'none';
      const summaryPart = `Summary: ${tuiManager.makeBold('created')}=${changeSummary.counts.created} ${tuiManager.makeBold(
        'updated'
      )}=${changeSummary.counts.updated} ${tuiManager.makeBold('deleted')}=${changeSummary.counts.deleted}.`;
      const detailPart = `Details: ${tuiManager.makeBold('created')}=${formatResourceList(
        changeSummary.lists.created,
        4
      )}; ${tuiManager.makeBold('updated')}=${formatResourceList(changeSummary.lists.updated, 4)}; ${tuiManager.makeBold(
        'deleted'
      )}=${formatResourceList(changeSummary.lists.deleted, 4)}.`;
      const progressMessage = `${inProgressPart}. ${finishedPart}.${remainingPart}`.trim();
      onProgress(
        `${progressMessage} Progress: ${completedPlanned}/${totalPlanned}. Currently updating: ${activeList}. Waiting to start update: ${waitingList}. ${summaryPart} ${detailPart}`
      );
    };

    const { warningMessages }: { warningMessages?: string[] } = await new Promise((resolve, reject) => {
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

      const afterStackOperationFailure = async () => {
        cleanupMonitoring();

        const handledFailedEvents = await this.#handleFailedEvents({ potentialErrorCausingEvents });
        tuiManager.writeInfo('handledFailedEvents', JSON.stringify(handledFailedEvents, null, 2));
        const formattedStackErrorText = tuiManager.formatComplexStackErrors(handledFailedEvents, 2);
        const hints = getHintsAfterStackFailureOperation({
          cfStackAction,
          stackId,
          isAutoRollbackEnabled: this.isAutoRollbackEnabled
        });
        return reject(
          new ExpectedError(
            'STACK',
            `Stack action ${this.stackActionType} failed.\n\n${formattedStackErrorText}\n`,
            hints
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
          // we are only fetching for new events "fetchSince"
          const [stackEvents, stackDetailsFromBatch] = await Promise.all([
            awsSdkManager.getStackEvents(stackId, fetchSince),
            fetchNumber % 4 === 0 && awsSdkManager.getStackDetails(stackId)
          ]).catch((err) => {
            // if there was an error when fetching stack events we cancel entire interval
            cleanupMonitoring();
            reject(err);
            throw err;
          });
          ++fetchNumber;
          // we are reversing to go from oldest to newest
          stackEvents.reverse();
          // if there are no new events, check stack details as fallback to detect if operation completed
          // this is critical - without this check, the monitoring could hang indefinitely if completion events are missed
          if (!stackEvents.length) {
            const stackDetails = stackDetailsFromBatch || (await awsSdkManager.getStackDetails(stackId));
            if (
              this.#stackStatusSignalsStackOperationSuccess({
                stackStatus: stackDetails?.StackStatus as StackStatus,
                cfStackAction
              })
            ) {
              return afterStackOperationSuccess();
            }
            if (
              this.#stackStatusSignalsStackOperationFailure({
                stackStatus: stackDetails?.StackStatus as StackStatus,
                cfStackAction
              })
            ) {
              return afterStackOperationFailure();
            }
            eventBatchEvaluationInProgress = false;
            return;
          }
          // use stackDetails from batch for later fallback check
          const stackDetails = stackDetailsFromBatch;
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
                return afterStackOperationFailure();
              }
              // if we are performing update and cleanup is happening after successful update
              if (
                cfStackAction === 'update' &&
                event.ResourceStatus === (StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS as any)
              ) {
                cleanupAfterSuccessfulUpdateInProgress = true;
                isResourceToHandleCountPossiblyInaccurate = true;
                inProgressResources.clear();
                completeResources.clear();
              }
            }
            // if the new event says that some resource is in progress, we add event into inProgressResources
            else if (status.endsWith('IN_PROGRESS')) {
              inProgressResources.add(LogicalResourceId);
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
              completeResources.add(LogicalResourceId);
              inProgressResources.delete(LogicalResourceId);
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
          // additional checking for stack status from stack details
          // if we somehow missed a cloudformation event signaling stack operation end, then operation might be hanging
          if (
            this.#stackStatusSignalsStackOperationSuccess({
              stackStatus: stackDetails?.StackStatus as StackStatus,
              cfStackAction
            })
          ) {
            return afterStackOperationSuccess();
          }
          if (
            this.#stackStatusSignalsStackOperationFailure({
              stackStatus: stackDetails?.StackStatus as StackStatus,
              cfStackAction
            })
          ) {
            return afterStackOperationFailure();
          }
          handleProgress();
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
      }, MONITORING_FREQUENCY_SECONDS * 1000);
    });
    cleanupMonitoring();
    return { warningMessages };
  };

  #reactToEvent = ({ stackEvent }: { stackEvent: StackEvent }) => {
    if (isEcsServiceCreateOrUpdateCloudformationEvent(stackEvent)) {
      const stpParentResourceName = calculatedStackOverviewManager.findStpParentNameOfCfResource({
        cfLogicalName: stackEvent.LogicalResourceId
      });
      this.#ecsDeploymentStatusPoller[stackEvent.LogicalResourceId] = new EcsServiceDeploymentStatusPoller({
        ecsServiceArn: stackEvent.PhysicalResourceId,
        pollerPrintName: stpParentResourceName,
        // time of event minus 10 seconds
        inspectDeploymentsCreatedAfterDate: new Date(new Date(stackEvent.Timestamp).getTime() - 10000),
        awsSdkManager
      });
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

  #handleFailedEvents = ({
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
    return Promise.all(
      relevantErrorEvents.map(async (event) => {
        const { handlerFunction } = cfFailedEventHandlers.find(({ eventMatchFunction }) => eventMatchFunction(event));
        return handlerFunction(event, { ecsDeploymentStatusPollers: this.#ecsDeploymentStatusPoller });
      })
    );
  };

  #getDetailOfSelectedResources = (resources: StackResourceSummary[]): Promise<EnrichedStackResourceInfo[]> => {
    return Promise.all(
      resources.map(async (resource) => {
        if (
          resource.ResourceType === 'AWS::ECS::Service' ||
          resource.ResourceType === 'Stacktape::ECSBlueGreenV1::Service'
        ) {
          const ecsService = await awsSdkManager.getEcsService({
            serviceArn: resource.PhysicalResourceId
          });
          const taskDefinitionInUse =
            // rolling deployments
            ecsService.deployments?.find(
              ({ status, rolloutState }) => status === 'PRIMARY' && rolloutState !== DeploymentRolloutState.FAILED
            )?.taskDefinition ||
            ecsService.deployments
              ?.filter(
                ({ status, rolloutState }) => status === 'ACTIVE' && rolloutState !== DeploymentRolloutState.FAILED
              )
              ?.sort(({ createdAt: ca1 }, { createdAt: ca2 }) => new Date(ca2).getTime() - new Date(ca1).getTime())
              ?.at(0)?.taskDefinition ||
            // bg deployments
            ecsService.taskSets?.find(({ status }) => status === 'PRIMARY')?.taskDefinition;

          const { tags = [], taskDefinition = {} } = taskDefinitionInUse
            ? await awsSdkManager.getEcsTaskDefinition({
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
            await awsSdkManager.getLambdaTags({
              lambdaArn
            })
          ).map(([key, value]) => ({ key, value }));
          return { ...resource, tags: resourceTags };
        }
        if (resource.ResourceType === 'AWS::AutoScaling::AutoScalingGroup') {
          const asgDetail = await awsSdkManager.getAutoscalingGroupInfo({
            autoscalingGroupAwsName: resource.PhysicalResourceId
          });
          return { ...resource, asgDetail };
        }
        if (resource.ResourceType === 'AWS::RDS::DBInstance') {
          const rdsInstanceDetail = await awsSdkManager.getRdsInstanceDetail({
            rdsInstanceIdentifier: resource.PhysicalResourceId
          });
          return { ...resource, rdsInstanceDetail };
        }
        if (resource.ResourceType === 'AWS::RDS::DBCluster') {
          const auroraClusterDetail = await awsSdkManager.getRdsClusterDetail({
            rdsClusterIdentifier: resource.PhysicalResourceId
          });
          return { ...resource, auroraClusterDetail };
        }
        return resource;
      })
    );
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
