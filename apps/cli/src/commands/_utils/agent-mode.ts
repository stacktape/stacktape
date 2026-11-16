import type { StacktapeCliArgs } from 'src/config/cli/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';

/**
 * Agent mode is enabled via --agent or --agentPort. It selects machine-readable output and no interaction; it never
 * confirms an operation. Operations that need confirmation still need --yes.
 */
export const isAgentMode = (capturedArgs?: Readonly<StacktapeCliArgs>): boolean => {
  const args = capturedArgs || (globalStateManager.args as StacktapeCliArgs);
  return !!(args?.agent || args?.agentPort !== undefined);
};

/**
 * Whether the command may ask the person running it to confirm. Agent mode, machine output, and a stdout or stdin that is
 * not a terminal cannot answer a prompt: an operation that needs confirmation fails there with CONFIRMATION_REQUIRED unless
 * --yes was given.
 */
export const canAskForConfirmation = (): boolean =>
  !isAgentMode() && tuiManager.isTTY && !!process.stdout.isTTY && !!process.stdin.isTTY;
