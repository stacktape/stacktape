import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { cfnResource } from '@stacktape/cloudformation/resource';
import {
  base64,
  getAtt,
  getAzs,
  importValue,
  join,
  ref,
  select,
  split,
  sub
} from '@stacktape/cloudformation/intrinsics';
import {
  getSharedNatStackName,
  getSharedNetworkExportName,
  getSharedNetworkStackName
} from '@stacktape/naming/shared-stacks';
import { getNatInstanceHeartbeatParameterName } from '@stacktape/naming/ssm-parameter-paths';
import { tagNames } from '@stacktape/naming/tag-names';
import { getNatInstanceBootScript } from '../calculated-stack-overview-manager/resource-resolvers/background-resources/nat-instance-boot-script';
import { INSTANCE_PROFILE_FUNCTION_SOURCE } from './instance-profile-function';

export const SHARED_NETWORK_KIND = 'shared-network';
export const SHARED_NAT_KIND = 'shared-network-nat';
/** One network per account and region; CloudFormation stack names are already scoped by both. */
export const SHARED_NETWORK_OWNERSHIP_KEY = 'default';

/**
 * Version 1: the VPC, three public and three private subnets, the route tables and the S3 and DynamoDB gateway
 * endpoints. Upgrades must be additive: stages use the subnet IDs as literals, and Lambda and RDS place resources in
 * them, so existing subnets, route tables and exports never change.
 */
export const SHARED_NETWORK_CONTRACT_VERSION = 1;
export const SHARED_NAT_CONTRACT_VERSION = 1;

/** The dev network uses 10.230.0.0/16 and stage VPCs 172.16.0.0/16; none overlap, so they can be peered later. */
export const SHARED_NETWORK_CIDR = '10.231.0.0/16';
const PUBLIC_SUBNET_CIDRS = ['10.231.0.0/19', '10.231.32.0/19', '10.231.64.0/19'];
const PRIVATE_SUBNET_CIDRS = ['10.231.96.0/19', '10.231.128.0/19', '10.231.160.0/19'];
const ZONES = [0, 1, 2];

/** The shared NAT's only kind in this version: one small arm64 instance in one zone, without failover. */
export const SHARED_NAT_INSTANCE_TYPE = 't4g.nano';
const AL2023_ARM64_IMAGE = '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64}}';
const NAT_READY_TIMEOUT = 'PT6M';

const ownershipOutputs = (kind: string, contractVersion: number) => ({
  ContractVersion: { Value: `${contractVersion}` },
  ResourceKind: { Value: kind },
  OwnershipKey: { Value: SHARED_NETWORK_OWNERSHIP_KEY }
});

