import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, getAzs, join, ref, select } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';

const getInternetGateway = () => cfnResource('AWS::EC2::InternetGateway', {});
const getGatewayAttachment = () =>
  cfnResource('AWS::EC2::VPCGatewayAttachment', {
    VpcId: vpcManager.getVpcId(),
    InternetGatewayId: ref(cfLogicalNames.internetGateway())
  });

const getRouteTable = (_subnetIndex: number) => cfnResource('AWS::EC2::RouteTable', { VpcId: vpcManager.getVpcId() });

const getInternetGatewayRoute = (subnetIndex: number) => {
  const resource = cfnResource('AWS::EC2::Route', {
    RouteTableId: ref(cfLogicalNames.routeTable(true, subnetIndex)),
    DestinationCidrBlock: '0.0.0.0/0',
    GatewayId: ref(cfLogicalNames.internetGateway())
  });
  resource.DependsOn = [cfLogicalNames.vpcGatewayAttachment()];
  return resource;
};

const getRouteTableToSubnetAssociation = (publicSubnet: boolean, subnetIndex: number) =>
  cfnResource('AWS::EC2::SubnetRouteTableAssociation', {
    RouteTableId: ref(cfLogicalNames.routeTable(publicSubnet, subnetIndex)),
    SubnetId: ref(cfLogicalNames.subnet(publicSubnet, subnetIndex))
  });

const getVpc = (vpcCidrBlock: string) =>
  cfnResource('AWS::EC2::VPC', {
    CidrBlock: vpcCidrBlock,
    EnableDnsHostnames: true,
    EnableDnsSupport: true
  });

const getSubnet = (subnetCidrBlock: string, publicSubnet: boolean, subnetIndex: number, region: AWSRegion) => {
  const subnet = cfnResource('AWS::EC2::Subnet', {
    CidrBlock: subnetCidrBlock,
    VpcId: vpcManager.getVpcId(),
    MapPublicIpOnLaunch: publicSubnet,
    AvailabilityZone: select(subnetIndex, getAzs(region))
  });
  return subnet;
};

const getVpcGatewayEndpoint = ({ type }: { type: 's3' | 'dynamo-db' }) => {
  const routeTableIds = [
    ref(cfLogicalNames.routeTable(true, 0)),
    ref(cfLogicalNames.routeTable(true, 1)),
    ref(cfLogicalNames.routeTable(true, 2))
  ];

  // Add private subnet route tables if private subnets exist
  if (configManager.allResourcesRequiringPrivateSubnets.length > 0) {
    routeTableIds.push(
      ref(cfLogicalNames.routeTable(false, 0)),
      ref(cfLogicalNames.routeTable(false, 1)),
      ref(cfLogicalNames.routeTable(false, 2))
    );
  }

  const resource = cfnResource('AWS::EC2::VPCEndpoint', {
    VpcId: vpcManager.getVpcId(),
    ServiceName:
      type === 's3'
        ? `com.amazonaws.${calculatedStackOverviewManager.context.region}.s3`
        : `com.amazonaws.${calculatedStackOverviewManager.context.region}.dynamodb`,
    VpcEndpointType: 'Gateway',
    RouteTableIds: routeTableIds
  });
  return resource;
};

const getKafkaOnDemandEndpointSecurityGroup = () =>
  cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupDescription: 'PrivateLink endpoints used by Lambda on-demand Kafka event-source mappings',
    SecurityGroupIngress: [
      {
        CidrIp: vpcManager.getVpcCidr(),
        FromPort: 443,
        ToPort: 443,
        IpProtocol: 'tcp'
      }
    ]
  });

const getKafkaOnDemandVpcEndpoint = (service: 'lambda' | 'sts') =>
  cfnResource('AWS::EC2::VPCEndpoint', {
    VpcId: vpcManager.getVpcId(),
    VpcEndpointType: 'Interface',
    ServiceName: `com.amazonaws.${calculatedStackOverviewManager.context.region}.${service}`,
    SubnetIds: vpcManager.getKafkaSubnetIds(),
    SecurityGroupIds: [ref(cfLogicalNames.kafkaOnDemandEndpointSecurityGroup())],
    PrivateDnsEnabled: true
  });

const getNatElasticIp = () => cfnResource('AWS::EC2::EIP', { Domain: 'vpc' });

const getNatGateway = (azIndex: number) => {
  const natGateway = cfnResource('AWS::EC2::NatGateway', {
    SubnetId: ref(cfLogicalNames.subnet(true, azIndex)),
    AllocationId: getAtt(cfLogicalNames.natElasticIp(azIndex), 'AllocationId')
  });
  return natGateway;
};

