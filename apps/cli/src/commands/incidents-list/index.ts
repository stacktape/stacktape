import { tuiManager } from '@application-services/tui-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIncidentsList = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { projectName, stage, incidentStatus, limit } = args;

  const incidents = await apiClient.listIncidents({
    project: projectName,
    stage,
    status: incidentStatus as 'ACTIVE' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ALL' | undefined,
    limit: limit ?? 25
  });

  if (isAgentMode(args)) {
    tuiManager.info(JSON.stringify(incidents, null, 2));
  } else if (incidents.length === 0) {
    tuiManager.info('No incidents.');
  } else {
    tuiManager.printTable({
      header: ['ID', 'Status', 'Severity', 'Title', 'Project', 'Stage', 'Opened', 'Signals'],
      rows: incidents.map((incident) => [
        incident.id,
        incident.status,
        incident.severity,
        incident.title.length > 50 ? `${incident.title.slice(0, 50)}...` : incident.title,
        incident.project || '-',
        incident.stage || '-',
        new Date(incident.openedAt).toLocaleString(),
        incident.signals.map((signal) => `${signal.state === 'ACTIVE' ? '✗' : '✓'}${signal.kind}`).join(' ')
      ])
    });
  }

  return incidents;
};
