import type { NatFailoverRuleInput } from '@domain-services/config-manager/resolved-types/resources';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { base64, getAtt, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getNatInstanceHeartbeatParameterName } from '@stacktape/naming/ssm-parameter-paths';
import { tagNames } from '@stacktape/naming/tag-names';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getEventBusRuleLambdaPermission } from '../functions/events/utils';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import { addInstanceProfile } from '../_utils/instance-profile';
import { getNatInstanceBootScript } from './nat-instance-boot-script';

/**
 * NAT instances (`stackConfig.nat: ec2 | ha-ec2`): one small arm64 Amazon Linux 2023 instance per availability
 * zone, each in an Auto Scaling group of size 1, following the fck-nat pattern.
 *
 * Each zone has a static network interface that CloudFormation points the private route tables at. The instance
 * attaches it at boot as its second interface, so a replacement instance needs no route change. Egress stays on the
 * instance's primary interface, to which the instance re-associates the zone's Elastic IP, so the public IP is stable
 * too. The instance verifies outbound internet before it reports ready, then keeps writing a heartbeat parameter; the
 * failover handler in the service Lambda (`helper-lambdas/stacktapeServiceLambda/nat-failover`) reads those heartbeats
 * every minute and reroutes a zone through another zone's instance while its own is unhealthy.
 */

const NAT_SECURITY_GROUP_DESCRIPTION = 'NAT instances: forward outbound traffic of the private subnets';
const AL2023_ARM64_IMAGE_PARAMETER = '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64';
/** How long the instance may take from launch to a verified NAT path before CloudFormation gives up on it. */
const INSTANCE_READY_TIMEOUT = 'PT6M';
const LIFECYCLE_HOOK_NAME = 'stacktape-nat-drain';

const natTags = (azIndex: number) =>
  stackManager.getTags([
    {
      name: tagNames.autoscalingGroupName(),
      value: awsResourceNames.natInstanceAutoscalingGroup({
        stackName: calculatedStackOverviewManager.context.stackName,
        azIndex
      })
    }
  ]);

const getSecurityGroup = () =>
  cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.natInstanceSecurityGroup(calculatedStackOverviewManager.context.stackName),
    GroupDescription: NAT_SECURITY_GROUP_DESCRIPTION,
    SecurityGroupIngress: [{ IpProtocol: '-1', CidrIp: vpcManager.getVpcCidr() }],
    SecurityGroupEgress: [{ IpProtocol: '-1', CidrIp: '0.0.0.0/0' }]
  });

