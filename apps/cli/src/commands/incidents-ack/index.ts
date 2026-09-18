import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIncidentsAck = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { success } = await apiClient.acknowledgeIncident({ incidentId: args.incidentId });
  tuiManager.info(
    success
      ? `Incident ${args.incidentId} acknowledged.`
      : `Incident ${args.incidentId} was not OPEN — nothing changed.`
  );
  return { success };
};
