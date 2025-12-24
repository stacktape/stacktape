import type { ServiceConnectService, ServiceProperties, ServiceRegistry } from '@cloudform/ecs/service';
import type { KeyValuePair, MountPoint, Volume } from '@cloudform/ecs/taskDefinition';
import { globalStateManager } from '@application-services/global-state-manager';
import ScalableTarget from '@cloudform/applicationAutoScaling/scalableTarget';
import ScalingPolicy from '@cloudform/applicationAutoScaling/scalingPolicy';
import AutoScalingGroup from '@cloudform/autoScaling/autoScalingGroup';
import AutoScalingGroupWarmPool from '@cloudform/autoScaling/warmPool';
import DeploymentGroup from '@cloudform/codeDeploy/deploymentGroup';
import LaunchTemplate from '@cloudform/ec2/launchTemplate';
import SecurityGroup, { Ingress } from '@cloudform/ec2/securityGroup';
import CapacityProvider from '@cloudform/ecs/capacityProvider';
import EcsCluster from '@cloudform/ecs/cluster';
import CapacityProviderAssociation from '@cloudform/ecs/clusterCapacityProviderAssociations';
import EcsService, { LoadBalancer } from '@cloudform/ecs/service';
import TaskDefinition, {
  ContainerDefinition,
  ContainerDependency,
  HealthCheck,
  PortMapping
} from '@cloudform/ecs/taskDefinition';
import TargetGroup, { TargetGroupAttribute } from '@cloudform/elasticLoadBalancingV2/targetGroup';
import { Base64, GetAtt, Join, Ref, Sub } from '@cloudform/functions';
import InstanceProfile from '@cloudform/iam/instanceProfile';
import Role, { Policy } from '@cloudform/iam/role';
import LogGroup from '@cloudform/logs/logGroup';
import SchedulerRule from '@cloudform/scheduler/schedule';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@config';
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
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { portMappingsPortName } from '@shared/naming/utils';
import { definedValueOr } from '@shared/utils/misc';
import { getCfEnvironment, transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { getAugmentedEnvironment } from '@utils/environment';
import uniqWith from 'lodash/uniqWith';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import { getImageUrlForMultiTask } from '../_utils/image-urls';
import { getPoliciesForRoles } from '../_utils/role-helpers';

const BLUE_GREEN_SERVICE_RESOURCE_TYPE: SupportedEcsBlueGreenV1ResourceType = 'Stacktape::ECSBlueGreenV1::Service';

export const getEcsCluster = ({ workload }: { workload: StpContainerWorkload }) => {
  const cluster = new EcsCluster({
    ClusterName: awsResourceNames.ecsCluster(workload.name, globalStateManager.targetStack.stackName)
  });
  // if (workload.resources.instanceTypes) {
  //   cluster.DependsOn = [cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource(workload.name)];
  // }

  return cluster;
};

export const getEcsExecutionRole = (credentialSecretArns: string[]) =>
  new Role({
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
    Policies:
      credentialSecretArns && credentialSecretArns.length
        ? [
            {
              PolicyName: 'private-repo-credentials-secrets',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: ['secretsmanager:GetSecretValue'],
                    Resource: credentialSecretArns
                  }
                ]
              }
            }
          ]
        : undefined
  });

