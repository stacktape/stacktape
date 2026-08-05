import type {
  ContainerDefinition,
  HealthCheck,
  PortMapping,
  Secret
} from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';
import type { Ingress } from '@stacktape/cloudformation/resources/aws-ec2-securitygroup';
import type { KeyValuePair, MountPoint, Volume } from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';
import type { LoadBalancer } from '@stacktape/cloudformation/resources/aws-ecs-service';
import type {
  ServiceConnectService,
  ServiceProperties,
  ServiceRegistry
} from '@stacktape/cloudformation/resources/aws-ecs-service';
import { base64, getAtt, join, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { cfnResource, type KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { SupportedEcsBlueGreenV1ResourceType } from '@domain-services/cloudformation-registry-manager/types';
import type {
  ContainerWorkloadTargetDetails,
  StpResolvedLoadBalancerReference
} from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type {
  ECSBlueGreenService,
  StpContainerWorkload
} from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpResourceScopableByConnectToAffectingRole } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';

import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import {
  DEFAULT_TEST_LISTENER_PORT,
  resolveReferenceToApplicationLoadBalancer
} from '@domain-services/config-manager/utils/application-load-balancers';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { resolveReferenceToNetworkLoadBalancer } from '@domain-services/config-manager/utils/network-load-balancers';
import { ec2Manager } from '@domain-services/ec2-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { portMappingsPortName } from '@stacktape/naming/workload-names';
import { definedValueOr } from '@utils/misc';
import {
  getCfEnvironment,
  getCloudFormationLogRetentionDays,
  transformIntoCloudformationSubstitutedString
} from '@utils/cloudformation';
import { getAugmentedEnvironment } from '@utils/environment';
import uniqWith from 'lodash/uniqWith';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import { getImageUrlForMultiTask } from '../_utils/image-urls';
import { getPoliciesForRoles } from '../_utils/role-helpers';
import type { ConnectToAwsServicesMacro } from '@stacktape/config/aws-service-macros';
import type {
  CustomDockerfileCwImagePackagingProps,
  EsLanguageSpecificConfig,
  PrebuiltImageCwPackagingProps
} from '@stacktape/config/deployment-artifacts';
import type {
  ContainerWorkloadHttpApiIntegration,
  ContainerWorkloadLoadBalancerIntegration,
  ContainerWorkloadLoadBalancerIntegrationProps,
  ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  ContainerWorkloadServiceConnectIntegration
} from '@stacktape/config/events';
import type { ContainerEfsMount, ContainerWorkloadContainer } from '@stacktape/config/multi-container-workloads';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@stacktape/packaging/bundlers/constants';
import {
  getContainerSecretIamResources,
  getContainerSecretValueFrom,
  getContainerSecretVersionLabels,
  parseContainerSecretReference
} from '@domain-services/config-manager/container-secrets';

const BLUE_GREEN_SERVICE_RESOURCE_TYPE: SupportedEcsBlueGreenV1ResourceType = 'Stacktape::ECSBlueGreenV1::Service';

export const getEcsCluster = ({ workload }: { workload: StpContainerWorkload }) => {
  const cluster = cfnResource('AWS::ECS::Cluster', {
    ClusterName: awsResourceNames.ecsCluster(workload.name, calculatedStackOverviewManager.context.stackName)
  });
  // if (workload.resources.instanceTypes) {
  //   cluster.DependsOn = [cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource(workload.name)];
  // }

  return cluster;
};

export const getEcsExecutionRole = (credentialSecretArns: string[], containerSecretValueFroms: string[]) => {
  const { secretResources, parameterResources } = getContainerSecretIamResources(containerSecretValueFroms);
  const policies = [];
  if (credentialSecretArns.length) {
    policies.push({
      PolicyName: 'private-repo-credentials-secrets',
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: ['secretsmanager:GetSecretValue'], Resource: credentialSecretArns }]
      }
    });
  }
  if (secretResources.length || parameterResources.length) {
    policies.push({
      PolicyName: 'container-runtime-secrets',
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          ...(secretResources.length
            ? [{ Effect: 'Allow', Action: ['secretsmanager:GetSecretValue'], Resource: secretResources }]
            : []),
          ...(parameterResources.length
            ? [{ Effect: 'Allow', Action: ['ssm:GetParameters'], Resource: parameterResources }]
            : [])
        ]
      }
    });
  }

  return cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'ecs-tasks.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'],
    Policies: policies.length ? policies : undefined
  });
};

export const getEcsAutoScalingRole = () =>
  cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'ecs-tasks.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceAutoscaleRole']
  });

export const getEcsEc2InstanceRole = () =>
  cfnResource('AWS::IAM::Role', {
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role']
  });

export const getEcsEc2InstanceProfile = () =>
  cfnResource('AWS::IAM::InstanceProfile', {
    Path: '/',
    Roles: [ref(cfLogicalNames.ecsEc2InstanceRole())]
  });

