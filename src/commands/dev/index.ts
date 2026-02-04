import { globalStateManager } from '@application-services/global-state-manager';
import { eventManager } from '@application-services/event-manager';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { box as clackBox } from '@clack/prompts';
import { MultiSpinner, setSpinnerAgentMode } from '@application-services/tui-manager/spinners';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { getError } from '@shared/utils/misc';
import { join } from 'node:path';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { devTuiState } from 'src/app/tui-manager/dev-tui/state';
import type { DevTuiState } from 'src/app/tui-manager/dev-tui/types';
import { initializeStackServicesForDevPhase1, initializeStackServicesForDevPhase2 } from '../_utils/initialization';
import {
  buildAgentReadyMessage,
  deleteAgentLockFile,
  getRunningAgent,
  spawnAgentDaemon,
  writeAgentLockFile
} from './agent-daemon';
import { agentLog, getAgentLogFilePath } from './agent-logger';
import {
  buildStartupMessage,
  getAgentPort,
  registerAgentCleanupHook,
  setRebuildFunctions,
  startAgentServer,
  updateAgentState
} from './agent-server';
import { initDevAgentCredentials } from './dev-agent-credentials';
import { getDevModeType, isLegacyDevMode } from './dev-mode-utils';
import { registerDevServerCleanupHook } from './dev-server';
import { deployDevStack } from './dev-stack-deployer';
import {
  getLocalEmulateableResources,
  getRemoteResourceNames,
  registerLocalResourceCleanupHook
} from './local-resources';
import { registerHealthMonitorCleanupHook } from './local-resources/health-monitor';
import { rebuildAllWorkloads, rebuildWorkload, runParallelWorkloads } from './parallel-runner';
import { findAvailablePort } from './port-utils';
import { registerLambdaEnvCleanupHook } from './lambda-env-manager';
import { registerTunnelCleanupHook } from './tunnel-manager';
import { registerCredentialCleanupHook } from './utils';

