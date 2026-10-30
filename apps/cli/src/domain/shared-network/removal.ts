import type { NetworkInterface, RouteTable, SecurityGroup, Subnet, VpcEndpoint } from '@aws-sdk/client-ec2';
import { getSharedNatStackName, getSharedNetworkStackName } from '@stacktape/naming/shared-stacks';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { SHARED_NAT_KIND, SHARED_NETWORK_KIND } from './template';

type RemovableStack = {
  StackId?: string;
  StackName?: string;
  StackStatus?: string;
  StackStatusReason?: string;
  Outputs?: Array<{ OutputKey?: string; OutputValue?: string; ExportName?: string }>;
};

type VpcContents = {
  interfaces: NetworkInterface[];
  subnets: Subnet[];
  securityGroups: SecurityGroup[];
  routeTables: RouteTable[];
  endpoints: VpcEndpoint[];
};

export type SharedNetworkRemovalAws = {
  /** By name or stack ID; `undefined` for a stack that does not exist under that name. */
  getStack: (stackNameOrId: string) => Promise<RemovableStack | undefined>;
  listImports: (exportName: string) => Promise<string[]>;
  /** The stack's resources that have a physical ID; none for a stack that does not exist. */
  listResources: (stackName: string) => Promise<Array<{ logicalId: string; physicalId: string }>>;
  setTerminationProtection: (stackId: string, enabled: boolean) => Promise<unknown>;
  deleteStack: (stackId: string) => Promise<unknown>;
  describeVpc: (vpcId: string) => Promise<VpcContents>;
};

export type SharedNetworkRemovalReport = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

type Outcome = { kind: 'absent' | 'removed' } | { kind: 'kept'; reason: string; warn?: boolean };

const READY_STATUSES = new Set(['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']);
const output = (stack: RemovableStack, key: string) =>
  stack.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;
const describeStatus = (stack: RemovableStack) =>
  `${stack.StackStatus}${stack.StackStatusReason ? `: ${stack.StackStatusReason}` : ''}`;
