import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

/**
 * Prints the incident's handoff: a self-contained markdown document with the incident's state,
 * signals, evidence, release context, timeline, related history and AI assessment, and guidance
 * for diagnosing it and watching its recovery read-only. The same document the Console's "Copy
 * details for agent" button produces.
 */
export const commandIncidentsShow = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { markdown } = await apiClient.incidentHandoff({ incidentId: args.incidentId });
  tuiManager.info(markdown);
  return { markdown };
};
