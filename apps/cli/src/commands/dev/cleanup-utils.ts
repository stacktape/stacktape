/**
 * Utility for creating once-only cleanup hook registrations.
 * Prevents duplicate registrations when modules are imported multiple times.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import type { AgentLockFile } from './agent-daemon';

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
 * other's database container and stopped its workload containers. A short hash of the working directory does the same
 * for two checkouts (Git worktrees) of one project on one stage, which have separate data directories.
 */
export const getDevContainerName = ({
  projectName,
  stage,
  workingDirectory,
  name
}: {
  projectName: string;
  stage: string;
  workingDirectory: string;
  name: string;
}): string => {
  const directoryHash = createHash('sha256').update(resolve(workingDirectory)).digest('hex').slice(0, 8);
  return `stp-${projectName}-${stage}-${directoryHash}-${name}`;
};

/**
 * Every dev session, terminal or agent, writes a lock file and labels the containers it starts with that lock file, its
 * process id and its stage. Cleanup reads the labels to tell a live session's containers from abandoned ones, and the
 * containers of this project directory and stage from those of others: the lock file lives in the project directory.
 */
const OWNER_LOCK_LABEL = 'stacktape.dev.lock';
const OWNER_PID_LABEL = 'stacktape.dev.pid';
const OWNER_STAGE_LABEL = 'stacktape.dev.stage';

let devSessionOwner: { lockFile: string; pid: number; stage: string } | undefined;

export const setDevSessionOwner = (owner: { lockFile: string; pid: number; stage: string }) => {
  devSessionOwner = owner;
};

/** `docker run` arguments that mark a container as owned by the current dev session. */
export const getDevContainerOwnerArgs = (): string[] =>
  devSessionOwner
    ? [
        '--label',
        `${OWNER_LOCK_LABEL}=${devSessionOwner.lockFile}`,
        '--label',
        `${OWNER_PID_LABEL}=${devSessionOwner.pid}`,
        '--label',
        `${OWNER_STAGE_LABEL}=${devSessionOwner.stage}`
      ]
    : [];

/** The same labels in the `--name value` form that `dockerRun`'s extra `dockerArgs` expect. */
export const getDevContainerOwnerDockerArgs = (): string[] => {
  const args = getDevContainerOwnerArgs();
  const pairs: string[] = [];
  for (let index = 0; index < args.length; index += 2) pairs.push(`${args[index]} ${args[index + 1]}`);
  return pairs;
};

export type DevContainer = { name: string; state: string; lockFile?: string; pid?: number; stage?: string };

/**
 * Whether a dev container was started in a project directory, and on a stage when one is given. Its lock-file label
 * names the directory. A container without labels comes from an older CLI and belongs to no known project.
 */
export const isDevContainerOfProject = (
  { lockFile, stage }: Pick<DevContainer, 'lockFile' | 'stage'>,
  scope: { lockDirectory: string; stage?: string },
  isSameDirectory: (a: string, b: string) => boolean
): boolean => {
  if (!lockFile || !isSameDirectory(dirname(lockFile), scope.lockDirectory)) return false;
  return !scope.stage || stage === scope.stage;
};

/**
 * The dev containers `dev stop --cleanup-containers` may remove: every stopped container, and a running one only when
 * its session is known to be gone (the process it is labeled with exited, and no live session holds its lock file).
 * A running container without owner labels comes from an older CLI; its session cannot be checked, so it stays.
 * `isInScope` limits the choice to one project's containers.
 */
export const selectRemovableDevContainers = (
  containers: DevContainer[],
  sessionIsAlive: (owner: { lockFile: string; pid: number }) => boolean,
  isInScope: (container: DevContainer) => boolean = () => true
): string[] =>
  containers
    .filter((container) => {
      if (!isInScope(container)) return false;
      const { state, lockFile, pid } = container;
      if (state !== 'running' && state !== 'restarting' && state !== 'paused') return true;
      if (!lockFile || !pid) return false;
      return !sessionIsAlive({ lockFile, pid });
    })
    .map(({ name }) => name);

/**
 * Whether the session that started a container still runs: its process does. r2rr: a lock file that was missing or
 * named another process counted as proof that the session had ended, and a refused second start had deleted the live
 * session's lock file, so cleanup removed its databases. A reused process ID keeps a container, which is the safe side.
 */
