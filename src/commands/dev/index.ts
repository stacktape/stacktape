import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { getError } from '@shared/utils/misc';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { devTuiState } from 'src/app/tui-manager/dev-tui/state';
import { initializeStackServicesForDevPhase1, initializeStackServicesForDevPhase2 } from '../_utils/initialization';
import { getDevModeType, isLegacyDevMode } from './dev-mode-utils';
import { registerDevServerCleanupHook } from './dev-server';
import { deployDevStack } from './dev-stack-deployer';
import {
  getLocalEmulateableResources,
  getRemoteResourceNames,
  registerLocalResourceCleanupHook
} from './local-resources';
import { rebuildAllWorkloads, rebuildWorkload, runParallelWorkloads } from './parallel-runner';
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
 * Get selected resources based on CLI args or interactive picker.
 */
const getSelectedResources = async (allResources: SelectableResource[]): Promise<Set<string>> => {
  const { resources: resourcesArg, skipResources: skipResourcesArg } = globalStateManager.args;

  const allNames = new Set(allResources.map((r) => r.name));

  // Validate resource names
  const validateNames = (names: Set<string>, argName: string) => {
    for (const name of names) {
      if (name !== 'all' && !allNames.has(name)) {
        throw getError({
          type: 'CLI',
          message: `Resource "${name}" specified in --${argName} does not exist.`,
          hint: `Available resources: ${[...allNames].join(', ')}`
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

  // Case 4: No args - show interactive picker
  const options = allResources.map((r) => ({
    value: r.name,
    label: `${r.name}`,
    description: r.type
  }));

  // Start TUI temporarily for the prompt (dev command doesn't start TUI by default)
  tuiManager.start();
  const selected = await tuiManager.promptMultiSelect({
    message: 'Select resources to run in dev mode:',
    options
    // No defaultValues - starts with nothing selected
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
 * Flow:
 * 1. Initialize credentials and config
 * 2. Show resource picker (or use --resources/--skipResources)
 * 3. (normal mode) Check if dev stack exists, deploy if not
 * 3. (legacy mode) Verify existing stack is deployed
 * 4. (normal mode) Start local emulated resources (databases, redis, dynamodb)
 * 5. Start local workloads (containers, frontends)
 * 6. Deploy and stream logs for functions
 */
export const commandDev = async (): Promise<DevReturnValue> => {
  // Register cleanup hooks for dev command (must be done at runtime, not module import time)
  // These hooks are NOT registered at module load to avoid side effects when stacktape code
  // is bundled into user applications
  registerCredentialCleanupHook();
  registerLocalResourceCleanupHook();
  registerDevServerCleanupHook();
  registerTunnelCleanupHook();

  const devMode = getDevModeType();
  const isLegacy = isLegacyDevMode();

  // Phase 1: Initialize credentials, config, packagingManager
  // This also prompts for stage if not provided
  await initializeStackServicesForDevPhase1();

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

  // Phase 2: Load AWS metadata (stack info, etc.)
  const spinner = tuiManager.createSpinner({ text: 'Loading metadata from AWS' });
  await initializeStackServicesForDevPhase2();
  spinner.success();

  if (isLegacy) {
    // Legacy mode: require existing deployed stack
    if (!stackManager.existingStackDetails) {
      throw getError({
        type: 'CLI',
        message: `Stack '${globalStateManager.targetStack.stackName}' does not exist.`,
        hint: `Legacy dev mode requires an already deployed stack. Deploy with 'stacktape deploy --stage ${globalStateManager.targetStack.stage}' first, or use '--devMode normal' to create a dev stack.`
      });
    }
    tuiManager.info(`Using existing stack '${globalStateManager.targetStack.stackName}' (legacy mode)`);
  } else {
    // Normal mode: check for dev stack or deploy one
    if (stackManager.existingStackDetails) {
      const isDevStack = deployedStackOverviewManager.getStackMetadata(stackMetadataNames.isDevStack());
      if (!isDevStack) {
        throw getError({
          type: 'CLI',
          message: `Stack '${globalStateManager.targetStack.stackName}' exists but is not a dev stack.`,
          hint: `Use a different stage name for dev mode (e.g., --stage dev-${globalStateManager.userData?.name?.split(' ')[0]?.toLowerCase() || 'local'}), or use '--devMode legacy' to run against an existing stack.`
        });
      }
    }

    // Deploy dev stack if it doesn't exist
    if (!stackManager.existingStackDetails) {
      tuiManager.info(`Dev stack '${globalStateManager.targetStack.stackName}' not found. Deploying...`);
      await deployDevStack();

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

  // Start the Dev TUI
  devTuiManager.start({
    projectName,
    stageName,
    onCommand: handleCommand,
    devMode
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
      const resourceType = mapResourceType(resource.type);
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
    // When DevTui is running, show error in TUI instead of crashing
    if (devTuiManager.running) {
      devTuiManager.systemLog(`Error: ${err.message}`, 'error');
    } else {
      throw err;
    }
  }

  // Keep the process running until Ctrl+C
  await new Promise<void>((resolve) => {
    const cleanup = () => {
      devTuiManager.stop();
      resolve();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
};

const mapResourceType = (type: string): 'postgres' | 'mysql' | 'redis' | 'dynamodb' | null => {
  if (type === 'relational-database') {
    // Need to check engine type - for now assume postgres
    return 'postgres';
  }
  if (type === 'redis-cluster') return 'redis';
  if (type === 'dynamo-db-table') return 'dynamodb';
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
