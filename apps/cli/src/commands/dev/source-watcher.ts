import chokidar from 'chokidar';
import { isAbsolute, resolve } from 'node:path';

type SourceWatcherOptions = {
  /** Each workload's source files; read again after every rebuild, because a rebuild can change them. */
  getSourceFiles: () => Map<string, string[]>;
  /** The configuration file: an edit to it is reported to `onConfigChange`, not rebuilt. */
  configPath?: string;
  /** Rebuilds the workloads built from the changed file; several functions can share one entry file. */
  onWorkloadChange: (props: { workloads: string[]; changedFile: string }) => Promise<void>;
  onConfigChange: () => Promise<void>;
  onUnmatchedChange?: (changedFile: string) => void;
};

const CHANGE_QUIET_MS = 100;

const absolute = (filePath: string) => (isAbsolute(filePath) ? filePath : resolve(filePath));

/**
 * Watches workload sources and the configuration file for `dev --watch`. It resolves once every file is watched, so dev
 * mode reports ready only when an edit can no longer be missed. Each change is handed on at once: the rebuilder queues
 * a change that arrives while its workload builds, so the last build always reads the latest files.
 */
export const startSourceWatcher = async ({
  getSourceFiles,
  configPath,
  onWorkloadChange,
  onConfigChange,
  onUnmatchedChange
}: SourceWatcherOptions) => {
  const fileToWorkloads = new Map<string, string[]>();
  const mapFiles = () => {
    fileToWorkloads.clear();
    for (const [workload, files] of getSourceFiles()) {
      for (const file of files) {
        const path = absolute(file);
        fileToWorkloads.set(path, [...(fileToWorkloads.get(path) ?? []), workload]);
      }
    }
    return [...fileToWorkloads.keys()];
  };
  const configFile = configPath ? absolute(configPath) : undefined;
  let watchedFiles = new Set([...mapFiles(), ...(configFile ? [configFile] : [])]);
  const watcher = chokidar.watch([...watchedFiles], { persistent: true, ignoreInitial: true });
  // chokidar emits `ready` only once it scanned at least one path.
  if (watchedFiles.size) await new Promise<void>((ready) => watcher.once('ready', () => ready()));

  // A rebuild can add or drop source files: watch the new set without unwatching the files that stay.
  const syncWatchedFiles = () => {
    const next = new Set([...mapFiles(), ...(configFile ? [configFile] : [])]);
    const removed = [...watchedFiles].filter((file) => !next.has(file));
    const added = [...next].filter((file) => !watchedFiles.has(file));
    if (removed.length) watcher.unwatch(removed);
    if (added.length) watcher.add(added);
    watchedFiles = next;
  };

  const inFlight = new Set<Promise<void>>();
  const quietTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // chokidar reports writes to one file that follow within about 50 ms as one change, sometimes at the first write. A
  // change is handed on after a short quiet period, so the build it starts reads the last write of a burst.
  const handOn = (key: string, task: () => Promise<void>) => {
    clearTimeout(quietTimers.get(key));
    quietTimers.set(
      key,
      setTimeout(() => {
        quietTimers.delete(key);
        const tracked: Promise<void> = task()
          .catch(() => {})
          .finally(() => inFlight.delete(tracked));
        inFlight.add(tracked);
      }, CHANGE_QUIET_MS)
    );
  };

  watcher.on('change', (changedPath: string) => {
    const changedFile = absolute(changedPath);
    if (changedFile === configFile) {
      handOn('\0config', onConfigChange);
      return;
    }
    const workloads = fileToWorkloads.get(changedFile);
    if (!workloads) {
      onUnmatchedChange?.(changedFile);
      return;
    }
    handOn(workloads.join('\0'), () => onWorkloadChange({ workloads, changedFile }).then(syncWatchedFiles));
  });

  return {
    /** Resolves once the handling of every change so far has finished. */
    settled: async () => {
      while (inFlight.size || quietTimers.size) {
        await Promise.all(inFlight);
        if (quietTimers.size) await new Promise((resolve) => setTimeout(resolve, CHANGE_QUIET_MS));
      }
    },
    close: async () => {
      for (const timer of quietTimers.values()) clearTimeout(timer);
      await watcher.close();
    }
  };
};
