import {
  CODING_AGENTS,
  findProjectEntries,
  type AgentChange,
  type CodingAgent,
  type CodingAgentId,
  type ProjectEntry
} from './agents';
import { resolveServerCommand, type ResolvedServerCommand } from './server-command';
import { verifyMcpServerCommand, type ConnectionCheck } from './verify-connection';

export type AgentOutcome = {
  agent: CodingAgentId;
  label: string;
  ok: boolean;
  server?: AgentChange;
  error?: string;
  /** How to do it by hand when it failed. */
  manualSetup?: string;
};

const toProjectEntryOutcome = ({ agent, ...entry }: ProjectEntry) => ({
  agent: agent.id,
  label: agent.label,
  ...entry
});

export type AgentSetupResult = {
  agents: AgentOutcome[];
  serverCommand: ResolvedServerCommand;
  /** Absent when no agent was configured, so there was nothing to check. */
  connectionCheck?: ConnectionCheck;
  /** Project files with their own Stacktape entry, which those agents use instead in this project. */
  projectEntries: Array<{
    agent: CodingAgentId;
    label: string;
    location: string;
    shared: boolean;
    removeCommand?: string;
  }>;
};

/**
 * Adds the Stacktape MCP server to each agent, then starts the configured command once to prove it serves
 * the tools. Each agent is independent: one failing leaves the others configured.
 */
export const setUpCodingAgents = async ({
  agents,
  cwd = process.cwd()
}: {
  agents: CodingAgent[];
  cwd?: string;
}): Promise<AgentSetupResult> => {
  const serverCommand = resolveServerCommand();
  const outcomes: AgentOutcome[] = [];

  for (const agent of agents) {
    try {
      const server = await agent.install(serverCommand);
      outcomes.push({ agent: agent.id, label: agent.label, ok: true, server });
    } catch (error) {
      outcomes.push({
        agent: agent.id,
        label: agent.label,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        manualSetup: agent.manualSetup(serverCommand)
      });
    }
  }

  const configured = new Set(outcomes.filter((outcome) => outcome.ok).map((outcome) => outcome.agent));
  const connectionCheck = configured.size > 0 ? await verifyMcpServerCommand(serverCommand) : undefined;
  const projectEntries = (await findProjectEntries(cwd))
    .filter(({ agent }) => configured.has(agent.id))
    .map(toProjectEntryOutcome);

  return { agents: outcomes, serverCommand, connectionCheck, projectEntries };
};

export const findConfiguredAgents = async (): Promise<CodingAgent[]> => {
  const configured: CodingAgent[] = [];
  for (const agent of CODING_AGENTS) {
    // A config that cannot be read counts as configured, so it is offered for removal and reports its own error.
    if (await agent.isConfigured().catch(() => true)) configured.push(agent);
  }
  return configured;
};

export const removeCodingAgents = async ({ agents, cwd = process.cwd() }: { agents: CodingAgent[]; cwd?: string }) => {
  const outcomes: AgentOutcome[] = [];
  for (const agent of agents) {
    try {
      outcomes.push({ agent: agent.id, label: agent.label, ok: true, server: await agent.remove() });
    } catch (error) {
      outcomes.push({
        agent: agent.id,
        label: agent.label,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const projectEntries = await findProjectEntries(cwd);
  return { agents: outcomes, projectEntries: projectEntries.map(toProjectEntryOutcome) };
};
