import type { UpdateServiceCommandInput } from '@aws-sdk/client-ecs';
import type { LoadBalancer } from '@cloudform/ecs/service';
import type { KeyValuePair as CfKeyValuePair, ContainerDefinition } from '@cloudform/ecs/taskDefinition';
import type CloudformationTaskDefinition from '@cloudform/ecs/taskDefinition';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { getTaskDefinitionTemplateOverrideFns } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads';
import {
  getEcsService,
  getEcsTaskDefinition
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads/utils';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { compareEcsTaskDefinitions } from '@domain-services/deployed-stack-overview-manager/hotswap-utils';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { EcsServiceDeploymentStatusPoller } from '@shared/aws/ecs-deployment-monitoring';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { getJobName } from '@shared/naming/utils';
import { NOT_YET_KNOWN_IDENTIFIER } from '@shared/utils/constants';
import { lowerCaseFirstCharacterOfEveryWord, serialize } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { replaceCloudformationRefFunctionsWithCfPhysicalIds } from '@utils/cloudformation';
import { getAwsSynchronizedTime } from '@utils/time';
import set from 'lodash/set';

const normalizeAndValidateCapacityProviderStrategyForEcsApi = (input: UpdateServiceCommandInput) => {
  const strategy = (input as any).capacityProviderStrategy;
  if (!Array.isArray(strategy)) {
    return;
  }

  // Allow users to specify CF-like refs in overrides (e.g. { Ref: 'LogicalId' }).
  // Convert them to physical IDs so the ECS API accepts them.
  const withResolvedRefs = replaceCloudformationRefFunctionsWithCfPhysicalIds(
    serialize(strategy),
    stackManager.existingStackResources
  );

  const sanitized = (withResolvedRefs as any[])
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry.capacityProvider;
      const capacityProvider = typeof raw === 'string' ? raw.trim() : undefined;
      if (!capacityProvider) return null;
      return { ...entry, capacityProvider };
    })
    .filter(Boolean);

  if (!sanitized.length) {
    // Avoid AWS error: "InvalidParameterException: Capacity Provider Identifier cannot be empty"
    delete (input as any).capacityProviderStrategy;
    return;
  }

  (input as any).capacityProviderStrategy = sanitized;
};

