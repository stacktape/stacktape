import type { DevNetwork, DevNetworkAws } from '@domain-services/dev-network';
import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import type { RelayEndpoint, RelayOwner, RelaySessionInfo } from './tunnel-manager';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, sep } from 'node:path';
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
import { localStatePaths } from 'src/config/local-state-paths';
import { createSpinner } from '@application-services/tui-manager/spinner';
import { recordDevBoxSession } from './agent-daemon';
import { agentLog } from './agent-logger';
import { createCleanupHook } from './cleanup-utils';
import { DevBoxConnection, openDevBoxRelaySession } from './dev-box';
import { getLocalEmulateableResources, getRelayedLocalResource } from './local-resources';
import { getResourceParamReferences } from './resource-references';
import { reportDevStartup } from './startup-progress';
import { holdRelayPresence, listRelaySessions, pingRelay, setStageLostHandler } from './tunnel-manager';
import { formatTimeWithZone } from '@utils/formatting';

export type DevNetworkSession = {
  network: DevNetwork;
  connection: DevBoxConnection;
  placement: DevNetworkPlacement;
  /** The leased relay port of each relayed local resource. */
  leases: Map<string, number>;
  owner: RelayOwner;
  /** `--take-over`: the tunnels replace those of another session of this stage. */
  takeOver: boolean;
  /**
   * Resolves once the network is complete. A network created by this start is returned while CloudFormation still
   * creates part of it: the dev stack deploys meanwhile, and the session waits for this before it is ready.
   */
  ready: Promise<void>;
  /** Whether `ready` has settled, and its error once it rejected, so a failed dev stack deployment reports the cause. */
  readyState: () => { settled: boolean; error?: unknown };
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
    // The process ID and the machine let a later session on this machine tell that this one has exited (see
    // `isStaleHolder`).
    session: `${process.pid}.${getMachineId()}.${randomUUID()}`
  };
};

/**
 * This machine, told apart from others with the same hostname: a hash of the hostname and the ID this installation
 * keeps in its local state. The hash keeps the installation's ID out of what other sessions see.
 */
const getMachineId = () =>
  createHash('sha256')
    .update(`${hostname()}\n${globalStateManager.systemId || randomUUID()}`)
    .digest('hex')
    .slice(0, 16);

/** The process ID and the machine in a session ID; sessions of a CLI older than this have no machine. */
const parseSession = (session: string) => {
  const match = /^(\d+)\.([0-9a-f]{16})\./.exec(session);
  return match ? { pid: Number(match[1]), machine: match[2] } : undefined;
};

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/**
 * A holder the relay still lists although its process has exited: an earlier session of the same user in the same
 * directory on this machine. The relay notices a session's end only once its connections close through SSM, which can
 * take a while after a stop or a kill, and a start right after `stop` was refused because of the stopped session.
 * The label names the hostname, which another machine can share; only a holder on this machine has a process here.
 */
export const isStaleHolder = (
  holder: Pick<RelaySessionInfo, 'owner' | 'label' | 'session'>,
  owner: RelayOwner,
  isAlive: (pid: number) => boolean = isProcessAlive
) => {
  if (holder.owner !== owner.id || holder.label !== owner.label) return false;
  const held = parseSession(holder.session);
  const own = parseSession(owner.session);
  if (!held || !own || held.machine !== own.machine) return false;
  return held.pid !== own.pid && !isAlive(held.pid);
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
  timeoutMs = STAGE_CHECK_TIMEOUT_MS,
  isAlive
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
  isAlive?: (pid: number) => boolean;
}): Promise<{ replacesStaleSession: boolean }> => {
  const none = { replacesStaleSession: false };
  if (boxState !== 'running' && boxState !== 'pending') return none;
  const timeout = new AbortController();
  const endpoint = await Promise.race([
    relay(),
    delay(timeoutMs, undefined, { signal: timeout.signal }).then(
      () => undefined,
      () => undefined
    )
  ]).finally(() => timeout.abort());
  if (!endpoint) return none;
  const listed = (await listSessions(endpoint, stackName).catch(() => [])).filter(
    ({ session }) => session !== owner.session
  );
  const others = listed.filter((holder) => !isStaleHolder(holder, owner, isAlive));
  if (!others.length) {
    if (!listed.length) return none;
    tuiManager.info(
      `The previous dev session of ${stackName} in this directory has ended; this session replaces its tunnels on the dev box.`
    );
    return { replacesStaleSession: true };
  }
  const holders = others
    .map(({ label, since }) => `${label}, since ${formatTimeWithZone(new Date(since * 1000))}`)
    .join('; ');
  if (takeOver) {
    tuiManager.info(`Taking over dev mode for ${stackName} from ${holders}.`);
    return none;
  }
  throw new CliError({
    category: 'CLI',
    code: 'DEV_STAGE_RUNNING_ELSEWHERE',
    // The message carries the way out: `dev --agent` passes on only the message of its daemon's error.
    message: `Dev mode for ${stackName} already runs in another session: ${holders}. Stop that session, or run this command again with --take-over to move the stage here.`,
    hints:
      'With `--take-over`, deployed functions reach the databases on this machine, and the other session stops itself.'
  });
};

const COST_EXPLANATION = [
  'Creating the dev network for this AWS account and region. This happens once; the dev stack deploys while it is',
  'created, and this first start takes about 5 minutes.',
  'It is a VPC with a small EC2 instance, the dev box. Your deployed dev functions reach the databases on your machine',
  'through it, and VPC functions get internet access through it. Nothing is exposed to the internet: your machine',
  'connects to the box through AWS Systems Manager.',
  'Cost: about $0.01 per hour while a dev session runs. The box stops itself 30 minutes after the last session ends;',
  'stopped, it costs about $0.70 per month for its disk. See it with `stacktape dev network`, delete it with',
  '`stacktape dev network delete`.'
];