export const getEcsTaskRole = ({
  workloadName,
  iamRoleStatements,
  accessToResourcesRequiringRoleChanges,
  accessToAwsServices,
  enableRemoteSessions,
  mountedEfsFilesystems
}: {
  workloadName: string;
  iamRoleStatements: StpIamRoleStatement[];
  accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices: ConnectToAwsServicesMacro[];
  mountedEfsFilesystems: StpEfsFilesystem[];
  enableRemoteSessions: boolean;
}) => {
  const isDevStack = calculatedStackOverviewManager.context.command === 'dev';
  return cfnResource('AWS::IAM::Role', {
    RoleName: awsResourceNames.containerWorkloadRole(
      calculatedStackOverviewManager.context.stackName,
      calculatedStackOverviewManager.context.region,
      workloadName
    ),
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'ecs-tasks.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ],
      Version: '2012-10-17'
    },
    // 12 hours for dev stacks, 1 hour for regular stacks (default)
    ...(isDevStack && { MaxSessionDuration: 43200 }),
    Policies: [
      ...getPoliciesForRoles({
        accessToResourcesRequiringRoleChanges,
        iamRoleStatements,
        accessToAwsServices,
        mountedEfsFilesystems
      }),
      ...(enableRemoteSessions
        ? [
            {
              PolicyName: 'ssm-messages',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: [
                      'ssmmessages:CreateControlChannel',
                      'ssmmessages:CreateDataChannel',
                      'ssmmessages:OpenControlChannel',
                      'ssmmessages:OpenDataChannel'
                    ],
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        : [])
    ]
  });
};

const formatPorts = ({
  events,
  usesEc2Instances
}: {
  events: ContainerWorkloadContainer['events'];
  usesEc2Instances: boolean;
}): PortMapping[] => {
  const resultMappings: PortMapping[] = [];
  const openPorts: {
    tcp: { [portNum: number]: { appProtocol?: 'grpc' | 'http' | 'http2' } };
    udp: { [portNum: number]: { appProtocol?: 'grpc' | 'http' | 'http2' } };
  } = { tcp: {}, udp: {} };
  (events || []).forEach((event) => {
    const protocol =
      event.type === 'application-load-balancer' ||
      event.type === 'network-load-balancer' ||
      event.type === 'http-api-gateway' ||
      event.type === 'workload-internal' ||
      event.type === 'service-connect'
        ? 'tcp'
        : 'udp';
    openPorts[protocol][event.properties.containerPort] =
      event.type === 'service-connect' ? { appProtocol: event.properties.protocol as 'grpc' | 'http' | 'http2' } : {};
  });
  Object.entries(openPorts).forEach(([protocol, portConfigs]) =>
    Object.entries(portConfigs).forEach(([num, { appProtocol }]) =>
      resultMappings.push({
        ContainerPort: Number(num),
        Protocol: protocol,
        HostPort: usesEc2Instances ? 0 : Number(num),
        Name: portMappingsPortName(Number(num)),
        AppProtocol: appProtocol || undefined
      })
    )
  );
  return resultMappings;
};

const formatInternalHealthCheck = (
  internalHealthCheck: ContainerWorkloadContainer['internalHealthCheck']
): HealthCheck => ({
  Command: internalHealthCheck.healthCheckCommand,
  Interval: internalHealthCheck.intervalSeconds,
  Retries: internalHealthCheck.retries,
  StartPeriod: internalHealthCheck.startPeriodSeconds,
  Timeout: internalHealthCheck.timeoutSeconds
});

// Helper function to generate consistent volume names
const getEfsVolumeName = (efsFilesystemName: string, rootDirectory?: string): string => {
  const normalizedRootDir = (rootDirectory || '/').replace(/\//g, '-').replace(/^-|-$/g, '') || 'Root';
  return `efs-${efsFilesystemName}-${normalizedRootDir}`;
};

const getContainerWorkloadContainerDefinitions = (workload: StpContainerWorkload): ContainerDefinition[] => {
  const { region } = calculatedStackOverviewManager.context;

  return workload.containers.map((container) => {
    const repositoryCredentialsSecretArn = (container.packaging.properties as PrebuiltImageCwPackagingProps)
      .repositoryCredentialsSecretArn;
    const command = (
      container.packaging.properties as PrebuiltImageCwPackagingProps | CustomDockerfileCwImagePackagingProps
    ).command;
    const entryPoint = (
      container.packaging.properties as PrebuiltImageCwPackagingProps | CustomDockerfileCwImagePackagingProps
    ).entryPoint;
    const isLoggingEnabled = !container.logging?.disabled;

    // Get packaging info for environment augmentation
    const packagingType = container.packaging?.type;
    const entryfilePath = (container.packaging?.properties as { entryfilePath?: string })?.entryfilePath;
    const languageSpecificConfig = (
      container.packaging?.properties as { languageSpecificConfig?: EsLanguageSpecificConfig }
    )?.languageSpecificConfig;
    const nodeVersion = languageSpecificConfig?.nodeVersion || DEFAULT_CONTAINER_NODE_VERSION;

    // Augment environment with source maps and experimental flags for JS/TS workloads
    const augmentedEnvironment = getAugmentedEnvironment({
      environment: container.environment,
      workloadType: workload.configParentResourceType,
      packagingType,
      entryfilePath,
      nodeVersion
    });
    const secrets = (container.secrets || []).map(({ name, valueFrom }) => ({
      Name: name,
      ValueFrom: getContainerSecretValueFrom(parseContainerSecretReference(valueFrom)!)
    })) as Secret[];
    const secretVersionLabels = getContainerSecretVersionLabels(container.secrets?.map(({ valueFrom }) => valueFrom));

    // Prepare MountPoints for EFS volumes
    const mountPoints: MountPoint[] = (container.volumeMounts || []).map((mount) => {
      // **USE HELPER**: Generate SourceVolume name using the helper function
      const volumeName = getEfsVolumeName(mount.properties.efsFilesystemName, mount.properties.rootDirectory);
      return {
        SourceVolume: volumeName,
        ContainerPath: mount.properties.mountPath,
        ReadOnly: false
      };
    });

    return {
      Name: container.name,
      Image: getImageUrlForMultiTask(workload, container.name),
      PortMappings: formatPorts({
        events: container.events || [],
        usesEc2Instances: !!workload.resources.instanceTypes
      }),
      ...(container.internalHealthCheck && { HealthCheck: formatInternalHealthCheck(container.internalHealthCheck) }),
      ...(repositoryCredentialsSecretArn && {
        RepositoryCredentials: { CredentialsParameter: repositoryCredentialsSecretArn }
      }),
      Essential: definedValueOr(container.essential, true),
      Environment: getCfEnvironment(augmentedEnvironment) as KeyValuePair[],
      Secrets: secrets.length ? secrets : undefined,
      DockerLabels: Object.keys(secretVersionLabels).length ? secretVersionLabels : undefined,
      EntryPoint: entryPoint,
      Command: command,
      StopTimeout: container.stopTimeout || 2,
      LogConfiguration: isLoggingEnabled
        ? {
            LogDriver: 'awslogs',
            Options: {
              'awslogs-region': region,
              'awslogs-group': ref(cfLogicalNames.ecsLogGroup(workload.name, container.name)),
              'awslogs-stream-prefix': 'ecs'
            }
          }
        : undefined,
      DependsOn: (container.dependsOn || []).map(({ condition, containerName }) => ({
        Condition: condition,
        ContainerName: containerName
      })),
      // Add MountPoints to the container definition
      MountPoints: mountPoints.length > 0 ? mountPoints : undefined
    };
  });
};

export const getEcsEc2InstanceLaunchTemplate = ({ workload }: { workload: StpContainerWorkload }) => {
  const cpuArchitecture = ec2Manager.ec2InstanceTypes
    .find((instanceType) => instanceType.InstanceType === workload.resources.instanceTypes[0])
    ?.ProcessorInfo.SupportedArchitectures.includes('arm64')
    ? 'ARM64'
    : 'X86_64';
  return cfnResource('AWS::EC2::LaunchTemplate', {
    LaunchTemplateData: {
      ImageId:
        cpuArchitecture === 'ARM64'
          ? '{{resolve:ssm:/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id}}'
          : '{{resolve:ssm:/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id}}',
      IamInstanceProfile: {
        Arn: getAtt(cfLogicalNames.ecsEc2InstanceProfile(), 'Arn')
      },
      UserData: base64(
        sub(
          [
            '#!/bin/bash',
            'echo ECS_CLUSTER=${clusterName} >> /etc/ecs/ecs.config;',
            'echo ECS_WARM_POOLS_CHECK=true >> /etc/ecs/ecs.config;',
            'echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config;'
          ].join('\n'),
          {
            clusterName: ref(cfLogicalNames.ecsCluster(workload.name))
          }
        )
      ),
      InstanceRequirements:
        workload.resources.instanceTypes.length > 1
          ? {
              VCpuCount: {
                Min: 0
              },
              MemoryMiB: {
                Min: 0
              },
              BareMetal: 'included',
              BurstablePerformance: 'included',
              AllowedInstanceTypes: workload.resources.instanceTypes
            }
          : undefined,
      InstanceType: workload.resources.instanceTypes.length === 1 ? workload.resources.instanceTypes[0] : undefined,
      SecurityGroupIds: [ref(cfLogicalNames.workloadSecurityGroup(workload.name))],
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.ecsEc2AutoscalingGroup(
                workload.name,
                calculatedStackOverviewManager.context.stackName
              )
            }
          ])
        },
        {
          ResourceType: 'volume',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.ecsEc2AutoscalingGroup(
                workload.name,
                calculatedStackOverviewManager.context.stackName
              )
            }
          ])
        },

        {
          ResourceType: 'network-interface',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.ecsEc2AutoscalingGroup(
                workload.name,
                calculatedStackOverviewManager.context.stackName
              )
            }
          ])
        }
      ]
    }
  });
};

