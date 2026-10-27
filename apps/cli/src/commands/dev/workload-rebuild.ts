import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { CliError } from '@utils/errors';
import { updateAgentState, type RebuildResult } from './agent-server';
import type { ConfigChange } from './config-change';
import { clearCredentialExpiryTimer } from './utils';

/**
 * A rebuild that failed for a reason other than the code or the configuration is tried once more: a dropped connection,
 * a failed AWS request (throttled, or the function still updating) or a failed write. Other failures Stacktape reports
 * itself (`CliError`: a build error, invalid configuration, a Docker build that failed) would fail the same way again.
 */
export const isRetryableRebuildError = (error: unknown) =>
  error instanceof Error && (!(error instanceof CliError) || error.category === 'AWS');

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
  detectConfigChange
}: {
  rebuild: (name: string) => Promise<void>;
  detectConfigChange: () => Promise<ConfigChange>;
}) => {
  const queues = new Map<string, WorkloadQueue>();
  const refused = new Set<string>();

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
      try {
        await rebuild(name);
        error = undefined;
        break;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        if (attempt > 1 || !isRetryableRebuildError(err)) break;
        devTuiManager.log(name, `Rebuild failed (${error}); trying once more.`, 'warn');
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
    if (!failedWorkloads.length) return { ok: true, rebuilt: names };
    return {
      ok: false,
      code: 'REBUILD_FAILED',
      message: failedWorkloads.map(({ name, error }) => `${name}: ${error}`).join('\n'),
      failedWorkloads
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

  return { rebuildWorkloads, onConfigFileChange };
};