const listNames = (names: string[]) =>
  `${names
    .slice(0, 3)
    .map((name) => `\`${name}\``)
    .join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}`;

/**
 * What in the shared VPC Stacktape did not create: anything else a network interface, subnet, security group, route
 * table, route or endpoint belongs to. `owned` holds the physical IDs of the network's and the NAT's stacks and of the
 * stages that import the network.
 *
 * Interfaces AWS creates for a stage's functions, tasks, databases and load balancers are not stack resources; every
 * group they carry is one of the stage's. The NAT instance's own interface carries the NAT's group and the NAT stack's
 * tag, which an interface someone else put in that group lacks. A route counts only in the form Stacktape creates it:
 * the default route to the network's internet gateway or the NAT, or an endpoint's prefix-list route.
 */
export const findForeignUse = ({
  contents,
  owned,
  natSecurityGroupIds = new Set()
}: {
  contents: VpcContents;
  owned: Set<string>;
  natSecurityGroupIds?: Set<string>;
}): string[] => {
  const found: string[] = [];
  const natStackName = getSharedNatStackName();
  for (const networkInterface of contents.interfaces) {
    const groups = (networkInterface.Groups ?? []).map(({ GroupId }) => GroupId ?? '');
    const isNatInstance = networkInterface.TagSet?.some(
      ({ Key, Value }) => Key === tagNames.stackName() && Value === natStackName
    );
    const ours =
      owned.has(networkInterface.NetworkInterfaceId ?? '') ||
      (groups.length > 0 &&
        groups.every((group) => owned.has(group)) &&
        (isNatInstance || !groups.some((group) => natSecurityGroupIds.has(group))));
    if (!ours) {
      found.push(
        `network interface ${networkInterface.NetworkInterfaceId}${networkInterface.Description ? ` (${networkInterface.Description})` : ''}`
      );
    }
  }
  for (const { SubnetId } of contents.subnets) {
    if (!owned.has(SubnetId ?? '')) found.push(`subnet ${SubnetId}`);
  }
  for (const { GroupId, GroupName } of contents.securityGroups) {
    if (GroupName !== 'default' && !owned.has(GroupId ?? '')) found.push(`security group ${GroupId} (${GroupName})`);
  }
  for (const routeTable of contents.routeTables) {
    const id = routeTable.RouteTableId ?? '';
    if (!owned.has(id)) {
      if (!(routeTable.Associations ?? []).some(({ Main }) => Main)) found.push(`route table ${id}`);
      continue;
    }
    for (const route of routeTable.Routes ?? []) {
      const target =
        route.GatewayId ??
        route.NetworkInterfaceId ??
        route.NatGatewayId ??
        route.TransitGatewayId ??
        route.VpcPeeringConnectionId ??
        route.EgressOnlyInternetGatewayId ??
        route.InstanceId ??
        route.LocalGatewayId ??
        route.CarrierGatewayId ??
        route.CoreNetworkArn ??
        '';
      const createdByStacktape =
        target === 'local' ||
        (owned.has(target) && (route.DestinationCidrBlock === '0.0.0.0/0' || !!route.DestinationPrefixListId));
      if (createdByStacktape) continue;
      const destination = route.DestinationCidrBlock ?? route.DestinationPrefixListId ?? route.DestinationIpv6CidrBlock;
      found.push(`route to ${destination} through ${target} in route table ${id}`);
    }
  }
  for (const { VpcEndpointId, ServiceName } of contents.endpoints) {
    if (!owned.has(VpcEndpointId ?? '')) found.push(`VPC endpoint ${VpcEndpointId} (${ServiceName})`);
  }
  return found;
};

/**
 * Removes the shared NAT and then the shared network once no stage uses them. It runs after a stage in the shared
 * network was deleted.
 *
 * A stack's imports are its reference count: CloudFormation lists the stages that import its exports and refuses to
 * delete it while one does. A stage keeps its imports until its stack is deleted completely, also while its delete
 * finishes in the background. When every importer is being deleted, this waits for them. A stack is kept when a stage
 * still uses it, when its delete failed, and when the VPC holds anything Stacktape did not create there.
 *
 * Termination protection is turned off just before the delete. A deploy that makes sure of the stack meanwhile
 * imports it, which makes CloudFormation cancel the delete; protection is then turned on again. Concurrent removals
 * converge: a delete in progress is waited for by stack ID.
 */
export const removeUnusedSharedNetwork = async ({
  aws,
  report,
  pollIntervalMs = 5_000,
  importersTimeoutMs = 45 * 60_000,
  deleteTimeoutMs = 30 * 60_000,
  wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
}: {
  aws: SharedNetworkRemovalAws;
  report: SharedNetworkRemovalReport;
  pollIntervalMs?: number;
  importersTimeoutMs?: number;
  deleteTimeoutMs?: number;
  wait?: (milliseconds: number) => Promise<unknown>;
}) => {
  const natName = getSharedNatStackName();
  const networkName = getSharedNetworkStackName();
  let announcedWait = false;

  const exportNamesOf = (stack: RemovableStack) =>
    (stack.Outputs ?? []).map(({ ExportName }) => ExportName).filter((name): name is string => !!name);

  /** What Stacktape created in the VPC: the shared stacks' resources and those of the stages in the network. */
  const listOwned = async (network: RemovableStack) => {
    const stages = (await Promise.all(exportNamesOf(network).map(aws.listImports))).flat();
    const stacks = [...new Set([natName, networkName, ...stages])];
    const resources = (await Promise.all(stacks.map((name) => aws.listResources(name)))).flat();
    const nat = await aws.listResources(natName);
    return {
      owned: new Set(resources.map(({ physicalId }) => physicalId)),
      natSecurityGroupIds: new Set(
        nat.filter(({ logicalId }) => logicalId === 'SecurityGroup').map(({ physicalId }) => physicalId)
      )
    };
  };

  /** Waits until no stage imports the stack's exports. Importers that are being deleted are waited for. */
  const waitForImporters = async (stack: RemovableStack, label: string): Promise<Outcome | undefined> => {
    const exportNames = exportNamesOf(stack);
    const startedAt = Date.now();
    for (;;) {
      const importers = [...new Set((await Promise.all(exportNames.map(aws.listImports))).flat())];
      if (!importers.length) return undefined;
      const states = await Promise.all(importers.map(async (name) => ({ name, stack: await aws.getStack(name) })));
      const users = states.filter(({ stack: importer }) => importer && importer.StackStatus !== 'DELETE_IN_PROGRESS');
      if (users.length) {
        const failed = users.filter(({ stack: importer }) => importer?.StackStatus === 'DELETE_FAILED');
        return {
          kind: 'kept',
          reason: failed.length
            ? `the delete of ${listNames(failed.map(({ name }) => name))} failed, and it still uses it. Delete that stage again`
            : `${users.length === 1 ? 'the stack' : `${users.length} stacks`} ${listNames(users.map(({ name }) => name))} still ${users.length === 1 ? 'uses' : 'use'} it`
        };
      }
      if (Date.now() - startedAt > importersTimeoutMs) {
        return {
          kind: 'kept',
          reason: `AWS is still deleting ${listNames(importers)}. The next delete of a stage in the shared network removes it`
        };
      }
      // A deleted stack keeps its imports until its delete is complete, and for a few seconds after.
      const deleting = states.filter(({ stack: importer }) => importer).map(({ name }) => name);
      if (deleting.length && !announcedWait) {
        announcedWait = true;
        report.info(
          `Every stage that uses the shared ${label} is being deleted. Waiting for AWS to finish deleting ${listNames(deleting)}; the shared ${label} is removed after that. This usually takes a few minutes, up to about 20 when functions release network interfaces. Stopping now keeps it; the next delete of a stage in the shared network removes it.`
        );
      }
      await wait(pollIntervalMs);
    }
  };

  /** A stack that stays keeps its termination protection. Best effort: the failure being reported matters more. */
  const restoreProtection = async (stackId: string) => {
    try {
      await aws.setTerminationProtection(stackId, true);
    } catch (error) {
      report.warn(`Could not turn termination protection on again for ${stackId}: ${error}`);
    }
  };

  /** Waits for a delete by stack ID: a deleted stack vanishes from reads by name. */
  const waitForDeletion = async (stackId: string, { requested }: { requested: boolean }): Promise<Outcome> => {
    const startedAt = Date.now();
    let seenDeleting = false;
    for (;;) {
      const current = await aws.getStack(stackId);
      if (!current || current.StackStatus === 'DELETE_COMPLETE') return { kind: 'removed' };
      if (current.StackStatus === 'DELETE_IN_PROGRESS') seenDeleting = true;
      else if (current.StackStatus === 'DELETE_FAILED') {
        await restoreProtection(stackId);
        return { kind: 'kept', warn: true, reason: `CloudFormation could not delete it (${describeStatus(current)})` };
      } else if (seenDeleting || !requested || /delete canceled/i.test(current.StackStatusReason ?? '')) {
        // CloudFormation cancels the delete of a stack whose export a stage imports: a deploy started using it.
        await restoreProtection(stackId);
        return { kind: 'kept', reason: 'a stage started using it while it was being removed' };
      }
      if (Date.now() - startedAt > deleteTimeoutMs) {
        return { kind: 'kept', warn: true, reason: `its delete did not finish in time (${describeStatus(current)})` };
      }
      await wait(pollIntervalMs);
    }
  };

  const remove = async ({ stackName, kind, label }: { stackName: string; kind: string; label: string }) => {
    let stack = await aws.getStack(stackName);
    if (!stack?.StackId) return { kind: 'absent' } as Outcome;
    const stackId = stack.StackId;
    if (stack.StackStatus === 'DELETE_IN_PROGRESS') return waitForDeletion(stackId, { requested: false });
    if (output(stack, 'ResourceKind') !== kind) {
      return { kind: 'kept', reason: 'it is not a stack Stacktape created' } as Outcome;
    }
    const usage = await waitForImporters(stack, label);
    if (usage) return usage;
    // Re-read: another stage's delete may have started removing it meanwhile.
    stack = await aws.getStack(stackId);
    if (!stack || stack.StackStatus === 'DELETE_COMPLETE') return { kind: 'removed' } as Outcome;
    if (stack.StackStatus === 'DELETE_IN_PROGRESS') return waitForDeletion(stackId, { requested: false });
    if (!READY_STATUSES.has(stack.StackStatus ?? '')) {
      return { kind: 'kept', reason: `CloudFormation is changing it (${describeStatus(stack)})` } as Outcome;
    }
    const network = await aws.getStack(networkName);
    const vpcId = network && output(network, 'VpcId');
    if (network && vpcId) {
      const foreign = findForeignUse({ contents: await aws.describeVpc(vpcId), ...(await listOwned(network)) });
      if (foreign.length) {
        return {
          kind: 'kept',
          reason: `its VPC ${vpcId} holds resources Stacktape did not create: ${foreign.slice(0, 5).join('; ')}${foreign.length > 5 ? ` and ${foreign.length - 5} more` : ''}. Remove them to have it removed with the next stage delete`
        } as Outcome;
      }
    }
    try {
      await aws.setTerminationProtection(stackId, false);
      await aws.deleteStack(stackId);
    } catch (error) {
      // Another stage's delete removed it between the read and these calls.
      const current = await aws.getStack(stackId);
      if (!current || current.StackStatus === 'DELETE_COMPLETE') return { kind: 'removed' } as Outcome;
      if (current.StackStatus !== 'DELETE_IN_PROGRESS') {
        await restoreProtection(stackId);
        throw error;
      }
    }
    return waitForDeletion(stackId, { requested: true });
  };

  const print = (label: string, stackName: string, outcome: Outcome) => {
    if (outcome.kind === 'removed')
      report.info(`Removed the shared ${label} \`${stackName}\`: no stage uses it any more.`);
    if (outcome.kind !== 'kept') return;
    const message = `Kept the shared ${label} \`${stackName}\`: ${outcome.reason}.`;
    if (outcome.warn) report.warn(message);
    else report.info(message);
  };

  // The NAT imports the network's exports, so the network can go only after it.
  const nat = await remove({ stackName: natName, kind: SHARED_NAT_KIND, label: 'NAT' });
  print('NAT', natName, nat);
  if (nat.kind === 'kept') return;
  const network = await remove({ stackName: networkName, kind: SHARED_NETWORK_KIND, label: 'network' });
  print('network', networkName, network);
};

