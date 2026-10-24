import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { localStatePaths } from 'src/config/local-state-paths';
import {
  type AgentLockFile,
  discoverDevAgents,
  getAllRunningAgents,
  isSameDirectory,
  requestDevAgent,
  stopRunningAgent
} from '../dev/agent-daemon';
import { cleanupOrphanedContainers } from '../dev/cleanup-utils';

type StoppedAgent = { port: number; projectName: string; stage: string };

const describeAgent = ({ projectName, stage, port }: { projectName?: string; stage?: string; port: number }) =>
  `${projectName || 'unknown project'}/${stage || 'unknown stage'} on port ${port}`;

/**
 * Stop running dev agent(s).
 * This is a lightweight command that doesn't require full initialization.
 *
 * Without `--agent-port`, it stops the agent of this project directory (`--cwd`) and, with `--stage`, of that stage.
 * An agent of another directory is never stopped by a guess: when several agents match, nothing is stopped and the
 * command fails with the list.
 */
export const commandDevStop = async (): Promise<{ stopped: StoppedAgent[] }> => {
  const { agentPort: agentPortArg, cleanupContainers: shouldCleanupContainers } = globalStateManager.args;
  // Only a stage given on this command line narrows the choice; a saved default stage must not hide other stages.
  const { stage } = globalStateManager.explicitArgs;

  // Handle --cleanupContainers flag
  if (shouldCleanupContainers) {
    tuiManager.info('Cleaning up orphaned Stacktape dev containers...');
    const cleaned = await cleanupOrphanedContainers();
    if (cleaned.length > 0) {
      tuiManager.success(`Removed ${cleaned.length} container(s): ${cleaned.join(', ')}`);
    } else {
      tuiManager.info('No orphaned containers found.');
    }
    // If only cleanup was requested (no agent stop), we're done
    if (!agentPortArg && !stage) {
      const allAgents = await getAllRunningAgents();
      if (allAgents.length === 0) {
        return { stopped: [] };
      }
    }
  }

  const stop = async (agent: AgentLockFile): Promise<StoppedAgent> => {
    tuiManager.info(`Stopping dev agent ${describeAgent(agent)}...`);
    if (!(await stopRunningAgent(agent))) {
      throw new CliError({
        category: 'CLI',
        code: 'CLI_DEV_STOP_FAILED',
        message: `Failed to stop the dev agent ${describeAgent(agent)}.`,
        hints: `Stop process ${agent.pid} yourself if it is still running.`
      });
    }
    tuiManager.success('Dev agent stopped.');
    return { port: agent.port, projectName: agent.projectName, stage: agent.stage };
  };

  // If --agentPort specified, stop that specific agent
  if (agentPortArg) {
    return { stopped: [await stop(await findAgentOnPort(agentPortArg))] };
  }

  const projectDirectory = globalStateManager.workingDir;
  const matchesStage = (agentStage?: string) => !stage || agentStage === stage;

  // The agents of this directory record themselves in its lock files.
  const fromLockFiles = (await getAllRunningAgents()).filter((agent) => matchesStage(agent.stage));
  // An agent whose lock file is gone still reports its project directory.
  const discovered = await discoverDevAgents();
  const candidates: AgentLockFile[] = fromLockFiles.length
    ? fromLockFiles
    : discovered
        .filter(
          (agent) =>
            agent.projectDirectory &&
            isSameDirectory(agent.projectDirectory, projectDirectory) &&
            matchesStage(agent.stage)
        )
        .map((agent) => ({
          pid: agent.pid,
          port: agent.port,
          phase: 'ready',
          projectName: agent.projectName || 'unknown',
          stage: agent.stage || 'unknown',
          region: agent.region || 'unknown',
          startedAt: '',
          workloads: [],
          databases: []
        }));

  if (candidates.length > 1) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_STOP_AMBIGUOUS',
      message: `Several dev agents run for ${projectDirectory}${stage ? ` and stage ${stage}` : ''}; none was stopped:\n${candidates
        .map((agent) => `  - ${describeAgent(agent)}`)
        .join('\n')}`,
      hints: 'Choose one with `--stage <stage>` or `--agent-port <port>`.'
    });
  }

  if (candidates.length === 1) {
    return { stopped: [await stop(candidates[0])] };
  }

  const elsewhere = discovered.filter(
    (agent) => !agent.projectDirectory || !isSameDirectory(agent.projectDirectory, projectDirectory)
  );
  tuiManager.info(`No running dev agent found for ${projectDirectory}${stage ? ` and stage ${stage}` : ''}.`);
  if (elsewhere.length) {
    tuiManager.info('Dev agents of other directories (not stopped):');
    for (const agent of elsewhere) {
      tuiManager.info(`  - ${describeAgent(agent)}${agent.projectDirectory ? ` in ${agent.projectDirectory}` : ''}`);
    }
    tuiManager.info('Stop one with `dev stop --cwd <directory>` or `dev stop --agent-port <port>`.');
  }
  return { stopped: [] };
};

/** The agent on an explicitly given port, from this directory's lock files or from the agent itself. */
const findAgentOnPort = async (port: number): Promise<AgentLockFile> => {
  // A lock file names the agent's project and stage, so stopping through it also removes that file.
  const lockFileAgent = (await getAllRunningAgents()).find((agent) => agent.port === port);
  if (lockFileAgent) return lockFileAgent;
  // Lock files live in the directory dev mode was started in, but every agent's token is in the user's state
  // directory under its port, so the agent can be stopped from any directory.
  let response: Response;
  try {
    response = await requestDevAgent({ port }, '/status', { timeoutMs: 2000 });
  } catch {
    response = new Response(null, { status: 404 });
  }
  if (response.status === 401) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_STOP_REFUSED',
      message:
        `The process on port ${port} refused the dev agent session token in ` +
        `${localStatePaths.devAgentTokenFile({ port })}. It is not a dev agent started by this user, or the ` +
        'file belongs to an earlier session.'
    });
  }
  if (!response.ok) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_AGENT_NOT_FOUND',
      message: `No dev agent found on port ${port}.`,
      hints: 'Run `stacktape dev stop` without `--agent-port` from the project directory to stop its agent.'
    });
  }
  // The agent wraps every response in its `{ v, ok, code, data }` envelope.
  const { data = {} } = (await response.json()) as { data?: Record<string, unknown> };
  return {
    pid: typeof data.pid === 'number' ? data.pid : 0,
    port,
    phase: 'ready',
    projectName: typeof data.projectName === 'string' ? data.projectName : 'unknown',
    stage: typeof data.stage === 'string' ? data.stage : 'unknown',
    region: typeof data.region === 'string' ? data.region : 'unknown',
    startedAt: '',
    workloads: [],
    databases: []
  };
};
