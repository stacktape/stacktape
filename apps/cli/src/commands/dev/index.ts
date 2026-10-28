import { getRelayedLocalResourceNames } from '@domain-services/dev-network/placement';
import { randomUUID } from 'node:crypto';
import { publicFlag } from '../../config/cli/public-names';
import { operationReporter } from '@application-services/operation-manager';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { createSpinner, setSpinnerAgentMode } from '@application-services/tui-manager/spinner';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { isResourceTypeExcludedInDevMode } from '@domain-services/config-manager/dev-mode';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { assertExistingDevStack } from './dev-stack-safety';
import { CliError, withHintLines } from '@utils/errors';
import { getDeveloperTrustStatement } from 'src/aws/iam';
import type { StacktapeCliArgs } from 'src/config/cli/types';
import { localStatePaths } from 'src/config/local-state-paths';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { devTuiState } from 'src/app/tui-manager/dev/state';
import {
  captureCommandArgs,
  initializeStackServicesForDevPhase1,
  initializeStackServicesForDevPhase2
} from '../_utils/initialization';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import {
  findLocalCfResourceReferences,
  findMissingLocalCfResourceOutputs,
  prepareDevStackReferences
} from './dev-stack-references';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';
import {
  buildAgentReadyMessage,
  capDaemonOutputFiles,
  buildAgentReadyPayload,
  compareSessionTarget,
  type DevSessionTarget,
  acquireAgentLockFile,
  findLiveStageSession,
  findOrphanedDevBoxSession,
  getLockFilePath,
  getCustomArgsSuffix,
  type ForwardedChildRecord,
  getRunningAgent,
  isOwnSessionStopping,
  registerOwnLockCleanup,
  requestDevAgent,
  spawnAgentDaemon,
  waitForStoppingSession,
  writeAgentLockFile,
  type AgentLockFile
} from './agent-daemon';
import { agentLog, getAgentLogFilePath } from './agent-logger';
import {
  buildStartupMessage,
  getAgentPort,
  mirrorDevTuiState,
  getAgentSessionId,
  registerAgentCleanupHook,
  setAgentNotices,
  setRebuildFunctions,
  startAgentServer,
  type FailedWorkload
} from './agent-server';
import { initDevAgentCredentials } from './dev-agent-credentials';
import { registerDevServerCleanupHook } from './dev-server';
import { deployDevStack, packageDevStackImages } from './dev-stack-deployer';
import {
  describeDevStackUpdateCause,
  getDevStackConfigFingerprint,
  getDevStackUpdateCause
} from './dev-stack-config-fingerprint';
import { getLocalEmulateableResources, registerLocalResourceCleanupHook } from './local-resources';
import { registerHealthMonitorCleanupHook } from './local-resources/health-monitor';
import {
  captureSessionConfig,
  getWorkloadEnvVars,
  getWorkloadSecretEnvNames,
  rebuildAllWorkloads,
  rebuildWorkload,
  runParallelWorkloads
} from './parallel-runner';
import { findAvailablePort } from './port-utils';
import {
  getDevNetworkDemand,
  refuseStageHeldElsewhere,
  startDevNetworkSession,
  waitForDevNetwork
} from './dev-network-session';
import { getActiveTunnels, registerTunnelCleanupHook } from './tunnel-manager';
import { registerCredentialCleanupHook } from './utils';
import { setDevSessionOwner } from './cleanup-utils';
import { registerNamedProxyCleanupHook } from './named-proxy/manager';
import {
  reportDevStartup,
  reportDevStartupHeartbeat,
  startDevStartupReporting,
  stopDevStartupReporting
} from './startup-progress';

type DevCompatibleResource = {
  name: string;
  type: string;
  category: 'container' | 'function' | 'hosting-bucket' | 'nextjs-web' | 'ssr-web';
  hostingContentType?: string;
};

type EmulateableResource = {
  name: string;
  type: 'relational-database' | 'redis-cluster' | 'dynamo-db-table' | 'open-search-domain';
  engineType: string;
};

type SelectableResource = {
  name: string;
  category: 'workload' | 'database';
  type: string;
};

/**
 * Get all resources that can run in dev mode (workloads).
 */
const getDevCompatibleResources = (): DevCompatibleResource[] => {
  const containerWorkloads = configManager.allContainerWorkloads.map((r) => ({
    name: r.nameChain[0],
    type: r.configParentResourceType,
    category: 'container' as const
  }));
  const functions = configManager.functions.map((f) => ({
    name: f.name,
    type: 'function' as const,
    category: 'function' as const
  }));
  const hostingBuckets = configManager.hostingBuckets
    .filter((b) => b.dev) // Only include hosting buckets with dev config
    .map((b) => ({
      name: b.name,
      type: 'hosting-bucket' as const,
      category: 'hosting-bucket' as const,
      hostingContentType: b.hostingContentType
    }));
  const nextjsWebs = configManager.nextjsWebs.map((n) => ({
    name: n.name,
    type: 'nextjs-web' as const,
    category: 'nextjs-web' as const
  }));
  const ssrWebs = [
    ...configManager.astroWebs.map((r) => ({ name: r.name, type: 'astro-web' as const, category: 'ssr-web' as const })),
    ...configManager.nuxtWebs.map((r) => ({ name: r.name, type: 'nuxt-web' as const, category: 'ssr-web' as const })),
    ...configManager.sveltekitWebs.map((r) => ({
      name: r.name,
      type: 'sveltekit-web' as const,
      category: 'ssr-web' as const
    })),
    ...configManager.solidstartWebs.map((r) => ({
      name: r.name,
      type: 'solidstart-web' as const,
      category: 'ssr-web' as const
    })),
    ...configManager.tanstackWebs.map((r) => ({
      name: r.name,
      type: 'tanstack-web' as const,
      category: 'ssr-web' as const
    })),
    ...configManager.remixWebs.map((r) => ({ name: r.name, type: 'remix-web' as const, category: 'ssr-web' as const }))
  ];
  return [...containerWorkloads, ...functions, ...hostingBuckets, ...nextjsWebs, ...ssrWebs];
};

/**
 * Normalize CLI list args (can be comma-separated or multiple flags).
 * Handles both string and string[] inputs from CLI.
 */
const normalizeListArg = (list?: string | string[]): Set<string> => {
  if (!list) return new Set();
  // Handle single string input (CLI may pass string instead of array)
  const items = Array.isArray(list) ? list : [list];
  if (items.length === 0) return new Set();
  return new Set(
    items
      .flatMap((item) => item.split(','))
      .map((s) => s.trim())
      .filter(Boolean)
  );
};

/**
 * Build list of all selectable resources for the picker.
 */
