import type { ContainerDefinition, KeyValuePair, TaskDefinitionProperties } from '@cloudform/ecs/taskDefinition';
import { globalStateManager } from '@application-services/global-state-manager';
import Application from '@cloudform/codeDeploy/application';
import { GetAtt, Ref } from '@cloudform/functions';
import { defaultLogRetentionDays } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferencesToMountedEfsFilesystems } from '@domain-services/config-manager/utils/efs-filesystems';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getJobName } from '@shared/naming/utils';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getResolvedConnectToEnvironmentVariables } from '../_utils/connect-to-helper';
import { getEfsAccessPoint } from '../_utils/efs';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import { getAtlasMongoRoleAssociatedUserResource } from '../_utils/role-helpers';
import { resolveApplicationLoadBalancerEvents } from './events/application-load-balancer';
import { resolveHttpApiEvents } from './events/http-api-gateway';
import { resolveNetworkLoadBalancerEvents } from './events/network-load-balancer';
import {
  getAutoScalingPolicy,
  getAutoScalingTarget,
  getCodeDeployDeploymentGroup,
  getEc2AutoscalingGroup,
  getEc2AutoscalingGroupWarmPool,
  getEcsAutoScalingRole,
  getEcsCluster,
  getEcsDeregisterTargetsCustomResource,
  getEcsDisableManagedTerminationProtectionCustomResource,
  getEcsEc2CapacityProvider,
  getEcsEc2CapacityProviderAssociation,
  getEcsEc2ForceDeleteAsgCustomResource,
  getEcsEc2InstanceLaunchTemplate,
  getEcsEc2InstanceProfile,
  getEcsEc2InstanceRole,
  getEcsExecutionRole,
  getEcsLogGroup,
  getEcsService,
  getEcsServiceSecurityGroup,
  getEcsTaskDefinition,
  getEcsTaskRole,
  getSchedulerRoleForScheduledInstanceRefresh,
  getSchedulerRuleForScheduledInstanceRefresh
} from './utils';

export const resolveContainerWorkloads = () => {
  const { containerWorkloads } = configManager;
  if (containerWorkloads.length) {
    containerWorkloads.forEach((definition) => resolveContainerWorkload({ definition }));
  }
};

