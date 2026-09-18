import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIncidentsResolve = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { success } = await apiClient.resolveIncident({ incidentId: args.incidentId });
  tuiManager.info(
    success
      ? `Incident ${args.incidentId} resolved. A recurring signal reopens it automatically.`
      : `Incident ${args.incidentId} was already resolved — nothing changed.`
  );
  return { success };
};
