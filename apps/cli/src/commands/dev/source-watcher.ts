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

const absolute = (filePath: string) => (isAbsolute(filePath) ? filePath : resolve(filePath));

/**
 * Watches workload sources and the configuration file for `dev --watch`. It resolves once every file is watched, so dev
 * mode reports ready only when an edit can no longer be missed. An edit that arrives while its workload rebuilds
 * queues one more rebuild instead of being lost.
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
  await new Promise<void>((ready) => watcher.once('ready', () => ready()));

  // A rebuild can add or drop source files: watch the new set without unwatching the files that stay.
  const syncWatchedFiles = () => {
    const next = new Set([...mapFiles(), ...(configFile ? [configFile] : [])]);
    const removed = [...watchedFiles].filter((file) => !next.has(file));
    const added = [...next].filter((file) => !watchedFiles.has(file));
    if (removed.length) watcher.unwatch(removed);
    if (added.length) watcher.add(added);
    watchedFiles = next;
  };

  const running = new Map<string, Promise<void>>();
  const queued = new Map<string, string>();
  const run = (key: string, changedFile: string, task: (changedFile: string) => Promise<void>) => {
    if (running.has(key)) {
      queued.set(key, changedFile);
      return;
    }
    const loop = (async () => {
      let file: string | undefined = changedFile;
      while (file !== undefined) {
        queued.delete(key);
        await task(file).catch(() => {});
        file = queued.get(key);
      }
    })().finally(() => running.delete(key));
    running.set(key, loop);
  };

  watcher.on('change', (changedPath: string) => {
    const changedFile = absolute(changedPath);
    if (changedFile === configFile) {
      run('\0config', changedFile, () => onConfigChange());
      return;
    }
    const workloads = fileToWorkloads.get(changedFile);
    if (!workloads) {
      onUnmatchedChange?.(changedFile);
      return;
    }
    run(workloads.join('\0'), changedFile, async (file) => {
      await onWorkloadChange({ workloads, changedFile: file });
      syncWatchedFiles();
    });
  });

  return {
    /** Resolves once every rebuild that a change started, including queued ones, has finished. */
    settled: async () => {
      while (running.size) await Promise.all(running.values());
    },
    close: () => watcher.close()
  };
};