/** The shared network stack. It has no parameters: everything that varies (the zones) is resolved by CloudFormation. */
export const buildSharedNetworkTemplate = (): CloudFormationTemplate => {
  const resources: CloudFormationTemplate['Resources'] = {
    Vpc: cfnResource('AWS::EC2::VPC', {
      CidrBlock: SHARED_NETWORK_CIDR,
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
      Tags: [{ Key: 'Name', Value: getSharedNetworkStackName() }]
    }),
    InternetGateway: cfnResource('AWS::EC2::InternetGateway', {}),
    InternetGatewayAttachment: cfnResource('AWS::EC2::VPCGatewayAttachment', {
      VpcId: ref('Vpc'),
      InternetGatewayId: ref('InternetGateway')
    }),
    PublicRouteTable: cfnResource('AWS::EC2::RouteTable', { VpcId: ref('Vpc') }),
    PublicInternetRoute: {
      ...cfnResource('AWS::EC2::Route', {
        RouteTableId: ref('PublicRouteTable'),
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: ref('InternetGateway')
      }),
      DependsOn: ['InternetGatewayAttachment']
    }
  };
  for (const zone of ZONES) {
    resources[`PublicSubnet${zone}`] = cfnResource('AWS::EC2::Subnet', {
      VpcId: ref('Vpc'),
      CidrBlock: PUBLIC_SUBNET_CIDRS[zone],
      AvailabilityZone: select(zone, getAzs('')),
      MapPublicIpOnLaunch: true,
      Tags: [{ Key: 'Name', Value: `${getSharedNetworkStackName()}-public-${zone}` }]
    });
    resources[`PublicSubnet${zone}RouteTableAssociation`] = cfnResource('AWS::EC2::SubnetRouteTableAssociation', {
      RouteTableId: ref('PublicRouteTable'),
      SubnetId: ref(`PublicSubnet${zone}`)
    });
    resources[`PrivateSubnet${zone}`] = cfnResource('AWS::EC2::Subnet', {
      VpcId: ref('Vpc'),
      CidrBlock: PRIVATE_SUBNET_CIDRS[zone],
      AvailabilityZone: select(zone, getAzs('')),
      MapPublicIpOnLaunch: false,
      Tags: [{ Key: 'Name', Value: `${getSharedNetworkStackName()}-private-${zone}` }]
    });
    // One route table per private subnet: the NAT stack adds their default routes, and a NAT per zone stays possible.
    resources[`PrivateRouteTable${zone}`] = cfnResource('AWS::EC2::RouteTable', { VpcId: ref('Vpc') });
    resources[`PrivateSubnet${zone}RouteTableAssociation`] = cfnResource('AWS::EC2::SubnetRouteTableAssociation', {
      RouteTableId: ref(`PrivateRouteTable${zone}`),
      SubnetId: ref(`PrivateSubnet${zone}`)
    });
  }
  const allRouteTables = [ref('PublicRouteTable'), ...ZONES.map((zone) => ref(`PrivateRouteTable${zone}`))];
  for (const [logicalId, service] of [
    ['S3GatewayEndpoint', 's3'],
    ['DynamoDbGatewayEndpoint', 'dynamodb']
  ] as const) {
    resources[logicalId] = cfnResource('AWS::EC2::VPCEndpoint', {
      VpcId: ref('Vpc'),
      ServiceName: sub(`com.amazonaws.\${AWS::Region}.${service}`),
      VpcEndpointType: 'Gateway',
      RouteTableIds: allRouteTables
    });
  }
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Stacktape shared network for non-production stages',
    Resources: resources,
    Outputs: {
      ...ownershipOutputs(SHARED_NETWORK_KIND, SHARED_NETWORK_CONTRACT_VERSION),
      VpcId: { Value: ref('Vpc'), Export: { Name: getSharedNetworkExportName('vpc-id') } },
      VpcCidr: { Value: SHARED_NETWORK_CIDR },
      PublicSubnetIds: {
        Value: join(
          ',',
          ZONES.map((zone) => ref(`PublicSubnet${zone}`))
        ),
        Export: { Name: getSharedNetworkExportName('public-subnet-ids') }
      },
      PrivateSubnetIds: {
        Value: join(
          ',',
          ZONES.map((zone) => ref(`PrivateSubnet${zone}`))
        ),
        Export: { Name: getSharedNetworkExportName('private-subnet-ids') }
      },
      PrivateRouteTableIds: {
        Value: join(
          ',',
          ZONES.map((zone) => ref(`PrivateRouteTable${zone}`))
        ),
        Export: { Name: getSharedNetworkExportName('private-route-table-ids') }
      },
      /** Public subnet `i` and private subnet `i` share zone `i`. */
      AvailabilityZones: {
        Value: join(
          ',',
          ZONES.map((zone) => getAtt(`PublicSubnet${zone}`, 'AvailabilityZone'))
        )
      }
    }
  } as CloudFormationTemplate;
};

/**
 * The shared NAT: one instance of `getNatInstanceBootScript` in the first public subnet, in an Auto Scaling group of
 * size 1 that replaces it when its outbound check fails. Its route-target interface and Elastic IP are static, so a
 * replacement keeps the routes and the public IP. Unlike `ha-ec2` in a stage, nothing fails over to another zone.
 */
