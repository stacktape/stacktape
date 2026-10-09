/**
 * Utility for creating once-only cleanup hook registrations.
 * Prevents duplicate registrations when modules are imported multiple times.
 */
import { readFileSync } from 'node:fs';
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
 * Every dev session, terminal or agent, writes a lock file and labels the containers it starts with that lock file and
 * its process id. Cleanup reads the labels to tell a live session's containers from abandoned ones.
 */
const OWNER_LOCK_LABEL = 'stacktape.dev.lock';
const OWNER_PID_LABEL = 'stacktape.dev.pid';

let devSessionOwner: { lockFile: string; pid: number } | undefined;

export const setDevSessionOwner = (owner: { lockFile: string; pid: number }) => {
  devSessionOwner = owner;
};

/** `docker run` arguments that mark a container as owned by the current dev session. */
export const getDevContainerOwnerArgs = (): string[] =>
  devSessionOwner
    ? [
        '--label',
        `${OWNER_LOCK_LABEL}=${devSessionOwner.lockFile}`,
        '--label',
        `${OWNER_PID_LABEL}=${devSessionOwner.pid}`
      ]
    : [];

/** The same labels in the `--name value` form that `dockerRun`'s extra `dockerArgs` expect. */
export const getDevContainerOwnerDockerArgs = (): string[] => {
  const args = getDevContainerOwnerArgs();
  return args.length ? [`${args[0]} ${args[1]}`, `${args[2]} ${args[3]}`] : [];
};

type DevContainer = { name: string; state: string; lockFile?: string; pid?: number };

/**
 * The dev containers `dev:stop --cleanupContainers` may remove: every stopped container, and a running one only when
 * its session is known to be gone (its lock file is missing or no longer names its process, or that process exited).
 * A running container without owner labels comes from an older CLI; its session cannot be checked, so it stays.
 */
export const selectRemovableDevContainers = (
  containers: DevContainer[],
  sessionIsAlive: (owner: { lockFile: string; pid: number }) => boolean
): string[] =>
  containers
    .filter(({ state, lockFile, pid }) => {
      if (state !== 'running' && state !== 'restarting' && state !== 'paused') return true;
      if (!lockFile || !pid) return false;
      return !sessionIsAlive({ lockFile, pid });
    })
    .map(({ name }) => name);

const isDevSessionAlive = ({ lockFile, pid }: { lockFile: string; pid: number }): boolean => {
  try {
    const lock = JSON.parse(readFileSync(lockFile, 'utf-8')) as { pid?: unknown };
    if (lock.pid !== pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Stop and remove the dev containers no live session owns. */
export const cleanupOrphanedContainers = async (): Promise<string[]> => {
  const { execDocker } = await import('@utils/docker');

  try {
    // List all containers (running and stopped) with names starting with 'stp-'
    const result = await execDocker(
      [
        'ps',
        '-a',
        '--filter',
        'name=^stp-',
        '--format',
        `{{.Names}}\t{{.State}}\t{{.Label "${OWNER_LOCK_LABEL}"}}\t{{.Label "${OWNER_PID_LABEL}"}}`
      ],
      { skipHandleError: true }
    );

    const containers = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line): DevContainer => {
        const [name, state, lockFile, pid] = line.split('\t');
        return { name, state, lockFile: lockFile || undefined, pid: Number(pid) || undefined };
      });

    const orphanedContainers = selectRemovableDevContainers(containers, isDevSessionAlive);

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