const buildSelectableResources = (
  workloads: DevCompatibleResource[],
  emulateableResources: EmulateableResource[]
): SelectableResource[] => {
  const resources: SelectableResource[] = [];

  // Add workloads first (containers, functions, frontends)
  for (const w of workloads) {
    resources.push({ name: w.name, category: 'workload', type: w.type });
  }

  // Add emulatable databases
  for (const e of emulateableResources) {
    resources.push({ name: e.name, category: 'database', type: e.engineType });
  }

  return resources;
};

/**
 * Simple fuzzy matching using Levenshtein distance.
 * Returns matches sorted by similarity (closest first).
 */
const findSimilarNames = (input: string, candidates: string[], maxDistance = 3): string[] => {
  const levenshtein = (a: string, b: string): number => {
    const matrix: number[][] = [];
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    for (let i = 0; i <= bLower.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= aLower.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= bLower.length; i++) {
      for (let j = 1; j <= aLower.length; j++) {
        if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }
    return matrix[bLower.length][aLower.length];
  };

  return candidates
    .map((candidate) => ({ name: candidate, distance: levenshtein(input, candidate) }))
    .filter((item) => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.name);
};

/**
 * Get selected resources based on CLI args or interactive picker.
 */
const getSelectedResources = async (
  allResources: SelectableResource[],
  args: Readonly<StacktapeCliArgs>
): Promise<Set<string>> => {
  const { resources: resourcesArg, skipResources: skipResourcesArg } = args;

  const allNames = new Set(allResources.map((r) => r.name));
  const allNamesArray = [...allNames];

  // Validate resource names with fuzzy matching for suggestions
  const validateNames = (names: Set<string>, argName: string) => {
    for (const name of names) {
      if (name !== 'all' && !allNames.has(name)) {
        const configuredType = configManager.config?.resources?.[name]?.type;
        if (configuredType) {
          const selectableNames = `Resources you can select: ${allNamesArray.join(', ')}.`;
          throw new CliError({
            category: 'CLI',
            code: 'CLI_DEV_RESOURCE_NOT_SELECTABLE',
            message:
              configuredType === 'batch-job'
                ? `\`${name}\` is a batch job, which dev mode does not run on your machine. The dev stack deploys it to AWS Batch, where it runs when triggered, as in a deployed stage. \`--${publicFlag(argName)}\` selects only functions, containers, frontends and databases.`
                : `\`${name}\` is a \`${configuredType}\`, which dev mode does not run on your machine. The dev stack deploys it to AWS when the selected workloads use it. \`--${publicFlag(argName)}\` selects only functions, containers, frontends and databases.`,
            hints: selectableNames
          });
        }
        // Find similar names for better error message
        const similar = findSimilarNames(name, allNamesArray, 3);
        const hint =
          similar.length > 0
            ? `Did you mean: ${similar.slice(0, 3).join(', ')}? Available resources: ${allNamesArray.join(', ')}`
            : `Available resources: ${allNamesArray.join(', ')}`;

        throw new CliError({
          category: 'CLI',
          code: 'CLI_DEV_RESOURCE_NOT_FOUND',
          message: `Resource \`${name}\` specified in \`--${publicFlag(argName)}\` does not exist.`,
          hints: hint
        });
      }
    }
  };

  const resourcesSet = normalizeListArg(resourcesArg);
  const skipSet = normalizeListArg(skipResourcesArg);

  if (resourcesSet.size > 0) validateNames(resourcesSet, 'resources');
  if (skipSet.size > 0) validateNames(skipSet, 'skipResources');

  // Case 1: --resources all
  if (resourcesSet.has('all')) {
    let selected = new Set(allNames);
    if (skipSet.size > 0) {
      selected = new Set([...selected].filter((n) => !skipSet.has(n)));
    }
    return selected;
  }

  // Case 2: --resources specified
  if (resourcesSet.size > 0) {
    let selected = new Set(resourcesSet);
    if (skipSet.size > 0) {
      selected = new Set([...selected].filter((n) => !skipSet.has(n)));
    }
    return selected;
  }

  // Case 3: --skipResources only (run all except skipped)
  if (skipSet.size > 0) {
    return new Set([...allNames].filter((n) => !skipSet.has(n)));
  }

  // Case 4: No args - show interactive picker (all selected by default)
  const options = allResources.map((r) => ({
    value: r.name,
    label: `${r.name}`,
    description: r.type
  }));

  // Start TUI temporarily for the prompt (dev command doesn't start TUI by default)
  tuiManager.start();
  const selected = await tuiManager.promptMultiSelect({
    message: 'Select resources to run in dev mode (all selected by default):',
    options,
    defaultValues: allResources.map((r) => r.name)
  });
  await tuiManager.stop();

  return new Set(selected);
};

/**
 * Main dev command.
 *
 * Agent mode (--agent):
 * - Spawns as a detached daemon process
 * - Parent waits for AGENT_READY signal, then exits
 * - Daemon keeps running with HTTP API on specified port
 * - Use --stop to stop a running agent
 *
 * Flow:
 * 1. Initialize credentials and config
 * 2. Show resource picker (or use --resources/--skipResources)
 * 3. Check if the dev stack exists and deploy it if needed
 * 4. Start local emulated resources (databases, Redis, DynamoDB)
 * 5. Start local workloads (containers, frontends)
 * 6. Deploy and stream logs for functions
 */
let agentReadyHeartbeatStopper: (() => void) | null = null;

type ReportedAgentStatus = {
  ready?: boolean;
  restartRequired?: string;
  workloads?: { name: string; type: string; url?: string }[];
  localResources?: { name: string; type: string; port?: number }[];
  failedWorkloads?: FailedWorkload[];
  notReadyReasons?: string[];
  logFile?: string | null;
};

/**
 * The ready payload of an agent that already runs, built from its own status as a fresh start builds it, with whether
 * the session is ready: a failed workload or a pending restart makes it not ready.
 */
export const getRunningAgentReadyPayload = async (agent: AgentLockFile) => {
  const status = await requestDevAgent(agent, '/status?verbose=true', { timeoutMs: 5000 })
    .then(async (response) => ((await response.json()) as { data?: ReportedAgentStatus }).data)
    .catch(() => undefined);
  const payload = buildAgentReadyPayload({
    port: agent.port,
    projectName: agent.projectName,
    stage: agent.stage,
    region: agent.region,
    workloads: Array.isArray(status?.workloads)
      ? status.workloads.map(({ name, type, url }) => ({ name, type, url }))
      : agent.workloads.map((name) => ({ name, type: 'unknown' })),
    databases: Array.isArray(status?.localResources)
      ? status.localResources.map(({ name, type, port }) => ({ name, type, port }))
      : agent.databases.map((name) => ({ name, type: 'unknown' })),
    logFile: status?.logFile || agent.logFile || '',
    sessionId: agent.sessionId,
    failedWorkloads: Array.isArray(status?.failedWorkloads) ? status.failedWorkloads : []
  });
  return {
    ...payload,
    ready: status?.ready === true,
    ...(Array.isArray(status?.notReadyReasons) && status.notReadyReasons.length
      ? { notReadyReasons: status.notReadyReasons }
      : {}),
    ...(status?.restartRequired ? { restartRequired: status.restartRequired } : {})
  };
};

/**
 * The result of a `dev --agent` whose session runs but is not ready: a distinct non-OK code, so a client that reads
 * only `ok` does not test against a workload that failed or runs its previous code. The session keeps running, and the
 * result carries it (`data.result`, as a ready start has it) with `ready: false` and the failed workloads.
 */
const sessionNotReadyError = ({
  payload,
  message
}: {
  payload: { port: number; failedWorkloads?: FailedWorkload[] };
  message: string;
}) => {
  const failedWorkloads = payload.failedWorkloads ?? [];
  const stop = `The session keeps running. Stop it with \`stacktape dev stop --agent-port ${payload.port}\`.`;
  return new CliError({
    category: 'CLI',
    code: failedWorkloads.length ? 'DEV_STARTED_WITH_FAILURES' : 'DEV_SESSION_NOT_READY',
    message: failedWorkloads.length
      ? `${message}:\n${failedWorkloads.map(({ name, error, hints }) => withHintLines(`  ${name}: ${error}`, hints)).join('\n')}`
      : message,
    hints: failedWorkloads.length
      ? [
          `Fix the errors, then rebuild: \`POST /rebuild/{name}\` to the agent on port ${payload.port}, or stacktape_dev with action=rebuild. Until then the failed workloads do not run your current code.`,
          stop
        ]
      : [`Poll \`GET /status\` on port ${payload.port} until \`ready\` is true.`, stop],
    data: { result: { ...payload, ready: false }, ready: false, failedWorkloads }
  });
};

/**
 * What `dev --agent` reports for the agent of this project and stage that already runs, exactly as a new start reports
 * it: clients such as the MCP tool take its port, token file, workload URLs and database ports from this result. A
 * session that is not ready ends the command with a non-OK code instead.
 */
export const reportRunningAgent = async (agent: AgentLockFile) => {
  const readyPayload = await getRunningAgentReadyPayload(agent);
  // A session that waits for a restart runs outdated configuration: reporting it as started would be a false green.
  if (readyPayload.restartRequired) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_RESTART_REQUIRED',
      message: `The dev session of this stage on port ${readyPayload.port} has to restart: ${readyPayload.restartRequired}`,
      hints: `Stop it with \`stacktape dev stop --agent-port ${readyPayload.port}\`, then start dev mode again.`
    });
  }
  // A failed workload leaves the session usable (a rebuild can fix it), but it is not ready.
  if (!readyPayload.ready) {
    throw sessionNotReadyError({
      payload: readyPayload,
      message: readyPayload.failedWorkloads?.length
        ? `The dev session on port ${readyPayload.port} runs, but workloads in it failed`
        : `The dev session on port ${readyPayload.port} runs, but is not ready: ${
            readyPayload.notReadyReasons?.join('; ') || 'it is still starting'
          }.`
    });
  }
  process.stdout.write(`AGENT_READY ${JSON.stringify(readyPayload)}\n`);
  return readyPayload;
};