export const isDevSessionAlive = ({ pid }: { lockFile: string; pid: number }): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // Another user's process: it exists.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/**
 * The lock files that the containers name and a live session holds. A container's name and its lock file both follow
 * from the project, stage and directory, and a session uses the running containers of its stage there: review of #385,
 * a session restarted after `kill -9` took over the running PostgreSQL container, which keeps the dead session's
 * process ID in its labels, and cleanup removed the new session's database. Labels cannot change on a running container,
 * so the lock file at the label's path says who has it now.
 */
const findLiveLockFiles = async (containers: DevContainer[]): Promise<Set<string>> => {
  const { isLockOwnerAlive } = await import('./agent-daemon');
  const lockFiles = [...new Set(containers.flatMap(({ lockFile }) => (lockFile ? [lockFile] : [])))];
  const live = await Promise.all(
    lockFiles.map(async (lockFile) => {
      try {
        const lock = JSON.parse(readFileSync(lockFile, 'utf-8')) as AgentLockFile;
        return typeof lock?.pid === 'number' && (await isLockOwnerAlive(lock)) ? lockFile : undefined;
      } catch {
        return undefined;
      }
    })
  );
  return new Set(live.filter((lockFile): lockFile is string => lockFile !== undefined));
};

/**
 * Stop and remove the dev containers in scope that no live session owns, and return their names. `sessionIsAlive`
 * replaces the default check, which also counts a session that holds the container's lock file now.
 */
export const cleanupOrphanedContainers = async ({
  isInScope,
  sessionIsAlive
}: {
  isInScope?: (container: DevContainer) => boolean;
  sessionIsAlive?: (owner: { lockFile: string; pid: number }) => boolean;
} = {}): Promise<string[]> => {
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
        `{{.Names}}\t{{.State}}\t{{.Label "${OWNER_LOCK_LABEL}"}}\t{{.Label "${OWNER_PID_LABEL}"}}\t{{.Label "${OWNER_STAGE_LABEL}"}}`
      ],
      { skipHandleError: true }
    );

    const containers = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line): DevContainer => {
        const [name, state, lockFile, pid, stage] = line.split('\t');
        return {
          name,
          state,
          lockFile: lockFile || undefined,
          pid: Number(pid) || undefined,
          stage: stage || undefined
        };
      });

    const isAlive =
      sessionIsAlive ??
      (await findLiveLockFiles(containers).then(
        (liveLockFiles) => (owner: { lockFile: string; pid: number }) =>
          isDevSessionAlive(owner) || liveLockFiles.has(owner.lockFile)
      ));
    const orphanedContainers = selectRemovableDevContainers(containers, isAlive, isInScope);

    const removed = await Promise.all(
      orphanedContainers.map(async (name) => {
        try {
          // Stop a running database gracefully, so its data stays consistent.
          await execDocker(['stop', name], { skipHandleError: true });
        } catch {
          // Container might already be stopped
        }
        try {
          await execDocker(['rm', '-f', name], { skipHandleError: true });
          return name;
        } catch {
          return undefined;
        }
      })
    );
    return removed.filter((name): name is string => name !== undefined);
  } catch {
    // Docker might not be running
    return [];
  }
};

/**
 * The containers that an earlier session of this project directory and stage left running when it was killed
 * (`kill -9`, `taskkill /f`, a closed terminal), removed when the next session starts. That session holds the stage's
 * lock file, so only its own containers would carry it with a live process: a container whose lock-file label names
 * this file and whose process exited belongs to a session that is gone. Another stage, another project in the same
 * directory or another checkout has another lock file, and a container without owner labels (an older CLI) stays.
 * `keep` names the databases this session takes over as they run, which keep their data and port.
 */
export const removeContainersOfEndedSessions = async ({ keep }: { keep: ReadonlySet<string> }): Promise<string[]> => {
  const owner = devSessionOwner;
  if (!owner) return [];
  const { isSameDirectory } = await import('./agent-daemon');
  return cleanupOrphanedContainers({
    isInScope: ({ name, lockFile, pid }) =>
      !keep.has(name) && pid !== owner.pid && Boolean(lockFile) && isSameDirectory(lockFile!, owner.lockFile),
    sessionIsAlive: isDevSessionAlive
  });
};
