import type { RelaySessionInfo } from '../dev/tunnel-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import {
  createDevNetworkAws,
  deleteDevNetwork,
  deleteFailedDevNetwork,
  FAILED_DEV_NETWORK_RECOVERY,
  getDevNetworkName,
  readDevNetwork,
  readFailedDevNetwork
} from '@domain-services/dev-network';
import { getDevNetworkLeaseParameterPrefix } from '@stacktape/naming/shared-stacks';
import { CliError } from '@utils/errors';
import { loadUserCredentials } from '../_utils/initialization';
import { isAgentMode } from '../_utils/agent-mode';
import { queryDevBoxRelay } from '../dev/dev-box';
import { listRelaySessions } from '../dev/tunnel-manager';
import { formatTimeWithZone } from '@utils/formatting';

const describeBoxState = (state: string | undefined) => {
  if (state === 'running') return 'running (about $0.01 per hour; it stops itself 30 minutes after the last session)';
  if (state === 'stopped') return 'stopped (about $0.70 per month for its disk; the next `stacktape dev` starts it)';
  return state ?? 'unknown';
};

/** How long `dev network` waits for a running box's relay to list its sessions. */
const SESSIONS_TIMEOUT_MS = 30_000;

/** A `stacktape dev` session that holds a stage, as `dev network` reports it. */
export type DevStageHolder = { stack: string; holder: string; since: string };

/**
 * The live `stacktape dev` sessions of the network, from the relay of a running box. A session keeps the box running,
 * so a stopped box has none and is not started to ask. `undefined` with a reason when the relay cannot be asked.
 */
export const readStageHolders = async ({
  boxState,
  listSessions
}: {
  boxState: string | undefined;
  /** Lists the sessions through the relay of the running box; rejects when it cannot. */
  listSessions: () => Promise<RelaySessionInfo[]>;
}): Promise<{ holders: DevStageHolder[] } | { holders: undefined; reason: string }> => {
  if (boxState !== 'running' && boxState !== 'pending') return { holders: [] };
  try {
    const sessions = await listSessions();
    return {
      holders: sessions
        .map(({ stack, label, since }) => ({ stack, holder: label, since: new Date(since * 1000).toISOString() }))
        .sort((left, right) => left.stack.localeCompare(right.stack) || left.since.localeCompare(right.since))
    };
  } catch (error) {
    return { holders: undefined, reason: (error as Error).message };
  }
};

const formatDuration = (milliseconds: number) => {
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
};

/** The sessions part of `dev network`'s output: one line per stage and holder. */
export const formatStageHolders = (
  result: Awaited<ReturnType<typeof readStageHolders>>,
  boxState: string | undefined,
  now = Date.now()
) => {
  if ('reason' in result) return [`  Dev sessions: unknown (${result.reason})`];
  if (!result.holders.length) {
    return [
      boxState === 'running' || boxState === 'pending'
        ? '  Dev sessions: none'
        : '  Dev sessions: none (a running session keeps the dev box running)'
    ];
  }
  return [
    '  Dev sessions (stage: who runs it, since when):',
    ...result.holders.map(
      ({ stack, holder, since }) =>
        `    ${stack}: ${holder}, since ${formatTimeWithZone(new Date(since), new Date(now))} (${formatDuration(now - Date.parse(since))})`
    )
  ];
};

/**
 * Shows the dev network of the account and region: the box, what it costs now, the stages that use it, and which
 * `stacktape dev` session runs each stage.
 */