export const getEc2AutoscalingGroup = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = cfnResource('AWS::AutoScaling::AutoScalingGroup', {
    MinSize: '0',
    // the maximum size of scaling group is maximum number of task instances * 4
    // this allows to have more instances during multiple sequential deployments
    // eventually amount of instances will be stabilized thanks to CAS to the optimal number
    MaxSize: `${workload.scaling.maxInstances * 4}`,
    MixedInstancesPolicy:
      workload.resources.instanceTypes.length > 1
        ? {
            LaunchTemplate: {
              LaunchTemplateSpecification: {
                LaunchTemplateId: ref(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name)),
                Version: getAtt(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name), 'LatestVersionNumber')
              },
              Overrides: workload.resources.instanceTypes.map((instanceType) => ({
                InstanceType: instanceType
              }))
            },
            InstancesDistribution: {
              OnDemandAllocationStrategy: 'prioritized'
            }
          }
        : undefined,
    LaunchTemplate:
      workload.resources.instanceTypes.length === 1
        ? {
            LaunchTemplateId: ref(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name)),
            Version: getAtt(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name), 'LatestVersionNumber')
          }
        : undefined,
    AutoScalingGroupName: awsResourceNames.ecsEc2AutoscalingGroup(
      workload.name,
      calculatedStackOverviewManager.context.stackName
    ),
    VPCZoneIdentifier: workload.usePrivateSubnetsWithNAT
      ? vpcManager.getPrivateSubnetIds()
      : vpcManager.getPublicSubnetIds(),
    NewInstancesProtectedFromScaleIn: true,
    InstanceMaintenancePolicy: {
      MaxHealthyPercentage: 200,
      MinHealthyPercentage: 100
    }
    // MaxInstanceLifetime: 86400
  });
  resource.DependsOn = [
    ...(configManager.reuseVpcConfig ? [] : [cfLogicalNames.vpcGatewayAttachment()]),
    cfLogicalNames.ecsCluster(workload.name)
  ];
  return resource;
};

export const getEc2AutoscalingGroupWarmPool = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = cfnResource('AWS::AutoScaling::WarmPool', {
    AutoScalingGroupName: ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)),
    MinSize: 0,
    MaxGroupPreparedCapacity: workload.scaling.maxInstances,
    PoolState: 'Stopped'
  });
  resource.DependsOn = [cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)];
  return resource;
};

export const getEcsEc2ForceDeleteAsgCustomResource = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = getStpServiceCustomResource<'forceDeleteAsg'>({
    forceDeleteAsg: {
      asgName: ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name))
    }
  });
  // Ensure this custom resource is deleted BEFORE the capacity provider (so its Delete handler
  // can remove scale-in protection early, reducing CloudFormation delete timeouts).
  resource.DependsOn = [cfLogicalNames.ecsCluster(workload.name), cfLogicalNames.ecsEc2CapacityProvider(workload.name)];
  return resource;
};

export const getEcsDisableManagedTerminationProtectionCustomResource = ({
  workload
}: {
  workload: StpContainerWorkload;
}) => {
  const resource = getStpServiceCustomResource<'disableEcsManagedTerminationProtection'>({
    disableEcsManagedTerminationProtection: {
      capacityProviderName: ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name))
    }
  });
  // Ensure this custom resource is deleted BEFORE the capacity provider, so its Delete handler
  // can disable managed termination protection while the capacity provider still exists.
  resource.DependsOn = [cfLogicalNames.ecsEc2CapacityProvider(workload.name)];
  return resource;
};

export const getEcsDeregisterTargetsCustomResource = ({ workload }: { workload: StpContainerWorkload }) => {
  const targetGroupArns = getTargetsForContainerWorkload({
    workloadName: workload.name,
    containers: workload.containers
  })
    .map(({ loadBalancerName, targetContainerPort }) => {
      return ref(
        cfLogicalNames.targetGroup({
          stpResourceName: workload.name,
          loadBalancerName,
          targetContainerPort
        })
      );
    })
    .filter(Boolean);

  if (!targetGroupArns.length) {
    return undefined;
  }

  const resource = getStpServiceCustomResource<'deregisterTargets'>({
    deregisterTargets: {
      targetGroupArns
    }
  });

  // Make sure this custom resource is deleted BEFORE the ECS service.
  // CloudFormation deletion order is reverse of dependencies.
  resource.DependsOn = [cfLogicalNames.ecsService(workload.name, !!workload.deployment)];
  return resource;
};

