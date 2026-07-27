/**
 * Utility for creating once-only cleanup hook registrations.
 * Prevents duplicate registrations when modules are imported multiple times.
 */

import { applicationManager } from '@application-services/application-manager';

// Track registered hooks by name to prevent duplicates
const registeredHooks = new Set<string>();

/**
 * Creates a cleanup hook registration function that can only be called once.
 * Subsequent calls are no-ops. This prevents duplicate cleanup when modules
 * are re-imported or when register functions are called multiple times.
 *
 * @param hookName - Unique identifier for this hook (for deduplication)
 * @param cleanupFn - Async function to run during cleanup
 * @returns A function that registers the cleanup hook (only once)
 *
 * @example
 * ```ts
 * export const registerMyCleanupHook = createCleanupHook('my-feature', async () => {
 *   await cleanupMyFeature();
 * });
 * ```
 */
export const createCleanupHook = (hookName: string, cleanupFn: () => Promise<void>): (() => void) => {
  return () => {
    if (registeredHooks.has(hookName)) return;
    registeredHooks.add(hookName);
    applicationManager.registerCleanUpHook(cleanupFn);
  };
};

/**
 * Check if a cleanup hook has been registered.
 * Useful for testing or debugging.
 */
export const isCleanupHookRegistered = (hookName: string): boolean => {
  return registeredHooks.has(hookName);
};

/**
 * Clear all registered hooks. Only use in tests.
 */
export const clearRegisteredHooks = (): void => {
  registeredHooks.clear();
};

/**
 * Extract stage from container name.
 * Container names are formatted as: stp-{stage}-{resourceName}
 */
const extractStageFromContainerName = (containerName: string): string | null => {
  // Container name format: stp-{stage}-{resourceName}
  // Stage can contain hyphens, so we need to be careful
  // We know it starts with "stp-" and ends with "-{resourceName}"
  // Resource names typically don't have hyphens in them
  const match = containerName.match(/^stp-(.+)-[^-]+$/);
  return match ? match[1] : null;
};

/**
 * Clean up truly orphaned Stacktape dev containers.
 * Only removes containers whose stage doesn't match any running dev agent.
 * Container naming: stp-{stage}-{resourceName}
 */
export const cleanupOrphanedContainers = async (): Promise<string[]> => {
  const { execDocker } = await import('@shared/utils/docker');
  const { getAllRunningAgents } = await import('./agent-daemon');

  try {
    // Get all running agents to know which stages are active
    const runningAgents = await getAllRunningAgents();
    const activeStages = new Set(runningAgents.map((agent) => agent.stage));

    // List all containers (running and stopped) with names starting with 'stp-'
    const result = await execDocker(['ps', '-a', '--filter', 'name=^stp-', '--format', '{{.Names}}'], {
      skipHandleError: true
    });

    const containerNames = result.stdout
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (containerNames.length === 0) {
      return [];
    }

    // Filter to only orphaned containers (stage not in activeStages)
    const orphanedContainers = containerNames.filter((name) => {
      const stage = extractStageFromContainerName(name);
      // If we can't parse the stage, or if the stage has no running agent, it's orphaned
      return !stage || !activeStages.has(stage);
    });

    if (orphanedContainers.length === 0) {
      return [];
    }

    const removedContainers: string[] = [];

    for (const name of orphanedContainers) {
      try {
        // Stop the container (if running)
        await execDocker(['stop', name], { skipHandleError: true });
      } catch {
        // Container might already be stopped
      }

      try {
        // Remove the container
        await execDocker(['rm', '-f', name], { skipHandleError: true });
        removedContainers.push(name);
      } catch {
        // Ignore removal errors
      }
    }

    return removedContainers;
  } catch {
    // Docker might not be running
    return [];
  }
};