export const createSharedNetworkRemovalAws = (): SharedNetworkRemovalAws => ({
  getStack: async (stackNameOrId) => (await awsSdkManager.cloudFormation.getDetails(stackNameOrId)) ?? undefined,
  listImports: (exportName) => awsSdkManager.cloudFormation.listImports(exportName),
  listResources: async (stackName) =>
    (await awsSdkManager.cloudFormation.getResources(stackName)).flatMap(({ LogicalResourceId, PhysicalResourceId }) =>
      LogicalResourceId && PhysicalResourceId ? [{ logicalId: LogicalResourceId, physicalId: PhysicalResourceId }] : []
    ),
  setTerminationProtection: (stackId, enabled) =>
    awsSdkManager.cloudFormation.setTerminationProtection(enabled, stackId),
  // The stacks keep the CloudFormation role they were created with, if any.
  deleteStack: (stackId) => awsSdkManager.cloudFormation.delete(stackId, {}),
  describeVpc: async (vpcId) => {
    const [interfaces, subnets, securityGroups, routeTables, endpoints] = await Promise.all([
      awsSdkManager.ec2.describeNetworkInterfaces(vpcId),
      awsSdkManager.ec2.describeSubnets({ vpcId }),
      awsSdkManager.ec2.describeSecurityGroups(vpcId),
      awsSdkManager.ec2.describeRouteTables(vpcId),
      awsSdkManager.ec2.describeVpcEndpoints(vpcId)
    ]);
    return { interfaces, subnets, securityGroups, routeTables, endpoints };
  }
});
