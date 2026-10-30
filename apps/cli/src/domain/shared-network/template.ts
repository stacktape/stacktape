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
  getSharedNetworkJanitorFunctionName,
  getSharedNetworkKeeperFunctionName,
  getSharedNetworkParameterPrefix,
  getSharedNetworkStackName
} from '@stacktape/naming/shared-stacks';
import { getNatInstanceHeartbeatParameterName } from '@stacktape/naming/ssm-parameter-paths';
import { tagNames } from '@stacktape/naming/tag-names';
import { getNatInstanceBootScript } from '../calculated-stack-overview-manager/resource-resolvers/background-resources/nat-instance-boot-script';
import { INSTANCE_PROFILE_FUNCTION_SOURCE } from './instance-profile-function';
import { JANITOR_FUNCTION_SOURCE } from './janitor-function';

export const SHARED_NETWORK_KIND = 'shared-network';
export const SHARED_NAT_KIND = 'shared-network-nat';
/** One network per account and region; CloudFormation stack names are already scoped by both. */
export const SHARED_NETWORK_OWNERSHIP_KEY = 'default';

/**
 * Version 1: the VPC, three public and three private subnets, the route tables and the S3 and DynamoDB gateway
 * endpoints. Version 2 adds the janitor (`janitor-function.ts`). Version 3 adds the no-access security group and its
 * keepers (`buildNoAccessGroupResources`). Upgrades must be additive: stages use the subnet IDs as literals, and Lambda
 * and RDS place resources in them, so existing subnets, route tables and exports never change.
 */
export const SHARED_NETWORK_CONTRACT_VERSION = 3;
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

/** How long a shared stack stays without users before the janitor removes it: a day, so preview stages that come and go keep the NAT. */
const DEFAULT_UNUSED_SECONDS = 24 * 60 * 60;

/**
 * The grace period. `STP_SHARED_NETWORK_UNUSED_MINUTES` is internal, for live tests: it applies when a deploy creates
 * or upgrades the network stack, and a value under an hour also makes the janitor run every minute.
 */