const getNatRoute = (subnetIndex: number, natAzIndex: number) => {
  const route = cfnResource('AWS::EC2::Route', {
    RouteTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
    DestinationCidrBlock: '0.0.0.0/0',
    NatGatewayId: ref(cfLogicalNames.natGateway(natAzIndex))
  });
  return route;
};

export const resolveAwsVpcDeployment = async () => {
  const shouldCreateVpc = configManager.allResourcesRequiringVpc.length && !configManager.reuseVpcConfig;

  if (!shouldCreateVpc) {
    return;
  }

  // Create VPC
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.vpc(),
    resource: getVpc(vpcManager.getVpcCidr()),
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
  });

  // Create Internet Gateway and attachment
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.internetGateway(),
    resource: getInternetGateway(),
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.vpcGatewayAttachment(),
    resource: getGatewayAttachment(),
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
  });

  // Create 3 public subnets with individual route tables
  const publicCidrs = ['172.16.0.0/20', '172.16.16.0/20', '172.16.32.0/20'];

  publicCidrs.forEach((cidr, i) => {
    // Create public subnet
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.subnet(true, i),
      resource: getSubnet(cidr, true, i, calculatedStackOverviewManager.context.region),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });

    // Create route table for this public subnet
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.routeTable(true, i),
      resource: getRouteTable(i),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });

    // Create IGW route for this route table
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.internetGatewayRoute(i),
      resource: getInternetGatewayRoute(i),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });

    // Associate route table with subnet
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.routeTableToSubnetAssociation(true, i),
      resource: getRouteTableToSubnetAssociation(true, i),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  });

  // Create private subnets if needed
  const requiresPrivateSubnets = configManager.allResourcesRequiringPrivateSubnets.length > 0;

  if (requiresPrivateSubnets) {
    const natConfig = configManager.stackConfig.vpc?.nat;
    const numNatGateways = natConfig?.availabilityZones ?? 2;

    // Collect EIP references for metadata
    const natEipRefs: any[] = [];

    // Create NAT Gateways
    for (let i = 0; i < numNatGateways; i++) {
      // Create Elastic IP (required for NAT Gateway)
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.natElasticIp(i),
        resource: getNatElasticIp(),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });

      // Create NAT Gateway
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.natGateway(i),
        resource: getNatGateway(i),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });

      // Collect EIP reference for metadata
      natEipRefs.push(ref(cfLogicalNames.natElasticIp(i)));
    }

    // Add NAT Gateway EIPs to stack metadata as comma-separated list
    calculatedStackOverviewManager.addStackMetadata({
      metaName: stackMetadataNames.natPublicIps(),
      metaValue: join(',', natEipRefs),
      showDuringPrint: true
    });

    // Create 3 private subnets
    const privateCidrs = ['172.16.48.0/20', '172.16.64.0/20', '172.16.80.0/20'];

    privateCidrs.forEach((cidr, i) => {
      // Create private subnet
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.subnet(false, i),
        resource: getSubnet(cidr, false, i, calculatedStackOverviewManager.context.region),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });

      // Create route table for this private subnet
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.routeTable(false, i),
        resource: getRouteTable(i),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });

      // Determine which NAT Gateway this subnet should use
      const natAzIndex = Math.min(i, numNatGateways - 1);

      // Create NAT route
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.natRoute(i),
        resource: getNatRoute(i, natAzIndex),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });

      // Associate route table with subnet
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.routeTableToSubnetAssociation(false, i),
        resource: getRouteTableToSubnetAssociation(false, i),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    });
  }

  // Create VPC Gateway Endpoints
  if (configManager.isVpcGatewayEndpointRequired.s3EndpointRequired) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.vpcGatewayEndpoint('s3'),
      resource: getVpcGatewayEndpoint({ type: 's3' }),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
  if (configManager.isVpcGatewayEndpointRequired.dynamoDbEndpointRequired) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.vpcGatewayEndpoint('dynamo-db'),
      resource: getVpcGatewayEndpoint({ type: 'dynamo-db' }),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
  if (configManager.kafkaClustersWithLambdaEvents.length && !configManager.reuseVpcConfig) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.kafkaOnDemandEndpointSecurityGroup(),
      resource: getKafkaOnDemandEndpointSecurityGroup(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    (['lambda', 'sts'] as const).forEach((service) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.kafkaOnDemandVpcEndpoint(service),
        resource: getKafkaOnDemandVpcEndpoint(service),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    });
  }
};
