import type {
  ContainerDefinition,
  KeyValuePair,
  LogConfiguration,
  TaskDefinitionProperties
} from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import { defaultLogRetentionDays } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferencesToMountedEfsFilesystems } from '@domain-services/config-manager/utils/efs-filesystems';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { templateManager, type TemplateManager } from '@domain-services/template-manager';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getJobName } from '@stacktape/naming/workload-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getLanguageFromExtension } from '@utils/environment';
import { getContainerIssueFilterPattern, isIssueDetectionSupportedLanguage } from '../_utils/issue-detection';
import {
  getResolvedConnectToEnvironmentVariables,
  mergeConnectToEnvironmentVariables
} from '../_utils/connect-to-helper';
import { getEfsAccessPoint } from '../_utils/efs';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import { logClassSupportsSubscriptionFilters } from '../_utils/log-groups';
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
  getSchedulerRuleForScheduledInstanceRefresh,
  getWorkloadTracing
} from './utils';
import {
  OTEL_COLLECTOR_CONTAINER_NAME,
  getEcsTaskTracingRoleStatements
} from '@domain-services/config-manager/utils/container-tracing';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { isDevCommand } from '../../../../commands/dev/dev-mode-utils';

export const resolveContainerWorkloads = () => {
  const containerWorkloads = filterResourcesForDevMode(configManager.containerWorkloads);
  if (containerWorkloads.length) {
    containerWorkloads.forEach((definition) => resolveContainerWorkload({ definition }));
  }
};