export const getSharedNetworkUnusedSeconds = () => {
  const minutes = Number(process.env.STP_SHARED_NETWORK_UNUSED_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : DEFAULT_UNUSED_SECONDS;
};

const ownershipOutputs = (kind: string, contractVersion: number) => ({
  ContractVersion: { Value: `${contractVersion}` },
  ResourceKind: { Value: kind },
  OwnershipKey: { Value: SHARED_NETWORK_OWNERSHIP_KEY }
});

/**
 * The janitor of the shared stacks (`janitor-function.ts`): a function that a schedule runs, its log group, and one
 * role that the function, the schedule and CloudFormation use. Every logical ID starts with `Janitor`, which the deletion
 * barrier relies on.
 *
 * The role reads what the function checks, deletes only the two shared stacks, and passes itself to CloudFormation for
 * those deletes. The delete actions CloudFormation needs for the stacks' resources apply only in CloudFormation's
 * session (`AWSCloudFormation`), never in the function's own. CloudFormation deletes the role it is using last: the
 * barrier, which the function's delete handler holds until everything else is deleted, depends on the role and the
 * function. None of this delays the VPC, which does not depend on it. The schedule is an EventBridge Scheduler schedule:
 * CloudFormation creates it in about 2 seconds, and an `AWS::Events::Rule` in about 60.
 */
const buildJanitorResources = (): CloudFormationTemplate['Resources'] => {
  const networkName = getSharedNetworkStackName();
  const natName = getSharedNatStackName();
  const functionName = getSharedNetworkJanitorFunctionName();
  const unusedSeconds = getSharedNetworkUnusedSeconds();
  const arn = (service: string, resource: string, region = '${AWS::Region}') =>
    sub(`arn:\${AWS::Partition}:${service}:${region}:\${AWS::AccountId}:${resource}`);
  const sharedStackArns = [networkName, natName].map((name) => arn('cloudformation', `stack/${name}/*`));
  const logGroupName = `/aws/lambda/${functionName}`;
  const onlyCloudFormation = { StringLike: { 'aws:userid': '*:AWSCloudFormation' } };
  return {
    JanitorRole: cfnResource('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: ['lambda.amazonaws.com', 'scheduler.amazonaws.com', 'cloudformation.amazonaws.com']
            },
            Action: 'sts:AssumeRole'
          }
        ]
      },
      Policies: [
        {
          PolicyName: 'janitor',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'cloudformation:DescribeStacks',
                  'cloudformation:DescribeStackResources',
                  'cloudformation:ListStackResources',
                  'cloudformation:ListImports',
                  'ec2:Describe*',
                  'autoscaling:Describe*'
                ],
                Resource: '*'
              },
              {
                Effect: 'Allow',
                Action: ['cloudformation:DeleteStack', 'cloudformation:UpdateTerminationProtection'],
                Resource: sharedStackArns
              },
              // The schedule runs the function with this role.
              { Effect: 'Allow', Action: 'lambda:InvokeFunction', Resource: arn('lambda', `function:${functionName}`) },
              // The keepers of the no-access group, which the function creates, invokes and deletes itself.
              {
                Effect: 'Allow',
                Action: [
                  'lambda:GetFunction',
                  'lambda:CreateFunction',
                  'lambda:InvokeFunction',
                  'lambda:DeleteFunction'
                ],
                Resource: (['public', 'private'] as const).map((subnets) =>
                  arn('lambda', `function:${getSharedNetworkKeeperFunctionName(subnets)}`)
                )
              },
              {
                Effect: 'Allow',
                Action: 'iam:PassRole',
                Resource: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/${networkName}-KeeperRole-*`),
                Condition: { StringEquals: { 'iam:PassedToService': 'lambda.amazonaws.com' } }
              },
              {
                Effect: 'Allow',
                Action: 'iam:PassRole',
                // The role's own ARN; a name pattern, because a policy of the role cannot reference the role.
                Resource: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/${networkName}-JanitorRole-*`),
                Condition: { StringEquals: { 'iam:PassedToService': 'cloudformation.amazonaws.com' } }
              },
              {
                Effect: 'Allow',
                Action: ['ssm:GetParameter', 'ssm:PutParameter', 'ssm:DeleteParameter'],
                Resource: arn('ssm', `parameter${getSharedNetworkParameterPrefix()}/*`)
              },
              {
                Effect: 'Allow',
                Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                Resource: arn('logs', `log-group:${logGroupName}:*`)
              },
              // What CloudFormation needs to delete the NAT stack, in either of its forms, and the network stack.
              {
                Effect: 'Allow',
                Action: [
                  'ec2:DeleteVpc',
                  'ec2:DeleteSubnet',
                  'ec2:DeleteRouteTable',
                  'ec2:DisassociateRouteTable',
                  'ec2:DeleteRoute',
                  'ec2:DetachInternetGateway',
                  'ec2:DeleteInternetGateway',
                  'ec2:DeleteVpcEndpoints',
                  'ec2:ModifyVpcEndpoint',
                  'ec2:DeleteSecurityGroup',
                  'ec2:RevokeSecurityGroupIngress',
                  'ec2:RevokeSecurityGroupEgress',
                  'ec2:DeleteNetworkInterface',
                  'ec2:DetachNetworkInterface',
                  'ec2:DisassociateAddress',
                  'ec2:ReleaseAddress',
                  'ec2:DeleteLaunchTemplate',
                  'autoscaling:UpdateAutoScalingGroup',
                  'autoscaling:DeleteAutoScalingGroup'
                ],
                Resource: '*',
                Condition: onlyCloudFormation
              },
              {
                Effect: 'Allow',
                Action: [
                  'iam:GetRole',
                  'iam:DeleteRole',
                  'iam:DeleteRolePolicy',
                  'iam:ListRolePolicies',
                  'iam:ListAttachedRolePolicies',
                  'iam:DetachRolePolicy',
                  'iam:ListInstanceProfilesForRole',
                  'iam:GetInstanceProfile',
                  'iam:RemoveRoleFromInstanceProfile',
                  'iam:DeleteInstanceProfile'
                ],
                Resource: [
                  sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/${networkName}-*`),
                  sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:instance-profile/${networkName}-*`)
                ],
                Condition: onlyCloudFormation
              },
              {
                Effect: 'Allow',
                Action: [
                  'lambda:GetFunction',
                  'lambda:InvokeFunction',
                  'lambda:DeleteFunction',
                  'lambda:RemovePermission'
                ],
                Resource: arn('lambda', `function:${networkName}-*`),
                Condition: onlyCloudFormation
              },
              {
                Effect: 'Allow',
                Action: ['scheduler:GetSchedule', 'scheduler:DeleteSchedule'],
                Resource: arn('scheduler', `schedule/default/${networkName}-*`),
                Condition: onlyCloudFormation
              },
              {
                Effect: 'Allow',
                Action: ['ssm:GetParameters', 'ssm:DeleteParameter'],
                Resource: arn('ssm', `parameter/stp/\${AWS::Region}/${natName}/*`),
                Condition: onlyCloudFormation
              },
              {
                Effect: 'Allow',
                Action: ['logs:DescribeLogGroups', 'logs:DeleteLogGroup'],
                Resource: arn('logs', `log-group:${logGroupName}*`),
                Condition: onlyCloudFormation
              }
            ]
          }
        }
      ]
    }),
    // The function writes only to this group, which goes with the stack, and cannot create another. Like everything of
    // the janitor, it depends on the role, so CloudFormation deletes it while the role still exists.
    JanitorLogGroup: {
      ...cfnResource('AWS::Logs::LogGroup', { LogGroupName: logGroupName, RetentionInDays: 14 }),
      DependsOn: ['JanitorRole']
    },
    JanitorFunction: cfnResource('AWS::Lambda::Function', {
      FunctionName: functionName,
      Description: 'Removes the Stacktape shared NAT and network once no stage used them for a while',
      Runtime: 'python3.14',
      Architectures: ['arm64'],
      Handler: 'index.handler',
      MemorySize: 128,
      // A run waits for the NAT's delete (about 2.5 minutes) before it removes the network.
      Timeout: 900,
      Role: getAtt('JanitorRole', 'Arn'),
      Code: { ZipFile: JANITOR_FUNCTION_SOURCE },
      Environment: {
        Variables: {
          NETWORK_STACK: networkName,
          NAT_STACK: natName,
          ROLE_ARN: getAtt('JanitorRole', 'Arn'),
          UNUSED_SECONDS: `${unusedSeconds}`,
          PARAMETER_PREFIX: getSharedNetworkParameterPrefix(),
          STACK_NAME_TAG: tagNames.stackName()
        }
      }
    }),
    JanitorSchedule: cfnResource('AWS::Scheduler::Schedule', {
      Name: functionName,
      Description: 'Runs the janitor of the Stacktape shared network',
      ScheduleExpression: unusedSeconds < 60 * 60 ? 'rate(1 minute)' : 'rate(1 hour)',
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: { Arn: getAtt('JanitorFunction', 'Arn'), RoleArn: getAtt('JanitorRole', 'Arn') }
    }),
    JanitorDeletionBarrier: {
      ...cfnResource('AWS::CloudFormation::CustomResource', {
        ServiceToken: getAtt('JanitorFunction', 'Arn'),
        ServiceTimeout: 900
      }),
      DependsOn: ['JanitorRole']
    }
  };
};

