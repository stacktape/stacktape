import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { devTuiState } from 'src/app/tui-manager/dev/state';
import { CliError, getErrorHints, withHintLines } from '@utils/errors';
import { describeStaleRemoteImages, updateAgentState, type RebuildResult, type StaleWorkload } from './agent-server';
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
 * a manual rebuild of one workload does not. `candidates` are the workloads to check, by default those of
 * `sourceFiles`; the images of batch jobs, which run in AWS, are checked the same way.
 */
export const findStaleWorkloads = ({
  rebuilt,
  sourceFiles,
  candidates = sourceFiles,
  builtAt,
  getModifiedAt = modifiedAt
}: {
  rebuilt: string[];
  sourceFiles: Map<string, string[]>;
  candidates?: Map<string, string[]>;
  /** When the last build of a workload that succeeded started. */
  builtAt: (name: string) => number;
  getModifiedAt?: (file: string) => number | undefined;
}): StaleWorkload[] => {
  const rebuiltFiles = new Set(rebuilt.flatMap((name) => (sourceFiles.get(name) ?? []).map((file) => resolve(file))));
  if (!rebuiltFiles.size) return [];
  return [...candidates].flatMap(([name, files]) => {
    if (rebuilt.includes(name)) return [];
    const since = builtAt(name);
    const changedFiles = files.filter((file) => rebuiltFiles.has(resolve(file)) && (getModifiedAt(file) ?? 0) > since);
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
 * are refused; the refused workloads keep their status and previous build, the session reports the restart it needs, and
 * they rebuild once the configuration matches again.
 */
export const createWorkloadRebuilder = ({
  rebuild,
  detectConfigChange,
  getSourceFiles = () => new Map(),
  getRemoteImageInputs = () => new Map(),
  reloadsCodeItself = () => false,
  getSessionStartedAt = () => 0,
  retryDelayMs = 3000
}: {
  rebuild: (name: string) => Promise<void>;
  detectConfigChange: () => Promise<ConfigChange>;
  /** The files each workload's last build read, to tell which workloads a rebuild left on older code. */
  getSourceFiles?: () => Map<string, string[]>;
  /**
   * The files each image that the dev stack runs in AWS (a batch job's) was built from when the session started. No
   * rebuild builds them again: only a restart does.
   */
  getRemoteImageInputs?: () => Map<string, string[]>;
  /** Whether a workload's dev server loads changed code itself (a frontend's hot reload), so rebuild all skips it. */
  reloadsCodeItself?: (name: string) => boolean;
  /** When the session's first builds started, the last build of a workload that this rebuilder never built. */
  getSessionStartedAt?: () => number;
  /** The wait before the second attempt: Lambda refuses a code update while the function is still updating. */
  retryDelayMs?: number;
}) => {
  const queues = new Map<string, WorkloadQueue>();
  const refused = new Set<string>();
  /** When the last successful build of each workload started. */
  const builtAt = new Map<string, number>();
  /** How to fix the last failed build of each workload, when its error says. */
  const errorHints = new Map<string, string[]>();

  /** The configuration check that runs or ran last. */
  let lastConfigCheck: Promise<unknown> = Promise.resolve();
  /**
   * Checks run one at a time, in the order they were asked for. Each reads the file when it starts, so the last one
   * read the newest file and its answer is the one that stays. Run side by side, a slow check of an edited file (a
   * TypeScript configuration executes again) finished after the check of the restored file, and the session waited
   * for a restart that nothing cleared.
   */
  const checkConfig = (): Promise<ConfigChange> => {
    const check = lastConfigCheck.then(async () => {
      const change = await detectConfigChange();
      updateAgentState({ restartRequired: change.changed ? change.reason : undefined });
      return change;
    });
    lastConfigCheck = check.catch(() => undefined);
    return check;
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
        errorHints.delete(name);
        builtAt.set(name, startedAt);
        break;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        const hints = getErrorHints(err);
        if (hints) errorHints.set(name, hints);
        else errorHints.delete(name);
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
      const hints = errorHints.get(name);
      devTuiManager.setRebuildError(name, withHintLines(error, hints));
      devTuiManager.setWorkloadStatus(name, 'error', { error, hints });
      devTuiManager.log(name, withHintLines(`Rebuild failed: ${error}`, hints), 'error');
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
    // A refused rebuild leaves each workload as it was: its previous build keeps serving.
    const previous = new Map(
      devTuiState
        .getState()
        .workloads.filter(({ name }) => requested.includes(name))
        .map((workload) => [workload.name, workload])
    );
    // Not running from the moment of the request: the configuration check can take a moment.
    for (const name of requested) devTuiManager.setWorkloadStatus(name, 'starting');
    const configChange = await checkConfig();
    if (configChange.changed) {
      for (const name of requested) {
        refused.add(name);
        const { status = 'running', error } = previous.get(name) ?? {};
        devTuiManager.setWorkloadStatus(name, status, { error });
      }
      devTuiManager.systemLog(configChange.reason, 'warn');
      const serving = requested.length
        ? ` ${requested.join(', ')} still run${requested.length === 1 ? 's' : ''} the previous build.`
        : '';
      return { ok: false, code: 'CONFIG_CHANGED_RESTART_REQUIRED', message: `${configChange.reason}${serving}` };
    }

    // Workloads refused earlier still run outdated code; they rebuild with this request.
    const names = [...new Set([...requested, ...refused])];
    refused.clear();
    for (const name of names) devTuiManager.setWorkloadStatus(name, 'starting');
    devTuiManager.startRebuild(names);
    const errors = await Promise.all(names.map(enqueue));
    await devTuiManager.finishRebuild();

    const failedWorkloads = names.flatMap((name, index) => {
      if (errors[index] === undefined) return [];
      const hints = errorHints.get(name);
      return [{ name, error: errors[index], ...(hints ? { hints } : {}) }];
    });
    const staleWorkloads = findStaleWorkloads({
      rebuilt: names.filter((_, index) => errors[index] === undefined),
      sourceFiles: getSourceFiles(),
      builtAt: (name) => builtAt.get(name) ?? getSessionStartedAt()
    });
    // A batch job runs the image the start built and pushed; no rebuild changes it.
    const staleRemoteImages = findStaleWorkloads({
      rebuilt: names.filter((_, index) => errors[index] === undefined),
      sourceFiles: getSourceFiles(),
      candidates: getRemoteImageInputs(),
      builtAt: getSessionStartedAt
    });
    if (staleRemoteImages.length) devTuiManager.systemLog(describeStaleRemoteImages(staleRemoteImages), 'warn');
    const stale = {
      ...(staleWorkloads.length ? { staleWorkloads } : {}),
      ...(staleRemoteImages.length ? { staleRemoteImages } : {})
    };
    if (!failedWorkloads.length) return { ok: true, rebuilt: names, ...stale };
    return {
      ok: false,
      code: 'REBUILD_FAILED',
      message: failedWorkloads.map(({ name, error, hints }) => withHintLines(`${name}: ${error}`, hints)).join('\n'),
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

  /**
   * Rebuilds every workload of the session (`names`) except frontends whose dev server runs and loads changed code
   * itself: restarting it would only interrupt it. A frontend whose server failed restarts, and rebuilding a frontend by
   * name still restarts it.
   */
  const rebuildAllWorkloads = async (names: string[]): Promise<RebuildResult> => {
    const running = new Set(
      devTuiState
        .getState()
        .workloads.filter(({ status }) => status === 'running')
        .map(({ name }) => name)
    );
    const leftRunning = names.filter((name) => reloadsCodeItself(name) && running.has(name));
    const result = await rebuildWorkloads(names.filter((name) => !leftRunning.includes(name)));
    if (!leftRunning.length || !('rebuilt' in result || 'failedWorkloads' in result)) return result;
    return { ...result, leftRunning };
  };

  return { rebuildWorkloads, rebuildAllWorkloads, rebuildWorkload, onConfigFileChange };
};