export const getEcsEc2CapacityProvider = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = cfnResource('AWS::ECS::CapacityProvider', {
    AutoScalingGroupProvider: {
      AutoScalingGroupArn: ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)),
      ManagedScaling: {
        Status: 'ENABLED',
        TargetCapacity: 100,
        MaximumScalingStepSize: workload.scaling.maxInstances
      },
      ManagedDraining: 'ENABLED',
      ManagedTerminationProtection: 'ENABLED'
    },
    // Ensure capacity provider has Stacktape tags (especially stackName).
    // This improves least-privilege IAM and makes it easier to scope permissions by tags.
    Tags: stackManager.getTags()
  });
  // Do NOT depend on the force-delete custom resource; that would cause the custom resource to be
  // deleted AFTER the capacity provider, making it too late to help during stack deletion.
  resource.DependsOn = [cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)];
  return resource;
};

export const getEcsEc2CapacityProviderAssociation = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = cfnResource('AWS::ECS::ClusterCapacityProviderAssociations', {
    Cluster: ref(cfLogicalNames.ecsCluster(workload.name)),
    DefaultCapacityProviderStrategy: [],
    CapacityProviders: [ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name))]
  });
  resource.DependsOn = [cfLogicalNames.ecsCluster(workload.name)];
  return resource;
};

const getEcsServiceSecurityGroupIngress = ({
  workload,
  workloadName
}: {
  workload: StpContainerWorkload;
  workloadName: string;
}): Ingress[] => {
  const rules: Ingress[] = [];
  getTargetsForContainerWorkload({ workloadName, containers: workload.containers }).forEach(
    ({ targetContainerPort, targetProtocol, loadBalancerName, loadBalancerHealthCheck }) => {
      rules.push({
        Description: `from load balancer ${loadBalancerName} to ${targetContainerPort}`,
        FromPort: workload.resources.instanceTypes ? 32768 : targetContainerPort,
        ToPort: workload.resources.instanceTypes ? 65535 : targetContainerPort,
        IpProtocol: targetProtocol === 'HTTP' || targetProtocol === 'TCP' ? 'tcp' : 'udp',
        SourceSecurityGroupId: ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))
      });
      if (
        loadBalancerHealthCheck?.healthCheckPort &&
        loadBalancerHealthCheck?.healthCheckPort !== targetContainerPort
      ) {
        rules.push({
          Description: `health check port ${loadBalancerHealthCheck.healthCheckPort}`,
          FromPort: workload.resources.instanceTypes ? 32768 : loadBalancerHealthCheck.healthCheckPort,
          ToPort: workload.resources.instanceTypes ? 65535 : loadBalancerHealthCheck.healthCheckPort,
          IpProtocol: 'tcp',
          SourceSecurityGroupId: ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))
        });
      }
    }
  );

  uniqWith(
    workload.containers.map(({ events }) => (events || []).filter(({ type }) => type === 'http-api-gateway')).flat(),
    (
      { properties: httpProps1 }: ContainerWorkloadHttpApiIntegration,
      { properties: httpProps2 }: ContainerWorkloadHttpApiIntegration
    ) =>
      httpProps1.containerPort === httpProps2.containerPort &&
      httpProps1.httpApiGatewayName === httpProps2.httpApiGatewayName
  ).forEach(({ properties: { httpApiGatewayName, containerPort } }: ContainerWorkloadHttpApiIntegration) => {
    const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
      referencedFrom: workload.name,
      stpResourceReference: httpApiGatewayName
    });
    rules.push({
      Description: `from http api gateway ${httpApiGatewayName} to ${containerPort}`,
      FromPort: workload.resources.instanceTypes ? 32768 : containerPort,
      ToPort: workload.resources.instanceTypes ? 65535 : containerPort,
      IpProtocol: 'tcp',
      SourceSecurityGroupId: ref(cfLogicalNames.httpApiVpcLinkSecurityGroup(httpApiGatewayInfo.name))
    });
  });
  uniqWith(
    workload.containers.map(({ events }) => (events || []).filter(({ type }) => type === 'service-connect')).flat(),
    (
      { properties: serviceConnect1 }: ContainerWorkloadServiceConnectIntegration,
      { properties: serviceConnect2 }: ContainerWorkloadServiceConnectIntegration
    ) => serviceConnect1.containerPort === serviceConnect2.containerPort
  ).forEach(({ properties: { containerPort } }: ContainerWorkloadServiceConnectIntegration) => {
    rules.push({
      Description: `service connect port ${containerPort}`,
      FromPort: workload.resources.instanceTypes ? 32768 : containerPort,
      ToPort: workload.resources.instanceTypes ? 65535 : containerPort,
      IpProtocol: 'tcp',
      // this is probably not the best way, but should be good for now
      // alternative is to create separate ingress resource for each container workload https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-ingress.html#cfn-ec2-security-group-ingress-groupname
      // we are not doing that to avoid creating many resources (another alternative would be using custom resource to adjust ingress rules)
      CidrIp: vpcManager.getVpcCidr()
    });
    // below can create circular dependency (i.e if there are two private services) - doing it this way (using security group IDs would require some more analysis)
    // configManager.allContainerWorkloads
    //   .filter(({ name }) => name !== workload.name)
    //   .forEach(({ name }) => {
    //     rules.push({
    //       Description: `service connect port ${containerPort} (from ${name})`,
    //       FromPort: containerPort,
    //       ToPort: containerPort,
    //       IpProtocol: 'tcp',
    //       SourceSecurityGroupId: ref(cfLogicalNames.workloadSecurityGroup(name))
    //     });
    //   });
  });
  return rules;
};

// @todo, consider reworking so that relevantTargets are not passed into function. instead they should be pulled from dataStore during compute
export const getEcsServiceSecurityGroup = ({ workload }: { workload: StpContainerWorkload }) =>
  cfnResource('AWS::EC2::SecurityGroup', {
    GroupDescription: awsResourceNames.workloadSecurityGroupGroupDescription(
      workload.name,
      calculatedStackOverviewManager.context.stackName
    ),
    GroupName: awsResourceNames.workloadSecurityGroup(workload.name, calculatedStackOverviewManager.context.stackName),
    VpcId: vpcManager.getVpcId(),
    SecurityGroupIngress: getEcsServiceSecurityGroupIngress({ workload, workloadName: workload.name })
  });