export const resolveContainerWorkload = ({ definition }: { definition: StpContainerWorkload }) => {
  // these resources are shared between all ECS based container workloads
  if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.ecsExecutionRole())) {
    const { prebuiltImageRepositoryCredentialsSecretArns } = configManager;
    const containerSecretValueFroms = configManager.allContainerWorkloads.flatMap(({ containers }) =>
      containers.flatMap(({ secrets }) => (secrets || []).map(({ valueFrom }) => valueFrom))
    );
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsExecutionRole(),
      resource: getEcsExecutionRole(prebuiltImageRepositoryCredentialsSecretArns, containerSecretValueFroms),
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
  const workloadTracing = getWorkloadTracing(definition);
  if (
    !isDevCommand() &&
    definition.resources.instanceTypes &&
    configManager.tracedContainerWorkloads.some(({ name }) => name === definition.name)
  ) {
    tuiManager.warn(
      `Tracing skipped for \`${definition.name}\`: EC2-based workloads run in bridge network mode, where containers cannot reach the collector sidecar on localhost.`
    );
  }
  if (workloadTracing) {
    // The collector occupies one of ECS's 10 container slots and a reserved name.
    if (definition.containers.some(({ name }) => name === OTEL_COLLECTOR_CONTAINER_NAME)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_TRACING_CONTAINER_NAME_RESERVED',
        message: `Container name \`${OTEL_COLLECTOR_CONTAINER_NAME}\` in \`${definition.name}\` is reserved for the tracing collector.`,
        hints: 'Rename the container, or disable tracing for this workload.'
      });
    }
    if (definition.containers.length + 1 > 10) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_TRACING_CONTAINER_LIMIT_EXCEEDED',
        message: `Workload \`${definition.name}\` has ${definition.containers.length} containers; with tracing enabled the collector exceeds the ECS limit of 10 containers per task.`,
        hints: 'Reduce the container count, or disable tracing for this workload.'
      });
    }
  }
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
        resource: cfnResource('AWS::CodeDeploy::Application', {
          ApplicationName: awsResourceNames.ecsCodeDeployApp(calculatedStackOverviewManager.context.stackName),
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
  const ecsServiceResource = getEcsService({ workload: definition, blueGreen: isBlueGreen });
  if (workloadTracing) {
    // First-deploy ordering: tasks must not start exporting spans before Transaction Search accepts them.
    ecsServiceResource.DependsOn = [
      ...(Array.isArray(ecsServiceResource.DependsOn) ? ecsServiceResource.DependsOn : []),
      cfLogicalNames.customResourceTransactionSearch()
    ];
  }
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.ecsService(definition.name, isBlueGreen),
    resource: ecsServiceResource,
    nameChain
  });

  // Best-effort cleanup during stack deletion: deregister targets from LB target groups to avoid
  // CloudFormation timeouts when ECS services get stuck in DRAINING.
  // This is safe for create/update (no-op) and only runs on Delete.
  const deregisterTargetsCustomResource = getEcsDeregisterTargetsCustomResource({ workload: definition });
  if (deregisterTargetsCustomResource) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsDeregisterTargetsCustomResource(definition.name),
      resource: deregisterTargetsCustomResource,
      nameChain
    });
  }
  // adding monitoring link
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'metrics',
    nameChain,
    linkValue: cfEvaluatedLinks.ecsMonitoring(
      ref(cfLogicalNames.ecsCluster(definition.name)),
      getAtt(cfLogicalNames.ecsService(definition.name, isBlueGreen), 'Name')
    )
  });
  if (workloadTracing) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.ecsLogGroup(definition.name, OTEL_COLLECTOR_CONTAINER_NAME),
      resource: getEcsLogGroup({
        workloadName: definition.name,
        stackName: calculatedStackOverviewManager.context.stackName,
        containerName: OTEL_COLLECTOR_CONTAINER_NAME,
        retentionDays: defaultLogRetentionDays.containerWorkload
      }),
      nameChain
    });
  }
  definition.containers.forEach(({ name: containerName, logging, volumeMounts, packaging: containerPackaging }) => {
    if (!logging?.disabled) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.ecsLogGroup(definition.name, containerName),
        resource: getEcsLogGroup({
          workloadName: definition.name,
          stackName: calculatedStackOverviewManager.context.stackName,
          containerName,
          retentionDays: logging?.retentionDays || defaultLogRetentionDays.containerWorkload,
          logClass: logging?.logClass
        }),
        nameChain
      });
      calculatedStackOverviewManager.addStacktapeResourceLink({
        linkName: `logs-${containerName}`,
        nameChain,
        linkValue: cfEvaluatedLinks.logGroup(
          awsResourceNames.containerLogGroup({
            stackName: calculatedStackOverviewManager.context.stackName,
            stpResourceName: definition.name,
            containerName
          })
        )
      });
      if (logging?.logForwarding) {
        getResourcesNeededForLogForwarding({
          resource: definition,
          logGroupCfLogicalName: cfLogicalNames.ecsLogGroup(definition.name, containerName),
          logForwardingConfig: logging?.logForwarding,
          logClass: logging?.logClass
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

      // Issue detection: add subscription filter to detect runtime errors.
      // Skip if logForwarding is configured (max 2 subscription filters per CW log group).
      const containerEntryfilePath = (containerPackaging?.properties as { entryfilePath?: string })?.entryfilePath;
      const containerLanguage = getLanguageFromExtension(containerEntryfilePath);
      const isStpManagedPackaging = containerPackaging?.type === 'stacktape-image-buildpack';
      const hasContainerLogForwarding = !!logging?.logForwarding;
      if (
        configManager.isIssueDetectionEnabled &&
        isIssueDetectionSupportedLanguage(containerLanguage) &&
        isStpManagedPackaging &&
        !hasContainerLogForwarding &&
        logClassSupportsSubscriptionFilters(logging?.logClass)
      ) {
        const serviceLambdaArn = getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn');
        const filterLogicalName = cfLogicalNames.issueDetectionSubscriptionFilter(
          `${definition.name}-${containerName}`
        );
        const permissionLogicalName = cfLogicalNames.issueDetectionLogsPermission();

        if (!templateManager.getCfResourceFromTemplate(permissionLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            cfLogicalName: permissionLogicalName,
            nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL, 'stacktapeServiceLambda'],
            resource: cfnResource('AWS::Lambda::Permission', {
              Action: 'lambda:InvokeFunction',
              Principal: `logs.${calculatedStackOverviewManager.context.region}.amazonaws.com`,
              FunctionName: serviceLambdaArn,
              SourceAccount: ref('AWS::AccountId')
            })
          });
        }

        const containerLogGroupLogicalName = cfLogicalNames.ecsLogGroup(definition.name, containerName);
        const subscriptionFilterResource = cfnResource('AWS::Logs::SubscriptionFilter', {
          LogGroupName: awsResourceNames.containerLogGroup({
            stackName: calculatedStackOverviewManager.context.stackName,
            stpResourceName: definition.name,
            containerName
          }),
          FilterPattern: getContainerIssueFilterPattern(containerLanguage),
          DestinationArn: serviceLambdaArn
        });
        subscriptionFilterResource.DependsOn = [permissionLogicalName, containerLogGroupLogicalName];
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: filterLogicalName,
          nameChain,
          resource: subscriptionFilterResource
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
      stpResourceTypeOfReferencer: definition.type,
      connectTo: definition.connectTo
    });
  const roleCfLogicalName = cfLogicalNames.ecsTaskRole(definition.name);
  const mountedEfsFilesystems = resolveReferencesToMountedEfsFilesystems({ resource: definition });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: roleCfLogicalName,
    resource: getEcsTaskRole({
      workloadName: definition.name,
      iamRoleStatements: (definition.iamRoleStatements || []).concat(
        workloadTracing ? getEcsTaskTracingRoleStatements() : []
      ),
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
        if (hotSwapDeploy && containerDef.LogConfiguration) {
          // we also substitute log group name with actual name; containers without awslogs
          // (disabled logging) have nothing to substitute
          (containerDef.LogConfiguration as LogConfiguration).Options['awslogs-group'] =
            awsResourceNames.containerLogGroup({
              stackName: calculatedStackOverviewManager.context.stackName,
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
        // The Stacktape-managed collector must not receive connectTo variables — they can carry
        // database credentials. Exact match: user containers may legitimately use similar names.
        if (containerDef.Name === OTEL_COLLECTOR_CONTAINER_NAME) {
          return;
        }
        const currentVars = (containerDef.Environment || []) as KeyValuePair[];
        containerDef.Environment = mergeConnectToEnvironmentVariables(currentVars, variablesToInject);
      });
    }
  ];
};