export const getEcsAutoScalingRole = () =>
  new Role({
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
  new Role({
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role']
  });

export const getEcsEc2InstanceProfile = () =>
  new InstanceProfile({
    Path: '/',
    Roles: [Ref(cfLogicalNames.ecsEc2InstanceRole())]
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
  return new Role({
    RoleName: awsResourceNames.containerWorkloadRole(
      globalStateManager.targetStack.stackName,
      globalStateManager.region,
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
    Policies: [
      ...getPoliciesForRoles({
        accessToResourcesRequiringRoleChanges,
        iamRoleStatements,
        accessToAwsServices,
        mountedEfsFilesystems
      }),
      ...(enableRemoteSessions
        ? [
            new Policy({
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
            })
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
    tcp: { [portNum: number]: { appProtocol?: string } };
    udp: { [portNum: number]: { appProtocol?: string } };
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
      event.type === 'service-connect' ? { appProtocol: event.properties.protocol } : {};
  });
  Object.entries(openPorts).forEach(([protocol, portConfigs]) =>
    Object.entries(portConfigs).forEach(([num, { appProtocol }]) =>
      resultMappings.push(
        new PortMapping({
          ContainerPort: Number(num),
          Protocol: protocol,
          HostPort: usesEc2Instances ? 0 : Number(num),
          Name: portMappingsPortName(Number(num)),
          AppProtocol: appProtocol || undefined
        })
      )
    )
  );
  return resultMappings;
};

const formatInternalHealthCheck = (
  internalHealthCheck: ContainerWorkloadContainer['internalHealthCheck']
): HealthCheck =>
  new HealthCheck({
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
  const { region } = globalStateManager;

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

    return new ContainerDefinition({
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
      EntryPoint: entryPoint,
      Command: command,
      StopTimeout: container.stopTimeout || 2,
      LogConfiguration: isLoggingEnabled
        ? {
            LogDriver: 'awslogs',
            Options: {
              'awslogs-region': region,
              'awslogs-group': Ref(cfLogicalNames.ecsLogGroup(workload.name, container.name)),
              'awslogs-stream-prefix': 'ecs'
            }
          }
        : undefined,
      DependsOn: (container.dependsOn || []).map(
        ({ condition, containerName }) =>
          new ContainerDependency({ Condition: condition, ContainerName: containerName })
      ),
      // Add MountPoints to the container definition
      MountPoints: mountPoints.length > 0 ? mountPoints : undefined
    });
  });
};

export const getEcsEc2InstanceLaunchTemplate = ({ workload }: { workload: StpContainerWorkload }) => {
  const cpuArchitecture = ec2Manager.ec2InstanceTypes
    .find((instanceType) => instanceType.InstanceType === workload.resources.instanceTypes[0])
    ?.ProcessorInfo.SupportedArchitectures.includes('arm64')
    ? 'ARM64'
    : 'X86_64';
  return new LaunchTemplate({
    LaunchTemplateData: {
      ImageId:
        cpuArchitecture === 'ARM64'
          ? '{{resolve:ssm:/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id}}'
          : '{{resolve:ssm:/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id}}',
      IamInstanceProfile: {
        Arn: GetAtt(cfLogicalNames.ecsEc2InstanceProfile(), 'Arn')
      },
      UserData: Base64(
        Sub(
          [
            '#!/bin/bash',
            // eslint-disable-next-line no-template-curly-in-string
            'echo ECS_CLUSTER=${clusterName} >> /etc/ecs/ecs.config;',
            'echo ECS_WARM_POOLS_CHECK=true >> /etc/ecs/ecs.config;',
            'echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config;'
          ].join('\n'),
          {
            clusterName: Ref(cfLogicalNames.ecsCluster(workload.name))
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
      SecurityGroupIds: [Ref(cfLogicalNames.workloadSecurityGroup(workload.name))],
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.ecsEc2AutoscalingGroup(workload.name, globalStateManager.targetStack.stackName)
            }
          ])
        },
        {
          ResourceType: 'volume',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.ecsEc2AutoscalingGroup(workload.name, globalStateManager.targetStack.stackName)
            }
          ])
        },

        {
          ResourceType: 'network-interface',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.ecsEc2AutoscalingGroup(workload.name, globalStateManager.targetStack.stackName)
            }
          ])
        }
      ]
    }
  });
};

export const getEc2AutoscalingGroup = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = new AutoScalingGroup({
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
                LaunchTemplateId: Ref(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name)),
                Version: GetAtt(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name), 'LatestVersionNumber')
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
            LaunchTemplateId: Ref(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name)),
            Version: GetAtt(cfLogicalNames.ecsEc2InstanceLaunchTemplate(workload.name), 'LatestVersionNumber')
          }
        : undefined,
    AutoScalingGroupName: awsResourceNames.ecsEc2AutoscalingGroup(
      workload.name,
      globalStateManager.targetStack.stackName
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
  const resource = new AutoScalingGroupWarmPool({
    AutoScalingGroupName: Ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)),
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
      asgName: Ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name))
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
      capacityProviderName: Ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name))
    }
  });
  // Ensure this custom resource is deleted BEFORE the capacity provider, so its Delete handler
  // can disable managed termination protection while the capacity provider still exists.
  resource.DependsOn = [cfLogicalNames.ecsEc2CapacityProvider(workload.name)];
  return resource;
};

