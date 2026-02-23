import type { OutputMode } from '@application-services/tui-manager/output-mode';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { setSpinnerAgentMode } from '@application-services/tui-manager/spinners';

/**
 * Check if agent mode is enabled via --agent flag.
 */
export const isAgentMode = (): boolean => {
  const args = globalStateManager.args as StacktapeCliArgs;
  return !!(args?.agent || args?.agentPort !== undefined);
};

/**
 * Resolve the effective output format from CLI args.
 * Priority: explicit --outputFormat > --agent (implies jsonl) > auto-detect.
 */
const resolveOutputFormatArg = (): OutputMode | undefined => {
  const args = globalStateManager.args as StacktapeCliArgs;
  if (args?.outputFormat) return args.outputFormat;
  if (isAgentMode()) return 'jsonl';
  return undefined;
};

/**
 * Initialize output mode and agent-specific settings.
 * Call this early in command initialization.
 * - Sets explicit output mode from --outputFormat or --agent
 * - In agent mode: auto-confirms operations, sets spinner agent mode
 */
export const initAgentMode = () => {
  const outputFormat = resolveOutputFormatArg();

  if (outputFormat) {
    tuiManager.setOutputFormat(outputFormat);
  }

  // Non-TTY spinner mode for jsonl and plain
  if (outputFormat === 'jsonl' || outputFormat === 'plain') {
    setSpinnerAgentMode(true);
  }

  // Agent-specific behaviors (beyond just output format)
  if (isAgentMode()) {
    (globalStateManager.args as StacktapeCliArgs).autoConfirmOperation = true;
  }
};