export const getECSHotswapInformation = async ({ workload }: { workload: StpContainerWorkload }) => {
  const {
    PhysicalResourceId: ecsServiceArn,
    ecsService: currentEcsService,
    ecsServiceTaskDefinition: currentTaskDefinition
  } = stackManager.existingStackResources.find(
    ({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.ecsService(workload.name, !!workload.deployment)
  );

  let calculatedTaskDefinition = getEcsTaskDefinition(workload);

  // substitute images
  (calculatedTaskDefinition.Properties.ContainerDefinitions as ContainerDefinition[]).forEach((containerDef) => {
    if (containerDef.Image === NOT_YET_KNOWN_IDENTIFIER) {
      containerDef.Image = deploymentArtifactManager.getImageUploadInfoForJob({
        jobName: getJobName({
          workloadName: workload.name,
          workloadType: workload.configParentResourceType,
          containerName: containerDef.Name as string
        }),
        hotSwapDeploy: true
      }).imageTagWithUrl;
    }
    // we also substitute log group name with actual name

    containerDef.LogConfiguration.Options['awslogs-group'] = awsResourceNames.containerLogGroup({
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: workload.name,
      containerName: containerDef.Name as string
    });
  });

  const temporaryTemplate: CloudformationTemplate = {
    Resources: { [cfLogicalNames.ecsTaskDefinition(workload.name)]: calculatedTaskDefinition }
  };

  // applying template overrides
  for (const fn of getTaskDefinitionTemplateOverrideFns({ resource: workload, hotSwapDeploy: true })) {
    await fn(temporaryTemplate);
  }

  calculatedTaskDefinition = temporaryTemplate.Resources[
    cfLogicalNames.ecsTaskDefinition(workload.name)
  ] as CloudformationTaskDefinition;

  // applying task definition overrides
  // we have to take overrides from the upmost parent
  const { overrides } = configManager.findResourceInConfig({ nameChain: workload.nameChain[0] })
    .resource as StpResource & { overrides?: ResourceOverrides };
  if (overrides) {
    Object.entries(overrides).forEach(([cfLogicalName, resourceOverrides]) => {
      if (cfLogicalName === cfLogicalNames.ecsTaskDefinition(workload.name)) {
        Object.entries(resourceOverrides).forEach(([pathToProp, value]) =>
          set(calculatedTaskDefinition.Properties, pathToProp, value)
        );
      }
    });
  }

  // resolving directives locally
  calculatedTaskDefinition = await configManager.resolveDirectives<CloudformationTaskDefinition>({
    itemToResolve: calculatedTaskDefinition,
    resolveRuntime: true,
    useLocalResolve: true
  });

  // we need to go through environment variables and transform them to strings.
  // this is because some of the resolved directives could have resolved to i.e number which is not allowed when registering task definition
  (calculatedTaskDefinition.Properties.ContainerDefinitions as ContainerDefinition[]).forEach((containerDef) => {
    (containerDef.Environment as CfKeyValuePair[]).forEach((envVar) => {
      envVar.Value = String(envVar.Value);
    });
  });

  // substituting Cloudformation intrinsic functions for actual values from already deployed task definition
  // these values are taken over from current definition
  calculatedTaskDefinition.Properties = {
    ...calculatedTaskDefinition.Properties,
    ExecutionRoleArn: currentTaskDefinition.executionRoleArn,
    TaskRoleArn: currentTaskDefinition.taskRoleArn,
    Tags: stackManager.getTags([{ name: tagNames.hotSwapDeploy(), value: 'true' }])
  };

  const { needsUpdate: ecsTaskDefinitionNeedsUpdate } = compareEcsTaskDefinitions({
    currentTaskDefinition,
    calculatedTaskDefinition
  });

  const ecsServiceNeedsUpdate =
    ecsTaskDefinitionNeedsUpdate || currentEcsService.taskDefinition !== currentTaskDefinition.taskDefinitionArn;

  return {
    ecsServiceArn,
    newCfTaskDefinition: calculatedTaskDefinition,
    workload,
    ecsTaskDefinition: { currentState: currentTaskDefinition, needsUpdate: ecsTaskDefinitionNeedsUpdate },
    ecsService: { currentState: currentEcsService, needsUpdate: ecsServiceNeedsUpdate },
    blueGreen: !!workload.deployment
  };
};

export const updateEcsService = async ({
  workload,
  ecsServiceArn,
  newCfTaskDefinition,
  blueGreen,
  ecsTaskDefinition,
  ecsService
}: Awaited<ReturnType<typeof getECSHotswapInformation>>) => {
  const updateWorkloadLogger = eventManager.createChildLogger({
    parentEventType: 'HOTSWAP_UPDATE',
    instanceId: workload.name
  });
  let { taskDefinitionArn } = ecsTaskDefinition.currentState;
  if (ecsTaskDefinition.needsUpdate) {
    await updateWorkloadLogger.startEvent({
      eventType: 'REGISTER_ECS_TASK_DEFINITION',
      description: 'Registering new task definition'
    });
    ({ taskDefinitionArn } = await awsSdkManager.registerEcsTaskDefinition({
      cloudformationEcsTaskDefinition: newCfTaskDefinition
    }));
    await updateWorkloadLogger.finishEvent({
      eventType: 'REGISTER_ECS_TASK_DEFINITION'
    });
  }

  if (ecsService.needsUpdate) {
    await updateWorkloadLogger.startEvent({
      eventType: 'UPDATE_ECS_SERVICE',
      description: 'Updating ECS service'
    });
    const clusterName = ecsServiceArn.split('/')[1];
    const { stackName } = globalStateManager.targetStack;
    const statusPoller = new EcsServiceDeploymentStatusPoller({
      ecsServiceArn,
      pollerPrintName: workload.nameChain[0],
      awsSdkManager,
      inspectDeploymentsCreatedAfterDate: await getAwsSynchronizedTime()
    });
    try {
      if (blueGreen) {
        const {
          Properties: { ECSService }
        } = getEcsService({ workload, blueGreen: true }) as ECSBlueGreenService;
        const { deploymentId } = await awsSdkManager.startEcsServiceCodeDeployUpdate({
          applicationName: awsResourceNames.ecsCodeDeployApp(stackName),
          autoRollbackConfiguration: {
            enabled: true,
            events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM', 'DEPLOYMENT_STOP_ON_REQUEST']
          },
          deploymentGroupName: awsResourceNames.codeDeployDeploymentGroup({
            stackName,
            stpResourceName: workload.name
          }),
          deploymentConfigName: 'CodeDeployDefault.ECSAllAtOnce',
          revision: {
            revisionType: 'AppSpecContent',
            appSpecContent: {
              content: JSON.stringify({
                Resources: [
                  {
                    TargetService: {
                      Type: 'AWS::ECS::Service',
                      Properties: {
                        TaskDefinition: taskDefinitionArn,
                        LoadBalancerInfo: {
                          ContainerName: (ECSService.LoadBalancers as LoadBalancer[])[0].ContainerName,
                          ContainerPort: (ECSService.LoadBalancers as LoadBalancer[])[0].ContainerPort
                        },
                        PlatformVersion: ECSService.PlatformVersion,
                        NetworkConfiguration:
                          ECSService.NetworkConfiguration &&
                          replaceCloudformationRefFunctionsWithCfPhysicalIds(
                            serialize(ECSService.NetworkConfiguration),
                            stackManager.existingStackResources
                          ),
                        CapacityProviderStrategy:
                          ECSService.CapacityProviderStrategy &&
                          replaceCloudformationRefFunctionsWithCfPhysicalIds(
                            serialize(ECSService.CapacityProviderStrategy),
                            stackManager.existingStackResources
                          )
                      }
                    }
                  }
                ]
              })
            }
          }
        });
        await awsSdkManager.waitForEcsServiceCodeDeployUpdateToFinish({ deploymentId });
      } else {
        const updateServiceInput: UpdateServiceCommandInput = {
          service: ecsServiceArn,
          taskDefinition: taskDefinitionArn,
          cluster: clusterName,
          forceNewDeployment: true,
          deploymentConfiguration: {
            // if set to 0, it can be a bit faster but there is downtime during deployment
            minimumHealthyPercent: 100,
            deploymentCircuitBreaker: {
              enable: true,
              rollback: true
            }
          }
        };

        // we have to take overrides from the upmost parent
        const { overrides } = configManager.findResourceInConfig({ nameChain: workload.nameChain[0] })
          .resource as StpResource & { overrides?: ResourceOverrides };
        if (overrides) {
          Object.entries(overrides).forEach(([cfLogicalName, resourceOverrides]) => {
            if (cfLogicalName === cfLogicalNames.ecsService(workload.name, blueGreen)) {
              Object.entries(resourceOverrides).forEach(([pathToProp, value]) =>
                set(updateServiceInput, lowerCaseFirstCharacterOfEveryWord(pathToProp), value)
              );
            }
          });
        }
        normalizeAndValidateCapacityProviderStrategyForEcsApi(updateServiceInput);
        await awsSdkManager.startEcsServiceRollingUpdate(updateServiceInput);
        await awsSdkManager.waitForEcsServiceRollingUpdateToFinish({ ecsServiceArn });
      }
    } finally {
      statusPoller.stopPolling();
    }
    await updateWorkloadLogger.finishEvent({
      eventType: 'UPDATE_ECS_SERVICE'
    });
  }
};