export const resolveContainerWorkload = ({ definition }: { definition: StpContainerWorkload }) => {
  // these resources are shared between all ECS based container workloads
  if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.ecsExecutionRole())) {
    const { prebuiltImageRepositoryCredentialsSecretArns } = configManager;
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsExecutionRole(),
      resource: getEcsExecutionRole(prebuiltImageRepositoryCredentialsSecretArns),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
  if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.ecsAutoScalingRole())) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsAutoScalingRole(),
      resource: getEcsAutoScalingRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }

  const isBlueGreen = !!definition.deployment;
  const { nameChain } = definition;
  if (definition.scaling) {
    const { scalingPolicy } = definition.scaling;
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.autoScalingTarget(definition.name),
      resource: getAutoScalingTarget(definition.name, definition),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.autoScalingPolicy(definition.name, 'ECSServiceAverageCPUUtilization'),
      resource: getAutoScalingPolicy(
        definition.name,
        'ECSServiceAverageCPUUtilization',
        scalingPolicy?.keepAvgCpuUtilizationUnder || 80
      ),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.autoScalingPolicy(definition.name, 'ECSServiceAverageMemoryUtilization'),
      resource: getAutoScalingPolicy(
        definition.name,
        'ECSServiceAverageMemoryUtilization',
        scalingPolicy?.keepAvgMemoryUtilizationUnder || 80
      ),
      nameChain
    });
  }

  if (definition.resources.instanceTypes) {
    if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.ecsEc2InstanceRole())) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.ecsEc2InstanceRole(),
        resource: getEcsEc2InstanceRole(),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    }
    if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.eventBusRoleForScheduledInstanceRefresh())) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh(),
        resource: getSchedulerRoleForScheduledInstanceRefresh(),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    }
    if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.ecsEc2InstanceProfile())) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.ecsEc2InstanceProfile(),
        resource: getEcsEc2InstanceProfile(),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    }
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate(definition.name),
      resource: getEcsEc2InstanceLaunchTemplate({ workload: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsEc2AutoscalingGroup(definition.name),
      resource: getEc2AutoscalingGroup({ workload: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource(definition.name),
      resource: getEcsEc2ForceDeleteAsgCustomResource({ workload: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsDisableManagedTerminationProtectionCustomResource(definition.name),
      resource: getEcsDisableManagedTerminationProtectionCustomResource({ workload: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsEc2CapacityProvider(definition.name),
      resource: getEcsEc2CapacityProvider({ workload: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation(definition.name),
      resource: getEcsEc2CapacityProviderAssociation({ workload: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh(definition.name),
      resource: getSchedulerRuleForScheduledInstanceRefresh({ workload: definition }),
      nameChain
    });
    if (definition.resources.enableWarmPool) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool(definition.name),
        resource: getEc2AutoscalingGroupWarmPool({ workload: definition }),
        nameChain
      });
    }
    // calculatedStackOverviewManager.addCfChildResource({
    //   cfLogicalName: cfLogicalNames.ecsScheduledMaintenanceEventBusRule(definition.name),
    //   nameChain,
    //   resource: getEventBusRuleForScheduledEcsServiceRedeploy({ workload: definition })
    // });
    // calculatedStackOverviewManager.addCfChildResource({
    //   cfLogicalName: cfLogicalNames.ecsScheduledMaintenanceLambdaPermission(definition.name),
    //   nameChain,
    //   resource: getLambdaPermissionForScheduledEcsServiceRedeploy({ workload: definition })
    // });
  }
  if (definition.deployment) {
    if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.ecsCodeDeployApp())) {
      calculatedStackOverviewManager.addCfChildResource({
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        cfLogicalName: cfLogicalNames.ecsCodeDeployApp(),
        resource: new Application({
          ApplicationName: awsResourceNames.ecsCodeDeployApp(globalStateManager.targetStack.stackName),
          ComputePlatform: 'ECS'
        })
      });
    }
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.codeDeployDeploymentGroup(definition.name),
      resource: getCodeDeployDeploymentGroup({ workload: definition })
    });
  }
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.ecsCluster(definition.name),
    resource: getEcsCluster({ workload: definition }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.workloadSecurityGroup(definition.name),
    resource: getEcsServiceSecurityGroup({
      workload: definition
    }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.ecsService(definition.name, isBlueGreen),
    resource: getEcsService({ workload: definition, blueGreen: isBlueGreen }),
    nameChain
  });

  // Best-effort cleanup during stack deletion: deregister targets from LB target groups to avoid
  // CloudFormation timeouts when ECS services get stuck in DRAINING.
  // This is safe for create/update (no-op) and only runs on Delete.
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.ecsDeregisterTargetsCustomResource(definition.name),
    resource: getEcsDeregisterTargetsCustomResource({ workload: definition }),
    nameChain
  });
  // adding monitoring link
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'metrics',
    nameChain,
    linkValue: cfEvaluatedLinks.ecsMonitoring(
      Ref(cfLogicalNames.ecsCluster(definition.name)),
      GetAtt(cfLogicalNames.ecsService(definition.name, isBlueGreen), 'Name')
    )
  });
  definition.containers.forEach(({ name: containerName, logging, volumeMounts }) => {
    if (!logging?.disabled) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.ecsLogGroup(definition.name, containerName),
        resource: getEcsLogGroup({
          workloadName: definition.name,
          stackName: globalStateManager.targetStack.stackName,
          containerName,
          retentionDays: logging?.retentionDays || defaultLogRetentionDays.containerWorkload
        }),
        nameChain
      });
      calculatedStackOverviewManager.addStacktapeResourceLink({
        linkName: `logs-${containerName}`,
        nameChain,
        linkValue: cfEvaluatedLinks.logGroup(
          awsResourceNames.containerLogGroup({
            stackName: globalStateManager.targetStack.stackName,
            stpResourceName: definition.name,
            containerName
          })
        )
      });
      if (logging?.logForwarding) {
        getResourcesNeededForLogForwarding({
          resource: definition,
          logGroupCfLogicalName: cfLogicalNames.ecsLogGroup(definition.name, containerName),
          logForwardingConfig: logging?.logForwarding
        }).forEach(({ cfLogicalName, cfResource }) => {
          if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              nameChain,
              cfLogicalName,
              resource: cfResource
            });
          }
        });
      }

      // Handle EFS volume mounts
      if (volumeMounts) {
        volumeMounts.forEach((mount) => {
          const accessPointLogicalName = cfLogicalNames.efsAccessPoint({
            stpResourceName: definition.name,
            efsFilesystemName: mount.properties.efsFilesystemName,
            rootDirectory: mount.properties.rootDirectory
          });

          if (!templateManager.getCfResourceFromTemplate(accessPointLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: accessPointLogicalName,
              resource: getEfsAccessPoint({
                efsFilesystemName: mount.properties.efsFilesystemName,
                rootDirectory: mount.properties.rootDirectory
              }),
              nameChain
            });
          }
        });
      }
    }
  });
  resolveApplicationLoadBalancerEvents({ definition });
  resolveHttpApiEvents(definition);
  resolveNetworkLoadBalancerEvents({ definition });
  const { accessToResourcesRequiringRoleChanges, accessToAtlasMongoClusterResources, accessToAwsServices } =
    resolveConnectToList({
      stpResourceNameOfReferencer: definition.name,
      connectTo: definition.connectTo
    });
  const roleCfLogicalName = cfLogicalNames.ecsTaskRole(definition.name);
  const mountedEfsFilesystems = resolveReferencesToMountedEfsFilesystems({ resource: definition });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: roleCfLogicalName,
    resource: getEcsTaskRole({
      workloadName: definition.name,
      iamRoleStatements: definition.iamRoleStatements,
      accessToResourcesRequiringRoleChanges,
      accessToAwsServices,
      enableRemoteSessions: definition.enableRemoteSessions,
      mountedEfsFilesystems
    }),
    nameChain
  });
  // here we are addressing creation of atlas mongo user which is associated to this role
  if (accessToAtlasMongoClusterResources?.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole(definition.name),
      nameChain,
      resource: getAtlasMongoRoleAssociatedUserResource({
        accessToAtlasMongoClusterResources,
        roleCfLogicalName
      })
    });
  }
  const ecsTaskDefinitionLogicalName = cfLogicalNames.ecsTaskDefinition(definition.name);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: ecsTaskDefinitionLogicalName,
    resource: getEcsTaskDefinition(definition),
    nameChain
  });
  getTaskDefinitionTemplateOverrideFns({ resource: definition }).forEach((fn) => {
    templateManager.addFinalTemplateOverrideFn(fn);
  });
};