export const getFormattedLoadBalancers = ({ workload }: { workload: StpContainerWorkload }): LoadBalancer[] => {
  const formattedLbs: LoadBalancer[] = [];
  getTargetsForContainerWorkload({ workloadName: workload.name, containers: workload.containers }).forEach(
    ({ loadBalancerName, targetContainerName, targetContainerPort }) => {
      formattedLbs.push({
        ContainerPort: targetContainerPort,
        ContainerName: targetContainerName,
        TargetGroupArn: ref(
          cfLogicalNames.targetGroup({
            stpResourceName: workload.name,
            loadBalancerName,
            targetContainerPort
          })
        )
      });
      // if (workload.deployment) {
      //   formattedLbs.push(
      //     new LoadBalancer({
      //       ContainerPort: targetContainerPort,
      //       ContainerName: targetContainerName,
      //       TargetGroupArn: Ref(
      //         cfLogicalNames.targetGroup({
      //           stpResourceName: workloadName,
      //           loadBalancerName,
      //           targetContainerPort,
      //           blueGreen: true
      //         })
      //       )
      //     })
      //   );
      // }
    }
  );
  return formattedLbs;
};

export const getFormattedListenersLogicalNames = ({
  workload,
  workloadName
}: {
  workload: StpContainerWorkload;
  workloadName: string;
}): string[] => {
  const arns: string[] = [];
  getTargetsForContainerWorkload({ workloadName, containers: workload.containers }).forEach(
    ({ loadBalancerName, listenerPorts }) => {
      listenerPorts.forEach((lbPort) => {
        arns.push(cfLogicalNames.listener(lbPort, loadBalancerName));
      });
    }
  );
  return arns;
};

export const getFormattedListenerRulesLogicalNames = ({ workload }: { workload: StpContainerWorkload }) => {
  return workload.containers
    .map(({ events }) => (events || []).filter(({ type }) => type === 'application-load-balancer'))
    .flat()
    .map(({ properties }: ContainerWorkloadLoadBalancerIntegration) => {
      const resolvedListenerReference = resolveReferenceToApplicationLoadBalancer(
        properties,
        workload.name,
        workload.type
      );
      return cfLogicalNames.listenerRule(
        resolvedListenerReference.listenerPort,
        resolvedListenerReference.loadBalancer.name,
        resolvedListenerReference.priority
      );
    });
};

export const getContainerWorkloadTargetGroup = ({
  targetDetails,
  definition
}: {
  targetDetails: ContainerWorkloadTargetDetails;
  definition: StpContainerWorkload;
}) =>
  cfnResource('AWS::ElasticLoadBalancingV2::TargetGroup', {
    HealthCheckPath: targetDetails.loadBalancerHealthCheck?.healthcheckPath,
    HealthCheckIntervalSeconds: targetDetails.loadBalancerHealthCheck?.healthcheckInterval || 5,
    HealthCheckTimeoutSeconds: targetDetails.loadBalancerHealthCheck?.healthcheckTimeout || 4,
    HealthyThresholdCount: 2,
    HealthCheckProtocol:
      targetDetails.loadBalancerHealthCheck?.healthCheckProtocol ||
      (targetDetails.targetProtocol === 'HTTP' ? 'HTTP' : 'TCP'),
    HealthCheckPort: targetDetails.loadBalancerHealthCheck?.healthCheckPort
      ? `${targetDetails.loadBalancerHealthCheck?.healthCheckPort}`
      : undefined,
    Port: targetDetails.targetContainerPort,
    Protocol: targetDetails.targetProtocol,
    TargetType: definition.resources.instanceTypes ? 'instance' : 'ip',
    VpcId: vpcManager.getVpcId(),
    TargetGroupAttributes: [{ Key: 'deregistration_delay.timeout_seconds', Value: '5' }]
  });

export const getAutoScalingTarget = (workloadName: string, workload: StpContainerWorkload) => {
  return cfnResource('AWS::ApplicationAutoScaling::ScalableTarget', {
    MaxCapacity: workload.scaling.maxInstances,
    MinCapacity: workload.scaling.minInstances,
    ResourceId: join('/', [
      'service',
      ref(cfLogicalNames.ecsCluster(workloadName)),
      getAtt(cfLogicalNames.ecsService(workloadName, !!workload.deployment), 'Name')
    ]),
    RoleARN: getAtt(cfLogicalNames.ecsAutoScalingRole(), 'Arn'),
    ScalableDimension: 'ecs:service:DesiredCount',
    ServiceNamespace: 'ecs'
  });
};

export const getAutoScalingPolicy = (
  workloadName: string,
  metric: 'ECSServiceAverageCPUUtilization' | 'ECSServiceAverageMemoryUtilization',
  targetValue: number
) =>
  cfnResource('AWS::ApplicationAutoScaling::ScalingPolicy', {
    PolicyName: awsResourceNames.autoScalingPolicy(
      workloadName,
      calculatedStackOverviewManager.context.stackName,
      metric
    ),
    PolicyType: 'TargetTrackingScaling',
    ScalingTargetId: ref(cfLogicalNames.autoScalingTarget(workloadName)),
    TargetTrackingScalingPolicyConfiguration: {
      PredefinedMetricSpecification: {
        PredefinedMetricType: metric
      },
      TargetValue: targetValue
    }
  });