/**
 * The no-access security group and its keepers (version 3).
 *
 * The group has no inbound rules, its outbound rules are the default (everything), and no stage resource admits it. A
 * stage function that connects to nothing private runs in it instead of the stage's groups
 * (`shared-network/no-access-group.ts`), so functions of every non-production stage share one subnet and
 * security-group combination. Lambda creates the network interfaces of a new combination in about 4 minutes and
 * releases them up to 20 minutes after its last function is gone; in a combination that is in use, a function is
 * created and deleted in seconds.
 *
 * The keepers hold the combination of each subnet set (public and private) while no stage does. They are idle
 * functions that the janitor creates (`Keeper`, a custom resource, does it right after the group exists), invokes on
 * every run, because Lambda reclaims the interfaces of functions not invoked for about 14 days, and deletes before it
 * removes the network. CloudFormation would wait about 4 minutes for a function in the VPC, which would delay every
 * first stage in the account; the custom resource does not wait. Their role can only manage network interfaces.
 */
const buildNoAccessGroupResources = (): CloudFormationTemplate['Resources'] => ({
  // Depends on the keepers' role, so CloudFormation deletes the role only after the group, whose delete waits until
  // Lambda has released the keepers' interfaces; Lambda manages them with that role. The janitor waits for the release
  // before it removes the network; a rollback or a manual delete may not. The role is created alongside the VPC.
  NoAccessSecurityGroup: {
    ...cfnResource('AWS::EC2::SecurityGroup', {
      VpcId: ref('Vpc'),
      GroupDescription:
        'Stacktape functions of non-production stages that connect to nothing private. Nothing admits this group.',
      Tags: [{ Key: 'Name', Value: `${getSharedNetworkStackName()}-no-access` }]
    }),
    DependsOn: ['KeeperRole']
  },
  KeeperRole: cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    Policies: [
      {
        PolicyName: 'keeper',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            // What Lambda needs to manage a function's network interfaces; the keepers write no logs.
            {
              Effect: 'Allow',
              Action: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DescribeSubnets',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses'
              ],
              Resource: '*'
            }
          ]
        }
      }
    ]
  }),
  Keeper: cfnResource('AWS::CloudFormation::CustomResource', {
    ServiceToken: getAtt('JanitorFunction', 'Arn'),
    ServiceTimeout: 300,
    NoAccessSecurityGroupId: ref('NoAccessSecurityGroup'),
    PublicSubnetIds: ZONES.map((zone) => ref(`PublicSubnet${zone}`)),
    PrivateSubnetIds: ZONES.map((zone) => ref(`PrivateSubnet${zone}`)),
    RoleArn: getAtt('KeeperRole', 'Arn')
  })
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
  Object.assign(resources, buildJanitorResources(), buildNoAccessGroupResources());
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
      NoAccessSecurityGroupId: {
        Value: ref('NoAccessSecurityGroup'),
        Export: { Name: getSharedNetworkExportName('no-access-security-group-id') }
      },
      // Read by the janitor's runs. The janitor function must not reference the keepers' resources: its deletion
      // barrier waits for them, and CloudFormation deletes a resource only after what references it.
      KeeperRoleArn: { Value: getAtt('KeeperRole', 'Arn') },
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
