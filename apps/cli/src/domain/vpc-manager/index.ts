import { importValue, ref, select, split } from '@stacktape/cloudformation/intrinsics';
import type { StpResource } from '@domain-services/config-manager/resolved-types/resources';
import type { Subnet, Vpc } from '@aws-sdk/client-ec2';
import { operationReporter } from '@application-services/operation-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getStackName } from '@stacktape/naming/stacks';
import { getSharedNetworkExportName } from '@stacktape/naming/shared-stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/compose';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import type { VpcReuseConfig } from '@stacktape/config/shared';
import { CliError } from '@utils/errors';
import { vpcErrors } from './errors';

type SubnetDetails = {
  subnet: Subnet;
};

/** The shared non-production network as its stack outputs describe it (see `domain/shared-network`). */
export type SharedNetwork = {
  vpcId: string;
  vpcCidr: string;
  /** Public subnet `i` and private subnet `i` share a zone. */
  publicSubnets: Array<{ id: string; availabilityZone: string }>;
  privateSubnets: Array<{ id: string; availabilityZone: string }>;
  /** The public IP of the shared NAT, when the stage uses it. */
  natPublicIp?: string;
};

/** A security group ingress rule without its source. */
type IngressPorts = { FromPort: number; ToPort: number; IpProtocol: string; Description?: string };

