import { globalStateManager } from '@application-services/global-state-manager';
import { getAllRunningAgents, stopRunningAgent } from '../dev/agent-daemon';
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
    console.log('Cleaning up orphaned Stacktape dev containers...');
    const cleaned = await cleanupOrphanedContainers();
    if (cleaned.length > 0) {
      console.log(`Removed ${cleaned.length} container(s): ${cleaned.join(', ')}`);
    } else {
      console.log('No orphaned containers found.');
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
  const stopAgentOnPort = async (port: number): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:${port}/status`, {
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        const status = (await response.json()) as { projectName?: string; stage?: string; pid?: number };
        const agent = {
          pid: status.pid || 0,
          port,
          phase: 'ready' as const,
          projectName: status.projectName || 'unknown',
          stage: status.stage || 'unknown',
          region: 'unknown',
          startedAt: '',
          workloads: [],
          databases: []
        };
        console.log(`Stopping dev agent on port ${port}...`);
        const stopped = await stopRunningAgent(agent);
        if (stopped) {
          console.log('Dev agent stopped.');
          return true;
        } else {
          console.error('Failed to stop dev agent.');
          return false;
        }
      }
    } catch {
      // Agent not responding on this port
    }
    return false;
  };

  // If --agentPort specified, stop that specific agent
  if (agentPortArg) {
    const stopped = await stopAgentOnPort(agentPortArg);
    if (!stopped) {
      console.log(`No dev agent found on port ${agentPortArg}.`);
      process.exit(1);
    }
    return;
  }

  // Try to get agents from lock files first
  const allAgents = await getAllRunningAgents();

  if (allAgents.length === 1) {
    // Single agent from lock file - stop it
    const agent = allAgents[0];
    console.log(`Stopping dev agent: ${agent.projectName}/${agent.stage} (port ${agent.port})...`);
    const stopped = await stopRunningAgent(agent);
    if (stopped) {
      console.log('Dev agent stopped.');
    } else {
      console.error('Failed to stop dev agent.');
      process.exit(1);
    }
    return;
  }

  if (allAgents.length > 1) {
    // Multiple agents - list them and ask user to be specific
    console.log('Multiple dev agents running:');
    for (const agent of allAgents) {
      console.log(`  - ${agent.projectName}/${agent.stage} on port ${agent.port}`);
    }
    console.log('');
    console.log('To stop a specific agent, use: dev:stop --agentPort <port>');
    return;
  }

  // No lock files found - try default port as fallback
  console.log('No lock files found, trying default port 7331...');
  const stopped = await stopAgentOnPort(7331);
  if (!stopped) {
    console.log('No running dev agents found.');
    console.log('');
    console.log('If the agent is running on a different port, use: dev:stop --agentPort <port>');
  }
};
