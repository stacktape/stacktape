import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { setSpinnerAgentMode } from '@application-services/tui-manager/spinners';

/**
 * Check if agent mode is enabled via --agent flag.
 */
export const isAgentMode = (): boolean => {
  return !!(globalStateManager.args as StacktapeCliArgs)?.agent;
};

/**
 * Initialize agent mode settings.
 * Call this early in command initialization to set up non-TTY output.
 * - Forces non-TTY mode on TUI manager (no spinners, animations)
 * - Sets spinner agent mode for plain text output
 */
export const initAgentMode = () => {
  if (isAgentMode()) {
    tuiManager.setAgentMode(true);
    setSpinnerAgentMode(true);
  }
};
