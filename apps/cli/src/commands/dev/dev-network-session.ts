import type { DevNetwork, DevNetworkAws } from '@domain-services/dev-network';
import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import type { RelayOwner } from './tunnel-manager';
import { hostname } from 'node:os';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { filterResourcesForDevMode } from '@domain-services/config-manager/dev-mode';
import { createDevNetworkAws, ensureDevNetwork } from '@domain-services/dev-network';
import { ensureLeases } from '@domain-services/dev-network/leases';
import type { StackContext } from '@domain-services/stack-context';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { SsmPortForwardingTunnel } from '@utils/ssm-session';
import findFreePorts from 'find-free-ports';
import { recordDevBoxSession } from './agent-daemon';
import { createCleanupHook } from './cleanup-utils';
import { DevBoxConnection } from './dev-box';
import { getLocalEmulateableResources, getRelayedLocalResource } from './local-resources';
import { getResourceParamReferences } from './resource-references';
import { holdRelayPresence, pingRelay } from './tunnel-manager';

export type DevNetworkSession = {
  network: DevNetwork;
  connection: DevBoxConnection;
  placement: DevNetworkPlacement;
  /** The leased relay port of each relayed local resource. */
  leases: Map<string, number>;
  owner: RelayOwner;
};

let session: DevNetworkSession | undefined;

export const getDevNetworkSession = () => session;

/**
 * The dev stack's functions that run in the dev network, each with the local databases it reaches through the relay:
 * every VPC function, and every function that uses a locally emulated database (`connectTo` or `$ResourceParam`).
 *
 * A dev stack that still deploys VPC resources of its own (a remote database in its VPC, for example) keeps its VPC
 * functions there, where they reach those resources; they cannot reach local databases, which is reported.
 */
export const getDevNetworkDemand = ({ noTunnel }: { noTunnel: boolean }) => {
  const { remoteResourceNames } = configManager.deploymentContext;
  const localNames = new Set(
    getLocalEmulateableResources()
      .map(({ name }) => name)
      .filter((name) => !remoteResourceNames.has(name))
  );
  const stackKeepsOwnVpc = filterResourcesForDevMode(
    configManager.allResourcesRequiringVpc,
    configManager.deploymentContext
  ).some((resource) => !('configParentResourceType' in resource && resource.configParentResourceType === 'function'));
  const functions: Record<string, string[]> = {};
  const unreachable: Array<{ name: string; resources: string[] }> = [];
  for (const lambda of configManager.functions) {
    const local = [...new Set([...(lambda.connectTo || []), ...getResourceParamReferences(lambda)])].filter((name) =>
      localNames.has(name)
    );
    if (lambda.joinDefaultVpc && stackKeepsOwnVpc) {
      if (local.length && !noTunnel) unreachable.push({ name: lambda.name, resources: local });
      continue;
    }
    const relayed = noTunnel ? [] : local;
    if (lambda.joinDefaultVpc || relayed.length) functions[lambda.name] = relayed;
  }
  return { functions, unreachable };
};

const getOwner = (): RelayOwner => {
  const user = globalStateManager.userData;
  return {
    id: user?.id || `${process.env.USER || 'developer'}@${hostname()}`,
    label: `${user?.name || user?.email || process.env.USER || 'another developer'} (${hostname()})`
  };
};

const COST_EXPLANATION = [
  'Creating the dev network for this AWS account and region. This happens once and takes about 4 minutes.',
  'It is a VPC with a small EC2 instance, the dev box. Your deployed dev functions reach the databases on your machine',
  'through it, and VPC functions get internet access through it. Nothing is exposed to the internet: your machine',
  'connects to the box through AWS Systems Manager.',
  'Cost: about $0.01 per hour while a dev session runs. The box stops itself 30 minutes after the last session ends;',
  'stopped, it costs about $0.70 per month for its disk. See it with `stacktape dev network`, delete it with',
  '`stacktape dev network delete`.'
];

const registerSessionCleanupHook = createCleanupHook('dev-network', async () => {
  await session?.connection.stop();
  session = undefined;
});

/**
 * Prepares the dev network for this session: creates or updates the network, starts the box in the background, leases
 * relay ports and computes the placement the dev stack is synthesized with. Returns `undefined` when no function
 * needs the network.
 */
export const startDevNetworkSession = async ({
  stackContext,
  noTunnel,
  orphanedSessionId,
  aws = createDevNetworkAws()
}: {
  stackContext: Pick<StackContext, 'stackName' | 'projectName' | 'stage'>;
  noTunnel: boolean;
  /** The SSM session of a killed earlier session of this stage, ended before the new one opens. */
  orphanedSessionId?: string;
  aws?: DevNetworkAws;
}): Promise<DevNetworkSession | undefined> => {
  const { stackName, projectName, stage } = stackContext;
  if (orphanedSessionId) {
    await awsSdkManager.systemsManager.terminateSession({ sessionId: orphanedSessionId }).catch(() => {});
  }
  const { functions, unreachable } = getDevNetworkDemand({ noTunnel });
  for (const { name, resources } of unreachable) {
    tuiManager.warn(
      `Function "${name}" stays in this stage's own VPC, where the stage deploys VPC resources, and can't reach the local ${resources.join(', ')}. ` +
        `To connect it to the deployed resource instead, run with --remote-resources ${resources.join(',')}.`
    );
  }
  if (!Object.keys(functions).length) return undefined;

  const { network } = await ensureDevNetwork({ aws, onCreate: () => tuiManager.info(COST_EXPLANATION.join(' ')) });
  const owner = getOwner();
  registerSessionCleanupHook();
  const connection = new DevBoxConnection({
    network,
    owner,
    deps: {
      aws,
      onSession: (sessionId) => recordDevBoxSession(sessionId, projectName, stage),
      findFreePort: async () => (await findFreePorts(1))[0],
      pingRelay,
      holdPresence: holdRelayPresence,
      openSession: async ({ instanceId, localPort, remotePort }) => {
        const tunnel = new SsmPortForwardingTunnel({
          localPort,
          targetInfo: {
            bastionInstanceId: instanceId,
            remoteHost: '127.0.0.1',
            remotePort,
            label: 'dev box relay',
            targetStpName: 'devBox'
          }
        });
        try {
          await tunnel.connect();
        } catch (error) {
          await tunnel.kill().catch(() => {});
          throw error;
        }
        return tunnel;
      }
    }
  });
  // The connection starts the box and connects while the dev stack deploys and the local databases start. Its presence
  // connection keeps a box that has been idle for almost 30 minutes from stopping itself meanwhile.
  void connection.connect();

  const relayedNames = [...new Set(Object.values(functions).flat())];
  const leases = await ensureLeases({
    store: aws.leases,
    networkName: network.stackName,
    stackName,
    resourceNames: relayedNames
  });
  const localResources: DevNetworkPlacement['localResources'] = {};
  for (const resourceName of relayedNames) {
    const relayed = await getRelayedLocalResource(resourceName, {
      host: network.boxPrivateIp,
      port: leases.get(resourceName)!
    });
    if (relayed) localResources[resourceName] = relayed;
  }
  const placement: DevNetworkPlacement = {
    subnetIds: network.privateSubnetIds,
    securityGroupId: network.lambdaSecurityGroupId,
    functions,
    localResources
  };
  configManager.setDevNetworkPlacement(placement);
  session = { network, connection, placement, leases, owner };
  return session;
};