export const getEcsService = ({ workload, blueGreen }: { workload: StpContainerWorkload; blueGreen?: boolean }) => {
  const serviceRegistries: ServiceRegistry[] = uniqWith(
    workload.containers
      .map(({ events, name: containerName }) =>
        (events || []).map((props) => ({ ...props, containerName })).filter(({ type }) => type === 'http-api-gateway')
      )
      .flat(),
    (
      { properties: httpProps1 }: ContainerWorkloadHttpApiIntegration & { containerName: string },
      { properties: httpProps2 }: ContainerWorkloadHttpApiIntegration & { containerName: string }
    ) => httpProps1.containerPort === httpProps2.containerPort
  ).map(
    ({
      properties: { containerPort },
      containerName
    }: ContainerWorkloadHttpApiIntegration & { containerName: string }) => ({
      RegistryArn: getAtt(cfLogicalNames.serviceDiscoveryEcsService(workload.name, containerPort), 'Arn'),
      ContainerPort: containerPort,
      ContainerName: containerName
    })
  );

  const serviceConnectServices: ServiceConnectService[] = uniqWith(
    workload.containers
      .map(({ events, name: containerName }) =>
        (events || []).filter(({ type }) => type === 'service-connect').map((event) => ({ ...event, containerName }))
      )
      .flat(),
    (
      { properties: props1 }: ContainerWorkloadServiceConnectIntegration & { containerName: string },
      { properties: props2 }: ContainerWorkloadServiceConnectIntegration & { containerName: string }
    ) => props1.containerPort === props2.containerPort
  ).map(
    ({
      properties: { containerPort, alias },
      containerName
    }: ContainerWorkloadServiceConnectIntegration & { containerName: string }) => ({
      PortName: portMappingsPortName(containerPort),
      ClientAliases: [
        {
          Port: containerPort,
          DnsName: alias || awsResourceNames.ecsServiceConnectDefaultDnsName(workload.name, containerName)
        }
      ],
      DiscoveryName: alias || awsResourceNames.ecsServiceConnectDefaultDnsName(workload.name, containerName)
    })
  );

  const serviceConnectIntegrationsInTheStack = Object.entries(
    configManager.serviceConnectContainerWorkloadsAssociations
  );

  const serviceProps: ServiceProperties = {
    Cluster: ref(cfLogicalNames.ecsCluster(workload.name)),
    DeploymentConfiguration: {
      // only works with ECS controller NOT blue-green
      DeploymentCircuitBreaker: !blueGreen
        ? {
            Enable: true,
            Rollback: true
          }
        : undefined,
      MaximumPercent: 200,
      MinimumHealthyPercent: 100
    },
    EnableECSManagedTags: true,
    PropagateTags: 'SERVICE',
    // HealthCheckGracePeriodSeconds: workload.loadBalancerCheckGracePeriodSeconds,
    LaunchType: workload.resources.instanceTypes ? undefined : 'FARGATE',
    CapacityProviderStrategy: workload.resources.instanceTypes
      ? [{ Weight: 1, CapacityProvider: ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name)) }]
      : undefined,
    LoadBalancers: getFormattedLoadBalancers({ workload }),
    // if we use instances, bridge networking is used and security group is associated directly with instance
    NetworkConfiguration: workload.resources.instanceTypes
      ? undefined
      : {
          AwsvpcConfiguration: {
            AssignPublicIp: workload.usePrivateSubnetsWithNAT ? 'DISABLED' : 'ENABLED',
            Subnets: workload.usePrivateSubnetsWithNAT
              ? vpcManager.getPrivateSubnetIds()
              : vpcManager.getPublicSubnetIds(),
            SecurityGroups: [ref(cfLogicalNames.workloadSecurityGroup(workload.name))]
          }
        },
    TaskDefinition: ref(cfLogicalNames.ecsTaskDefinition(workload.name)),
    PlatformVersion: workload.resources.instanceTypes ? undefined : 'LATEST',
    ServiceRegistries: serviceRegistries.length ? serviceRegistries : undefined,
    PlacementStrategies: workload.resources.instanceTypes ? [{ Type: 'binpack', Field: 'memory' }] : undefined,
    EnableExecuteCommand: workload.enableRemoteSessions || false,
    ServiceConnectConfiguration:
      !blueGreen && serviceConnectIntegrationsInTheStack.length
        ? {
            Enabled: true,
            Namespace: getAtt(cfLogicalNames.serviceDiscoveryPrivateNamespace(), 'Arn'),
            Services: serviceConnectServices.length ? serviceConnectServices : undefined
          }
        : undefined,
    // blue green properties
    DeploymentController: blueGreen ? { Type: 'CODE_DEPLOY' } : undefined,
    ServiceName: blueGreen
      ? awsResourceNames.ecsService(workload.name, calculatedStackOverviewManager.context.stackName, blueGreen)
      : undefined,
    DesiredCount: blueGreen ? 1 : undefined
  };

  const isBlueGreenServiceDeployed = stackManager.existingStackResources?.find(
    ({ LogicalResourceId, ResourceType }) =>
      LogicalResourceId === cfLogicalNames.ecsService(workload.name, blueGreen) &&
      ResourceType === BLUE_GREEN_SERVICE_RESOURCE_TYPE
  );

  const service: KnownCloudFormationResource<'AWS::ECS::Service'> | ECSBlueGreenService = blueGreen
    ? {
        Type: BLUE_GREEN_SERVICE_RESOURCE_TYPE,
        Properties: {
          ECSService: serviceProps,
          StackName: calculatedStackOverviewManager.context.stackName,
          CodeDeployApplicationName: ref(cfLogicalNames.ecsCodeDeployApp()),
          CodeDeployDeploymentGroupName: awsResourceNames.codeDeployDeploymentGroup({
            stackName: calculatedStackOverviewManager.context.stackName,
            stpResourceName: workload.name
          }),
          LifecycleEventHooks:
            workload.deployment?.afterTrafficShiftFunction || workload.deployment?.beforeAllowTrafficFunction
              ? {
                  AfterAllowTraffic:
                    workload.deployment.afterTrafficShiftFunction &&
                    ref(
                      resolveReferenceToLambdaFunction({
                        stpResourceReference: workload.deployment.afterTrafficShiftFunction,
                        referencedFrom: workload.name,
                        referencedFromType: 'multi-container-workload'
                      }).cfLogicalName
                    ),
                  BeforeAllowTraffic:
                    workload.deployment.beforeAllowTrafficFunction &&
                    ref(
                      resolveReferenceToLambdaFunction({
                        stpResourceReference: workload.deployment.beforeAllowTrafficFunction,
                        referencedFrom: workload.name,
                        referencedFromType: 'multi-container-workload'
                      }).cfLogicalName
                    )
                }
              : undefined
        },
        DependsOn: isBlueGreenServiceDeployed ? [cfLogicalNames.codeDeployDeploymentGroup(workload.name)] : []
      }
    : cfnResource('AWS::ECS::Service', serviceProps);

  // this is necessary due to deployment order
  // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html#service-connect-concepts-deploy
  if (!serviceConnectServices.length && serviceConnectIntegrationsInTheStack.length) {
    const workloadsWithServiceConnectIntegration = Array.from(
      new Set(serviceConnectIntegrationsInTheStack.map(([workloadName]) => workloadName))
    );
    service.DependsOn = ((service.DependsOn as string[]) || []).concat(
      workloadsWithServiceConnectIntegration.map((workloadName) => cfLogicalNames.ecsService(workloadName, false))
    );
  }
  if (workload.resources.instanceTypes) {
    const dependencies = [
      cfLogicalNames.ecsDisableManagedTerminationProtectionCustomResource(workload.name),
      cfLogicalNames.ecsEc2CapacityProviderAssociation(workload.name),
      cfLogicalNames.routeTableToSubnetAssociation(true, 0),
      cfLogicalNames.routeTableToSubnetAssociation(true, 1)
    ];

    // If using private subnets, also depend on NAT routes so instances can reach ECS API during draining
    if (workload.usePrivateSubnetsWithNAT) {
      dependencies.push(cfLogicalNames.natRoute(0), cfLogicalNames.natRoute(1), cfLogicalNames.natRoute(2));
    }

    service.DependsOn = ((service.DependsOn as string[]) || []).concat(dependencies);
  }

  service.DependsOn = ((service.DependsOn as string[]) || []).concat(
    getFormattedListenersLogicalNames({ workloadName: workload.name, workload }),
    getFormattedListenerRulesLogicalNames({ workload })
  );
  return service;
};