export const buildSharedNatTemplate = ({ region }: { region: string }): CloudFormationTemplate => {
  const stackName = getSharedNatStackName();
  const heartbeatParameterName = getNatInstanceHeartbeatParameterName({ stackName, region, azIndex: 0 });
  // Instance profiles are global to the account, the stack is one per region.
  const instanceProfileName = `${stackName}-\${AWS::Region}`;
  const tags = [
    { Key: tagNames.stackName(), Value: stackName },
    { Key: 'Name', Value: stackName }
  ];
  const publicSubnet = select(0, split(',', importValue(getSharedNetworkExportName('public-subnet-ids'))));
  const privateRouteTables = split(',', importValue(getSharedNetworkExportName('private-route-table-ids')));
  const resources: CloudFormationTemplate['Resources'] = {
    SecurityGroup: cfnResource('AWS::EC2::SecurityGroup', {
      VpcId: importValue(getSharedNetworkExportName('vpc-id')),
      GroupDescription: 'Shared NAT instance: forwards outbound traffic of the shared private subnets',
      SecurityGroupIngress: [{ IpProtocol: '-1', CidrIp: SHARED_NETWORK_CIDR }],
      SecurityGroupEgress: [{ IpProtocol: '-1', CidrIp: '0.0.0.0/0' }],
      Tags: tags
    }),
    Role: cfnResource('AWS::IAM::Role', {
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
              { Effect: 'Allow', Action: ['ec2:DescribeNetworkInterfaces', 'ec2:DescribeAddresses'], Resource: '*' },
              {
                Effect: 'Allow',
                Action: ['ec2:AttachNetworkInterface', 'ec2:ModifyNetworkInterfaceAttribute', 'ec2:AssociateAddress'],
                Resource: '*',
                Condition: { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } }
              },
              {
                Effect: 'Allow',
                Action: ['ssm:PutParameter'],
                Resource: sub(
                  `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${heartbeatParameterName}`
                )
              },
              { Effect: 'Allow', Action: ['cloudformation:SignalResource'], Resource: ref('AWS::StackId') },
              {
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
      ]
    }),
    // `AWS::IAM::InstanceProfile` waits about 2 minutes on every create, and the instance cannot launch before it. NAT
    // stacks created before keep that resource: the contract version is unchanged, so they are never updated to this.
    InstanceProfileFunctionRole: cfnResource('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      },
      Policies: [
        {
          PolicyName: 'instance-profile',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'iam:GetInstanceProfile',
                  'iam:CreateInstanceProfile',
                  'iam:DeleteInstanceProfile',
                  'iam:AddRoleToInstanceProfile',
                  'iam:RemoveRoleFromInstanceProfile'
                ],
                Resource: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:instance-profile/${instanceProfileName}`)
              },
              // Adding a role to a profile requires passing it. The name pattern CloudFormation gives `Role` instead of
              // its ARN, so this role and the function are created while `Role` is (about 18 s each).
              {
                Effect: 'Allow',
                Action: 'iam:PassRole',
                Resource: sub('arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${AWS::StackName}-Role-*')
              }
            ]
          }
        }
      ]
    }),
    InstanceProfileFunction: cfnResource('AWS::Lambda::Function', {
      Description: 'Creates the instance profile of the Stacktape shared NAT',
      Runtime: 'python3.14',
      Architectures: ['arm64'],
      Handler: 'index.handler',
      MemorySize: 128,
      Timeout: 300,
      Role: getAtt('InstanceProfileFunctionRole', 'Arn'),
      Code: { ZipFile: INSTANCE_PROFILE_FUNCTION_SOURCE }
    }),
    InstanceProfile: cfnResource('AWS::CloudFormation::CustomResource', {
      ServiceToken: getAtt('InstanceProfileFunction', 'Arn'),
      InstanceProfileName: sub(instanceProfileName),
      RoleName: ref('Role'),
      // The dry-run launches name the NAT's own image, type and subnet, so EC2 checks a request it would accept.
      ProbeImageId: AL2023_ARM64_IMAGE,
      ProbeInstanceType: SHARED_NAT_INSTANCE_TYPE,
      ProbeSubnetId: publicSubnet
    }),
    ElasticIp: cfnResource('AWS::EC2::EIP', { Domain: 'vpc', Tags: tags }),
    NetworkInterface: cfnResource('AWS::EC2::NetworkInterface', {
      SubnetId: publicSubnet,
      GroupSet: [ref('SecurityGroup')],
      SourceDestCheck: false,
      Description: 'Stacktape shared NAT route target',
      Tags: tags
    }),
    HeartbeatParameter: cfnResource('AWS::SSM::Parameter', {
      Name: heartbeatParameterName,
      Type: 'String',
      Value: '{}',
      Description: 'Heartbeat of the Stacktape shared NAT instance'
    }),
    LaunchTemplate: cfnResource('AWS::EC2::LaunchTemplate', {
      LaunchTemplateData: {
        ImageId: AL2023_ARM64_IMAGE,
        InstanceType: SHARED_NAT_INSTANCE_TYPE,
        IamInstanceProfile: { Arn: getAtt('InstanceProfile', 'Arn') },
        SecurityGroupIds: [ref('SecurityGroup')],
        MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1 },
        UserData: base64(
          sub(getNatInstanceBootScript({ heartbeatParameterName, azIndex: 0 }), {
            eniId: ref('NetworkInterface'),
            eipAllocationId: getAtt('ElasticIp', 'AllocationId'),
            stackName: ref('AWS::StackName'),
            asgLogicalId: 'AutoScalingGroup'
          })
        ),
        TagSpecifications: ['instance', 'volume', 'network-interface'].map((ResourceType) => ({
          ResourceType,
          Tags: tags
        }))
      }
    }),
    AutoScalingGroup: {
      ...cfnResource('AWS::AutoScaling::AutoScalingGroup', {
        MinSize: '1',
        MaxSize: '1',
        DesiredCapacity: '1',
        LaunchTemplate: {
          LaunchTemplateId: ref('LaunchTemplate'),
          Version: getAtt('LaunchTemplate', 'LatestVersionNumber')
        },
        VPCZoneIdentifier: [publicSubnet],
        HealthCheckType: 'EC2',
        HealthCheckGracePeriod: 120,
        Tags: tags.map((tag) => ({ ...tag, PropagateAtLaunch: true }))
      }),
      DependsOn: ['HeartbeatParameter'],
      CreationPolicy: { ResourceSignal: { Count: 1, Timeout: NAT_READY_TIMEOUT } },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: 0,
          MaxBatchSize: 1,
          WaitOnResourceSignals: true,
          PauseTime: NAT_READY_TIMEOUT
        }
      }
    }
  };
  for (const zone of ZONES) {
    // Routes wait for the verified NAT path (the group's signal), so private subnets never point at a dead interface.
    resources[`PrivateDefaultRoute${zone}`] = {
      ...cfnResource('AWS::EC2::Route', {
        RouteTableId: select(zone, privateRouteTables),
        DestinationCidrBlock: '0.0.0.0/0',
        NetworkInterfaceId: ref('NetworkInterface')
      }),
      DependsOn: ['AutoScalingGroup']
    };
  }
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Stacktape shared NAT for the shared network',
    Resources: resources,
    Outputs: {
      ...ownershipOutputs(SHARED_NAT_KIND, SHARED_NAT_CONTRACT_VERSION),
      Kind: { Value: 'ec2' },
      InstanceType: { Value: SHARED_NAT_INSTANCE_TYPE },
      PublicIp: { Value: ref('ElasticIp') },
      NatId: { Value: ref('NetworkInterface'), Export: { Name: getSharedNetworkExportName('nat') } }
    }
  } as CloudFormationTemplate;
};
