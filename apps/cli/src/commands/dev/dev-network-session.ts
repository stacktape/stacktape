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
import { createDevNetworkAws, ensureDevNetwork, getDevNetworkName } from '@domain-services/dev-network';
import { ensureLeases } from '@domain-services/dev-network/leases';
import {
  createStageHolderStore,
  getStageHolderParameterName,
  holdStage,
  readStageHolder,
  type StageHolderStore
} from '@domain-services/dev-network/holders';
import { isMcpInvocation } from '@application-services/operation-invocation-context';
import type { StackContext } from '@domain-services/stack-context';
import { CliError } from '@utils/errors';
import { reserveFreeLocalPort } from '@utils/ports';
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
  /** What this start did with the network: created it, joined another session's creation, updated or reused it. */
  action: 'create' | 'join' | 'upgrade' | 'reuse';
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
  /** Removes this session's stage holder record (see `holdStage`). */
  releaseStage: () => Promise<void>;
};

let session: DevNetworkSession | undefined;

export const getDevNetworkSession = () => session;

/**
 * The dev stack's functions that run in the dev network, each with the local databases it reaches through the relay:
 * every VPC function, and every function that uses a locally emulated database (`connectTo` or `$ResourceParam`).
 * Batch jobs always run in a VPC, so a dev stack with batch jobs places their compute environments in the network too,
 * and each job reaches the local databases it uses.
 *
 * A dev stack that still deploys VPC resources of its own (a remote database in its VPC, for example) keeps its VPC
 * functions and batch jobs there, where they reach those resources; they cannot reach local databases, which is
 * reported.
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
  ).some(
    (resource) =>
      resource.type !== 'batch-job' &&
      !('configParentResourceType' in resource && resource.configParentResourceType === 'function')
  );
  const usedLocalResources = (resource: { connectTo?: string[] }, environmentOwner: unknown) =>
    [...new Set([...(resource.connectTo || []), ...getResourceParamReferences(environmentOwner)])].filter((name) =>
      localNames.has(name)
    );
  const functions: Record<string, string[]> = {};
  const unreachable: Array<{ kind: 'Function' | 'Batch job'; name: string; resources: string[] }> = [];
  for (const lambda of configManager.functions) {
    const local = usedLocalResources(lambda, lambda);
    if (lambda.joinDefaultVpc && stackKeepsOwnVpc) {
      if (local.length && !noTunnel) unreachable.push({ kind: 'Function', name: lambda.name, resources: local });
      continue;
    }
    const relayed = noTunnel ? [] : local;
    if (lambda.joinDefaultVpc || relayed.length) functions[lambda.name] = relayed;
  }
  // The batch jobs of a stack share their compute environments, so either all of them run in the network or none.
  const batchJobs: Record<string, string[]> | undefined =
    configManager.batchJobs.length && !stackKeepsOwnVpc ? {} : undefined;
  for (const job of configManager.batchJobs) {
    const local = usedLocalResources(job, job.container);
    if (batchJobs) batchJobs[job.name] = noTunnel ? [] : local;
    else if (local.length && !noTunnel) unreachable.push({ kind: 'Batch job', name: job.name, resources: local });
  }
  return { functions, batchJobs, unreachable };
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

/**
 * The refusal of a stage another session holds. Through MCP, the way to move the stage is the tool's `takeOver`
 * argument, not the CLI flag.
 */
const stageRunningElsewhereError = ({
  stackName,
  holders,
  mcp = isMcpInvocation()
}: {
  stackName: string;
  holders: Pick<RelaySessionInfo, 'label' | 'since'>[];
  mcp?: boolean;
}) => {
  const described = holders
    .map(({ label, since }) => `${label}, since ${formatTimeWithZone(new Date(since * 1000))}`)
    .join('; ');
  const takeOver = mcp
    ? 'call stacktape_dev with action=start and args.takeOver=true'
    : 'run this command again with --take-over';
  return new CliError({
    category: 'CLI',
    code: 'DEV_STAGE_RUNNING_ELSEWHERE',
    // The message carries the way out: `dev --agent` passes on only the message of its daemon's error.
    message: `Dev mode for ${stackName} already runs in another session: ${described}. Stop that session, or ${takeOver} to move the stage here.`,
    hints: `With ${mcp ? 'args.takeOver=true' : '`--take-over`'}, deployed functions reach the databases on this machine, and the other session stops itself.`
  });
};

/**
 * Refuses a stage that another running session holds, from its holder record: one SSM read right after the
 * configuration is loaded, so the refusal does not wait for the dev stack's metadata and the dev network. Without a
 * fresh record, or with `--take-over`, the relay check in `startDevNetworkSession` decides.
 */
