import { base64, getAtt, getAzs, join, ref, select, sub } from '@stacktape/cloudformation/intrinsics';
import { cfnResource, type CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { getDevBoxUserData } from './boot-script';

/** Increment when the template changes: an older network is updated on the next `stacktape dev` that uses it. */
export const DEV_NETWORK_CONTRACT_VERSION = 4;
export const DEV_NETWORK_KIND = 'dev-network';
export const DEV_BOX_IMAGE_PARAMETER = '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64';
export const DEV_BOX_INSTANCE_TYPE = 't4g.nano';

const VPC_CIDR = '10.230.0.0/16';
const PUBLIC_SUBNET_CIDRS = ['10.230.0.0/20', '10.230.16.0/20'];
const PRIVATE_SUBNET_CIDRS = ['10.230.128.0/20', '10.230.144.0/20'];

const tags = (networkName: string, name: string) => [
  { Key: 'Name', Value: name },
  { Key: 'stacktape:dev-network', Value: networkName }
];

/**
 * The dev network of one AWS account and region, shared by every `stacktape dev` session there:
 *
 * - a VPC with two public and two private subnets;
 * - the dev box, one t4g.nano instance in the first public subnet. It is the private subnets' NAT (their default route
 *   points at it) and runs the relay through which deployed dev functions reach databases on a developer's machine.
 *   It has one network interface: a stopped instance with one interface gets a new public IP when it starts, which it
 *   needs for SSM and NAT. Its private IP never changes, so dev stacks are deployed with it. It starts without its
 *   instance profile: CloudFormation waits about 2 minutes after creating a profile, and an instance that refers to it
 *   would wait too. `stacktape dev` attaches the profile once it exists, and the box connects to SSM then;
 * - `LambdaSecurityGroup`, which every dev function in the network uses, and `BoxSecurityGroup`, which admits only it;
 * - the keeper function. Lambda creates the network interfaces of a subnet and security-group combination with the
 *   first function that uses it (about 4 minutes) and removes them after the last one is deleted (1 to 2 minutes, which a
 *   stack deletion waits for). The keeper uses the dev functions' combination and is never invoked, so dev stacks are
 *   created in seconds and deleted without that wait.
 *
 * The image is a parameter resolved once at creation: a newer Amazon Linux image must not replace the box, which
 * would change its private IP.
 */
export const buildDevNetworkTemplate = ({ networkName }: { networkName: string }): CloudFormationTemplate => {
  const resources: CloudFormationTemplate['Resources'] = {
    Vpc: cfnResource('AWS::EC2::VPC', {
      CidrBlock: VPC_CIDR,
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
      Tags: tags(networkName, networkName)
    }),
    InternetGateway: cfnResource('AWS::EC2::InternetGateway', { Tags: tags(networkName, networkName) }),
    GatewayAttachment: cfnResource('AWS::EC2::VPCGatewayAttachment', {
      VpcId: ref('Vpc'),
      InternetGatewayId: ref('InternetGateway')
    }),
    PublicRouteTable: cfnResource('AWS::EC2::RouteTable', {
      VpcId: ref('Vpc'),
      Tags: tags(networkName, `${networkName}-public`)
    }),
    PublicRoute: {
      ...cfnResource('AWS::EC2::Route', {
        RouteTableId: ref('PublicRouteTable'),
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: ref('InternetGateway')
      }),
      DependsOn: ['GatewayAttachment']
    },
    PrivateRouteTable: cfnResource('AWS::EC2::RouteTable', {
      VpcId: ref('Vpc'),
      Tags: tags(networkName, `${networkName}-private`)
    }),
    // While the box is stopped this route is a blackhole: dev functions in the network have no internet until a dev
    // session starts the box again.
    PrivateRoute: cfnResource('AWS::EC2::Route', {
      RouteTableId: ref('PrivateRouteTable'),
      DestinationCidrBlock: '0.0.0.0/0',
      InstanceId: ref('Box')
    }),
    // Free gateway endpoints: S3 and DynamoDB stay reachable from dev functions without the box.
    S3Endpoint: cfnResource('AWS::EC2::VPCEndpoint', {
      VpcId: ref('Vpc'),
      ServiceName: sub('com.amazonaws.${AWS::Region}.s3'),
      VpcEndpointType: 'Gateway',
      RouteTableIds: [ref('PrivateRouteTable'), ref('PublicRouteTable')]
    }),
    DynamoDbEndpoint: cfnResource('AWS::EC2::VPCEndpoint', {
      VpcId: ref('Vpc'),
      ServiceName: sub('com.amazonaws.${AWS::Region}.dynamodb'),
      VpcEndpointType: 'Gateway',
      RouteTableIds: [ref('PrivateRouteTable'), ref('PublicRouteTable')]
    }),
    LambdaSecurityGroup: cfnResource('AWS::EC2::SecurityGroup', {
      VpcId: ref('Vpc'),
      GroupDescription: 'Stacktape dev functions',
      SecurityGroupEgress: [{ IpProtocol: '-1', CidrIp: '0.0.0.0/0' }],
      Tags: tags(networkName, `${networkName}-lambdas`)
    }),
    BoxSecurityGroup: cfnResource('AWS::EC2::SecurityGroup', {
      VpcId: ref('Vpc'),
      GroupDescription: 'Stacktape dev box: relay ports and NAT for dev functions only',
      SecurityGroupIngress: [{ IpProtocol: '-1', SourceSecurityGroupId: ref('LambdaSecurityGroup') }],
      SecurityGroupEgress: [{ IpProtocol: '-1', CidrIp: '0.0.0.0/0' }],
      Tags: tags(networkName, `${networkName}-box`)
    }),
    BoxRole: cfnResource('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      },
      // SSM only. The box stops itself with an OS shutdown, which needs no AWS permission.
      ManagedPolicyArns: [sub('arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore')],
      Tags: tags(networkName, `${networkName}-box`)
    }),
    BoxInstanceProfile: cfnResource('AWS::IAM::InstanceProfile', { Roles: [ref('BoxRole')] }),
    // CloudFormation replaces an instance whose `LaunchTemplate` property changes, and a new version number changes it.
    // A replaced box gets a new private IP, which every deployed dev stack carries: keep this launch template static.
    BoxLaunchTemplate: cfnResource('AWS::EC2::LaunchTemplate', {
      LaunchTemplateData: { MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1 } }
    }),
    Box: cfnResource('AWS::EC2::Instance', {
      ImageId: ref('ImageId'),
      InstanceType: DEV_BOX_INSTANCE_TYPE,
      LaunchTemplate: {
        LaunchTemplateId: ref('BoxLaunchTemplate'),
        Version: getAtt('BoxLaunchTemplate', 'LatestVersionNumber')
      },
      NetworkInterfaces: [
        {
          DeviceIndex: '0',
          SubnetId: ref('PublicSubnet0'),
          GroupSet: [ref('BoxSecurityGroup')],
          AssociatePublicIpAddress: true,
          DeleteOnTermination: true
        }
      ],
      // NAT: forwarded packets carry the dev functions' addresses.
      SourceDestCheck: false,
      InstanceInitiatedShutdownBehavior: 'stop',
      UserData: base64(getDevBoxUserData()),
      Tags: tags(networkName, `${networkName}-box`)
    }),
    KeeperRole: cfnResource('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      },
      ManagedPolicyArns: [sub('arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole')],
      Tags: tags(networkName, `${networkName}-keeper`)
    }),
    Keeper: cfnResource('AWS::Lambda::Function', {
      FunctionName: `${networkName}-keeper`,
      Description: 'Keeps the network interfaces of Stacktape dev functions ready. Never invoked.',
      // A runtime whose function updates Lambda blocks would block every update of this stack. Python 3.14 is supported
      // as long as the OS-only `provided.al2023` (both until June 2029, with Amazon Linux 2023) and, unlike it, takes
      // inline code; Node.js 24 ends in April 2028.
      Runtime: 'python3.14',
      Architectures: ['arm64'],
      Handler: 'index.handler',
      MemorySize: 128,
      Timeout: 3,
      Role: getAtt('KeeperRole', 'Arn'),
      Code: { ZipFile: 'def handler(event, context):\n    return None\n' },
      VpcConfig: {
        SubnetIds: [ref('PrivateSubnet0'), ref('PrivateSubnet1')],
        SecurityGroupIds: [ref('LambdaSecurityGroup')]
      },
      Tags: tags(networkName, `${networkName}-keeper`)
    })
  };
  for (const [index, cidr] of PUBLIC_SUBNET_CIDRS.entries()) {
    resources[`PublicSubnet${index}`] = cfnResource('AWS::EC2::Subnet', {
      VpcId: ref('Vpc'),
      CidrBlock: cidr,
      MapPublicIpOnLaunch: true,
      AvailabilityZone: select(index, getAzs('')),
      Tags: tags(networkName, `${networkName}-public-${index}`)
    });
    resources[`PublicSubnet${index}RouteTable`] = cfnResource('AWS::EC2::SubnetRouteTableAssociation', {
      SubnetId: ref(`PublicSubnet${index}`),
      RouteTableId: ref('PublicRouteTable')
    });
  }
  for (const [index, cidr] of PRIVATE_SUBNET_CIDRS.entries()) {
    resources[`PrivateSubnet${index}`] = cfnResource('AWS::EC2::Subnet', {
      VpcId: ref('Vpc'),
      CidrBlock: cidr,
      AvailabilityZone: select(index, getAzs('')),
      Tags: tags(networkName, `${networkName}-private-${index}`)
    });
    resources[`PrivateSubnet${index}RouteTable`] = cfnResource('AWS::EC2::SubnetRouteTableAssociation', {
      SubnetId: ref(`PrivateSubnet${index}`),
      RouteTableId: ref('PrivateRouteTable')
    });
  }
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Stacktape dev network: the shared VPC and dev box of `stacktape dev` in this account and region.',
    Parameters: {
      ImageId: { Type: 'AWS::EC2::Image::Id', Description: 'Amazon Linux 2023 arm64 image of the dev box' }
    },
    Resources: resources,
    Outputs: {
      ResourceKind: { Value: DEV_NETWORK_KIND },
      OwnershipKey: { Value: networkName },
      ContractVersion: { Value: `${DEV_NETWORK_CONTRACT_VERSION}` },
      VpcId: { Value: ref('Vpc') },
      PrivateSubnetIds: { Value: join(',', [ref('PrivateSubnet0'), ref('PrivateSubnet1')]) },
      LambdaSecurityGroupId: { Value: ref('LambdaSecurityGroup') },
      BoxInstanceId: { Value: ref('Box') },
      BoxPrivateIp: { Value: getAtt('Box', 'PrivateIp') },
      BoxInstanceProfileName: { Value: ref('BoxInstanceProfile') },
      KeeperFunctionName: { Value: ref('Keeper') }
    }
  };
};