export const getEcsEc2CapacityProvider = ({ workload }: { workload: StpContainerWorkload }) => {
  const resource = new CapacityProvider({
    AutoScalingGroupProvider: {
      AutoScalingGroupArn: Ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)),
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
  const resource = new CapacityProviderAssociation({
    Cluster: Ref(cfLogicalNames.ecsCluster(workload.name)),
    DefaultCapacityProviderStrategy: [],
    CapacityProviders: [Ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name))]
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
      rules.push(
        new Ingress({
          Description: `from load balancer ${loadBalancerName} to ${targetContainerPort}`,
          FromPort: workload.resources.instanceTypes ? 32768 : targetContainerPort,
          ToPort: workload.resources.instanceTypes ? 65535 : targetContainerPort,
          IpProtocol: targetProtocol === 'HTTP' || targetProtocol === 'TCP' ? 'tcp' : 'udp',
          SourceSecurityGroupId: Ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))
        })
      );
      if (
        loadBalancerHealthCheck?.healthCheckPort &&
        loadBalancerHealthCheck?.healthCheckPort !== targetContainerPort
      ) {
        rules.push(
          new Ingress({
            Description: `health check port ${loadBalancerHealthCheck.healthCheckPort}`,
            FromPort: workload.resources.instanceTypes ? 32768 : loadBalancerHealthCheck.healthCheckPort,
            ToPort: workload.resources.instanceTypes ? 65535 : loadBalancerHealthCheck.healthCheckPort,
            IpProtocol: 'tcp',
            SourceSecurityGroupId: Ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))
          })
        );
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
    rules.push(
      new Ingress({
        Description: `from http api gateway ${httpApiGatewayName} to ${containerPort}`,
        FromPort: workload.resources.instanceTypes ? 32768 : containerPort,
        ToPort: workload.resources.instanceTypes ? 65535 : containerPort,
        IpProtocol: 'tcp',
        SourceSecurityGroupId: Ref(cfLogicalNames.httpApiVpcLinkSecurityGroup(httpApiGatewayInfo.name))
      })
    );
  });
  uniqWith(
    workload.containers.map(({ events }) => (events || []).filter(({ type }) => type === 'service-connect')).flat(),
    (
      { properties: serviceConnect1 }: ContainerWorkloadServiceConnectIntegration,
      { properties: serviceConnect2 }: ContainerWorkloadServiceConnectIntegration
    ) => serviceConnect1.containerPort === serviceConnect2.containerPort
  ).forEach(({ properties: { containerPort } }: ContainerWorkloadServiceConnectIntegration) => {
    rules.push(
      new Ingress({
        Description: `service connect port ${containerPort}`,
        FromPort: workload.resources.instanceTypes ? 32768 : containerPort,
        ToPort: workload.resources.instanceTypes ? 65535 : containerPort,
        IpProtocol: 'tcp',
        // this is probably not the best way, but should be good for now
        // alternative is to create separate ingress resource for each container workload https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-ingress.html#cfn-ec2-security-group-ingress-groupname
        // we are not doing that to avoid creating many resources (another alternative would be using custom resource to adjust ingress rules)
        CidrIp: vpcManager.getVpcCidr()
      })
    );
    // below can create circular dependency (i.e if there are two private services) - doing it this way (using security group IDs would require some more analysis)
    // configManager.allContainerWorkloads
    //   .filter(({ name }) => name !== workload.name)
    //   .forEach(({ name }) => {
    //     rules.push(
    //       new Ingress({
    //         Description: `service connect port ${containerPort} (from ${name})`,
    //         FromPort: containerPort,
    //         ToPort: containerPort,
    //         IpProtocol: 'tcp',
    //         SourceSecurityGroupId: Ref(cfLogicalNames.workloadSecurityGroup(name))
    //       })
    //     );
    //   });
  });
  return rules;
};

// @todo, consider reworking so that relevantTargets are not passed into function. instead they should be pulled from dataStore during compute
export const getEcsServiceSecurityGroup = ({ workload }: { workload: StpContainerWorkload }) =>
  new SecurityGroup({
    GroupDescription: awsResourceNames.workloadSecurityGroupGroupDescription(
      workload.name,
      globalStateManager.targetStack.stackName
    ),
    GroupName: awsResourceNames.workloadSecurityGroup(workload.name, globalStateManager.targetStack.stackName),
    VpcId: vpcManager.getVpcId(),
    SecurityGroupIngress: getEcsServiceSecurityGroupIngress({ workload, workloadName: workload.name })
  });