export const getTaskDefinitionTemplateOverrideFns = ({
  resource,
  hotSwapDeploy
}: {
  resource: StpContainerWorkload;
  hotSwapDeploy?: boolean;
}): TemplateManager['templateOverrideFunctions'][number][] => {
  return [
    async (template) => {
      const templateResourceProps = template.Resources[cfLogicalNames.ecsTaskDefinition(resource.name)]
        .Properties as TaskDefinitionProperties;
      (templateResourceProps.ContainerDefinitions as ContainerDefinition[]).forEach((containerDef) => {
        const imageUrl = deploymentArtifactManager.getImageUploadInfoForJob({
          jobName: getJobName({
            workloadName: resource.name,
            workloadType: resource.configParentResourceType,
            containerName: containerDef.Name as string
          }),
          hotSwapDeploy
        })?.imageTagWithUrl;
        if (imageUrl) {
          containerDef.Image = imageUrl;
        }
        if (hotSwapDeploy) {
          // we also substitute log group name with actual name
          containerDef.LogConfiguration.Options['awslogs-group'] = awsResourceNames.containerLogGroup({
            stackName: globalStateManager.targetStack.stackName,
            stpResourceName: resource.name,
            containerName: containerDef.Name as string
          });
        }
      });
    },
    // @note we can't set this upfront, because the parameters are only known after entire template has been resolved
    async (template) => {
      const templateResourceProps = template.Resources[cfLogicalNames.ecsTaskDefinition(resource.name)]
        .Properties as TaskDefinitionProperties;

      const variablesToInject = getResolvedConnectToEnvironmentVariables({
        connectTo: resource.connectTo,
        localResolve: hotSwapDeploy
      });

      (templateResourceProps.ContainerDefinitions as ContainerDefinition[]).forEach((containerDef) => {
        const currentVars = (containerDef.Environment || []) as KeyValuePair[];
        variablesToInject.forEach(({ Name, Value }) => {
          const varIndex = currentVars.findIndex(({ Name: AlreadyAddedName }) => Name === AlreadyAddedName);
          if (varIndex >= 0) {
            currentVars[varIndex] = { Name, Value };
          } else {
            currentVars.push({ Name, Value });
          }
        });
      });
    }
  ];
};
