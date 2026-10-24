import type { DevNetwork, DevNetworkAws } from '@domain-services/dev-network';
import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import type { RelayEndpoint, RelayOwner, RelaySessionInfo } from './tunnel-manager';
import { randomUUID } from 'node:crypto';
import { homedir, hostname } from 'node:os';
import { sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { filterResourcesForDevMode } from '@domain-services/config-manager/dev-mode';
import { createDevNetworkAws, ensureDevNetwork } from '@domain-services/dev-network';
import { ensureLeases } from '@domain-services/dev-network/leases';
import type { StackContext } from '@domain-services/stack-context';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import findFreePorts from 'find-free-ports';
import { recordDevBoxSession } from './agent-daemon';
import { createCleanupHook } from './cleanup-utils';
import { DevBoxConnection, openDevBoxRelaySession } from './dev-box';
import { getLocalEmulateableResources, getRelayedLocalResource } from './local-resources';
import { getResourceParamReferences } from './resource-references';
import { holdRelayPresence, listRelaySessions, pingRelay } from './tunnel-manager';

export type DevNetworkSession = {
  network: DevNetwork;
  connection: DevBoxConnection;
  placement: DevNetworkPlacement;
  /** The leased relay port of each relayed local resource. */
  leases: Map<string, number>;
  owner: RelayOwner;
  /** `--take-over`: the tunnels replace those of another session of this stage. */
  takeOver: boolean;
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

/**
 * This session as other sessions see it. Every `stacktape dev` process is its own session: two worktrees of one project
 * on one machine are told apart too, and the label names the machine and the project directory of the holder.
 */
const getOwner = (): RelayOwner => {
  const user = globalStateManager.userData;
  const home = homedir();
  const directory = globalStateManager.workingDir;
  const shownDirectory = directory.startsWith(`${home}${sep}`) ? `~${directory.slice(home.length)}` : directory;
  return {
    id: user?.id || `${process.env.USER || 'developer'}@${hostname()}`,
    label: `${user?.name || user?.email || process.env.USER || 'another developer'} (${hostname()}, ${shownDirectory})`,
    session: randomUUID()
  };
};

/** How long the stage check waits for a running box's relay; after that the tunnels' own refusal decides. */
const STAGE_CHECK_TIMEOUT_MS = 45_000;

/**
 * Refuses to start a stage that another `stacktape dev` session runs, before this one deploys anything: both would
 * deploy their function code, and only one can receive the deployed functions' database connections. A live session
 * keeps the box running, so a box that is not running needs no check. With `takeOver`, it reports whom it replaces.
 */
export const assertStageNotRunningElsewhere = async ({
  boxState,
  relay,
  listSessions,
  stackName,
  owner,
  takeOver,
  timeoutMs = STAGE_CHECK_TIMEOUT_MS
}: {
  boxState: string | undefined;
  relay: () => Promise<Pick<RelayEndpoint, 'controlHost' | 'controlPort'>>;
  listSessions: (
    relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>,
    stack: string
  ) => Promise<RelaySessionInfo[]>;
  stackName: string;
  owner: RelayOwner;
  takeOver: boolean;
  timeoutMs?: number;
}) => {
  if (boxState !== 'running' && boxState !== 'pending') return;
  const timeout = new AbortController();
  const endpoint = await Promise.race([
    relay(),
    delay(timeoutMs, undefined, { signal: timeout.signal }).then(
      () => undefined,
      () => undefined
    )
  ]).finally(() => timeout.abort());
  if (!endpoint) return;
  const others = (await listSessions(endpoint, stackName).catch(() => [])).filter(
    ({ session }) => session !== owner.session
  );
  if (!others.length) return;
  const holders = others
    .map(({ label, since }) => `${label}, since ${new Date(since * 1000).toLocaleTimeString()}`)
    .join('; ');
  if (takeOver) {
    tuiManager.info(`Taking over dev mode for ${stackName} from ${holders}.`);
    return;
  }
  throw new CliError({
    category: 'CLI',
    code: 'DEV_STAGE_RUNNING_ELSEWHERE',
    // The message carries the way out: `dev --agent` passes on only the message of its daemon's error.
    message: `Dev mode for ${stackName} already runs in another session: ${holders}. Stop that session, or run this command again with --take-over to move the stage here.`,
    hints:
      'With `--take-over`, deployed functions reach the databases on this machine, and the other session stops receiving their connections.'
  });
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
  takeOver,
  orphanedSessionId,
  aws = createDevNetworkAws()
}: {
  stackContext: Pick<StackContext, 'stackName' | 'projectName' | 'stage'>;
  noTunnel: boolean;
  takeOver: boolean;
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

  const { network } = await ensureDevNetwork({
    aws,
    onCreate: () => tuiManager.info(COST_EXPLANATION.join(' ')),
    onDeletionWait: () =>
      tuiManager.info('The dev network is being deleted. Waiting for the deletion to finish, then creating it again.')
  });
  const owner = getOwner();
  registerSessionCleanupHook();
  const connection = new DevBoxConnection({
    network,
    owner,
    stackName,
    deps: {
      aws,
      onSession: (sessionId) => recordDevBoxSession(sessionId, projectName, stage),
      findFreePort: async () => (await findFreePorts(1))[0],
      pingRelay,
      holdPresence: holdRelayPresence,
      openSession: openDevBoxRelaySession
    }
  });
  // Read before the connection starts a stopped box: only a box that already runs can have a session of this stage.
  const boxState = (await aws.describeBox(network.boxInstanceId))?.state;
  // The connection starts the box and connects while the dev stack deploys and the local databases start. Its presence
  // connection keeps a box that has been idle for almost 30 minutes from stopping itself meanwhile.
  void connection.connect();
  const relayedNames = [...new Set(Object.values(functions).flat())];
  let leases: Map<string, number>;
  try {
    await assertStageNotRunningElsewhere({
      boxState,
      relay: connection.connect,
      listSessions: listRelaySessions,
      stackName,
      owner,
      takeOver
    });
    leases = await ensureLeases({
      store: aws.leases,
      networkName: network.stackName,
      stackName,
      resourceNames: relayedNames
    });
  } catch (error) {
    // The session is not recorded yet, so the cleanup hook would not end this connection.
    await connection.stop();
    throw error;
  }
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
  session = { network, connection, placement, leases, owner, takeOver };
  return session;
};