export const getFormattedLoadBalancers = ({ workload }: { workload: StpContainerWorkload }): LoadBalancer[] => {
  const formattedLbs: LoadBalancer[] = [];
  getTargetsForContainerWorkload({ workloadName: workload.name, containers: workload.containers }).forEach(
    ({ loadBalancerName, targetContainerName, targetContainerPort }) => {
      formattedLbs.push(
        new LoadBalancer({
          ContainerPort: targetContainerPort,
          ContainerName: targetContainerName,
          TargetGroupArn: Ref(
            cfLogicalNames.targetGroup({
              stpResourceName: workload.name,
              loadBalancerName,
              targetContainerPort
            })
          )
        })
      );
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
  new TargetGroup({
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
    TargetGroupAttributes: [new TargetGroupAttribute({ Key: 'deregistration_delay.timeout_seconds', Value: '5' })]
  });

export const getAutoScalingTarget = (workloadName: string, workload: StpContainerWorkload) => {
  return new ScalableTarget({
    MaxCapacity: workload.scaling.maxInstances,
    MinCapacity: workload.scaling.minInstances,
    ResourceId: Join('/', [
      'service',
      Ref(cfLogicalNames.ecsCluster(workloadName)),
      GetAtt(cfLogicalNames.ecsService(workloadName, !!workload.deployment), 'Name')
    ]),
    RoleARN: GetAtt(cfLogicalNames.ecsAutoScalingRole(), 'Arn'),
    ScalableDimension: 'ecs:service:DesiredCount',
    ServiceNamespace: 'ecs'
  });
};

export const getAutoScalingPolicy = (
  workloadName: string,
  metric: 'ECSServiceAverageCPUUtilization' | 'ECSServiceAverageMemoryUtilization',
  targetValue: number
) =>
  new ScalingPolicy({
    PolicyName: awsResourceNames.autoScalingPolicy(workloadName, globalStateManager.targetStack.stackName, metric),
    PolicyType: 'TargetTrackingScaling',
    ScalingTargetId: Ref(cfLogicalNames.autoScalingTarget(workloadName)),
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
      RegistryArn: GetAtt(cfLogicalNames.serviceDiscoveryEcsService(workload.name, containerPort), 'Arn'),
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
    Cluster: Ref(cfLogicalNames.ecsCluster(workload.name)),
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
      ? [{ Weight: 1, CapacityProvider: Ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name)) }]
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
            SecurityGroups: [Ref(cfLogicalNames.workloadSecurityGroup(workload.name))]
          }
        },
    TaskDefinition: Ref(cfLogicalNames.ecsTaskDefinition(workload.name)),
    PlatformVersion: workload.resources.instanceTypes ? undefined : 'LATEST',
    ServiceRegistries: serviceRegistries.length ? serviceRegistries : undefined,
    PlacementStrategies: workload.resources.instanceTypes ? [{ Type: 'binpack', Field: 'memory' }] : undefined,
    EnableExecuteCommand: workload.enableRemoteSessions || false,
    ServiceConnectConfiguration:
      !blueGreen && serviceConnectIntegrationsInTheStack.length
        ? {
            Enabled: true,
            Namespace: GetAtt(cfLogicalNames.serviceDiscoveryPrivateNamespace(), 'Arn'),
            Services: serviceConnectServices.length ? serviceConnectServices : undefined
          }
        : undefined,
    // blue green properties
    DeploymentController: blueGreen ? { Type: 'CODE_DEPLOY' } : undefined,
    ServiceName: blueGreen
      ? awsResourceNames.ecsService(workload.name, globalStateManager.targetStack.stackName, blueGreen)
      : undefined,
    DesiredCount: blueGreen ? 1 : undefined
  };

  const isBlueGreenServiceDeployed = stackManager.existingStackResources?.find(
    ({ LogicalResourceId, ResourceType }) =>
      LogicalResourceId === cfLogicalNames.ecsService(workload.name, blueGreen) &&
      ResourceType === BLUE_GREEN_SERVICE_RESOURCE_TYPE
  );

  const service: EcsService | ECSBlueGreenService = blueGreen
    ? {
        Type: BLUE_GREEN_SERVICE_RESOURCE_TYPE,
        Properties: {
          ECSService: serviceProps,
          StackName: globalStateManager.targetStack.stackName,
          CodeDeployApplicationName: Ref(cfLogicalNames.ecsCodeDeployApp()),
          CodeDeployDeploymentGroupName: awsResourceNames.codeDeployDeploymentGroup({
            stackName: globalStateManager.targetStack.stackName,
            stpResourceName: workload.name
          }),
          LifecycleEventHooks:
            workload.deployment?.afterTrafficShiftFunction || workload.deployment?.beforeAllowTrafficFunction
              ? {
                  AfterAllowTraffic:
                    workload.deployment.afterTrafficShiftFunction &&
                    Ref(
                      resolveReferenceToLambdaFunction({
                        stpResourceReference: workload.deployment.afterTrafficShiftFunction,
                        referencedFrom: workload.name,
                        referencedFromType: 'multi-container-workload'
                      }).cfLogicalName
                    ),
                  BeforeAllowTraffic:
                    workload.deployment.beforeAllowTrafficFunction &&
                    Ref(
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
    : new EcsService(serviceProps);

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
  const resource = new DeploymentGroup({
    ApplicationName: Ref(cfLogicalNames.ecsCodeDeployApp()),
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
              Name: GetAtt(
                cfLogicalNames.targetGroup({
                  stpResourceName: workload.name,
                  loadBalancerName: lbReference.loadBalancer.name,
                  targetContainerPort: lbReference.containerPort
                }),
                'TargetGroupName'
              )
            },
            {
              Name: GetAtt(
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
            ListenerArns: [Ref(cfLogicalNames.listener(lbReference.listenerPort, lbReference.loadBalancer.name))]
          },
          TestTrafficRoute: workload.deployment.beforeAllowTrafficFunction
            ? {
                ListenerArns: [
                  Ref(
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
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: workload.name
    }),
    DeploymentStyle: {
      DeploymentType: 'BLUE_GREEN',
      DeploymentOption: 'WITH_TRAFFIC_CONTROL'
    },
    DeploymentConfigName: `CodeDeployDefault.ECS${workload.deployment.strategy}`,
    ECSServices: [
      {
        ClusterName: awsResourceNames.ecsCluster(workload.name, globalStateManager.targetStack.stackName),
        ServiceName: awsResourceNames.ecsService(workload.name, globalStateManager.targetStack.stackName, true)
      }
    ],
    ServiceRoleArn: GetAtt(cfLogicalNames.codeDeployServiceRole(), 'Arn')
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

export const getEcsTaskDefinition = (workload: StpContainerWorkload): TaskDefinition => {
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
        FilesystemId: Ref(cfLogicalNames.efsFilesystem(mount.properties.efsFilesystemName)),
        TransitEncryption: 'ENABLED',
        AuthorizationConfig: {
          AccessPointId: Ref(accessPointLogicalName),
          IAM: 'ENABLED'
        }
        // RootDirectory should NOT be specified here when using AccessPointId
      }
    });
  });
  const cpuArchitecture =
    packagingManager.getTargetCpuArchitectureForContainer(workload.resources) === 'linux/arm64' ? 'ARM64' : 'X86_64';
  return new TaskDefinition({
    Family: awsResourceNames.ecsTaskDefinitionFamily(workload.name, globalStateManager.targetStack.stackName),
    NetworkMode: workload.resources.instanceTypes ? 'bridge' : 'awsvpc',
    RequiresCompatibilities: workload.resources.instanceTypes ? ['EC2'] : ['FARGATE'],
    Cpu: cpu,
    Memory: memory.toString(),
    ExecutionRoleArn: GetAtt(cfLogicalNames.ecsExecutionRole(), 'Arn'),
    TaskRoleArn: GetAtt(cfLogicalNames.ecsTaskRole(workload.name), 'Arn'),
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
  return new LogGroup({
    LogGroupName: awsResourceNames.containerLogGroup({
      stpResourceName: workloadName,
      stackName,
      containerName
    }),
    RetentionInDays: retentionDays
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
    AutoScalingGroupName: Ref(cfLogicalNames.ecsEc2AutoscalingGroup(workload.name)),
    Preferences: {
      MinHealthyPercentage: 100,
      MaxHealthyPercentage: 200,
      ScaleInProtectedInstances: 'Refresh',
      SkipMatching: false
    }
  };
  return new SchedulerRule({
    State: 'ENABLED',
    ScheduleExpression: 'cron(0 0 ? * SUN *)',
    FlexibleTimeWindow: {
      Mode: 'OFF'
    },
    Target: {
      Arn: 'arn:aws:scheduler:::aws-sdk:autoscaling:startInstanceRefresh',
      RoleArn: GetAtt(cfLogicalNames.eventBusRoleForScheduledInstanceRefresh(), 'Arn'),
      Input: transformIntoCloudformationSubstitutedString(inputTemplate)
    }
  });
};

export const getSchedulerRoleForScheduledInstanceRefresh = () => {
  return new Role({
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
