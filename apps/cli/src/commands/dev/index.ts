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
import { CliError } from '@utils/errors';
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
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';
import {
  buildAgentReadyMessage,
  buildAgentReadyPayload,
  deleteAgentLockFile,
  findOrphanedDevBoxSession,
  getLockFilePath,
  getCustomArgsSuffix,
  type ForwardedChildRecord,
  getRunningAgent,
  requestDevAgent,
  spawnAgentDaemon,
  stopRunningAgent,
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
  setRebuildFunctions,
  startAgentServer
} from './agent-server';
import { initDevAgentCredentials } from './dev-agent-credentials';
import { registerDevServerCleanupHook } from './dev-server';
import { deployDevStack } from './dev-stack-deployer';
import { devStackConfigNeedsUpdate, getDevStackConfigFingerprint } from './dev-stack-config-fingerprint';
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
import { startDevNetworkSession, waitForDevNetwork } from './dev-network-session';
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
  failedWorkloads?: { name: string; error: string }[];
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
    ...(status?.restartRequired ? { restartRequired: status.restartRequired } : {})
  };
};

export const commandDev = async () => {
  const initialArgs = captureCommandArgs();
  const agentPortArg = initialArgs.agentPort;
  const agentEnabled = Boolean(initialArgs.agent || agentPortArg !== undefined);
  const isAgentChild = Boolean(initialArgs.agentChild);

  // Handle --agent (without --agent-child): spawn daemon and exit
  // The daemon child will have --agent-child flag set
  if (agentEnabled && !isAgentChild) {
    // Check if agent is already running
    const runningAgent = await getRunningAgent();
    if (runningAgent) {
      // Report the running agent exactly like a new one: clients such as the MCP tool take its port, token file,
      // workload URLs and database ports from this result.
      const readyPayload = await getRunningAgentReadyPayload(runningAgent);
      // A session that waits for a restart runs outdated configuration: reporting it as started would be a false green.
      if (readyPayload.restartRequired) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_DEV_RESTART_REQUIRED',
          message: `The dev session of this stage on port ${readyPayload.port} has to restart: ${readyPayload.restartRequired}`,
          hints: `Stop it with \`stacktape dev stop --agent-port ${readyPayload.port}\`, then start dev mode again.`
        });
      }
      // A failed workload leaves the session usable (a rebuild can fix it), so it is reported with ready: false.
      if (readyPayload.ready) process.stdout.write(`AGENT_READY ${JSON.stringify(readyPayload)}\n`);
      else {
        tuiManager.warn(
          `The dev session on port ${readyPayload.port} runs, but is not ready: ${
            readyPayload.failedWorkloads?.map(({ name, error }) => `${name}: ${error}`).join('; ') ||
            'it is still starting'
          }`
        );
      }
      return readyPayload;
    }

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

    const failedWorkloads = result.readyPayload?.failedWorkloads ?? [];
    if (failedWorkloads.length > 0) {
      // A session with a failed workload is not usable, and leaving it running would hold its port, containers and
      // Lambda environment changes. Stop it through its stop route so its cleanup runs, then report the failure.
      const { port, projectName, stage, region, logFile } = result.readyPayload!;
      await stopRunningAgent({
        pid: result.pid ?? 0,
        port,
        phase: 'ready',
        projectName,
        stage: stage || '',
        region: region || '',
        startedAt: '',
        workloads: [],
        databases: []
      });
      throw new CliError({
        category: 'CLI',
        code: 'CLI_DEV_WORKLOAD_FAILED',
        message: `Dev mode stopped because ${failedWorkloads.length === 1 ? 'a workload' : 'workloads'} failed to start:\n${failedWorkloads.map(({ name, error }) => `  ${name}: ${error}`).join('\n')}`,
        hints: logFile ? `The full output is in ${logFile}.` : undefined
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
  // Every session, terminal or agent, records itself before it starts anything, and labels its containers with that
  // record, so `dev:stop --cleanupContainers` can tell a live session's containers from abandoned ones.
  writeAgentLockFile({
    pid: process.pid,
    port: getAgentPort() ?? 0,
    phase: 'starting',
    projectName: stackContext.projectName,
    stage: stackContext.stage,
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
  applicationManager.registerCleanUpHook(async () => {
    deleteAgentLockFile(stackContext.projectName, stackContext.stage);
  });

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
  const remoteResourceNames = configManager.deploymentContext.remoteResourceNames;

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
  await ensureMissingSecretsCreated();
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
    devTrustStatement
  });
  const devStackConfigChanged = devStackConfigNeedsUpdate({
    deployedFingerprint: deployedStackOverviewManager.getStackMetadata(stackMetadataNames.devStackConfigFingerprint()),
    desiredFingerprint: desiredDevStackConfigFingerprint
  });

  // A resolved-config fingerprint keeps warm starts fast while still refreshing IAM roles and other support
  // infrastructure after configuration changes. Stacks created before this metadata existed refresh once.
  if (!stackManager.existingStackDetails || devStackConfigChanged) {
    try {
      if (agentEnabled) {
        // Agent mode reports the deployment as JSONL events, CloudFormation resource counts included: the parent passes
        // them on, and the session's log file records the start and the outcome.
        reportDevStartup({
          step: 'DEV_STACK',
          status: 'started',
          message: !stackManager.existingStackDetails
            ? `Creating dev stack ${stackContext.stackName}`
            : `Updating dev stack ${stackContext.stackName}: its configuration changed`
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
          const port = getAgentPort();

          // Write lock file for discovery by other processes
          writeAgentLockFile({
            pid: process.pid,
            port: port!,
            phase: 'ready',
            projectName,
            stage: stageName,
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
                .map((w) => ({ name: w.name, error: w.error || 'unknown error' }))
            })}\n`
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
    // Delete lock file when agent stops
    if (agentEnabled) {
      deleteAgentLockFile();
    }

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
    if (Object.values(devNetworkSession.placement.functions).some((resources) => resources.length)) {
      devTuiManager.addSetupStep('tunnels', 'Lambda tunnels');
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
