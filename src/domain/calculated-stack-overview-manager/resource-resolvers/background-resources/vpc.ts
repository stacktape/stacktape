import { globalStateManager } from '@application-services/global-state-manager';
import EIP from '@cloudform/ec2/eip';
import InternetGateway from '@cloudform/ec2/internetGateway';
import NatGateway from '@cloudform/ec2/natGateway';
import Route from '@cloudform/ec2/route';
import RouteTable from '@cloudform/ec2/routeTable';
import Subnet from '@cloudform/ec2/subnet';
import SubnetRouteTableAssociation from '@cloudform/ec2/subnetRouteTableAssociation';
import VPC from '@cloudform/ec2/vpc';
import VPCEndpoint from '@cloudform/ec2/vpcEndpoint';
import VPCGatewayAttachment from '@cloudform/ec2/vpcGatewayAttachment';
import { GetAtt, GetAZs, Join, Ref, Select } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';

const getInternetGateway = () => new InternetGateway({});
const getGatewayAttachment = () =>
  new VPCGatewayAttachment({
    VpcId: vpcManager.getVpcId(),
    InternetGatewayId: Ref(cfLogicalNames.internetGateway())
  });

const getRouteTable = (_subnetIndex: number) => new RouteTable({ VpcId: vpcManager.getVpcId() });

const getInternetGatewayRoute = (subnetIndex: number) => {
  const resource = new Route({
    RouteTableId: Ref(cfLogicalNames.routeTable(true, subnetIndex)),
    DestinationCidrBlock: '0.0.0.0/0',
    GatewayId: Ref(cfLogicalNames.internetGateway())
  });
  resource.DependsOn = [cfLogicalNames.vpcGatewayAttachment()];
  return resource;
};

const getRouteTableToSubnetAssociation = (publicSubnet: boolean, subnetIndex: number) =>
  new SubnetRouteTableAssociation({
    RouteTableId: Ref(cfLogicalNames.routeTable(publicSubnet, subnetIndex)),
    SubnetId: Ref(cfLogicalNames.subnet(publicSubnet, subnetIndex))
  });

const getVpc = (vpcCidrBlock: string) =>
  new VPC({
    CidrBlock: vpcCidrBlock,
    EnableDnsHostnames: true,
    EnableDnsSupport: true
  });

const getSubnet = (subnetCidrBlock: string, publicSubnet: boolean, subnetIndex: number, region: AWSRegion) => {
  const subnet = new Subnet({
    CidrBlock: subnetCidrBlock,
    VpcId: vpcManager.getVpcId(),
    MapPublicIpOnLaunch: publicSubnet,
    AvailabilityZone: Select(subnetIndex, GetAZs(region))
  });
  return subnet;
};

const getVpcGatewayEndpoint = ({ type }: { type: 's3' | 'dynamo-db' }) => {
  const routeTableIds = [
    Ref(cfLogicalNames.routeTable(true, 0)),
    Ref(cfLogicalNames.routeTable(true, 1)),
    Ref(cfLogicalNames.routeTable(true, 2))
  ];

  // Add private subnet route tables if private subnets exist
  if (configManager.allResourcesRequiringPrivateSubnets.length > 0) {
    routeTableIds.push(
      Ref(cfLogicalNames.routeTable(false, 0)),
      Ref(cfLogicalNames.routeTable(false, 1)),
      Ref(cfLogicalNames.routeTable(false, 2))
    );
  }

  const resource = new VPCEndpoint({
    VpcId: vpcManager.getVpcId(),
    ServiceName:
      type === 's3'
        ? `com.amazonaws.${globalStateManager.region}.s3`
        : `com.amazonaws.${globalStateManager.region}.dynamodb`,
    VpcEndpointType: 'Gateway',
    RouteTableIds: routeTableIds
  });
  return resource;
};

const getNatElasticIp = () => new EIP({ Domain: 'vpc' });

const getNatGateway = (azIndex: number) => {
  const natGateway = new NatGateway({
    SubnetId: Ref(cfLogicalNames.subnet(true, azIndex)),
    AllocationId: GetAtt(cfLogicalNames.natElasticIp(azIndex), 'AllocationId')
  });
  return natGateway;
};

const getNatRoute = (subnetIndex: number, natAzIndex: number) => {
  const route = new Route({
    RouteTableId: Ref(cfLogicalNames.routeTable(false, subnetIndex)),
    DestinationCidrBlock: '0.0.0.0/0',
    NatGatewayId: Ref(cfLogicalNames.natGateway(natAzIndex))
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
      resource: getSubnet(cidr, true, i, globalStateManager.region),
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
      natEipRefs.push(Ref(cfLogicalNames.natElasticIp(i)));
    }

    // Add NAT Gateway EIPs to stack metadata as comma-separated list
    calculatedStackOverviewManager.addStackMetadata({
      metaName: stackMetadataNames.natPublicIps(),
      metaValue: Join(',', natEipRefs),
      showDuringPrint: true
    });

    // Create 3 private subnets
    const privateCidrs = ['172.16.48.0/20', '172.16.64.0/20', '172.16.80.0/20'];

    privateCidrs.forEach((cidr, i) => {
      // Create private subnet
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.subnet(false, i),
        resource: getSubnet(cidr, false, i, globalStateManager.region),
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
};
