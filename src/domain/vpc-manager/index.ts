import type { Subnet, Vpc } from '@aws-sdk/client-ec2';
import { eventManager } from '@application-services/event-manager';
import { Ref } from '@cloudform/functions';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getStackName } from '@shared/naming/utils';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

type SubnetDetails = {
  subnet: Subnet;
};

// Helper function to validate VPC CIDR is within RFC 1918 private IP ranges
const isPrivateCidr = (cidrBlock: string): boolean => {
  const ipMatch = cidrBlock.match(/^(\d+)\.(\d+)\./);
  if (!ipMatch) {
    return false;
  }

  const firstOctet = Number.parseInt(ipMatch[1], 10);
  const secondOctet = Number.parseInt(ipMatch[2], 10);

  // 10.0.0.0/8
  if (firstOctet === 10) {
    return true;
  }

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  // 192.168.0.0/16
  if (firstOctet === 192 && secondOctet === 168) {
    return true;
  }

  return false;
};

export class VpcManager {
  name = this.constructor.name;
  #vpc: Vpc | null = null;
  #publicSubnets: SubnetDetails[] = [];
  #privateSubnets: SubnetDetails[] = [];

  init = async (params?: { reuseVpc?: VpcReuseConfig; resourcesRequiringPrivateSubnet?: StpResource[] }) => {
    // Check if reuseVpc is configured
    const reuseVpc = params?.reuseVpc;
    if (!reuseVpc) {
      return;
    }

    const resourcesRequiringPrivateSubnet = params?.resourcesRequiringPrivateSubnet || [];

    await eventManager.startEvent({
      eventType: 'LOAD_VPC_INFO',
      description: 'Loading VPC information'
    });

    let vpcId: string;

    // Determine VPC ID using one of two methods
    if (reuseVpc.vpcId) {
      // Method 1: Direct VPC ID
      vpcId = reuseVpc.vpcId;
    } else {
      // Method 2: Find VPC in target stack using projectName/stage
      const targetStackName = getStackName(reuseVpc.projectName, reuseVpc.stage);
      const stackResources = await awsSdkManager.getStackResources(targetStackName);

      const vpcLogicalName = cfLogicalNames.vpc();
      const vpcResource = stackResources.find((resource) => resource.LogicalResourceId === vpcLogicalName);

      if (!vpcResource || !vpcResource.PhysicalResourceId) {
        throw stpErrors.e131({ stackName: targetStackName });
      }

      vpcId = vpcResource.PhysicalResourceId;
    }

    // Get VPC details from EC2 API
    const vpcs = await awsSdkManager.describeVpcs([vpcId]);
    this.#vpc = vpcs[0];

    if (!this.#vpc?.CidrBlock || !this.#vpc?.VpcId) {
      throw stpErrors.e131({
        stackName: reuseVpc.projectName && reuseVpc.stage ? getStackName(reuseVpc.projectName, reuseVpc.stage) : vpcId
      });
    }

    // Validate VPC CIDR is within private IP ranges
    if (!isPrivateCidr(this.#vpc.CidrBlock)) {
      throw stpErrors.e134({ vpcId, cidrBlock: this.#vpc.CidrBlock });
    }

    // Get all subnets in the VPC
    const allSubnets = await awsSdkManager.describeSubnets({ vpcId });

    // Get route tables for the VPC
    const routeTables = await awsSdkManager.describeRouteTables(vpcId);

    // Build subnet-to-route-table mapping
    const subnetToRouteTableMap = new Map<string, string>();
    let mainRouteTableId: string | undefined;

    for (const routeTable of routeTables) {
      // Check if this is the main route table
      const isMainRouteTable = routeTable.Associations?.some((assoc) => assoc.Main);
      if (isMainRouteTable && routeTable.RouteTableId) {
        mainRouteTableId = routeTable.RouteTableId;
      }

      // Map explicitly associated subnets to this route table
      for (const association of routeTable.Associations || []) {
        if (association.SubnetId && routeTable.RouteTableId) {
          subnetToRouteTableMap.set(association.SubnetId, routeTable.RouteTableId);
        }
      }
    }

    // Categorize subnets as public or private
    for (const subnet of allSubnets) {
      if (!subnet.SubnetId) {
        continue;
      }

      // Find the route table for this subnet (explicit association or main route table)
      const routeTableId = subnetToRouteTableMap.get(subnet.SubnetId) || mainRouteTableId;
      const routeTable = routeTables.find((rt) => rt.RouteTableId === routeTableId);

      // Check if route table has a route to an Internet Gateway
      const hasIgwRoute = routeTable?.Routes?.some(
        (route) => route.DestinationCidrBlock === '0.0.0.0/0' && route.GatewayId?.startsWith('igw-')
      );

      // Create SubnetDetails
      const subnetDetails: SubnetDetails = {
        subnet
      };

      if (hasIgwRoute) {
        this.#publicSubnets.push(subnetDetails);
      } else {
        this.#privateSubnets.push(subnetDetails);
      }
    }

    // Validate minimum 3 public subnets
    if (this.#publicSubnets.length < 3) {
      throw stpErrors.e133({ vpcId, foundCount: this.#publicSubnets.length });
    }

    // Validate minimum 2 private subnets if resources require them
    if (resourcesRequiringPrivateSubnet.length > 0 && this.#privateSubnets.length < 2) {
      throw stpErrors.e135({
        vpcId,
        foundCount: this.#privateSubnets.length,
        requiringResources: resourcesRequiringPrivateSubnet.map((r) => r.name)
      });
    }

    await eventManager.finishEvent({
      eventType: 'LOAD_VPC_INFO',
      data: {
        vpcId,
        publicSubnetCount: this.#publicSubnets.length,
        privateSubnetCount: this.#privateSubnets.length
      }
    });
  };

  getVpcId = () => {
    if (this.#vpc?.VpcId) {
      return this.#vpc.VpcId;
    }
    return Ref(cfLogicalNames.vpc());
  };

  getVpcCidr = () => {
    if (this.#vpc?.CidrBlock) {
      return this.#vpc.CidrBlock;
    }
    return '172.16.0.0/16';
  };

  getPublicSubnetIds = () => {
    if (this.#publicSubnets.length > 0) {
      return this.#publicSubnets.map((subnetDetails) => subnetDetails.subnet.SubnetId!);
    }
    return [
      Ref(cfLogicalNames.subnet(true, 0)),
      Ref(cfLogicalNames.subnet(true, 1)),
      Ref(cfLogicalNames.subnet(true, 2))
    ];
  };

  getPrivateSubnetIds = () => {
    if (this.#privateSubnets.length > 0) {
      return this.#privateSubnets.map((subnetDetails) => subnetDetails.subnet.SubnetId!);
    }
    return [
      Ref(cfLogicalNames.subnet(false, 0)),
      Ref(cfLogicalNames.subnet(false, 1)),
      Ref(cfLogicalNames.subnet(false, 2))
    ];
  };
}

export const vpcManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new VpcManager());
