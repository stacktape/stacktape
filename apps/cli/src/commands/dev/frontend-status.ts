import type { LogLevel } from './agent-logger';
import type { DevServerState } from './dev-server';
import { tuiManager } from '@application-services/tui-manager';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { formatDevServerStatus } from './dev-server';

/**
 * Reports a frontend dev server's state as its workload status and its output as the workload's log. The workload
 * fails only when its server does not run; an error the running server printed (a failed request, a failed compile)
 * is already in the log at level error and stays apart from the status, as `requestError`.
 */
export const createFrontendStatusReporter = (name: string) => {
  const useDevTui = devTuiManager.running;
  let reported: DevServerState | undefined;

  const onStateChange = (state: DevServerState) => {
    const previous = reported;
    reported = state;
    const status = formatDevServerStatus(state);
    const inRebuildPhase = devTuiManager.inRebuildPhase;

    if (state.status === 'ready') {
      const sizeInfo = state.lastCompileTime ? `ready in ${state.lastCompileTime}` : undefined;
      // Only the request error changed: the server served all along, and what it printed is in the log already.
      const requestOnly =
        previous?.status === 'ready' &&
        previous.url === state.url &&
        previous.lastCompileTime === state.lastCompileTime;
      if (inRebuildPhase && !requestOnly) {
        // During its rebuild, the rebuild UI shows the size; the rebuild sets the status once it finished.
        if (sizeInfo) devTuiManager.setRebuildSize(name, sizeInfo);
      } else if (useDevTui) {
        devTuiManager.setWorkloadStatus(name, 'running', {
          url: state.url,
          size: sizeInfo,
          error: undefined,
          requestError: state.requestError
        });
        if (!requestOnly) devTuiManager.log(name, status);
      } else if (!requestOnly) {
        tuiManager.info(`[${name}] ${status}`);
      }
    } else if (state.status === 'error') {
      // A server can fail at any time, also while another workload rebuilds: its status says so either way.
      if (inRebuildPhase) devTuiManager.setRebuildError(name, state.error || 'Build failed');
      if (useDevTui) {
        devTuiManager.setWorkloadStatus(name, 'error', { error: state.error });
        devTuiManager.log(name, status, 'error');
      } else {
        tuiManager.error(`[${name}] ${status}`);
      }
    }
  };

  const onOutput = (message: string, level: LogLevel) => {
    if (devTuiManager.inRebuildPhase) devTuiManager.bufferRebuildLog(name, message, level);
    else if (useDevTui) devTuiManager.log(name, message, level);
    else tuiManager.info(`[${name}] ${message}`);
  };

  return { onStateChange, onOutput };
};