type DevCompatibleResource = {
  name: string;
  type: string;
  category: 'container' | 'function' | 'hosting-bucket' | 'nextjs-web';
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
  return [...containerWorkloads, ...functions, ...hostingBuckets, ...nextjsWebs];
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
const getSelectedResources = async (allResources: SelectableResource[]): Promise<Set<string>> => {
  const { resources: resourcesArg, skipResources: skipResourcesArg } = globalStateManager.args;

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

        throw getError({
          type: 'CLI',
          message: `Resource "${name}" specified in --${argName} does not exist.`,
          hint
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
 * Supports two modes:
 * - normal (default): Deploys a stripped-down "dev stack" and emulates databases locally
 * - legacy: Requires existing deployed stack, no local database emulation
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
 * 3. (normal mode) Check if dev stack exists, deploy if not
 * 3. (legacy mode) Verify existing stack is deployed
 * 4. (normal mode) Start local emulated resources (databases, redis, dynamodb)
 * 5. Start local workloads (containers, frontends)
 * 6. Deploy and stream logs for functions
 */
export const commandDev = async () => {
  const agentPortArg = globalStateManager.args.agentPort;
  const agentEnabled = Boolean(globalStateManager.args.agent || agentPortArg !== undefined);
  const isAgentChild = Boolean(globalStateManager.args.agentChild);

  // Handle --agent (without --agent-child): spawn daemon and exit
  // The daemon child will have --agent-child flag set
  if (agentEnabled && !isAgentChild) {
    // Check if agent is already running
    const runningAgent = await getRunningAgent();
    if (runningAgent) {
      console.log(
        buildAgentReadyMessage({
          port: runningAgent.port,
          projectName: runningAgent.projectName,
          stage: runningAgent.stage,
          region: runningAgent.region,
          workloads: runningAgent.workloads.map((name) => ({ name, type: 'unknown' })),
          databases: runningAgent.databases.map((name) => ({ name, type: 'unknown' })),
          logFile: runningAgent.logFile || ''
        })
      );
      return;
    }

    // Find available port
    const defaultAgentPort = 7331;
    const agentPort = agentPortArg ?? (await findAvailablePort(defaultAgentPort));
    if (!agentPort) {
      throw getError({
        type: 'CLI',
        message: `Could not find available port for agent server (tried ${defaultAgentPort}-${defaultAgentPort + 99}).`,
        hint: 'Specify a port with --agentPort or free up ports in that range.'
      });
    }

    // Build args for daemon (remove --agent and --agentPort with its value, add --agent-child)
    const allArgs = process.argv.slice(2);
    const originalArgs: string[] = [];
    for (let i = 0; i < allArgs.length; i++) {
      const arg = allArgs[i];
      if (arg === '--agent') continue;
      if (arg === '--agentPort' || arg === '-ap') {
        i++; // Skip next arg (the port value)
        continue;
      }
      if (arg.startsWith('--agentPort=') || arg.startsWith('-ap=')) continue;
      originalArgs.push(arg);
    }

    console.log('Starting dev agent daemon...');
    console.log('');
    const result = await spawnAgentDaemon({
      originalArgs,
      agentPort,
      timeoutMs: 600000 // 10 minutes for stack deployment + startup
    });

    if (!result.success) {
      console.error(`Failed to start dev agent: ${result.error}`);
      process.exit(1);
    }

    // Print startup message with endpoint documentation
    if (result.readyPayload) {
      const { port, projectName, stage, region, workloads, databases, logFile } = result.readyPayload;
      console.log('');
      console.log(
        buildStartupMessage({
          projectName,
          stage: stage || '',
          region: region || '',
          workloads: workloads || [],
          databases: databases || [],
          port,
          logFile
        })
      );
      console.log('');
      console.log('─'.repeat(60));
      console.log('IMPORTANT: When done, stop the dev agent with:');
      console.log(`  stacktape dev:stop --agentPort ${port}`);
      console.log('─'.repeat(60));
    }

    // Daemon started successfully - parent can exit
    return;
  }

  // Register cleanup hooks for dev command (must be done at runtime, not module import time)
  // These hooks are NOT registered at module load to avoid side effects when stacktape code
  // is bundled into user applications
  registerCredentialCleanupHook();
  registerLocalResourceCleanupHook();
  registerHealthMonitorCleanupHook();
  registerDevServerCleanupHook();
  registerTunnelCleanupHook();
  registerLambdaEnvCleanupHook();

  const devMode = getDevModeType();
  const isLegacy = isLegacyDevMode();

  // Phase 1: Initialize credentials, config, packagingManager
  // This also prompts for stage if not provided
  await initializeStackServicesForDevPhase1();

  // Set agent mode early so spinners use plain text output
  if (agentEnabled) {
    setSpinnerAgentMode(true);
  }

  if (agentEnabled) {
    // Find available port (use specified port or find one starting from 7331)
    const defaultAgentPort = 7331;
    const agentPort = agentPortArg ?? (await findAvailablePort(defaultAgentPort));
    if (!agentPort) {
      throw getError({
        type: 'CLI',
        message: `Could not find available port for agent server (tried ${defaultAgentPort}-${defaultAgentPort + 99}).`,
        hint: 'Specify a port with --agentPort or free up ports in that range.'
      });
    }

    registerAgentCleanupHook();
    setRebuildFunctions(rebuildWorkload, rebuildAllWorkloads);
    await startAgentServer(agentPort, join(globalStateManager.workingDir, '.stacktape', 'dev-agent'));
  }

  // Print header - plain text in agent mode, clack box otherwise
  if (agentEnabled) {
    const headerTitle = `DEV MODE${isLegacy ? ' (legacy)' : ''}`;
    console.log(
      `--- ${headerTitle}: ${globalStateManager.targetStack.projectName} -> ${globalStateManager.targetStack.stage} (${globalStateManager.region}) ---`
    );
    console.log('');
  } else {
    const headerTitle = `RUNNING DEV MODE${isLegacy ? ' (legacy)' : ''}`;
    const projectNameLabel = tuiManager.makeBold(globalStateManager.targetStack.projectName);
    const stageNameLabel = tuiManager.colorize('cyan', globalStateManager.targetStack.stage);
    const regionLabel = tuiManager.colorize('gray', globalStateManager.region);
    clackBox(`${projectNameLabel} → ${stageNameLabel} (${regionLabel})`, tuiManager.makeBold(` ${headerTitle} `), {
      rounded: true,
      width: 'auto',
      titleAlign: 'left',
      contentAlign: 'left'
    });
    console.info('');
  }

  const allWorkloads = getDevCompatibleResources();
  // In legacy mode, we don't offer local database emulation
  const allEmulateableResources = isLegacy ? [] : getLocalEmulateableResources();
  const remoteResourceNames = isLegacy ? new Set<string>() : getRemoteResourceNames();

  // Validate that we have something to run
  if (allWorkloads.length === 0 && allEmulateableResources.length === 0) {
    throw getError({
      type: 'CLI',
      message: 'No dev-compatible resources found in your config.',
      hint: 'Add a function, container workload, or database to use the dev command.'
    });
  }

  // Build selectable resources and get user selection
  // In legacy mode, only workloads are selectable (not databases)
  const allSelectableResources = buildSelectableResources(allWorkloads, allEmulateableResources);
  const selectedResourceNames = await getSelectedResources(allSelectableResources);

  if (selectedResourceNames.size === 0) {
    throw getError({
      type: 'CLI',
      message: 'No resources selected to run.',
      hint: 'Select at least one resource or use --resources all to run everything.'
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
    console.log(`[~] Selected resources: ${allNames.join(', ')}`);
  }

  // Phase 2: Load AWS metadata (stack info, etc.)
  const multiSpinner = new MultiSpinner(tuiManager.colorize.bind(tuiManager));
  const metadataSpinner = multiSpinner.add('dev-metadata', 'Loading metadata from AWS');
  await initializeStackServicesForDevPhase2();
  metadataSpinner.success();

  if (isLegacy) {
    // Legacy mode: require existing deployed stack
    if (!stackManager.existingStackDetails) {
      throw getError({
        type: 'CLI',
        message: `Stack '${globalStateManager.targetStack.stackName}' does not exist.`,
        hint: `Legacy dev mode requires an already deployed stack. Deploy with 'stacktape deploy --stage ${globalStateManager.targetStack.stage}' first, or use '--devMode normal' to create a dev stack.`
      });
    }
  } else {
    // Normal mode: check for dev stack or deploy one
    if (stackManager.existingStackDetails) {
      const isDevStack = deployedStackOverviewManager.getStackMetadata(stackMetadataNames.isDevStack());
      if (!isDevStack) {
        const stackStatus = stackManager.existingStackDetails.StackStatus;
        const failedStatuses = new Set([
          'CREATE_FAILED',
          'ROLLBACK_COMPLETE',
          'ROLLBACK_FAILED',
          'UPDATE_ROLLBACK_COMPLETE',
          'UPDATE_ROLLBACK_FAILED',
          'UPDATE_FAILED'
        ]);
        const inProgressStatuses = new Set([
          'CREATE_IN_PROGRESS',
          'ROLLBACK_IN_PROGRESS',
          'UPDATE_IN_PROGRESS',
          'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
          'UPDATE_ROLLBACK_IN_PROGRESS'
        ]);
        const stageName = globalStateManager.targetStack.stage.toLowerCase();
        const isProbablyDevStage = stageName.includes('dev') || stageName.includes('local');

        if ((failedStatuses.has(stackStatus) || inProgressStatuses.has(stackStatus)) && isProbablyDevStage) {
          const warnMsg = `Stack '${globalStateManager.targetStack.stackName}' exists but isn't marked as a dev stack and is in ${stackStatus}.`;
          const infoMsg = 'Deleting the failed stack and redeploying a fresh dev stack...';
          if (agentEnabled) {
            console.log(`[!] ${warnMsg}`);
            console.log(`[~] ${infoMsg}`);
          } else {
            tuiManager.warn(warnMsg);
            tuiManager.info(infoMsg);
          }
          await stackManager.deleteStack();
          await stackManager.refetchStackDetails(globalStateManager.targetStack.stackName);
        } else {
          throw getError({
            type: 'CLI',
            message: `Stack '${globalStateManager.targetStack.stackName}' exists but is not a dev stack.`,
            hint: `Use a different stage name for dev mode (e.g., --stage dev-${globalStateManager.userData?.name?.split(' ')[0]?.toLowerCase() || 'local'}), or use '--devMode legacy' to run against an existing stack.`
          });
        }
      }
    }

    // Deploy dev stack if it doesn't exist
    if (!stackManager.existingStackDetails) {
      if (agentEnabled) {
        // Agent mode: plain text output for dev stack deployment
        console.log('[~] Deploying dev stack (minimal stack for dev mode)...');
        try {
          await deployDevStack();
          console.log('[+] Dev stack deployed successfully');
        } catch (err) {
          console.log('[x] Dev stack deployment failed');
          throw err;
        }
      } else {
        // Interactive mode: use TUI
        eventManager.setSilentMode(false);
        tuiManager.start();
        tuiManager.setShowPhaseHeaders(false);
        tuiManager.setHeader({
          action: 'DEPLOYING DEV STACK',
          projectName: globalStateManager.targetStack.projectName,
          stageName: globalStateManager.targetStack.stage,
          region: globalStateManager.region,
          subtitle: 'minimal stack for dev mode'
        });
        try {
          await deployDevStack();
        } finally {
          await tuiManager.stop();
          tuiManager.setShowPhaseHeaders(true);
          eventManager.setSilentMode(true);
        }
      }

      // Refresh stack details after deployment
      await stackManager.refetchStackDetails(globalStateManager.targetStack.stackName);
      await deployedStackOverviewManager.refreshStackInfoMap({
        stackDetails: stackManager.existingStackDetails,
        stackResources: stackManager.existingStackResources
      });
    }
  }

  // Now start the Dev TUI
  const projectName = globalStateManager.targetStack.projectName;
  const stageName = globalStateManager.targetStack.stage;

  // Prepare resource info for agent startup message
  const workloadInfos = devCompatibleResources.map((r) => ({ name: r.name, type: r.category }));
  const databaseInfos = emulateableResources.map((r) => ({ name: r.name, type: r.engineType }));

  // Start the Dev TUI
  // When agent mode is enabled, use non-TTY renderer for LLM-friendly output
  devTuiManager.start({
    projectName,
    stageName,
    onCommand: handleCommand,
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
            region: globalStateManager.region,
            startedAt: new Date().toISOString(),
            workloads: workloadInfos.map((w) => w.name),
            databases: databaseInfos.map((d) => d.name),
            logFile: getAgentLogFilePath() || undefined
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
          console.log(
            buildAgentReadyMessage({
              port: port!,
              projectName,
              stage: stageName,
              region: globalStateManager.region,
              workloads: workloadsWithUrls,
              databases: databasesWithPorts,
              logFile: getAgentLogFilePath() || ''
            })
          );
          console.log('');

          // Also print human-readable info
          console.log(
            buildStartupMessage({
              projectName,
              stage: stageName,
              region: globalStateManager.region,
              workloads: workloadInfos,
              databases: databaseInfos,
              logFile: getAgentLogFilePath() || undefined
            })
          );
          console.log('');
        }
      : undefined,
    devMode,
    agentMode: agentEnabled
  });

  if (agentEnabled) {
    // Initialize dev agent credentials (scoped IAM role for agent API)
    initDevAgentCredentials();

    let agentLogCursor = 0;
    const mapLogLevel = (level: 'info' | 'warn' | 'error' | 'debug'): 'info' | 'warn' | 'error' => {
      if (level === 'error') return 'error';
      if (level === 'warn') return 'warn';
      return 'info';
    };

    const syncAgentState = (state: DevTuiState) => {
      updateAgentState({
        phase: state.isQuitting ? 'stopping' : state.phase === 'running' ? 'ready' : 'starting',
        workloads: state.workloads.map((workload) => ({
          name: workload.name,
          type: workload.type,
          status: workload.status,
          url: workload.url,
          port: workload.port,
          error: workload.error,
          size: workload.size
        })),
        localResources: state.localResources.map((resource) => ({
          name: resource.name,
          type: resource.type,
          status: resource.status,
          port: resource.port,
          error: resource.error
        }))
      });

      const newLogs = state.logs.filter((log) => log.timestamp > agentLogCursor);
      for (const log of newLogs) {
        agentLog(log.source, log.message, mapLogLevel(log.level));
      }
      if (newLogs.length > 0) {
        agentLogCursor = newLogs[newLogs.length - 1].timestamp;
      }
    };

    syncAgentState(devTuiState.getState());
    const unsubscribe = devTuiState.subscribe(syncAgentState);
    applicationManager.registerCleanUpHook(() => {
      unsubscribe();
    });
  }

  applicationManager.registerCleanUpHook(async () => {
    // Delete lock file when agent stops
    if (agentEnabled) {
      deleteAgentLockFile();
    }

    const state = devTuiState.getState();
    const logLine = devTuiManager.running
      ? devTuiManager.systemLog.bind(devTuiManager)
      : tuiManager.info.bind(tuiManager);
    logLine('Stopping dev workloads...');

    const workloads = state.workloads.filter(
      (w) => w.status === 'running' || w.status === 'error' || w.status === 'starting'
    );
    for (const workload of workloads) {
      logLine(`  ${workload.name}`);
    }

    const localResources = state.localResources.filter((r) => r.status === 'running' || r.status === 'error');
    if (localResources.length > 0) {
      logLine('Stopping local resources...');
      for (const resource of localResources) {
        logLine(`  ${resource.name}`);
      }
    }

    devTuiManager.stop();
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
  // In legacy mode, this is skipped (no local database emulation)
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
  if (hasLocalResources) {
    if (!globalStateManager.args.noTunnel) {
      devTuiManager.addSetupStep('tunnels', 'Lambda tunnels');
    }
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

  // Build set of selected database names for local resource handling
  // In legacy mode, this is empty (all databases use deployed AWS resources)
  const selectedLocalResourceNames = isLegacy ? new Set<string>() : new Set(emulateableResources.map((r) => r.name));

  // Run all dev-compatible resources (this will update TUI as things start)
  try {
    await runParallelWorkloads(devCompatibleResources, selectedLocalResourceNames);
  } catch (err) {
    // When DevTui is running, show error in TUI and then re-throw
    if (devTuiManager.running) {
      devTuiManager.stop();
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

const handleCommand = async (command: string) => {
  // Clear input buffer after command
  devTuiState.clearInputBuffer();

  if (command === 'q' || command === 'quit') {
    devTuiManager.stop();
    process.exit(0);
  }

  if (command === 'rs') {
    devTuiManager.systemLog('Rebuilding all workloads...');
    await rebuildAllWorkloads();
    devTuiManager.systemLog('All workloads rebuilt');
    return;
  }

  if (command.startsWith('rs ')) {
    const workloadName = command.slice(3).trim();
    devTuiManager.systemLog(`Rebuilding ${workloadName}...`);
    const found = await rebuildWorkload(workloadName);
    if (found) {
      devTuiManager.systemLog(`${workloadName} rebuilt`);
    } else {
      devTuiManager.systemLog(`Workload "${workloadName}" not found`, 'warn');
    }
    return;
  }

  if (command === 'c' || command === 'clear') {
    devTuiManager.clearLogs();
  }
};