/** Placeholders for a preview before the shared network exists: its exports, which a deploy replaces with literals. */
const sharedNetworkPlaceholders = () => {
  const subnets = (exportName: 'public-subnet-ids' | 'private-subnet-ids') =>
    [0, 1, 2].map((index) => ({
      SubnetId: select(index, split(',', importValue(getSharedNetworkExportName(exportName)))) as unknown as string,
      AvailabilityZone: `zone-${index}`
    }));
  return {
    vpc: { VpcId: importValue(getSharedNetworkExportName('vpc-id')) as unknown as string, CidrBlock: '10.231.0.0/16' },
    publicSubnets: subnets('public-subnet-ids'),
    privateSubnets: subnets('private-subnet-ids')
  };
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

class VpcManager {
  name = this.constructor.name;
  #vpc: Vpc | null = null;
  #publicSubnets: SubnetDetails[] = [];
  #privateSubnets: SubnetDetails[] = [];
  #shared: { usesNat: boolean; natPublicIp?: string } | null = null;

  /**
   * Places the stack's networked resources in the shared non-production network, or back in a VPC of its own
   * (`undefined`). `not-created` is a preview of a stage whose network does not exist yet.
   */
  useSharedNetwork = (network: SharedNetwork | 'not-created' | undefined, { usesNat = false } = {}) => {
    if (!network) {
      if (this.#shared) {
        this.#shared = null;
        this.#vpc = null;
        this.#publicSubnets = [];
        this.#privateSubnets = [];
      }
      return;
    }
    const { vpc, publicSubnets, privateSubnets } =
      network === 'not-created'
        ? sharedNetworkPlaceholders()
        : {
            vpc: { VpcId: network.vpcId, CidrBlock: network.vpcCidr },
            publicSubnets: network.publicSubnets.map(({ id, availabilityZone }) => ({
              SubnetId: id,
              AvailabilityZone: availabilityZone
            })),
            privateSubnets: network.privateSubnets.map(({ id, availabilityZone }) => ({
              SubnetId: id,
              AvailabilityZone: availabilityZone
            }))
          };
    this.#vpc = vpc;
    this.#publicSubnets = publicSubnets.map((subnet) => ({ subnet }));
    this.#privateSubnets = privateSubnets.map((subnet) => ({ subnet }));
    this.#shared = { usesNat, natPublicIp: network === 'not-created' ? undefined : network.natPublicIp };
  };

  /** Whether the stack runs in the shared non-production network instead of a VPC it creates or reuses. */
  get isSharedNetwork() {
    return this.#shared !== null;
  }

  get sharedNetwork() {
    return this.#shared;
  }

  /**
   * The security groups of a network interface the stack creates (a function, task, instance, load balancer or VPC
   * link). In the shared network every one of them also carries the stage's group, which `vpcWideIngress` admits.
   */
  withStageSecurityGroup = <T>(securityGroups: T[]): Array<T | ReturnType<typeof ref>> =>
    this.isSharedNetwork ? [...securityGroups, ref(cfLogicalNames.stageNetworkSecurityGroup())] : securityGroups;

  /**
   * An ingress rule that admits "the stack's VPC". In a VPC of the stack's own that is its CIDR. In the shared network
   * the CIDR also holds every other non-production stage, so the rule admits the stage's group instead.
   */
  vpcWideIngress = (ports: IngressPorts) =>
    this.isSharedNetwork
      ? { ...ports, SourceSecurityGroupId: ref(cfLogicalNames.stageNetworkSecurityGroup()) }
      : { ...ports, CidrIp: this.getVpcCidr() };

  init = async (params?: { reuseVpc?: VpcReuseConfig; resourcesRequiringPrivateSubnet?: StpResource[] }) => {
    // Check if reuseVpc is configured
    const reuseVpc = params?.reuseVpc;
    if (!reuseVpc) {
      return;
    }

    const resourcesRequiringPrivateSubnet = params?.resourcesRequiringPrivateSubnet || [];

    await operationReporter.startEvent({
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
      const stackResources = await awsSdkManager.cloudFormation.getResources(targetStackName);

      const vpcLogicalName = cfLogicalNames.vpc();
      const vpcResource = stackResources.find((resource) => resource.LogicalResourceId === vpcLogicalName);

      if (!vpcResource || !vpcResource.PhysicalResourceId) {
        throw vpcErrors.reuseTargetNotFound(targetStackName);
      }

      vpcId = vpcResource.PhysicalResourceId;
    }

    // Get VPC details from EC2 API
    const vpcs = await awsSdkManager.ec2.describeVpcs([vpcId]);
    this.#vpc = vpcs[0];

    if (!this.#vpc?.CidrBlock || !this.#vpc?.VpcId) {
      throw vpcErrors.reuseTargetNotFound(
        reuseVpc.projectName && reuseVpc.stage ? getStackName(reuseVpc.projectName, reuseVpc.stage) : vpcId
      );
    }

    // Validate VPC CIDR is within private IP ranges
    if (!isPrivateCidr(this.#vpc.CidrBlock)) {
      throw vpcErrors.cidrNotPrivate({ vpcId, cidrBlock: this.#vpc.CidrBlock });
    }

    // Get all subnets in the VPC
    const allSubnets = await awsSdkManager.ec2.describeSubnets({ vpcId });

    // Get route tables for the VPC
    const routeTables = await awsSdkManager.ec2.describeRouteTables(vpcId);

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
      throw vpcErrors.publicSubnetsInsufficient({ vpcId, foundCount: this.#publicSubnets.length });
    }

    // Validate minimum 2 private subnets if resources require them
    if (resourcesRequiringPrivateSubnet.length > 0 && this.#privateSubnets.length < 2) {
      throw vpcErrors.privateSubnetsInsufficient({
        vpcId,
        foundCount: this.#privateSubnets.length,
        requiringResources: resourcesRequiringPrivateSubnet.map((r) => r.name)
      });
    }

    await operationReporter.finishEvent({
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
    return ref(cfLogicalNames.vpc());
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
      ref(cfLogicalNames.subnet(true, 0)),
      ref(cfLogicalNames.subnet(true, 1)),
      ref(cfLogicalNames.subnet(true, 2))
    ];
  };

  getKafkaSubnetIds = () => {
    if (this.#publicSubnets.length === 0) return this.getPublicSubnetIds();
    const subnetsByAvailabilityZone = new Map<string, string>();
    this.#publicSubnets.forEach(({ subnet }) => {
      if (
        subnet.SubnetId &&
        subnet.AvailabilityZoneId !== 'use1-az3' &&
        subnet.AvailabilityZone &&
        !subnetsByAvailabilityZone.has(subnet.AvailabilityZone)
      ) {
        subnetsByAvailabilityZone.set(subnet.AvailabilityZone, subnet.SubnetId);
      }
    });
    if (subnetsByAvailabilityZone.size < 2) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_KAFKA_VPC_SUBNETS_INVALID',
        message: 'Kafka requires public subnets in at least two distinct supported availability zones.',
        hints:
          'Use a VPC with public subnets in at least two availability zones. In us-east-1, MSK does not support use1-az3.'
      });
    }
    return [...subnetsByAvailabilityZone.values()];
  };

  /**
   * One subnet in each availability zone that workloads in the VPC run in: the zones of the public subnets, plus the
   * zones of the private subnets when `includePrivateSubnets`. Public subnets win within a zone and keep their order,
   * so the first entries stay the first public subnets. In the stack's own VPC, public and private subnet `i` share
   * zone `i`, so these are the three public subnets.
   */
  getSubnetIdPerAvailabilityZone = ({ includePrivateSubnets }: { includePrivateSubnets: boolean }) => {
    if (this.#publicSubnets.length === 0) return this.getPublicSubnetIds();
    const subnetsByAvailabilityZone = new Map<string, string>();
    [...this.#publicSubnets, ...(includePrivateSubnets ? this.#privateSubnets : [])].forEach(({ subnet }) => {
      if (subnet.SubnetId && subnet.AvailabilityZone && !subnetsByAvailabilityZone.has(subnet.AvailabilityZone)) {
        subnetsByAvailabilityZone.set(subnet.AvailabilityZone, subnet.SubnetId);
      }
    });
    return [...subnetsByAvailabilityZone.values()];
  };

  getPrivateSubnetIds = () => {
    if (this.#privateSubnets.length > 0) {
      return this.#privateSubnets.map((subnetDetails) => subnetDetails.subnet.SubnetId!);
    }
    return [
      ref(cfLogicalNames.subnet(false, 0)),
      ref(cfLogicalNames.subnet(false, 1)),
      ref(cfLogicalNames.subnet(false, 2))
    ];
  };
}

export const vpcManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new VpcManager());