/**
 * Ends this session once another session took its stage over (or holds it after this machine slept through a
 * take-over): staying up, it could redeploy functions over the new holder's. In agent mode the reason goes to the agent
 * log and to `devAgentStopReasonFile`, where a client finds it after the agent has exited; in a terminal it is printed
 * after the dev screen is gone.
 */
export const endSessionForLostStage = ({
  stackName,
  label,
  agentPort,
  stop = () => process.emit('SIGINT')
}: {
  stackName: string;
  label: string;
  agentPort: number | undefined;
  stop?: () => void;
}) => {
  const message =
    `${label} took over dev mode for ${stackName}, so deployed functions now reach the databases there. This session ` +
    'stopped so that it cannot redeploy functions over theirs. To move the stage back, run `stacktape dev` again with --take-over.';
  if (agentPort) {
    agentLog('dev', message, 'error');
    const file = localStatePaths.devAgentStopReasonFile({ port: agentPort });
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(
      file,
      JSON.stringify({ code: 'DEV_STAGE_TAKEN_OVER', message, pid: process.pid, at: new Date().toISOString() }),
      { mode: 0o600 }
    );
  } else {
    process.once('exit', () => process.stderr.write(`\n${message}\n`));
  }
  // The same path as Ctrl+C and the agent's stop route.
  stop();
  return message;
};

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
  agentPort,
  orphanedSessionId,
  aws = createDevNetworkAws()
}: {
  stackContext: Pick<StackContext, 'stackName' | 'projectName' | 'stage'>;
  noTunnel: boolean;
  takeOver: boolean;
  /** The agent's port in `--agent` mode, where the reason of a self-ended session is recorded. */
  agentPort?: number;
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

  const { network, action, ready } = await ensureDevNetwork({
    aws,
    onCreate: () => tuiManager.info(COST_EXPLANATION.join(' ')),
    onDeletionWait: () =>
      tuiManager.info('The dev network is being deleted. Waiting for the deletion to finish, then creating it again.'),
    onJoinCreation: () =>
      tuiManager.info(
        'Another `stacktape dev` session is creating the dev network for this AWS account and region. Waiting for it to finish (about 4 minutes).'
      )
  });
  const owner = getOwner();
  registerSessionCleanupHook();
  let stageLost = false;
  setStageLostHandler(({ label }) => {
    if (stageLost) return;
    stageLost = true;
    endSessionForLostStage({ stackName, label, agentPort });
  });
  const connection = new DevBoxConnection({
    network,
    owner,
    stackName,
    deps: {
      aws,
      onSession: (sessionId) => recordDevBoxSession(sessionId, projectName, stage),
      findFreePort: async () => (await findFreePorts(1))[0],
      pingRelay,
      listSessions: listRelaySessions,
      holdPresence: holdRelayPresence,
      openSession: openDevBoxRelaySession
    }
  });
  // Read before the connection starts a stopped box: only a box that already runs can have a session of this stage. A
  // network this session creates has no sessions, and its new box would make the check wait for a relay that cannot
  // answer before the network is complete. A session that found another one's creation running waited for the whole
  // network (see `ensureDevNetwork`) and checks.
  const boxState = action === 'create' ? undefined : (await aws.describeBox(network.boxInstanceId))?.state;
  // The connection starts the box and connects while the dev stack deploys and the local databases start. Its presence
  // connection keeps a box that has been idle for almost 30 minutes from stopping itself meanwhile.
  void connection.connect();
  const relayedNames = [...new Set(Object.values(functions).flat())];
  let leases: Map<string, number>;
  let replacesStaleSession = false;
  try {
    ({ replacesStaleSession } = await assertStageNotRunningElsewhere({
      boxState,
      relay: connection.connect,
      listSessions: listRelaySessions,
      stackName,
      owner,
      takeOver
    }));
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
  const state: { settled: boolean; error?: unknown } = { settled: false };
  ready.then(
    () => (state.settled = true),
    (error) => Object.assign(state, { settled: true, error })
  );
  session = {
    network,
    connection,
    placement,
    leases,
    owner,
    // The tunnels of an ended session may still hold the relay ports; they are replaced like a take-over's.
    takeOver: takeOver || replacesStaleSession,
    ready,
    readyState: () => ({ ...state })
  };
  return session;
};

/**
 * Waits until the network this session started with is complete. The dev stack deploys while CloudFormation creates
 * the rest of a new network, so this usually returns at once; a failed creation rejects.
 */
export const waitForDevNetwork = async (
  devNetworkSession: Pick<DevNetworkSession, 'network' | 'ready' | 'readyState'>
) => {
  const { settled, error } = devNetworkSession.readyState();
  if (error) throw error;
  if (settled) return;
  const message = `Waiting for CloudFormation to finish the dev network ${devNetworkSession.network.stackName}`;
  const spinner = createSpinner(message, tuiManager.colorize.bind(tuiManager));
  reportDevStartup({ step: 'DEV_NETWORK', status: 'started', message });
  try {
    await devNetworkSession.ready;
  } catch (failure) {
    spinner.error();
    reportDevStartup({
      step: 'DEV_NETWORK',
      status: 'completed',
      level: 'error',
      message: `Creating the dev network failed: ${(failure as Error).message}`
    });
    throw failure;
  }
  spinner.success();
  reportDevStartup({ step: 'DEV_NETWORK', status: 'completed', message });
};