export const getCodeDeployDeploymentGroup = ({ workload }: { workload: StpContainerWorkload }) => {
  let lbReference: StpResolvedLoadBalancerReference;
  workload.containers.some(({ events }) => {
    if (events) {
      const lbEvent = events.find(
        (event) => event.type === 'application-load-balancer'
      ) as ContainerWorkloadLoadBalancerIntegration;
      lbReference = resolveReferenceToApplicationLoadBalancer(lbEvent.properties, workload.name, workload.type);
    }
    return lbReference;
  });
  const resource = cfnResource('AWS::CodeDeploy::DeploymentGroup', {
    ApplicationName: ref(cfLogicalNames.ecsCodeDeployApp()),
    AutoRollbackConfiguration: {
      Enabled: false,
      Events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM', 'DEPLOYMENT_STOP_ON_REQUEST']
    },
    BlueGreenDeploymentConfiguration: {
      DeploymentReadyOption: {
        ActionOnTimeout: 'CONTINUE_DEPLOYMENT',
        WaitTimeInMinutes: 0
      },
      TerminateBlueInstancesOnDeploymentSuccess: {
        Action: 'TERMINATE',
        TerminationWaitTimeInMinutes: 0
      }
    },
    LoadBalancerInfo: {
      TargetGroupPairInfoList: [
        {
          TargetGroups: [
            {
              Name: getAtt(
                cfLogicalNames.targetGroup({
                  stpResourceName: workload.name,
                  loadBalancerName: lbReference.loadBalancer.name,
                  targetContainerPort: lbReference.containerPort
                }),
                'TargetGroupName'
              )
            },
            {
              Name: getAtt(
                cfLogicalNames.targetGroup({
                  stpResourceName: workload.name,
                  loadBalancerName: lbReference.loadBalancer.name,
                  targetContainerPort: lbReference.containerPort,
                  blueGreen: true
                }),
                'TargetGroupName'
              )
            }
          ],
          ProdTrafficRoute: {
            ListenerArns: [ref(cfLogicalNames.listener(lbReference.listenerPort, lbReference.loadBalancer.name))]
          },
          TestTrafficRoute: workload.deployment.beforeAllowTrafficFunction
            ? {
                ListenerArns: [
                  ref(
                    cfLogicalNames.listener(
                      workload.deployment.testListenerPort || DEFAULT_TEST_LISTENER_PORT,
                      lbReference.loadBalancer.name
                    )
                  )
                ]
              }
            : undefined
        }
      ]
    },
    DeploymentGroupName: awsResourceNames.codeDeployDeploymentGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: workload.name
    }),
    DeploymentStyle: {
      DeploymentType: 'BLUE_GREEN',
      DeploymentOption: 'WITH_TRAFFIC_CONTROL'
    },
    DeploymentConfigName: `CodeDeployDefault.ECS${workload.deployment.strategy}`,
    ECSServices: [
      {
        ClusterName: awsResourceNames.ecsCluster(workload.name, calculatedStackOverviewManager.context.stackName),
        ServiceName: awsResourceNames.ecsService(workload.name, calculatedStackOverviewManager.context.stackName, true)
      }
    ],
    ServiceRoleArn: getAtt(cfLogicalNames.codeDeployServiceRole(), 'Arn')
  });

  const isBlueGreenServiceDeployed = stackManager.existingStackResources.find(
    ({ LogicalResourceId, ResourceType }) =>
      LogicalResourceId === cfLogicalNames.ecsService(workload.name, true) &&
      ResourceType === BLUE_GREEN_SERVICE_RESOURCE_TYPE
  );
  resource.DependsOn = isBlueGreenServiceDeployed ? [] : [cfLogicalNames.ecsService(workload.name, true)];

  return resource;
};

const getTaskMemory = (workload: StpContainerWorkload): number => {
  if (!workload.resources.instanceTypes) {
    return workload.resources.memory;
  }

  const smallestInstance = ec2Manager.getInstanceWithLowestMemory({ instanceTypes: workload.resources.instanceTypes });
  const smallestInstanceMemory = smallestInstance.MemoryInfo.SizeInMiB;

  // the memory that is actually available is smaller that the memory of the instance (since OS and other processes also take memory)
  // based on our experience it is up to 15% of memory of the instance
  // for smaller instances (with 512MB memory) it can be more (which is why we use low limit of 128MB)
  const backgroundProcessMemory =
    smallestInstanceMemory * 0.15 <= 128
      ? 128
      : smallestInstanceMemory <= 16 * 1024
        ? smallestInstanceMemory * 0.15
        : smallestInstanceMemory <= 128 * 1024
          ? smallestInstanceMemory * 0.1
          : smallestInstanceMemory * 0.05;

  if (workload.resources.memory) {
    if (workload.resources.memory > smallestInstanceMemory - backgroundProcessMemory) {
      throw stpErrors.e114({
        instanceType: smallestInstance.InstanceType,
        availableMemory: smallestInstanceMemory - backgroundProcessMemory,
        requestedMemory: workload.resources.memory,
        originalResourceType: workload.configParentResourceType,
        stpResourceName: workload.nameChain[0]
      });
    }
    return Math.floor(workload.resources.memory);
  }

  return Math.floor(smallestInstanceMemory - backgroundProcessMemory);
};

