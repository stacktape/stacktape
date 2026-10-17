import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import {
  CODING_AGENTS,
  getCodingAgent,
  type CodingAgent,
  type CodingAgentId
} from '@domain-services/coding-agent-setup/agents';
import { resolveServerCommand } from '@domain-services/coding-agent-setup/server-command';
import {
  findConfiguredAgents,
  removeCodingAgents,
  setUpCodingAgents,
  type AgentOutcome
} from '@domain-services/coding-agent-setup/setup';
import { CliError } from '@utils/errors';
import { homedir } from 'node:os';
import { isAgentMode } from '../_utils/agent-mode';

const tildify = (path: string) => {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
};

const canPrompt = () => !isAgentMode() && !globalStateManager.args.autoConfirmOperation && tuiManager.isTTY;

const requestedAgents = (): CodingAgent[] | undefined => {
  const requested = globalStateManager.args.codingAgents as CodingAgentId[] | undefined;
  return requested && requested.length > 0 ? requested.map(getCodingAgent) : undefined;
};

const CHANGE_LABELS = {
  created: 'added',
  updated: 'updated',
  unchanged: 'already set up',
  removed: 'removed',
  absent: 'not set up'
} as const;

const chooseAgents = async ({
  message,
  candidates,
  preselected
}: {
  message: string;
  candidates: Array<{ agent: CodingAgent; note: string }>;
  preselected: CodingAgentId[];
}): Promise<CodingAgent[]> => {
  tuiManager.start();
  try {
    const chosen = await tuiManager.promptMultiSelect({
      message,
      options: candidates.map(({ agent, note }) => ({ value: agent.id, label: agent.label, description: note })),
      defaultValues: preselected
    });
    return chosen.map((id) => getCodingAgent(id as CodingAgentId));
  } finally {
    await tuiManager.stop();
  }
};

type ProjectEntryOutcome = { label: string; location: string; removeCommand?: string };

// One file can be read by several agents (a project `.mcp.json`); it is reported once.
const groupByLocation = (entries: ProjectEntryOutcome[]) => {
  const groups = new Map<string, { location: string; removeCommand?: string; names: string[] }>();
  for (const entry of entries) {
    const group = groups.get(entry.location) ?? {
      location: entry.location,
      removeCommand: entry.removeCommand,
      names: []
    };
    group.names.push(entry.label);
    groups.set(entry.location, group);
  }
  return [...groups.values()].map(({ names, ...group }) => ({
    ...group,
    count: names.length,
    labels: names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  }));
};

const printOutcome = (outcome: AgentOutcome) => {
  if (!outcome.ok) {
    tuiManager.warn(`${outcome.label}: ${outcome.error}`);
    if (outcome.manualSetup) tuiManager.info(`  To set it up by hand: ${outcome.manualSetup}`);
    return;
  }
  const server = outcome.server!;
  tuiManager.info(`${outcome.label}: ${CHANGE_LABELS[server.change]} (${tildify(server.location)})`);
  if (server.backupPath) tuiManager.info(`  Previous file kept as ${tildify(server.backupPath)}`);
};