/** The AWS profile a start selects explicitly; `default` by itself selects nothing worth comparing. */
const explicitProfile = () => globalStateManager.rawArgs?.profile || process.env.AWS_PROFILE || undefined;

const resolvedRegion = () => {
  try {
    return globalStateManager.region;
  } catch {
    return undefined;
  }
};

/**
 * The target a start asks for before it loads its credentials. With `--awsAccount` the Console account supplies them,
 * and a profile is ignored. With local credentials, the account comes from the profile or one STS call.
 */
const requestedSessionTarget = async (): Promise<Partial<DevSessionTarget>> => {
  const awsAccountName = globalStateManager.args.awsAccount;
  if (awsAccountName) return { region: resolvedRegion(), awsAccountName };
  const awsAccountId = await globalStateManager.resolveLocalAwsAccountId().catch(() => undefined);
  return { region: resolvedRegion(), profile: explicitProfile(), awsAccountId };
};

/** The target this session runs against, recorded in its lock file once the credentials are loaded. */
const ownSessionTarget = (): DevSessionTarget => {
  let account: { awsAccountId?: string; name?: string } | undefined;
  try {
    account = globalStateManager.targetAwsAccount;
  } catch {
    account = undefined;
  }
  // Local credentials get a `local:` account; a Console account supplies the credentials whatever the profile.
  const viaConsole = account?.name !== undefined && !account.name.startsWith('local:');
  return {
    region: resolvedRegion() ?? '',
    awsAccountId: account?.awsAccountId,
    ...(viaConsole ? { awsAccountName: account!.name } : { profile: explicitProfile() })
  };
};

/**
 * r2rr: a start for another region, profile or account of the same project and stage reused the running session, and
 * the client then worked against the wrong one. The two cannot run side by side: they share the lock file and the
 * local containers of the stage.
 */
const targetMismatchError = (session: AgentLockFile, mismatch: string[]) =>
  new CliError({
    category: 'CLI',
    code: 'DEV_SESSION_TARGET_MISMATCH',
    message: `Dev mode for stage ${session.stage} already runs in this directory (process ${session.pid}${session.port ? `, agent port ${session.port}` : ''}) against another target: ${mismatch.join(', ')}.`,
    hints: [
      `Stop it first with \`stacktape dev stop${session.port ? ` --agent-port ${session.port}` : ''}\`, or run this target under another stage.`
    ]
  });

/**
 * The running agent of this project and stage, which a start reports instead of starting one, if it runs against the
 * requested target. When the target cannot be compared before the credentials load, this returns null: the start goes
 * on, and once its credentials are loaded it reports the agent or refuses (`refuseStageRunningHere`).
 */
export const findReusableAgent = async (): Promise<AgentLockFile | null> => {
  const agent = await getRunningAgent();
  if (!agent) return null;
  const { comparable, mismatch } = compareSessionTarget(agent, await requestedSessionTarget());
  if (!comparable) return null;
  if (mismatch.length > 0) throw targetMismatchError(agent, mismatch);
  return agent;
};

/**
 * Creates this session's lock file, or refuses the start while another session of the stage holds it. A session that
 * stops is waited for, and the lock file is then tried once more.
 */