export const getEcsTaskDefinition = (
  workload: StpContainerWorkload
): KnownCloudFormationResource<'AWS::ECS::TaskDefinition'> => {
  const cpu = workload.resources.cpu && (workload.resources.cpu * 1024).toFixed();
  const memory = getTaskMemory(workload);

  // Aggregate all unique EFS volumes from all containers
  const volumes: Volume[] = [];
  const uniqueEfsVolumes = new Map<string, ContainerEfsMount>();

  workload.containers.forEach((container) => {
    (container.volumeMounts || []).forEach((mount) => {
      if (mount.type === 'efs') {
        const volumeIdentifier = getEfsVolumeName(mount.properties.efsFilesystemName, mount.properties.rootDirectory);
        if (!uniqueEfsVolumes.has(volumeIdentifier)) {
          uniqueEfsVolumes.set(volumeIdentifier, mount);
        }
      }
    });
  });

  uniqueEfsVolumes.forEach((mount, volumeName) => {
    const accessPointLogicalName = cfLogicalNames.efsAccessPoint({
      stpResourceName: workload.name,
      efsFilesystemName: mount.properties.efsFilesystemName,
      rootDirectory: mount.properties.rootDirectory
    });

    volumes.push({
      Name: volumeName, // Use the identifier derived from the helper
      EFSVolumeConfiguration: {
        FilesystemId: ref(cfLogicalNames.efsFilesystem(mount.properties.efsFilesystemName)),
        TransitEncryption: 'ENABLED',
        AuthorizationConfig: {
          AccessPointId: ref(accessPointLogicalName),
          IAM: 'ENABLED'
        }
        // RootDirectory should NOT be specified here when using AccessPointId
      }
    });
  });
  const cpuArchitecture =
    packagingManager.getTargetCpuArchitectureForContainer(workload.resources) === 'linux/arm64' ? 'ARM64' : 'X86_64';
  return cfnResource('AWS::ECS::TaskDefinition', {
    Family: awsResourceNames.ecsTaskDefinitionFamily(workload.name, calculatedStackOverviewManager.context.stackName),
    NetworkMode: workload.resources.instanceTypes ? 'bridge' : 'awsvpc',
    RequiresCompatibilities: workload.resources.instanceTypes ? ['EC2'] : ['FARGATE'],
    Cpu: cpu,
    Memory: memory.toString(),
    ExecutionRoleArn: getAtt(cfLogicalNames.ecsExecutionRole(), 'Arn'),
    TaskRoleArn: getAtt(cfLogicalNames.ecsTaskRole(workload.name), 'Arn'),
    ContainerDefinitions: getContainerWorkloadContainerDefinitions(workload),
    Volumes: volumes.length > 0 ? volumes : undefined,
    RuntimePlatform: {
      OperatingSystemFamily: 'LINUX',
      CpuArchitecture: cpuArchitecture
    }
  });
};

export const getEcsLogGroup = ({
  stackName,
  workloadName,
  containerName,
  retentionDays
}: {
  workloadName: string;
  stackName: string;
  containerName?: string;
  retentionDays: number;
}) => {
  return cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.containerLogGroup({
      stpResourceName: workloadName,
      stackName,
      containerName
    }),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });
};

const getTargetGroupIdentifier = (loadBalancerName: string, workloadName: string, targetContainerPort?: number) =>
  `${loadBalancerName}${workloadName}${targetContainerPort || ''}`;

export const getTargetsForContainerWorkload = ({
  workloadName,
  containers
}: {
  workloadName: string;
  containers: StpContainerWorkload['containers'];
}) => {
  const targets: { [targetGroupIdentifier: string]: ContainerWorkloadTargetDetails } = {};
  containers
    .map(({ events, name, loadBalancerHealthCheck }) => {
      return (events || [])
        .filter(({ type }) => type === 'application-load-balancer' || type === 'network-load-balancer')
        .map((integration) => ({ ...integration, containerName: name, loadBalancerHealthCheck }));
    })
    .flat()
    .map(({ containerName, loadBalancerHealthCheck, ...lbReference }) => ({
      containerName,
      loadBalancerHealthCheck,
      ...(lbReference.type === 'application-load-balancer'
        ? resolveReferenceToApplicationLoadBalancer(
            lbReference.properties as ContainerWorkloadLoadBalancerIntegrationProps,
            workloadName,
            'multi-container-workload'
          )
        : resolveReferenceToNetworkLoadBalancer(
            lbReference.properties as ContainerWorkloadNetworkLoadBalancerIntegrationProps,
            workloadName,
            'multi-container-workload'
          ))
    }))
    .forEach(
      ({
        loadBalancerHealthCheck,
        loadBalancer: { name: referencedLbName },
        listenerPort: referencedLbPort,
        containerPort: referencedTargetPort,
        containerName,
        protocol
      }) => {
        const targetGroupIdentifier = getTargetGroupIdentifier(referencedLbName, workloadName, referencedTargetPort);
        // loadBalancerPorts is set of ports because single loadBalancer can have multiple listeners target one target group
        if (targets[targetGroupIdentifier]) {
          (targets[targetGroupIdentifier] as ContainerWorkloadTargetDetails).listenerPorts.add(referencedLbPort);
          return;
        }
        const lbPorts: Set<number> = new Set();
        lbPorts.add(referencedLbPort);
        targets[targetGroupIdentifier] = {
          loadBalancerHealthCheck,
          targetProtocol: protocol === 'TLS' || protocol === 'TCP' ? 'TCP' : 'HTTP',
          targetContainerPort: referencedTargetPort,
          targetContainerName: containerName,
          loadBalancerName: referencedLbName,
          targetWorkload: workloadName,
          listenerPorts: lbPorts
        };
      }
    );
  return Object.values(targets);
};

export const getSchedulerRuleForScheduledInstanceRefresh = ({ workload }: { workload: StpContainerWorkload }) => {
  const inputTemplate = {
    AutoScalingGroupName: ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)),
    Preferences: {
      MinHealthyPercentage: 100,
      MaxHealthyPercentage: 200,
      ScaleInProtectedInstances: 'Refresh',
      SkipMatching: false
    }
  };
  return cfnResource('AWS::Scheduler::Schedule', {
    State: 'ENABLED',
    ScheduleExpression: 'cron(0 0 ? * SUN *)',
    FlexibleTimeWindow: {
      Mode: 'OFF'
    },
    Target: {
      Arn: 'arn:aws:scheduler:::aws-sdk:autoscaling:startInstanceRefresh',
      RoleArn: getAtt(cfLogicalNames.eventBusRoleForScheduledInstanceRefresh(), 'Arn'),
      Input: transformIntoCloudformationSubstitutedString(inputTemplate)
    }
  });
};

export const getSchedulerRoleForScheduledInstanceRefresh = () => {
  return cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'scheduler.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ]
    },
    Policies: [
      {
        PolicyName: 'instance-refresh-permissions',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'autoscaling:StartInstanceRefresh',
                'autoscaling:DescribeInstanceRefreshes',
                'autoscaling:CancelInstanceRefresh'
              ],
              Resource: '*'
            }
          ]
        }
      }
    ]
  });
};

// export const getLambdaPermissionForScheduledEcsServiceRedeploy = ({ workload }: { workload: StpContainerWorkload }) => {
//   return new LambdaPermission({
//     Action: 'lambda:InvokeFunction',
//     Principal: 'events.amazonaws.com',
//     FunctionName: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
//     SourceArn: GetAtt(cfLogicalNames.ecsScheduledMaintenanceEventBusRule(workload.name), 'Arn')
//   });
// };