export const commandDevNetwork = async () => {
  const { args } = await loadUserCredentials();
  const aws = createDevNetworkAws();
  const region = globalStateManager.region;
  const failed = await readFailedDevNetwork(aws);
  if (failed) {
    const result = {
      region,
      exists: true,
      stackName: failed.stackName,
      failed: { status: failed.status, reason: failed.reason }
    };
    if (isAgentMode(args)) tuiManager.info(JSON.stringify(result, null, 2));
    else {
      tuiManager.printLines([
        `Dev network ${failed.stackName} in ${region} failed to be created and was not deleted again (${failed.status}${failed.reason ? `: ${failed.reason}` : ''}).`,
        ...FAILED_DEV_NETWORK_RECOVERY.map((step, index) => `  ${index + 1}. ${step}`)
      ]);
    }
    return result;
  }
  const network = await readDevNetwork(aws);
  if (!network) {
    const result = { region, exists: false };
    if (isAgentMode(args)) tuiManager.info(JSON.stringify(result, null, 2));
    else
      tuiManager.info(`There is no dev network in ${region}. The first \`stacktape dev\` that needs one creates it.`);
    return result;
  }
  const [box, functions, leases] = await Promise.all([
    aws.describeBox(network.boxInstanceId),
    aws.listFunctionsInSecurityGroup(network.lambdaSecurityGroupId),
    aws.leases.list(getDevNetworkLeaseParameterPrefix(network.stackName))
  ]);
  const sessions = await readStageHolders({
    boxState: box?.state,
    listSessions: () =>
      queryDevBoxRelay({ aws, network, request: (relay) => listRelaySessions(relay), timeoutMs: SESSIONS_TIMEOUT_MS })
  });
  const prefix = `${getDevNetworkLeaseParameterPrefix(network.stackName)}/`;
  const stages = [...new Set(leases.map(({ name }) => name.slice(prefix.length).split('/')[0]))].sort();
  const devFunctions = functions.filter((name) => name !== network.keeperFunctionName).sort();
  const result = {
    region,
    exists: true,
    stackName: network.stackName,
    vpcId: network.vpcId,
    box: {
      instanceId: network.boxInstanceId,
      state: box?.state,
      privateIp: network.boxPrivateIp,
      publicIp: box?.publicIp
    },
    devFunctions,
    stacksWithLeases: stages,
    /** `null` when the running box's relay could not be asked; see `sessionsUnknownReason`. */
    sessions: sessions.holders ?? null,
    ...('reason' in sessions ? { sessionsUnknownReason: sessions.reason } : {})
  };
  if (isAgentMode(args)) {
    tuiManager.info(JSON.stringify(result, null, 2));
    return result;
  }
  tuiManager.printLines([
    `Dev network ${network.stackName} in ${region} (VPC ${network.vpcId})`,
    `  Dev box: ${network.boxInstanceId}, ${describeBoxState(box?.state)}`,
    ...formatStageHolders(sessions, box?.state),
    `  Dev functions in the network: ${devFunctions.length ? devFunctions.join(', ') : 'none'}`,
    `  Stacks with relay ports: ${stages.length ? stages.join(', ') : 'none'}`,
    '',
    'Delete it with `stacktape dev network delete`. The next `stacktape dev` that needs it creates it again.'
  ]);
  return result;
};

/** Deletes the dev network of the account and region, after its dev stages are deleted. */
export const commandDevNetworkDelete = async () => {
  const { args } = await loadUserCredentials();
  const aws = createDevNetworkAws();
  const confirm = async (stackName: string) => {
    if (args.autoConfirmOperation) return true;
    if (!process.stdout.isTTY) {
      throw new CliError({
        category: 'CLI',
        code: 'DEV_NETWORK_DELETE_NOT_CONFIRMED',
        message: `Deleting the dev network ${stackName} needs confirmation.`,
        hints: 'Run it in a terminal, or add `--yes`.'
      });
    }
    const proceed = await tuiManager.promptConfirm({
      message: `Delete the dev network ${stackName}, its dev box and its relay ports?`
    });
    if (!proceed) tuiManager.info('Operation canceled.');
    return proceed;
  };
  // A network whose creation failed has no box or relay to ask; it is deleted by its stack name.
  const failed = await readFailedDevNetwork(aws);
  if (failed) {
    if (!(await confirm(failed.stackName))) return { deleted: false };
    tuiManager.info(`Deleting the dev network ${failed.stackName}, whose creation failed (${failed.status}).`);
    const { deletedLeases, recreated } = await deleteFailedDevNetwork({ aws, failed });
    tuiManager.success(
      `Deleted the dev network ${failed.stackName} and ${deletedLeases} relay port lease${deletedLeases === 1 ? '' : 's'}. The next \`stacktape dev\` creates a new one.`
    );
    return { deleted: true, recreated };
  }
  const network = await readDevNetwork(aws);
  if (!network) {
    tuiManager.info(`There is no dev network (${getDevNetworkName()}) in ${globalStateManager.region}.`);
    return { deleted: false };
  }
  if (!(await confirm(network.stackName))) return { deleted: false };
  tuiManager.info(`Deleting the dev network ${network.stackName}. This takes about 2 minutes.`);
  const { deletedLeases, recreated } = await deleteDevNetwork({
    aws,
    network,
    force: Boolean(args.force),
    findLiveSessions: (target) =>
      queryDevBoxRelay({ aws, network: target, request: (relay) => listRelaySessions(relay) })
  });
  if (recreated) {
    tuiManager.success(
      `Deleted the dev network ${network.stackName}. A \`stacktape dev\` session that started meanwhile created a new one under the same name; its relay port leases were kept.`
    );
    return { deleted: true, recreated };
  }
  tuiManager.success(
    `Deleted the dev network ${network.stackName} and ${deletedLeases} relay port lease${deletedLeases === 1 ? '' : 's'}.`
  );
  return { deleted: true, recreated };
};