export const refuseStageHeldElsewhere = async ({
  stackName,
  takeOver,
  store = createStageHolderStore(),
  networkName = getDevNetworkName(),
  owner = getOwner(),
  isAlive
}: {
  stackName: string;
  takeOver: boolean;
  store?: StageHolderStore;
  networkName?: string;
  owner?: RelayOwner;
  isAlive?: (pid: number) => boolean;
}) => {
  if (takeOver) return;
  const holder = await readStageHolder({ store, name: getStageHolderParameterName({ networkName, stackName }) }).catch(
    () => undefined
  );
  if (!holder || holder.session === owner.session || isStaleHolder(holder, owner, isAlive)) return;
  throw stageRunningElsewhereError({ stackName, holders: [holder] });
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
  if (takeOver) {
    const holders = others
      .map(({ label, since }) => `${label}, since ${formatTimeWithZone(new Date(since * 1000))}`)
      .join('; ');
    tuiManager.info(`Taking over dev mode for ${stackName} from ${holders}.`);
    return none;
  }
  throw stageRunningElsewhereError({ stackName, holders: others });
};

const COST_EXPLANATION = [
  'Creating the dev network for this AWS account and region. This happens once; the dev stack deploys while it is',
  'created, and this first start takes about 5 minutes.',
  'It is a VPC with a small EC2 instance, the dev box. Your deployed dev functions reach the databases on your machine',
  'through it, and VPC functions get internet access through it. Nothing is exposed to the internet: your machine',
  'connects to the box through AWS Systems Manager.',
  'Cost: about $0.01 per hour while a dev session runs. The box stops itself 30 minutes after the last session ends;',
  'stopped, it costs about $0.75 per month for its disk and its relay parameter. See it with `stacktape dev network`,',
  'delete it with `stacktape dev network delete`.'
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
  refused = false,
  stop = () => process.emit('SIGINT')
}: {
  stackName: string;
  label: string;
  agentPort: number | undefined;
  /** The stage was held by another session that started at the same time, and this session never got it. */
  refused?: boolean;
  stop?: () => void;
}) => {
  const message = refused
    ? `Dev mode for ${stackName} already runs in another session: ${label}. This session stopped so that it cannot ` +
      'redeploy functions over theirs. Stop that session, or run `stacktape dev` again with --take-over to move the stage here.'
    : `${label} took over dev mode for ${stackName}, so deployed functions now reach the databases there. This session ` +
      'stopped so that it cannot redeploy functions over theirs. To move the stage back, run `stacktape dev` again with --take-over.';
  if (agentPort) {
    agentLog('dev', message, 'error');
    const file = localStatePaths.devAgentStopReasonFile({ port: agentPort });
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(
      file,
      JSON.stringify({
        code: refused ? 'DEV_STAGE_RUNNING_ELSEWHERE' : 'DEV_STAGE_TAKEN_OVER',
        message,
        pid: process.pid,
        at: new Date().toISOString()
      }),
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
  await Promise.all([session?.releaseStage().catch(() => {}), session?.connection.stop()]);
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
  aws = createDevNetworkAws(),
  holderStore = createStageHolderStore()
}: {
  stackContext: Pick<StackContext, 'stackName' | 'projectName' | 'stage'>;
  noTunnel: boolean;
  takeOver: boolean;
  /** The agent's port in `--agent` mode, where the reason of a self-ended session is recorded. */
  agentPort?: number;
  aws?: DevNetworkAws;
  holderStore?: StageHolderStore;
}): Promise<DevNetworkSession | undefined> => {
  const { stackName, projectName, stage } = stackContext;
  const { functions, batchJobs, unreachable } = getDevNetworkDemand({ noTunnel });
  for (const { kind, name, resources } of unreachable) {
    tuiManager.warn(
      `${kind} "${name}" stays in this stage's own VPC, where the stage deploys VPC resources, and can't reach the local ${resources.join(', ')}. ` +
        `To connect it to the deployed resource instead, run with --remote-resources ${resources.join(',')}.`
    );
  }
  if (!Object.keys(functions).length && !batchJobs) return undefined;

  const { network, action, ready } = await ensureDevNetwork({
    aws,
    onCreate: () => {
      tuiManager.info(COST_EXPLANATION.join(' '));
      reportDevStartup({
        step: 'DEV_NETWORK',
        status: 'running',
        message: 'Creating the dev network for this AWS account and region; this first start takes about 5 minutes'
      });
    },
    onUpgrade: () =>
      tuiManager.info(
        "Updating the dev network to this Stacktape version. The dev box keeps running; when its relay restarts with the new version, every dev session that uses the box, other developers' included, loses its connection for a few seconds and reconnects."
      ),
    onDeletionWait: () =>
      tuiManager.info('The dev network is being deleted. Waiting for the deletion to finish, then creating it again.'),
    onJoinCreation: () =>
      tuiManager.info(
        'Another `stacktape dev` session is creating the dev network for this AWS account and region. This session continues as soon as its dev box exists, and the dev stack deploys while CloudFormation finishes the network.'
      )
  });
  const owner = getOwner();
  registerSessionCleanupHook();
  let stageLost = false;
  let heldStage: { lose: () => void; release: () => Promise<void> } | undefined;
  const loseStage = ({ label, refused = false }: { label: string; refused?: boolean }) => {
    if (stageLost) return;
    stageLost = true;
    // The holder record is the new holder's now: this session neither refreshes nor deletes it.
    heldStage?.lose();
    endSessionForLostStage({ stackName, label, agentPort, refused });
  };
  setStageLostHandler(loseStage);
  // Settles once the stage check below has decided; the relay may refuse this session's presence before that.
  let decideStage!: (decision: { mayTakeOver: boolean }) => void;
  const stageDecision = new Promise<{ mayTakeOver: boolean }>((resolve) => (decideStage = resolve));
  const connection = new DevBoxConnection({
    network,
    owner,
    stackName,
    deps: {
      // The presence holds the stage on the relay: a session whose functions only use the box as NAT has no tunnel
      // that a take-over could close.
      mayTakeOverStage: async (holder) => (await stageDecision).mayTakeOver || isStaleHolder(holder, owner),
      onStageLost: ({ label, refused }) => loseStage({ label, refused }),
      aws,
      onSession: (sessionId) => recordDevBoxSession(sessionId, projectName, stage),
      reservePort: () => reserveFreeLocalPort(),
      onRelayUpdate: (version) =>
        tuiManager.info(
          `Restarting the dev box relay to update it from version ${version}. Dev sessions that use the box, other developers' included, reconnect within seconds.`
        ),
      pingRelay,
      listSessions: listRelaySessions,
      holdPresence: holdRelayPresence,
      openSession: openDevBoxRelaySession
    }
  });
  // Read before the connection starts a stopped box: only a box that already runs can have a session of this stage. A
  // network that is being created has no sessions yet, and its new box would make the check wait for a relay that
  // cannot answer before the network is complete. The creating session may run this stage too; then the relay refuses
  // the second session's tunnels.
  const boxState =
    action === 'create' || action === 'join' ? undefined : (await aws.describeBox(network.boxInstanceId))?.state;
  // The connection starts the box and connects while the dev stack deploys and the local databases start. Its presence
  // connection keeps a box that has been idle for almost 30 minutes from stopping itself meanwhile.
  void connection.connect();
  const relayedNames = [...new Set([...Object.values(functions), ...Object.values(batchJobs ?? {})].flat())];
  let leases: Map<string, number>;
  let replacesStaleSession = false;
  const localResources: DevNetworkPlacement['localResources'] = {};
  try {
    ({ replacesStaleSession } = await assertStageNotRunningElsewhere({
      boxState,
      relay: connection.connect,
      listSessions: listRelaySessions,
      stackName,
      owner,
      takeOver
    }));
    decideStage({ mayTakeOver: takeOver || replacesStaleSession });
    leases = await ensureLeases({
      store: aws.leases,
      networkName: network.stackName,
      stackName,
      resourceNames: relayedNames
    });
    for (const resourceName of relayedNames) {
      const relayed = await getRelayedLocalResource(resourceName, {
        host: network.boxPrivateIp,
        port: leases.get(resourceName)!
      });
      if (relayed) localResources[resourceName] = relayed;
    }
  } catch (error) {
    // The session is not recorded yet, so the cleanup hook would not end this connection.
    decideStage({ mayTakeOver: false });
    await connection.stop();
    throw error;
  }
  const placement: DevNetworkPlacement = {
    subnetIds: network.privateSubnetIds,
    securityGroupId: network.lambdaSecurityGroupId,
    functions,
    ...(batchJobs ? { batchJobs } : {}),
    localResources
  };
  configManager.setDevNetworkPlacement(placement);
  // This session holds the stage now; its record lets the next start elsewhere refuse it at once.
  heldStage = await holdStage({
    store: holderStore,
    name: getStageHolderParameterName({ networkName: network.stackName, stackName }),
    holder: { owner: owner.id, label: owner.label, session: owner.session, since: Math.floor(Date.now() / 1000) }
  }).catch((error) => {
    tuiManager.debug(`Could not record this session as the holder of ${stackName}: ${(error as Error).message}`);
    return { lose: () => {}, release: async () => {} };
  });
  if (stageLost) heldStage.lose();
  const state: { settled: boolean; error?: unknown } = { settled: false };
  ready.then(
    () => (state.settled = true),
    (error) => Object.assign(state, { settled: true, error })
  );
  session = {
    network,
    action,
    connection,
    placement,
    leases,
    owner,
    // The tunnels of an ended session may still hold the relay ports; they are replaced like a take-over's.
    takeOver: takeOver || replacesStaleSession,
    ready,
    readyState: () => ({ ...state }),
    releaseStage: heldStage.release
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
