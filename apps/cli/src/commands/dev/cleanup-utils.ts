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
 * Name of a local container dev mode starts for a workload or database. The project and stage keep the sessions of two
 * projects apart when they use the same stage and resource names; without them, one project's session reused the
 * other's database container and stopped its workload containers.
 */
export const getDevContainerName = ({
  projectName,
  stage,
  name
}: {
  projectName: string;
  stage: string;
  name: string;
}): string => `stp-${projectName}-${stage}-${name}`;

/**
 * The `stp-` containers that belong to no running agent, by their current name or the legacy `stp-{stage}-{resource}`
 * one. Reading the stage back out of a name broke once names gained the project, so names are matched against agents.
 */
export const selectOrphanedDevContainers = (
  containerNames: string[],
  runningAgents: { projectName: string; stage: string }[]
): string[] =>
  containerNames.filter(
    (name) =>
      !runningAgents.some(
        ({ projectName, stage }) =>
          name.startsWith(`stp-${projectName}-${stage}-`) ||
          (name.startsWith(`stp-${stage}-`) && !name.slice(`stp-${stage}-`.length).includes('-'))
      )
  );

/**
 * Clean up truly orphaned Stacktape dev containers.
 * Only removes containers that belong to no running dev agent.
 */
export const cleanupOrphanedContainers = async (): Promise<string[]> => {
  const { execDocker } = await import('@utils/docker');
  const { getAllRunningAgents } = await import('./agent-daemon');

  try {
    const runningAgents = await getAllRunningAgents();

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

    const orphanedContainers = selectOrphanedDevContainers(containerNames, runningAgents);

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
