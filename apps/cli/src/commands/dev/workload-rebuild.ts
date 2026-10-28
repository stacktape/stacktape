import { statSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { CliError } from '@utils/errors';
import { updateAgentState, type RebuildResult, type StaleWorkload } from './agent-server';
import type { ConfigChange } from './config-change';
import { clearCredentialExpiryTimer } from './utils';

/**
 * A rebuild that failed for a reason other than the code or the configuration is tried once more: a dropped connection,
 * a failed AWS request (throttled, or the function still updating) or a failed write. Other failures Stacktape reports
 * itself (`CliError`: a build error, invalid configuration, a Docker build that failed) would fail the same way again.
 */
export const isRetryableRebuildError = (error: unknown) =>
  error instanceof Error && (!(error instanceof CliError) || error.category === 'AWS');

const modifiedAt = (file: string): number | undefined => {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
};

/**
 * The workloads besides `rebuilt` that use one of the rebuilt workloads' files changed after their own last build. A
 * shared package that one rebuild picked up leaves its other consumers on the old code; watch mode rebuilds them all,
 * a manual rebuild of one workload does not.
 */
export const findStaleWorkloads = ({
  rebuilt,
  sourceFiles,
  builtAt,
  getModifiedAt = modifiedAt
}: {
  rebuilt: string[];
  sourceFiles: Map<string, string[]>;
  /** When the last build of a workload that succeeded started. */
  builtAt: (name: string) => number;
  getModifiedAt?: (file: string) => number | undefined;
}): StaleWorkload[] => {
  const rebuiltFiles = new Set(rebuilt.flatMap((name) => sourceFiles.get(name) ?? []));
  if (!rebuiltFiles.size) return [];
  return [...sourceFiles].flatMap(([name, files]) => {
    if (rebuilt.includes(name)) return [];
    const since = builtAt(name);
    const changedFiles = files.filter((file) => rebuiltFiles.has(file) && (getModifiedAt(file) ?? 0) > since);
    return changedFiles.length ? [{ name, changedFiles }] : [];
  });
};

type WorkloadQueue = {
  /** The build that runs now. */
  running?: Promise<string | undefined>;
  /** The one build that waits for it; every request made meanwhile joins it, so it builds the latest files. */
  queued?: Promise<string | undefined>;
};

/**
 * Rebuilds workloads for every entry point: agent and MCP requests, the watcher and the TUI keys. Each workload has
 * one queue: a request that arrives while the workload builds waits for that build and then builds the current files,
 * and only the last build reports the workload's status. Without it, an older build that finished last reported
 * `running` over a newer failed one, and two builds of one function shared its artifact folder.
 *
 * A rebuild deploys code only. While the configuration file differs from the one the session started with, rebuilds
 * are refused; the refused workloads keep the status `error` and rebuild once the configuration matches again.
 */
export const createWorkloadRebuilder = ({
  rebuild,
  detectConfigChange,
  getSourceFiles = () => new Map(),
  getSessionStartedAt = () => 0,
  retryDelayMs = 3000
}: {
  rebuild: (name: string) => Promise<void>;
  detectConfigChange: () => Promise<ConfigChange>;
  /** The files each workload's last build read, to tell which workloads a rebuild left on older code. */
  getSourceFiles?: () => Map<string, string[]>;
  /** When the session's first builds started, the last build of a workload that this rebuilder never built. */
  getSessionStartedAt?: () => number;
  /** The wait before the second attempt: Lambda refuses a code update while the function is still updating. */
  retryDelayMs?: number;
}) => {
  const queues = new Map<string, WorkloadQueue>();
  const refused = new Set<string>();
  /** When the last successful build of each workload started. */
  const builtAt = new Map<string, number>();

  const checkConfig = async (): Promise<ConfigChange> => {
    const change = await detectConfigChange();
    updateAgentState({ restartRequired: change.changed ? change.reason : undefined });
    return change;
  };

  /** Builds `name` and reports its status, unless a newer build of it waits and will report instead. */
  const build = async (name: string, queue: WorkloadQueue): Promise<string | undefined> => {
    // The rebuild fetches fresh credentials and registers their expiry again.
    clearCredentialExpiryTimer(name);
    let error: string | undefined;
    for (let attempt = 1; ; attempt++) {
      const startedAt = Date.now();
      try {
        await rebuild(name);
        error = undefined;
        builtAt.set(name, startedAt);
        break;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        // A newer build waits: it builds the current files anyway, and its result is the one reported.
        if (attempt > 1 || !isRetryableRebuildError(err) || queue.queued) break;
        devTuiManager.log(name, `Rebuild failed (${error}); trying once more.`, 'warn');
        await delay(retryDelayMs);
        if (queue.queued) break;
      }
    }
    if (queue.queued) return error;
    if (error === undefined) {
      devTuiManager.setRebuildDone(name);
      devTuiManager.setWorkloadStatus(name, 'running', { error: undefined });
    } else {
      devTuiManager.setRebuildError(name, error);
      devTuiManager.setWorkloadStatus(name, 'error', { error });
      devTuiManager.log(name, `Rebuild failed: ${error}`, 'error');
    }
    return error;
  };

  const enqueue = (name: string): Promise<string | undefined> => {
    let queue = queues.get(name);
    if (!queue) {
      queue = {};
      queues.set(name, queue);
    }
    if (queue.queued) return queue.queued;
    const previous = queue.running;
    const next: Promise<string | undefined> = (previous ?? Promise.resolve(undefined))
      .catch(() => undefined)
      .then(async () => {
        queue.running = next;
        if (queue.queued === next) queue.queued = undefined;
        try {
          return await build(name, queue);
        } finally {
          if (queue.running === next) queue.running = undefined;
        }
      });
    if (previous) queue.queued = next;
    else queue.running = next;
    return next;
  };

  const rebuildWorkloads = async (requested: string[]): Promise<RebuildResult> => {
    // Not running from the moment of the request: the configuration check can take a moment.
    for (const name of requested) devTuiManager.setWorkloadStatus(name, 'starting');
    const configChange = await checkConfig();
    if (configChange.changed) {
      const error = `Not rebuilt: ${configChange.reason}`;
      for (const name of requested) {
        refused.add(name);
        devTuiManager.setWorkloadStatus(name, 'error', { error });
      }
      devTuiManager.systemLog(configChange.reason, 'warn');
      return { ok: false, code: 'CONFIG_CHANGED_RESTART_REQUIRED', message: configChange.reason };
    }

    // Workloads refused earlier still run outdated code; they rebuild with this request.
    const names = [...new Set([...requested, ...refused])];
    refused.clear();
    for (const name of names) devTuiManager.setWorkloadStatus(name, 'starting');
    devTuiManager.startRebuild(names);
    const errors = await Promise.all(names.map(enqueue));
    await devTuiManager.finishRebuild();

    const failedWorkloads = names.flatMap((name, index) =>
      errors[index] === undefined ? [] : [{ name, error: errors[index] }]
    );
    const staleWorkloads = findStaleWorkloads({
      rebuilt: names.filter((_, index) => errors[index] === undefined),
      sourceFiles: getSourceFiles(),
      builtAt: (name) => builtAt.get(name) ?? getSessionStartedAt()
    });
    const stale = staleWorkloads.length ? { staleWorkloads } : {};
    if (!failedWorkloads.length) return { ok: true, rebuilt: names, ...stale };
    return {
      ok: false,
      code: 'REBUILD_FAILED',
      message: failedWorkloads.map(({ name, error }) => `${name}: ${error}`).join('\n'),
      failedWorkloads,
      ...stale
    };
  };

  /**
   * The configuration file changed on disk. A change that a rebuild cannot apply waits for a restart; a configuration
   * that matches the start again rebuilds the workloads whose rebuild it refused.
   */
  const onConfigFileChange = async () => {
    const change = await checkConfig();
    if (change.changed) {
      devTuiManager.systemLog(change.reason, 'warn');
      return;
    }
    if (refused.size) await rebuildWorkloads([]);
  };

  /**
   * Rebuilds one workload of the session (`known`); `undefined` for a name the session does not run. A workload added
   * to the configuration after the start runs only after a restart, which the result says.
   */
  const rebuildWorkload = async (name: string, known: boolean): Promise<RebuildResult | undefined> => {
    if (known) return rebuildWorkloads([name]);
    const change = await checkConfig();
    if (!change.changed) return undefined;
    return {
      ok: false,
      code: 'CONFIG_CHANGED_RESTART_REQUIRED',
      message: `${name} is not part of this dev session. ${change.reason}`
    };
  };

  return { rebuildWorkloads, rebuildWorkload, onConfigFileChange };
};