export const acquireSessionLock = async (lock: AgentLockFile) => {
  if (!(await acquireAgentLockFile(lock))) return;
  await refuseStageRunningHere({ projectName: lock.projectName, stage: lock.stage });
  const holder = await acquireAgentLockFile(lock);
  if (holder) throw stageRunningHereError(holder, lock.projectName, lock.stage);
};

/** How long a start waits for the stopping previous session of its stage; MCP's stop waits as long for an agent. */
const STOPPING_SESSION_WAIT_MS = 30_000;

/**
 * Refuses a session of this stage while another process runs one in this directory. One that is stopping is waited
 * for first. The two would share the lock file and the local containers.
 */
export const refuseStageRunningHere = async ({ projectName, stage }: { projectName: string; stage: string }) => {
  const stopping = await waitForStoppingSession({
    projectName,
    stage,
    timeoutMs: STOPPING_SESSION_WAIT_MS,
    onWait: ({ pid }) =>
      tuiManager.info(`Waiting for the previous dev session of this stage (process ${pid}) to finish stopping.`)
  });
  const session = stopping ?? (await findLiveStageSession(projectName, stage));
  if (!session) return;
  const { mismatch } = compareSessionTarget(session, ownSessionTarget());
  if (mismatch.length > 0) throw targetMismatchError(session, mismatch);
  if (stopping)
    throw new CliError({
      category: 'CLI',
      code: 'DEV_SESSION_STILL_STOPPING',
      message: `The previous dev session of this stage (process ${session.pid}) is still stopping after ${STOPPING_SESSION_WAIT_MS / 1000} s.`,
      hints: stageRunningHereHints(session, projectName, stage)
    });
  throw stageRunningHereError(session, projectName, stage);
};

const stageRunningHereHints = (session: AgentLockFile, projectName: string, stage: string) => [
  `Stop it with \`stacktape dev stop${session.port ? ` --agent-port ${session.port}` : ''}\`, or use another stage.`,
  `If no dev session runs, delete ${getLockFilePath(projectName, stage)}.`
];

const stageRunningHereError = (session: AgentLockFile, projectName: string, stage: string) =>
  new CliError({
    category: 'CLI',
    code: 'DEV_STAGE_RUNNING_HERE',
    message: `Dev mode for stage ${stage} already runs in this directory (process ${session.pid}${session.port ? `, agent port ${session.port}` : ''}).`,
    hints: stageRunningHereHints(session, projectName, stage)
  });