const getInstanceRole = ({ availabilityZones }: { availabilityZones: number }) => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  const azIndexes = Array.from({ length: availabilityZones }, (_, azIndex) => azIndex);
  return cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: [sub('arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore')],
    Policies: [
      {
        PolicyName: 'nat-instance',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['ec2:DescribeNetworkInterfaces', 'ec2:DescribeAddresses'],
              Resource: '*'
            },
            {
              // Attaching the static interface and moving the Elastic IP touch the instance's own primary
              // interface and the stack's own interfaces and addresses, all tagged with the stack name.
              Effect: 'Allow',
              Action: ['ec2:AttachNetworkInterface', 'ec2:ModifyNetworkInterfaceAttribute', 'ec2:AssociateAddress'],
              Resource: '*',
              Condition: { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } }
            },
            {
              Effect: 'Allow',
              Action: ['ssm:PutParameter'],
              Resource: azIndexes.map((azIndex) =>
                sub(
                  `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${getNatInstanceHeartbeatParameterName({ stackName, region, azIndex })}`
                )
              )
            },
            {
              Effect: 'Allow',
              Action: ['cloudformation:SignalResource'],
              Resource: ref('AWS::StackId')
            },
            {
              // A boot failure is written on the instance, a forwarding failure on the zone's interface.
              Effect: 'Allow',
              Action: ['ec2:CreateTags'],
              Resource: [
                sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:instance/*'),
                sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:network-interface/*')
              ],
              Condition: { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } }
            },
            {
              Effect: 'Allow',
              Action: ['autoscaling:SetInstanceHealth'],
              Resource: '*',
              Condition: { StringEquals: { [`autoscaling:ResourceTag/${tagNames.stackName()}`]: stackName } }
            }
          ]
        }
      }
    ],
    Tags: stackManager.getTags()
  });
};

const getElasticIp = (azIndex: number) => cfnResource('AWS::EC2::EIP', { Domain: 'vpc', Tags: natTags(azIndex) });

const getNetworkInterface = (azIndex: number) =>
  cfnResource('AWS::EC2::NetworkInterface', {
    SubnetId: ref(cfLogicalNames.subnet(true, azIndex)),
    GroupSet: [ref(cfLogicalNames.natInstanceSecurityGroup())],
    SourceDestCheck: false,
    Description: `Stacktape NAT instance route target, availability zone ${azIndex}`,
    Tags: natTags(azIndex)
  });

const getHeartbeatParameter = (azIndex: number) => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  return cfnResource('AWS::SSM::Parameter', {
    Name: getNatInstanceHeartbeatParameterName({ stackName, region, azIndex }),
    Type: 'String',
    // The instance overwrites it; CloudFormation only owns the parameter's existence. Keep these properties stable:
    // any change makes CloudFormation rewrite the value, and the next probe would take the zone for unverified
    // until the heartbeat (20 s) lands again.
    Value: '{}',
    Description: `Heartbeat of the Stacktape NAT instance in availability zone ${azIndex}`
  });
};

/** The zone's boot script (see `getNatInstanceBootScript`). */
const getUserData = (azIndex: number) => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  const script = getNatInstanceBootScript({
    heartbeatParameterName: getNatInstanceHeartbeatParameterName({ stackName, region, azIndex }),
    azIndex
  });
  return base64(
    sub(script, {
      eniId: ref(cfLogicalNames.natInstanceNetworkInterface(azIndex)),
      eipAllocationId: getAtt(cfLogicalNames.natInstanceElasticIp(azIndex), 'AllocationId'),
      stackName: ref('AWS::StackName'),
      asgLogicalId: cfLogicalNames.natInstanceAutoscalingGroup(azIndex)
    })
  );
};

const getLaunchTemplate = (azIndex: number) =>
  cfnResource('AWS::EC2::LaunchTemplate', {
    LaunchTemplateData: {
      ImageId: `{{resolve:ssm:${AL2023_ARM64_IMAGE_PARAMETER}}}`,
      InstanceType: configManager.natSettings.instanceSize,
      IamInstanceProfile: { Arn: getAtt(cfLogicalNames.natInstanceProfile(), 'Arn') },
      SecurityGroupIds: [ref(cfLogicalNames.natInstanceSecurityGroup())],
      MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1 },
      UserData: getUserData(azIndex),
      TagSpecifications: [
        { ResourceType: 'instance', Tags: natTags(azIndex) },
        { ResourceType: 'volume', Tags: natTags(azIndex) },
        { ResourceType: 'network-interface', Tags: natTags(azIndex) }
      ]
    }
  });

const getAutoscalingGroup = (azIndex: number) => {
  const resource = cfnResource('AWS::AutoScaling::AutoScalingGroup', {
    AutoScalingGroupName: awsResourceNames.natInstanceAutoscalingGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      azIndex
    }),
    MinSize: '1',
    MaxSize: '1',
    DesiredCapacity: '1',
    LaunchTemplate: {
      LaunchTemplateId: ref(cfLogicalNames.natInstanceLaunchTemplate(azIndex)),
      Version: getAtt(cfLogicalNames.natInstanceLaunchTemplate(azIndex), 'LatestVersionNumber')
    },
    VPCZoneIdentifier: [ref(cfLogicalNames.subnet(true, azIndex))],
    HealthCheckType: 'EC2',
    HealthCheckGracePeriod: 120,
    Tags: natTags(azIndex).map((tag) => ({ ...tag, PropagateAtLaunch: true }))
  });
  // A launch must prove the NAT path (the boot script's signal) before it counts, and a changed launch template
  // replaces the single instance of this zone: terminate, launch, wait for the signal. The failover handler moves
  // the zone's traffic to another zone's instance for the duration.
  resource.CreationPolicy = { ResourceSignal: { Count: 1, Timeout: INSTANCE_READY_TIMEOUT } };
  resource.UpdatePolicy = {
    AutoScalingRollingUpdate: {
      MinInstancesInService: 0,
      MaxBatchSize: 1,
      WaitOnResourceSignals: true,
      PauseTime: INSTANCE_READY_TIMEOUT
    }
  };
  // Zones are replaced one after another so a bad image never takes both down at once. While the previous zone's group
  // does not exist yet (a first deploy, or a switch from gateways, where the routes still point elsewhere) there is
  // nothing to protect, and the zones launch in parallel. The order is a DependsOn only: adding it later updates no
  // resource.
  resource.DependsOn = [
    cfLogicalNames.vpcGatewayAttachment(),
    cfLogicalNames.internetGatewayRoute(azIndex),
    cfLogicalNames.natInstanceHeartbeatParameter(azIndex),
    ...(azIndex > 0 && isNatInstanceZoneDeployed(azIndex - 1)
      ? [cfLogicalNames.natInstanceAutoscalingGroup(azIndex - 1)]
      : [])
  ];
  return resource;
};

