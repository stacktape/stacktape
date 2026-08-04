import type { StacktapeCliArgs } from 'src/config/cli/types';
import { globalStateManager } from '@application-services/global-state-manager';

/** Agent mode is enabled via --agent or --agentPort. */
export const isAgentMode = (capturedArgs?: Readonly<StacktapeCliArgs>): boolean => {
  const args = capturedArgs || (globalStateManager.args as StacktapeCliArgs);
  return !!(args?.agent || args?.agentPort !== undefined);
};

/**
 * Agent-specific behaviors beyond output format. The output mode itself
 * (--outputFormat, --agent implying jsonl) is resolved once by runCommand and
 * applied through tuiManager.init/setOutputFormat.
 */
export const initAgentMode = () => {
  if (isAgentMode()) {
    (globalStateManager.args as StacktapeCliArgs).autoConfirmOperation = true;
  }
};
