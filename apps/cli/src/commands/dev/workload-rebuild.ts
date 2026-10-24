import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { updateAgentState, type RebuildResult } from './agent-server';
import type { ConfigChange } from './config-change';
import { clearCredentialExpiryTimer } from './utils';

/** Records whether the configuration changed; dev mode is not ready while it waits for a restart. */
export const checkConfigUnchanged = async (detectConfigChange?: () => Promise<ConfigChange>): Promise<ConfigChange> => {
  const change = (await detectConfigChange?.()) ?? { changed: false };
  updateAgentState({ restartRequired: change.changed ? change.reason : undefined });
  return change;
};

/**
 * Rebuilds workloads and reports what happened. A workload whose rebuild fails keeps the status `error` until a
 * rebuild succeeds: its previous code may still serve, and tests must not pass against it. A changed configuration
 * refuses the rebuild, because a rebuild deploys code only.
 */
export const rebuildWorkloads = async ({
  names,
  rebuild,
  detectConfigChange
}: {
  names: string[];
  rebuild: (name: string) => Promise<void>;
  detectConfigChange?: () => Promise<ConfigChange>;
}): Promise<RebuildResult> => {
  const configChange = await checkConfigUnchanged(detectConfigChange);
  if (configChange.changed) {
    devTuiManager.systemLog(configChange.reason, 'warn');
    return { ok: false, code: 'CONFIG_CHANGED_RESTART_REQUIRED', message: configChange.reason };
  }

  for (const name of names) {
    // The rebuild fetches fresh credentials and registers their expiry again.
    clearCredentialExpiryTimer(name);
    devTuiManager.setWorkloadStatus(name, 'starting');
  }
  devTuiManager.startRebuild(names);

  const failedWorkloads: { name: string; error: string }[] = [];
  await Promise.all(
    names.map(async (name) => {
      try {
        await rebuild(name);
        devTuiManager.setRebuildDone(name);
        devTuiManager.setWorkloadStatus(name, 'running', { error: undefined });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        failedWorkloads.push({ name, error });
        devTuiManager.setRebuildError(name, error);
        devTuiManager.setWorkloadStatus(name, 'error', { error });
        devTuiManager.log(name, `Rebuild failed: ${error}`, 'error');
      }
    })
  );
  await devTuiManager.finishRebuild();

  if (!failedWorkloads.length) return { ok: true, rebuilt: names };
  return {
    ok: false,
    code: 'REBUILD_FAILED',
    message: failedWorkloads.map(({ name, error }) => `${name}: ${error}`).join('\n'),
    failedWorkloads
  };
};