export const commandMcpAdd = async () => {
  const detected = new Map(CODING_AGENTS.map((agent) => [agent.id, agent.detect()]));
  const installedAgents = CODING_AGENTS.filter((agent) => detected.get(agent.id));

  let targets = requestedAgents();
  if (!targets && canPrompt()) {
    tuiManager.info(
      'Stacktape adds its MCP server to the agents you pick, for your user only. ' +
        'Agents can then deploy, read logs and metrics and look up Stacktape docs. They ask you before changing infrastructure.'
    );
    targets = await chooseAgents({
      message: 'Which coding agents should use Stacktape?',
      candidates: CODING_AGENTS.map((agent) => ({
        agent,
        note: detected.get(agent.id) ?? 'not found on this machine'
      })),
      preselected: installedAgents.map((agent) => agent.id)
    });
    if (targets.length === 0) {
      tuiManager.info('No agent selected. Nothing was changed.');
      return { result: { agents: [] } };
    }
  }
  targets ||= installedAgents;
  if (targets.length === 0) {
    const server = resolveServerCommand();
    throw new CliError({
      category: 'CLI',
      code: 'MCP_NO_CODING_AGENTS',
      message: 'No coding agent was found on this machine, so nothing was set up.',
      hints: [
        `Name the agents to set up, for example: stacktape mcp:add --codingAgents ${CODING_AGENTS.map((agent) => agent.id).join(',')}`,
        `Or add the server by hand, for example in Claude Code: ${getCodingAgent('claude-code')
          .manualSetup(server)
          .replace(/^Run: /, '')}`
      ]
    });
  }

  const result = await setUpCodingAgents({ agents: targets });
  result.agents.forEach(printOutcome);

  const { connectionCheck, serverCommand } = result;
  const commandLine = [serverCommand.command, ...serverCommand.args].join(' ');
  if (connectionCheck?.ok) {
    tuiManager.success(`\`${commandLine}\` starts and offers ${connectionCheck.toolCount} Stacktape tools.`);
  } else if (connectionCheck) {
    tuiManager.warn(`\`${commandLine}\` did not start as an MCP server: ${connectionCheck.reason}`);
    if (connectionCheck.stderrTail) tuiManager.warn(connectionCheck.stderrTail);
  }
  if (serverCommand.caveat) tuiManager.warn(serverCommand.caveat);
  for (const entry of groupByLocation(result.projectEntries)) {
    tuiManager.warn(
      `In this folder, ${entry.labels} ${entry.count > 1 ? 'use' : 'uses'} the Stacktape entry in ${tildify(entry.location)} instead of the one just set up. ` +
        (entry.removeCommand
          ? `Remove it with \`${entry.removeCommand}\`.`
          : 'Remove it there unless your team relies on it.')
    );
  }

  const configured = result.agents.filter((outcome) => outcome.ok);
  const failed = result.agents.length - configured.length;
  const checkFailed = connectionCheck !== undefined && !connectionCheck.ok;
  if (configured.length > 0 && !checkFailed) {
    const reloads = [...new Set(configured.map((outcome) => getCodingAgent(outcome.agent).reloadHint))];
    tuiManager.success(
      `Ready. ${reloads.map((hint) => hint[0].toUpperCase() + hint.slice(1)).join('. ')}. ` +
        'Then ask your agent: "Use Stacktape to show what this project deploys."'
    );
  }
  if (failed > 0 || checkFailed) {
    throw new CliError({
      category: 'CLI',
      code: checkFailed ? 'MCP_SERVER_CHECK_FAILED' : 'MCP_AGENT_SETUP_FAILED',
      message:
        failed > 0
          ? `Stacktape could not be set up for ${failed} of ${result.agents.length} agents.`
          : 'The agents are configured, but the Stacktape MCP server did not start with the configured command.',
      hints: ['The details are printed above. Fix the cause and run `stacktape mcp:add` again; it is safe to repeat.']
    });
  }

  return { result };
};

export const commandMcpRemove = async () => {
  const configuredAgents = await findConfiguredAgents();

  let targets = requestedAgents();
  if (!targets && canPrompt() && configuredAgents.length > 0) {
    targets = await chooseAgents({
      message: 'Remove Stacktape from which coding agents?',
      candidates: configuredAgents.map((agent) => ({ agent, note: 'Stacktape is set up' })),
      preselected: configuredAgents.map((agent) => agent.id)
    });
  }
  targets ||= configuredAgents;

  const result = await removeCodingAgents({ agents: targets });
  result.agents.forEach(printOutcome);
  for (const entry of groupByLocation(result.projectEntries)) {
    tuiManager.info(
      entry.removeCommand
        ? `${entry.labels} still has a Stacktape entry in ${entry.location}. Remove it with \`${entry.removeCommand}\`.`
        : `${tildify(entry.location)} still has a Stacktape entry, read by ${entry.labels}. It is shared with your team, so it was left as is.`
    );
  }
  if (result.agents.length === 0) {
    tuiManager.info(
      result.projectEntries.length > 0
        ? 'No agent has a user-level Stacktape entry. Nothing was changed.'
        : 'Stacktape is not set up in any coding agent. Nothing was changed.'
    );
  }

  const failed = result.agents.filter((outcome) => !outcome.ok).length;
  if (failed > 0) {
    throw new CliError({
      category: 'CLI',
      code: 'MCP_AGENT_REMOVE_FAILED',
      message: `Stacktape could not be removed from ${failed} of ${result.agents.length} agents.`,
      hints: ['The details are printed above.']
    });
  }
  return { result };
};
