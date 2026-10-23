import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { localStatePaths } from 'src/config/local-state-paths';
import { type AgentLockFile, getAllRunningAgents, requestDevAgent, stopRunningAgent } from '../dev/agent-daemon';
import { cleanupOrphanedContainers } from '../dev/cleanup-utils';

/**
 * Stop running dev agent(s).
 * This is a lightweight command that doesn't require full initialization.
 */
export const commandDevStop = async () => {
  const agentPortArg = globalStateManager.args.agentPort;
  const shouldCleanupContainers = globalStateManager.args.cleanupContainers;

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
    if (!agentPortArg) {
      const allAgents = await getAllRunningAgents();
      if (allAgents.length === 0) {
        return;
      }
    }
  }

  // Helper to stop agent on a specific port
  const stopAgentOnPort = async (port: number): Promise<'stopped' | 'failed' | 'refused' | 'not-found'> => {
    // A lock file names the agent's project and stage, so stopping through it also removes that file.
    const lockFileAgent = (await getAllRunningAgents()).find((agent) => agent.port === port);
    let agent: AgentLockFile | undefined = lockFileAgent;
    if (!agent) {
      // Lock files live in the directory dev mode was started in, but every agent's token is in the user's state
      // directory under its port, so the agent can be stopped from any directory.
      try {
        const response = await requestDevAgent({ port }, '/status', { timeoutMs: 2000 });
        if (response.status === 401) {
          tuiManager.error(
            `The process on port ${port} refused the dev agent session token in ` +
              `${localStatePaths.devAgentTokenFile({ port })}. It is not a dev agent started by this user, or the ` +
              'file belongs to an earlier session.'
          );
          return 'refused';
        }
        if (!response.ok) return 'not-found';
        // The agent wraps every response in its `{ v, ok, code, data }` envelope.
        const status = (await response.json()) as { data?: { pid?: unknown } };
        const pid = typeof status.data?.pid === 'number' ? status.data.pid : 0;
        agent = {
          pid,
          port,
          phase: 'ready',
          projectName: 'unknown',
          stage: 'unknown',
          region: 'unknown',
          startedAt: '',
          workloads: [],
          databases: []
        };
      } catch {
        // Agent not responding on this port
        return 'not-found';
      }
    }
    tuiManager.info(`Stopping dev agent on port ${port}...`);
    const stopped = await stopRunningAgent(agent);
    if (stopped) {
      tuiManager.success('Dev agent stopped.');
      return 'stopped';
    }
    tuiManager.error('Failed to stop dev agent.');
    return 'failed';
  };

  // If --agentPort specified, stop that specific agent
  if (agentPortArg) {
    const outcome = await stopAgentOnPort(agentPortArg);
    if (outcome !== 'stopped') {
      if (outcome === 'not-found') tuiManager.warn(`No dev agent found on port ${agentPortArg}.`);
      process.exit(1);
    }
    return;
  }

  // Try to get agents from lock files first
  const allAgents = await getAllRunningAgents();

  if (allAgents.length === 1) {
    // Single agent from lock file - stop it
    const agent = allAgents[0];
    tuiManager.info(`Stopping dev agent: ${agent.projectName}/${agent.stage} (port ${agent.port})...`);
    const stopped = await stopRunningAgent(agent);
    if (stopped) {
      tuiManager.success('Dev agent stopped.');
    } else {
      tuiManager.error('Failed to stop dev agent.');
      process.exit(1);
    }
    return;
  }

  if (allAgents.length > 1) {
    // Multiple agents - list them and ask user to be specific
    tuiManager.info('Multiple dev agents running:');
    for (const agent of allAgents) {
      tuiManager.info(`  - ${agent.projectName}/${agent.stage} on port ${agent.port}`);
    }
    tuiManager.printLines(['']);
    tuiManager.info('To stop a specific agent, use: dev stop --agent-port <port>');
    return;
  }

  // No lock files found - try default port as fallback
  tuiManager.info('No lock files found, trying default port 7331...');
  const outcome = await stopAgentOnPort(7331);
  if (outcome === 'not-found') {
    tuiManager.info('No running dev agents found.');
    tuiManager.printLines(['']);
    tuiManager.info('If the agent is running on a different port, use: dev stop --agent-port <port>');
  }
};