const isNatInstanceZoneDeployed = (azIndex: number) =>
  !!stackManager.existingStackResources?.some(
    ({ LogicalResourceId, ResourceType }) =>
      LogicalResourceId === cfLogicalNames.natInstanceAutoscalingGroup(azIndex) &&
      ResourceType === 'AWS::AutoScaling::AutoScalingGroup'
  );

const getTerminationLifecycleHook = (azIndex: number) =>
  cfnResource('AWS::AutoScaling::LifecycleHook', {
    AutoScalingGroupName: ref(cfLogicalNames.natInstanceAutoscalingGroup(azIndex)),
    LifecycleHookName: LIFECYCLE_HOOK_NAME,
    LifecycleTransition: 'autoscaling:EC2_INSTANCE_TERMINATING',
    HeartbeatTimeout: 120,
    DefaultResult: 'CONTINUE'
  });

export const getNatRouteToInstance = ({ subnetIndex, natAzIndex }: { subnetIndex: number; natAzIndex: number }) => {
  const route = cfnResource('AWS::EC2::Route', {
    RouteTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
    DestinationCidrBlock: '0.0.0.0/0',
    NetworkInterfaceId: ref(cfLogicalNames.natInstanceNetworkInterface(natAzIndex))
  });
  // The interface exists long before an instance forwards through it. Waiting for the zone's Auto Scaling group (its
  // instance has signalled a verified NAT path) keeps a switch from gateways serving through the old gateways until
  // the instances are ready, instead of several minutes of black-holed traffic.
  route.DependsOn = [cfLogicalNames.natInstanceAutoscalingGroup(natAzIndex)];
  return route;
};

const getFailoverRuleInput = ({
  availabilityZones,
  privateSubnetCount
}: {
  availabilityZones: number;
  privateSubnetCount: number;
}): NatFailoverRuleInput => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  return {
    natFailover: {
      stackName,
      region: ref('AWS::Region'),
      zones: Array.from({ length: availabilityZones }, (_, azIndex) => ({
        azIndex,
        autoscalingGroupName: awsResourceNames.natInstanceAutoscalingGroup({ stackName, azIndex }),
        networkInterfaceId: ref(cfLogicalNames.natInstanceNetworkInterface(azIndex)),
        heartbeatParameterName: getNatInstanceHeartbeatParameterName({ stackName, region, azIndex })
      })),
      routeTables: Array.from({ length: privateSubnetCount }, (_, subnetIndex) => ({
        routeTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
        homeAzIndex: Math.min(subnetIndex, availabilityZones - 1)
      }))
    }
  };
};

const getRouteReconcileCustomResource = ({
  availabilityZones,
  privateSubnetCount
}: {
  availabilityZones: number;
  privateSubnetCount: number;
}) => {
  const resource = getStpServiceCustomResource<'natRoutes'>({
    natRoutes: {
      routes: Array.from({ length: privateSubnetCount }, (_, subnetIndex) => ({
        routeTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
        networkInterfaceId: ref(
          cfLogicalNames.natInstanceNetworkInterface(Math.min(subnetIndex, availabilityZones - 1))
        )
      })),
      // Instances are replaced, and routes can fail over, only when a launch template changes. Keying the reconcile on
      // the template versions reruns it after exactly those deploys and leaves other deploys free to take the fast path.
      launchTemplateVersions: Array.from({ length: availabilityZones }, (_, azIndex) =>
        getAtt(cfLogicalNames.natInstanceLaunchTemplate(azIndex), 'LatestVersionNumber')
      )
    }
  });
  resource.DependsOn = [
    ...Array.from({ length: availabilityZones }, (_, azIndex) => cfLogicalNames.natInstanceAutoscalingGroup(azIndex)),
    ...Array.from({ length: privateSubnetCount }, (_, subnetIndex) => cfLogicalNames.natRoute(subnetIndex))
  ];
  return resource;
};