export const commandDev = async () => {
  const initialArgs = captureCommandArgs();
  const agentPortArg = initialArgs.agentPort;
  const agentEnabled = Boolean(initialArgs.agent || agentPortArg !== undefined);
  const isAgentChild = Boolean(initialArgs.agentChild);

  // Handle --agent (without --agent-child): spawn daemon and exit
  // The daemon child will have --agent-child flag set
  if (agentEnabled && !isAgentChild) {
    const stillStopping = await waitForStoppingSession({
      timeoutMs: STOPPING_SESSION_WAIT_MS,
      onWait: ({ pid }) =>
        tuiManager.info(`Waiting for the previous dev session of this stage (process ${pid}) to finish stopping.`)
    });
    if (stillStopping) {
      throw new CliError({
        category: 'CLI',
        code: 'DEV_SESSION_STILL_STOPPING',
        message: `The previous dev session of this stage (process ${stillStopping.pid}) is still stopping after ${STOPPING_SESSION_WAIT_MS / 1000} s.`,
        hints: 'Start dev mode again once it has exited. `stacktape dev stop` ends it if it does not.'
      });
    }
    // Check if agent is already running
    const runningAgent = await findReusableAgent();
    if (runningAgent) return reportRunningAgent(runningAgent);

    // Find available port
    const defaultAgentPort = 7331;
    const agentPort = agentPortArg ?? (await findAvailablePort(defaultAgentPort));
    if (!agentPort) {
      throw new CliError({
        category: 'CLI',
        code: 'CLI_DEV_AGENT_PORT_UNAVAILABLE',
        message: `Could not find available port for agent server (tried ${defaultAgentPort}-${defaultAgentPort + 99}).`,
        hints: 'Specify a port with `--agent-port`, or free a port in that range.'
      });
    }

    // Reported before the daemon starts, so a client knows the agent's port and token file while a first start still
    // creates the dev network and deploys the dev stack.
    tuiManager.emitEvent({
      phase: 'DEV_STARTUP',
      eventType: 'DEV_SESSION',
      status: 'started',
      message: `Starting the dev agent on port ${agentPort}`,
      detail: { kind: 'dev-agent', agentPort, tokenFile: localStatePaths.devAgentTokenFile({ port: agentPort }) }
    });
    const result = await spawnAgentDaemon({
      explicitArgs: globalStateManager.explicitArgs,
      customArgs: getCustomArgsSuffix(),
      agentPort,
      // An inactivity limit: the daemon reports progress and a heartbeat while it works.
      timeoutMs: 600000,
      onChildRecord: forwardDaemonProgress
    });

    if (!result.success) {
      // The daemon's own failure (a conflicting stack, missing credentials, a failed deployment) keeps its code and
      // hints, so the caller can act on them. Only a daemon that died or hung gets the generic code.
      if (result.childResult) {
        throw new CliError({
          category: 'CLI',
          code: result.childResult.code,
          message: result.childResult.message,
          hints: result.childResult.hints
        });
      }
      throw new CliError({
        category: 'CLI',
        code: 'CLI_DEV_AGENT_START_FAILED',
        message: `Failed to start dev agent: ${result.error || 'Unknown error'}`
      });
    }

    // A failed workload leaves the rest of the session usable, and a rebuild after the fix starts it: a function that
    // failed to build keeps running its previous code, and a container or dev server that failed is not running.
    if (result.readyPayload?.failedWorkloads.length) {
      throw sessionNotReadyError({
        payload: result.readyPayload,
        message: 'Dev mode runs, but workloads in it failed to start'
      });
    }

    // Print startup message with endpoint documentation
    if (result.readyPayload) {
      const { port, projectName, stage, region, workloads, databases, logFile } = result.readyPayload;
      tuiManager.printLines([
        '',
        buildStartupMessage({
          projectName,
          stage: stage || '',
          region: region || '',
          workloads: workloads || [],
          databases: databases || [],
          port,
          logFile
        }),
        '',
        '─'.repeat(60),
        'IMPORTANT: When done, stop the dev agent with:',
        `  stacktape dev stop --agent-port ${port}`,
        '─'.repeat(60)
      ]);
    }

    // Daemon started successfully - parent can exit
    return result.readyPayload || null;
  }

  // Register cleanup hooks for dev command (must be done at runtime, not module import time)
  // These hooks are NOT registered at module load to avoid side effects when stacktape code
  // is bundled into user applications
  registerCredentialCleanupHook();
  registerLocalResourceCleanupHook();
  registerHealthMonitorCleanupHook();
  registerDevServerCleanupHook();
  registerTunnelCleanupHook();
  registerNamedProxyCleanupHook();

  // Phase 1: Initialize credentials, config, packagingManager
  // This also prompts for stage if not provided
  const { args, stackContext } = await initializeStackServicesForDevPhase1();
  captureSessionConfig();
  // A client that started this session can still read what it deployed when the start fails later.
  if (agentEnabled) {
    tuiManager.emitEvent({
      phase: 'DEV_STARTUP',
      eventType: 'DEV_SESSION',
      status: 'running',
      message: `Dev session for project ${stackContext.projectName}, stage ${stackContext.stage} in ${stackContext.region}`,
      detail: {
        kind: 'dev-target',
        projectName: stackContext.projectName,
        stage: stackContext.stage,
        region: stackContext.region,
        ...(globalStateManager.configPath ? { configPath: globalStateManager.configPath } : {})
      }
    });
  }

  // Set agent mode early so spinners use plain text output
  if (agentEnabled) {
    setSpinnerAgentMode(true);
  }

  if (agentEnabled) {
    // Find available port (use specified port or find one starting from 7331)
    const defaultAgentPort = 7331;
    const agentPort = agentPortArg ?? (await findAvailablePort(defaultAgentPort));
    if (!agentPort) {
      throw new CliError({
        category: 'CLI',
        code: 'CLI_DEV_AGENT_PORT_UNAVAILABLE',
        message: `Could not find available port for agent server (tried ${defaultAgentPort}-${defaultAgentPort + 99}).`,
        hints: 'Specify a port with `--agent-port`, or free a port in that range.'
      });
    }

    registerAgentCleanupHook();
    setRebuildFunctions(rebuildWorkload, rebuildAllWorkloads);
    await startAgentServer(
      agentPort,
      localStatePaths.devAgentDirectory({ workingDirectory: stackContext.workingDir }),
      {
        getEnvVars: getWorkloadEnvVars,
        getSecretEnvNames: getWorkloadSecretEnvNames
      },
      {
        sessionId: process.env.STACKTAPE_DEV_SESSION_ID || randomUUID(),
        projectDirectory: stackContext.workingDir,
        projectName: stackContext.projectName,
        stage: stackContext.stage,
        region: stackContext.region
      }
    );
    // Dev mode's own messages (file changes, redeploys, dev box state, warnings) go to the session's log file too.
    tuiManager.setMessageListener((type, message) => {
      if (type === 'debug') return;
      agentLog('dev', message, type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'info');
    });
    startDevStartupReporting();

    // A first run deploys the dev stack, which can far outlast any fixed readiness deadline. The
    // daemon therefore emits a progress heartbeat until AGENT_READY, and the parent treats its
    // timeout as an inactivity limit: a silent CloudFormation wait keeps the daemon alive, while a
    // genuinely hung child still gets reaped.
    if (isAgentChild) {
      const heartbeat = setInterval(reportDevStartupHeartbeat, 20_000);
      heartbeat.unref();
      agentReadyHeartbeatStopper = () => clearInterval(heartbeat);
    }
  }

  const orphanedDevBoxSessionId = findOrphanedDevBoxSession(stackContext.projectName, stackContext.stage);
  // The parent could not compare the target before the credentials loaded (`findReusableAgent`): an agent of this stage
  // with the same target is reported as this start's result.
  if (isAgentChild) {
    const running = await getRunningAgent(stackContext.projectName, stackContext.stage);
    const target = running && compareSessionTarget(running, ownSessionTarget());
    if (running && target?.comparable && target.mismatch.length === 0) return reportRunningAgent(running);
  }
  // Another session of this stage in this directory shares its lock file and containers: refused before anything else.
  await refuseStageRunningHere({ projectName: stackContext.projectName, stage: stackContext.stage });

  const devHeader = {
    action: 'RUNNING DEV MODE',
    projectName: stackContext.projectName,
    stageName: stackContext.stage,
    region: stackContext.region
  } as const;

  tuiManager.showCommandHeader(devHeader, { renderStandalone: !agentEnabled });

  if (!agentEnabled) {
    tuiManager.printLines(['']);
  }

  const allWorkloads = getDevCompatibleResources();
  const allEmulateableResources = getLocalEmulateableResources();

  // Validate that we have something to run
  if (allWorkloads.length === 0 && allEmulateableResources.length === 0) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_NO_COMPATIBLE_RESOURCES',
      message: 'No dev-compatible resources found in your config.',
      hints: 'Add a function, container workload, or database to use `stacktape dev`.'
    });
  }

  // Build selectable resources and get user selection
  const allSelectableResources = buildSelectableResources(allWorkloads, allEmulateableResources);
  const selectedResourceNames = await getSelectedResources(allSelectableResources, args);

  if (selectedResourceNames.size === 0) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_NO_RESOURCES_SELECTED',
      message: 'No resources selected to run.',
      hints: 'Select at least one resource, or use `--resources all` to run everything.'
    });
  }

  // Filter workloads and emulatable resources based on selection
  const devCompatibleResources = allWorkloads.filter((r) => selectedResourceNames.has(r.name));
  const emulateableResources = allEmulateableResources.filter((r) => selectedResourceNames.has(r.name));

  // Log selected resources in agent mode
  if (agentEnabled) {
    const workloadNames = devCompatibleResources.map((r) => `${r.name} (${r.category})`);
    const dbNames = emulateableResources.map((r) => `${r.name} (${r.engineType})`);
    const allNames = [...workloadNames, ...dbNames];
    tuiManager.info(`[~] Selected resources: ${allNames.join(', ')}`);
  }

  // The dev stack's references to local resources are checked before any AWS work, so such a config error comes back in
  // seconds. Local DynamoDB tables that stream triggers read are deployed instead.
  const skippedFunctionNames = new Set(
    allWorkloads
      .filter(({ category, name }) => category === 'function' && !selectedResourceNames.has(name))
      .map(({ name }) => name)
  );
  const devStackNotices = prepareDevStackReferences({ noTunnel: Boolean(args.noTunnel), skippedFunctionNames });
  setAgentNotices(devStackNotices);
  devStackNotices.forEach((notice, index) => {
    if (agentEnabled)
      reportDevStartup({ step: 'DEV_SESSION', key: `notice-${index}`, status: 'completed', message: notice });
    else tuiManager.info(notice);
  });
  const remoteResourceNames = configManager.deploymentContext.remoteResourceNames;

  // A stage another session runs is refused before any slower AWS work. Only sessions whose functions use the dev
  // network hold a stage; the relay check in the network step stays the authority.
  if (Object.keys(getDevNetworkDemand({ noTunnel: Boolean(args.noTunnel) }).functions).length) {
    await refuseStageHeldElsewhere({ stackName: stackContext.stackName, takeOver: Boolean(args.takeOver) });
  }

  // Every session, terminal or agent, records itself before it starts anything, and labels its containers with that
  // record, so `dev:stop --cleanupContainers` can tell a live session's containers from abandoned ones. Only after the
  // stage checks: r2rr, a refused second start overwrote the running session's lock file and then deleted it. Created
  // exclusively: of two starts that passed the checks, one gets it.
  await acquireSessionLock({
    pid: process.pid,
    port: getAgentPort() ?? 0,
    phase: 'starting',
    projectName: stackContext.projectName,
    stage: stackContext.stage,
    ...ownSessionTarget(),
    region: stackContext.region,
    startedAt: new Date().toISOString(),
    workloads: [],
    databases: [],
    sessionId: getAgentSessionId()
  });
  setDevSessionOwner({
    lockFile: getLockFilePath(stackContext.projectName, stackContext.stage),
    pid: process.pid,
    stage: stackContext.stage
  });
  registerOwnLockCleanup({ projectName: stackContext.projectName, stage: stackContext.stage });

  // Phase 2 reads the dev stack and its metadata from AWS. The secret and parameter checks and the dev network need
  // nothing of it, so it runs in the background meanwhile; it is awaited before the dev stack is checked.
  reportDevStartup({
    step: 'DEV_SESSION',
    key: 'aws-metadata',
    status: 'started',
    message: 'Loading the dev stack and its metadata from AWS'
  });
  const metadataState: { loaded: boolean; error?: unknown } = { loaded: false };
  const metadata = initializeStackServicesForDevPhase2(stackContext).then(
    () => {
      metadataState.loaded = true;
      reportDevStartup({
        step: 'DEV_SESSION',
        key: 'aws-metadata',
        status: 'completed',
        message: 'Loaded the dev stack and its metadata from AWS'
      });
    },
    (error) => {
      metadataState.error = error;
      throw error;
    }
  );
  metadata.catch(() => {});

  // They may prompt for missing values in a terminal, so they run before the dev network shows its progress.
  reportDevStartup({
    step: 'DEV_SESSION',
    key: 'config-references',
    status: 'started',
    message: 'Checking the secrets and SSM parameters the configuration references'
  });
  await ensureMissingSecretsCreated({ devStackName: stackContext.stackName });
  await ensureMissingSsmParamsCreated();
  reportDevStartup({
    step: 'DEV_SESSION',
    key: 'config-references',
    status: 'completed',
    message: 'Checked the secrets and SSM parameters the configuration references'
  });
  // A stack that cannot be read must not cost a dev network creation first.
  if (metadataState.error) throw metadataState.error;

  // VPC functions and functions that use a local database run in the account's shared dev network. Preparing it
  // starts the dev box in the background, and decides where the dev stack's functions run and which relay address
  // their environment carries.
  const devNetworkSpinner = createSpinner('Preparing the dev network', tuiManager.colorize.bind(tuiManager));
  reportDevStartup({
    step: 'DEV_NETWORK',
    status: 'started',
    message: 'Preparing the dev network (the first time, it creates the dev box in about 1 minute)'
  });
  let devNetworkSession: Awaited<ReturnType<typeof startDevNetworkSession>>;
  try {
    devNetworkSession = await startDevNetworkSession({
      stackContext,
      noTunnel: Boolean(args.noTunnel),
      takeOver: Boolean(args.takeOver),
      agentPort: getAgentPort() ?? undefined,
      orphanedSessionId: orphanedDevBoxSessionId
    });
    devNetworkSpinner.success();
    reportDevStartup({
      step: 'DEV_NETWORK',
      status: 'completed',
      message: !devNetworkSession
        ? 'No function needs the dev network'
        : devNetworkSession.readyState().settled
          ? `Dev network ${devNetworkSession.network.stackName} is ready`
          : `Dev network ${devNetworkSession.network.stackName}: dev box created; CloudFormation finishes the network while the dev stack deploys`
    });
  } catch (error) {
    devNetworkSpinner.error();
    reportDevStartup({
      step: 'DEV_NETWORK',
      status: 'completed',
      level: 'error',
      message: `Preparing the dev network failed: ${(error as Error).message}`
    });
    throw error;
  }

  if (!metadataState.loaded) {
    const metadataSpinner = createSpinner('Loading metadata from AWS', tuiManager.colorize.bind(tuiManager));
    try {
      await metadata;
    } catch (error) {
      metadataSpinner.error();
      throw error;
    }
    metadataSpinner.success();
  }

  // Check for a dev stack or deploy one.
  if (stackManager.existingStackDetails) {
    assertExistingDevStack({
      stackName: stackContext.stackName,
      stage: stackContext.stage,
      isDevStack: deployedStackOverviewManager.getStackMetadata(stackMetadataNames.isDevStack()),
      tags: stackManager.existingStackDetails.Tags,
      stackStatus: stackManager.existingStackDetails.StackStatus
    });
  }

  // Locally running containers assume their roles with the developer's credentials, and the dev stack trusts the
  // developer in those roles, so IAM accepts the trust while the stack deploys.
  const devTrustStatement = configManager.allContainerWorkloads.some(({ configParentResourceType }) =>
    isResourceTypeExcludedInDevMode(configParentResourceType)
  )
    ? getDeveloperTrustStatement(globalStateManager.credentials.identity.arn)
    : undefined;
  configManager.setDevTrustStatement(devTrustStatement);
  const desiredDevStackConfigFingerprint = getDevStackConfigFingerprint({
    config: configManager.config,
    devNetwork: devNetworkSession?.placement,
    devTrustStatement,
    remoteResourceNames,
    skippedFunctionNames
  });
  const devStackUpdateCause = getDevStackUpdateCause({
    deployedFingerprint: deployedStackOverviewManager.getStackMetadata(stackMetadataNames.devStackConfigFingerprint()),
    desiredFingerprint: desiredDevStackConfigFingerprint
  });
  const devStackConfigChanged = devStackUpdateCause !== undefined;
  // Local scripts are not in the fingerprint, and a dev stack deployed before it added outputs for local workloads has
  // none: an update adds the outputs that local workloads read.
  const missingLocalOutputs = stackManager.existingStackDetails
    ? findMissingLocalCfResourceOutputs({
        references: findLocalCfResourceReferences(configManager.config),
        isDeployed: (resourceName) => Boolean(stackManager.getExistingResourceDetails(resourceName)),
        outputs: stackManager.lastDeploymentStackOutput
      })
    : [];
  // Batch jobs and AgentCore runtimes run images that AWS pulls from the stack's registry. Their code is not in the
  // fingerprint, so an existing stack is updated when an image changed; a new stack builds them while it deploys.
  let changedImages: string[] = [];
  if (stackManager.existingStackDetails && configManager.imageJobNamesToPackage.length) {
    const imageSpinner = createSpinner(
      'Building the images of resources that run in AWS',
      tuiManager.colorize.bind(tuiManager)
    );
    reportDevStartup({
      step: 'DEV_STACK',
      key: 'images',
      status: 'started',
      message: 'Building the images of batch jobs and other resources that run in AWS'
    });
    try {
      changedImages = await packageDevStackImages();
    } catch (error) {
      imageSpinner.error();
      reportDevStartup({
        step: 'DEV_STACK',
        key: 'images',
        status: 'completed',
        level: 'error',
        message: `Building the images of resources that run in AWS failed: ${(error as Error).message}`
      });
      throw error;
    }
    imageSpinner.success();
    reportDevStartup({
      step: 'DEV_STACK',
      key: 'images',
      status: 'completed',
      message: changedImages.length
        ? `Changed images: ${changedImages.join(', ')}`
        : 'The images of resources that run in AWS are unchanged'
    });
  }

  // A resolved-config fingerprint keeps warm starts fast while still refreshing IAM roles and other support
  // infrastructure after configuration changes. Stacks created before this metadata existed refresh once.
  if (
    !stackManager.existingStackDetails ||
    devStackConfigChanged ||
    changedImages.length ||
    missingLocalOutputs.length
  ) {
    const updateReasons = [
      devStackUpdateCause && describeDevStackUpdateCause(devStackUpdateCause, { takeOver: Boolean(args.takeOver) }),
      !devStackUpdateCause &&
        missingLocalOutputs.length &&
        `local workloads read ${missingLocalOutputs.map((name) => `\`${name}\``).join(', ')}, which the dev stack does not output yet`,
      changedImages.length &&
        `the image of ${changedImages.map((name) => `\`${name}\``).join(', ')} changed and is pushed to AWS`
    ].filter(Boolean);
    const devStackDeployMessage = !stackManager.existingStackDetails
      ? `Creating dev stack ${stackContext.stackName}`
      : `Updating dev stack ${stackContext.stackName}: ${updateReasons.join(', and ')}`;
    try {
      if (agentEnabled) {
        // Agent mode reports the deployment as JSONL events, CloudFormation resource counts included: the parent passes
        // them on, and the session's log file records the start and the outcome.
        reportDevStartup({
          step: 'DEV_STACK',
          status: 'started',
          message: devStackDeployMessage
        });
        operationReporter.setSilentMode(false);
        try {
          await deployDevStack({ configFingerprint: desiredDevStackConfigFingerprint });
          reportDevStartup({ step: 'DEV_STACK', status: 'completed', message: 'Dev stack deployed' });
        } catch (err) {
          reportDevStartup({
            step: 'DEV_STACK',
            status: 'completed',
            level: 'error',
            message: `Dev stack deployment failed: ${(err as Error).message}`
          });
          throw err;
        } finally {
          operationReporter.setSilentMode(true);
        }
      } else {
        // Interactive mode: use TUI to show deployment progress.
        // Set a header that explains this is an automatic dev-stack setup step.
        tuiManager.info(`${devStackDeployMessage}.`);
        operationReporter.setSilentMode(false);
        tuiManager.showCommandHeader({
          action: 'DEPLOYING DEV STACK',
          projectName: stackContext.projectName,
          stageName: stackContext.stage,
          region: stackContext.region
        });
        tuiManager.start();
        try {
          await deployDevStack({ configFingerprint: desiredDevStackConfigFingerprint });
        } finally {
          await tuiManager.stop();
          operationReporter.setSilentMode(true);
        }
      }
    } catch (error) {
      // A dev stack deployed into a network that is still being created fails when the network does; the network's
      // error explains the dev stack's.
      throw devNetworkSession?.readyState().error ?? error;
    }

    // Refresh stack details after deployment
    await stackManager.refetchStackDetails(stackContext.stackName);
    await deployedStackOverviewManager.refreshStackInfoMap({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources
    });
  }
  if (devNetworkSession) await waitForDevNetwork(devNetworkSession);

  // Now start the Dev TUI
  const projectName = stackContext.projectName;
  const stageName = stackContext.stage;

  // Prepare resource info for agent startup message
  const workloadInfos = devCompatibleResources.map((r) => ({ name: r.name, type: r.category }));
  const databaseInfos = emulateableResources.map((r) => ({ name: r.name, type: r.engineType }));

  // Start the Dev TUI
  // When agent mode is enabled, use non-TTY renderer for LLM-friendly output
  devTuiManager.start({
    projectName,
    stageName,
    onReady: agentEnabled
      ? () => {
          // A stop during the start cancels it: the daemon reports the interruption once its cleanup ends, not ready.
          // `/stop` answers before its interrupt arrives, so the session's own stop mark counts too.
          if (applicationManager.isInterrupted || isOwnSessionStopping()) return;
          const port = getAgentPort();

          // Write lock file for discovery by other processes
          writeAgentLockFile({
            pid: process.pid,
            port: port!,
            phase: 'ready',
            projectName,
            stage: stageName,
            ...ownSessionTarget(),
            region: stackContext.region,
            startedAt: new Date().toISOString(),
            workloads: workloadInfos.map((w) => w.name),
            databases: databaseInfos.map((d) => d.name),
            logFile: getAgentLogFilePath() || undefined,
            sessionId: getAgentSessionId()
          });

          // Get workload details from state for the ready message
          const state = devTuiState.getState();
          const workloadsWithUrls = state.workloads.map((w) => ({
            name: w.name,
            type: w.type,
            url: w.url
          }));
          const databasesWithPorts = state.localResources.map((r) => ({
            name: r.name,
            type: r.type,
            port: r.port
          }));

          // Print AGENT_READY for daemon parent to detect
          // This MUST be printed for the daemon spawning to work
          agentReadyHeartbeatStopper?.();
          agentReadyHeartbeatStopper = null;
          const failedWorkloadNames = devTuiState
            .getState()
            .workloads.filter((w) => w.status === 'error')
            .map((w) => w.name);
          reportDevStartup({
            step: 'DEV_SESSION',
            status: 'completed',
            ...(failedWorkloadNames.length
              ? {
                  level: 'error',
                  message: `Dev session started, but these workloads failed: ${failedWorkloadNames.join(', ')}`
                }
              : { message: 'Dev session ready' })
          });
          stopDevStartupReporting();
          if (applicationManager.isInterrupted || isOwnSessionStopping()) return;
          process.stdout.write(
            `${buildAgentReadyMessage({
              port: port!,
              projectName,
              stage: stageName,
              region: stackContext.region,
              workloads: workloadsWithUrls,
              databases: databasesWithPorts,
              logFile: getAgentLogFilePath() || '',
              sessionId: getAgentSessionId(),
              failedWorkloads: state.workloads
                .filter((w) => w.status === 'error')
                .map((w) => ({
                  name: w.name,
                  error: w.error || 'unknown error',
                  ...(w.hints?.length ? { hints: w.hints } : {})
                })),
              notices: devStackNotices
            })}\n`,
            // The process that started the daemon reads its output only until now; from here the files are capped.
            () => capDaemonOutputFiles()
          );
          tuiManager.printLines(['']);

          // Also print human-readable info
          tuiManager.printLines([
            buildStartupMessage({
              projectName,
              stage: stageName,
              region: stackContext.region,
              workloads: workloadInfos,
              databases: databaseInfos,
              logFile: getAgentLogFilePath() || undefined
            }),
            ''
          ]);
        }
      : undefined,
    agentMode: agentEnabled
  });

  if (agentEnabled) {
    // Initialize dev agent credentials (scoped IAM role for agent API)
    initDevAgentCredentials();

    mirrorDevTuiState(devTuiState.getState());
    const unsubscribe = devTuiState.subscribe(mirrorDevTuiState);
    applicationManager.registerCleanUpHook(() => {
      unsubscribe();
    });
  }

  applicationManager.registerCleanUpHook(async () => {
    // Snapshot state before stopping the TUI (stop() resets state)
    const state = devTuiState.getState();
    const cleanupLines: string[] = [];

    const workloads = state.workloads.filter(
      (w) => w.status === 'running' || w.status === 'error' || w.status === 'starting'
    );
    if (workloads.length > 0) {
      cleanupLines.push('Stopping dev workloads...');
      for (const workload of workloads) {
        cleanupLines.push(`  ${workload.name}`);
      }
    }

    const localResources = state.localResources.filter((r) => r.status === 'running' || r.status === 'error');
    if (localResources.length > 0) {
      cleanupLines.push('Stopping local resources...');
      for (const resource of localResources) {
        cleanupLines.push(`  ${resource.name}`);
      }
    }

    const activeTunnels = getActiveTunnels();
    if (activeTunnels.length > 0) {
      cleanupLines.push('Stopping tunnels...');
      for (const tunnel of activeTunnels) {
        cleanupLines.push(`  ${tunnel.resourceName} (${tunnel.relayHost}:${tunnel.relayPort})`);
      }
    }

    // Stop the dev TUI first -- this exits the alternate screen buffer so
    // subsequent stdout writes are visible on the normal terminal screen.
    if (devTuiManager.running) {
      await devTuiManager.stop();
    }

    // Print cleanup progress directly to stdout to bypass any console interception
    // that may still be partially active. This ensures messages are always visible.
    for (const line of cleanupLines) {
      try {
        process.stdout.write(`${line}\n`);
      } catch {}
    }

    setSpinnerAgentMode(false);
  });

  // Set up rebuild handler for keyboard shortcuts
  devTuiManager.setRebuildHandler(async (workloadName) => {
    if (workloadName === null) {
      await rebuildAllWorkloads();
    } else {
      await rebuildWorkload(workloadName);
    }
  });

  // Register local resources in TUI (only selected ones that aren't remote)
  for (const resource of emulateableResources) {
    if (!remoteResourceNames.has(resource.name)) {
      const resourceType = mapResourceType(resource.type, resource.engineType);
      if (resourceType) {
        devTuiManager.addLocalResource({ name: resource.name, type: resourceType });
      }
    }
  }

  // Register setup steps in TUI (if we have local resources)
  const hasLocalResources = emulateableResources.some((r) => !remoteResourceNames.has(r.name));
  if (devNetworkSession) {
    devTuiManager.addSetupStep('dev-box', 'Dev box');
    if (getRelayedLocalResourceNames(devNetworkSession.placement).length) {
      devTuiManager.addSetupStep('tunnels', 'Relay tunnels');
    }
  }
  if (hasLocalResources) {
    devTuiManager.addSetupStep('env-inject', 'Injecting environment');
  }

  // Register hooks in TUI
  const hooks = configManager.hooks?.beforeDev || [];
  for (const hook of hooks) {
    if ('scriptName' in hook) {
      devTuiManager.addHook({ name: hook.scriptName });
    }
  }

  // Register workloads in TUI
  for (const resource of devCompatibleResources) {
    devTuiManager.addWorkload({
      name: resource.name,
      type: resource.category,
      hostingContentType: resource.hostingContentType
    });
  }

  // Start the renderer after all items are registered so the first frame has the complete layout
  devTuiManager.startRenderer();

  // Build the set of selected database names for local resource handling.
  const selectedLocalResourceNames = new Set(emulateableResources.map((resource) => resource.name));

  // Run all dev-compatible resources (this will update TUI as things start)
  try {
    await runParallelWorkloads(devCompatibleResources, selectedLocalResourceNames, { args, stackContext });
  } catch (err) {
    // When DevTui is running, show error in TUI and then re-throw
    if (devTuiManager.running) {
      await devTuiManager.stop();
    }
    throw err;
  }

  // Keep the process running until Ctrl+C
  await new Promise<void>((resolve) => {
    const cleanup = async () => {
      await applicationManager.handleExitSignal('SIGINT');
      resolve();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
};

/** Passes the daemon's startup progress on to this command's own output. */
const forwardDaemonProgress = ({ type, line, record }: ForwardedChildRecord) => {
  if (tuiManager.mode === 'jsonl') {
    // Already a well-formed JSONL record; written as it is, it keeps the daemon's timestamps and details.
    process.stdout.write(`${line}\n`);
    return;
  }
  const message = String(record.message);
  if (type === 'log' && (record.level === 'warn' || record.level === 'error')) tuiManager.warn(message);
  else tuiManager.info(message);
};

const mapResourceType = (
  type: string,
  engineType?: string
): 'postgres' | 'mysql' | 'mariadb' | 'redis' | 'dynamodb' | 'opensearch' | null => {
  if (type === 'relational-database') {
    // Check engine type for relational databases
    if (engineType === 'mysql' || engineType?.includes('mysql')) return 'mysql';
    if (engineType === 'mariadb') return 'mariadb';
    return 'postgres'; // Default for postgres, aurora-postgres, etc.
  }
  if (type === 'redis-cluster') return 'redis';
  if (type === 'dynamo-db-table') return 'dynamodb';
  if (type === 'open-search-domain') return 'opensearch';
  return null;
};
