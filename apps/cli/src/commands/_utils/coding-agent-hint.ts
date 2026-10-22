import { tuiManager } from '@application-services/tui-manager';
import { CODING_AGENTS } from '@domain-services/coding-agent-setup/agents';
import { findConfiguredAgents } from '@domain-services/coding-agent-setup/setup';

/**
 * After a stack's first deploy, one line for people who use a coding agent that does not know Stacktape yet. A hint
 * rather than a question: the deploy is done and there is nothing to decide now.
 */
export const hintCodingAgentSetupAfterFirstDeploy = async (): Promise<void> => {
  if (!process.stdout.isTTY) return;
  const installed = CODING_AGENTS.filter((agent) => agent.detect());
  if (installed.length === 0 || (await findConfiguredAgents()).length > 0) return;
  tuiManager.hint(
    `Let ${installed[0].label}${installed.length > 1 ? ' and your other coding agents' : ''} deploy and debug this project with Stacktape: stacktape mcp add`
  );
};