const getProbeRule = (input: NatFailoverRuleInput) =>
  cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    ScheduleExpression: 'rate(1 minute)',
    Targets: [
      {
        Id: 'natFailoverProbe',
        Arn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Input: transformIntoCloudformationSubstitutedString(input)
      }
    ]
  });

const getAutoscalingEventsRule = (input: NatFailoverRuleInput) =>
  cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    EventPattern: {
      source: ['aws.autoscaling'],
      'detail-type': [
        'EC2 Instance-terminate Lifecycle Action',
        'EC2 Instance Launch Successful',
        'EC2 Instance Launch Unsuccessful',
        'EC2 Instance Terminate Successful',
        'EC2 Instance Terminate Unsuccessful'
      ],
      detail: { AutoScalingGroupName: input.natFailover.zones.map(({ autoscalingGroupName }) => autoscalingGroupName) }
    },
    Targets: [
      {
        Id: 'natFailoverAutoscalingEvents',
        Arn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Input: transformIntoCloudformationSubstitutedString(input)
      }
    ]
  });

/** Adds the per-zone NAT instances, the shared role and security group, the route reconcile and the failover rules. */
export const resolveNatInstances = ({
  availabilityZones,
  privateSubnetCount
}: {
  availabilityZones: number;
  privateSubnetCount: number;
}) => {
  const add = (cfLogicalName: string, resource: ReturnType<typeof cfnResource>) =>
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource,
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });

  add(cfLogicalNames.natInstanceSecurityGroup(), getSecurityGroup());
  add(cfLogicalNames.natInstanceRole(), getInstanceRole({ availabilityZones }));
  addInstanceProfile({
    cfLogicalName: cfLogicalNames.natInstanceProfile(),
    roleCfLogicalName: cfLogicalNames.natInstanceRole(),
    purpose: 'nat-instance',
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cloudformationProperties: { Roles: [ref(cfLogicalNames.natInstanceRole())] }
  });

  for (let azIndex = 0; azIndex < availabilityZones; azIndex += 1) {
    add(cfLogicalNames.natInstanceElasticIp(azIndex), getElasticIp(azIndex));
    add(cfLogicalNames.natInstanceNetworkInterface(azIndex), getNetworkInterface(azIndex));
    add(cfLogicalNames.natInstanceHeartbeatParameter(azIndex), getHeartbeatParameter(azIndex));
    add(cfLogicalNames.natInstanceLaunchTemplate(azIndex), getLaunchTemplate(azIndex));
    add(cfLogicalNames.natInstanceAutoscalingGroup(azIndex), getAutoscalingGroup(azIndex));
    if (availabilityZones > 1) {
      add(cfLogicalNames.natInstanceTerminationLifecycleHook(azIndex), getTerminationLifecycleHook(azIndex));
    }
  }

  // After every deploy, once the zones' instances have signalled, every private route table is put back on its home
  // interface: the failover handler may have moved it during the deploy, and CloudFormation only rewrites routes whose
  // template changed.
  add(
    cfLogicalNames.customResourceNatRoutes(),
    getRouteReconcileCustomResource({ availabilityZones, privateSubnetCount })
  );

  // The rules exist for a single zone too. With one zone the handler only keeps the routes on that zone's interface,
  // but a stack going from ha-ec2 to ec2 needs the handler to learn the new topology in the update phase: a rule that
  // is deleted instead lives until the cleanup phase and keeps serving its two-zone input after the routes changed.
  {
    const input = getFailoverRuleInput({ availabilityZones, privateSubnetCount });
    const lambdaArn = getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn');
    add(cfLogicalNames.natFailoverProbeRule(), getProbeRule(input));
    add(
      cfLogicalNames.natFailoverProbeRulePermission(),
      getEventBusRuleLambdaPermission({
        lambdaEndpointArn: lambdaArn,
        eventBusRuleArn: getAtt(cfLogicalNames.natFailoverProbeRule(), 'Arn')
      })
    );
    add(cfLogicalNames.natFailoverAutoscalingEventsRule(), getAutoscalingEventsRule(input));
    add(
      cfLogicalNames.natFailoverAutoscalingEventsRulePermission(),
      getEventBusRuleLambdaPermission({
        lambdaEndpointArn: lambdaArn,
        eventBusRuleArn: getAtt(cfLogicalNames.natFailoverAutoscalingEventsRule(), 'Arn')
      })
    );
  }

  return {
    elasticIpRefs: Array.from({ length: availabilityZones }, (_, azIndex) =>
      ref(cfLogicalNames.natInstanceElasticIp(azIndex))
    )
  };
};
