import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import { IncidentWatchTimeoutError, waitForIncidentResolution, type IncidentWatchObservation } from './watch-incident';

const DEFAULT_TIMEOUT_SECONDS = 15 * 60;
const DEFAULT_STABILITY_SECONDS = 30;

export const commandIncidentsWatch = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const timeoutSeconds = args.incidentWatchTimeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const stabilitySeconds = args.incidentWatchStabilitySeconds ?? DEFAULT_STABILITY_SECONDS;

  if (stabilitySeconds > timeoutSeconds) {
    throw new CliError({
      category: 'INPUT',
      code: 'INCIDENT_WATCH_INVALID_WINDOW',
      message: 'The incident stability window cannot be longer than the watch timeout.',
      hints: 'Increase --incidentWatchTimeoutSeconds or decrease --incidentWatchStabilitySeconds.'
    });
  }

  let lastPresentationKey: string | undefined;
  const agentMode = isAgentMode(args);
  const reportObservation = ({ incident, stableForMs }: IncidentWatchObservation) => {
    const phase = incident.status === 'RESOLVED' ? 'stabilizing' : 'waiting';
    const presentationKey = `${incident.status}:${phase}`;
    if (presentationKey === lastPresentationKey) return;
    lastPresentationKey = presentationKey;

    const activeSignals = incident.signals.filter((signal) => signal.state === 'ACTIVE').length;
    if (agentMode) {
      tuiManager.info(
        JSON.stringify({
          event: 'incident.watch.status',
          incidentId: incident.id,
          status: incident.status,
          phase,
          activeSignals,
          stableForSeconds: Math.floor(stableForMs / 1_000)
        })
      );
      return;
    }

    if (phase === 'stabilizing') {
      tuiManager.info(`Incident ${incident.id} is resolved. Confirming recovery for ${stabilitySeconds} seconds...`);
    } else {
      tuiManager.info(
        `Incident ${incident.id} is ${incident.status} with ${activeSignals} active signal(s). Waiting...`
      );
    }
  };

  try {
    const result = await waitForIncidentResolution({
      fetchIncident: () => apiClient.incidentStatus({ incidentId: args.incidentId }),
      timeoutMs: timeoutSeconds * 1_000,
      stabilityMs: stabilitySeconds * 1_000,
      onObservation: reportObservation
    });

    const output = {
      incidentId: result.incident.id,
      status: result.incident.status,
      resolveReason: result.incident.resolveReason,
      resolvedAt: result.incident.resolvedAt,
      stableForSeconds: Math.floor(result.stableForMs / 1_000)
    };
    tuiManager.info(
      agentMode
        ? JSON.stringify({ event: 'incident.watch.resolved', ...output })
        : `Incident ${result.incident.id} remained resolved for ${output.stableForSeconds} seconds.`
    );
    return output;
  } catch (error) {
    if (!(error instanceof IncidentWatchTimeoutError)) throw error;
    const activeSignals = error.lastIncident.signals.filter((signal) => signal.state === 'ACTIVE').length;
    throw new CliError({
      category: 'STACK_MONITORING',
      code: 'INCIDENT_WATCH_TIMEOUT',
      message: `Incident ${args.incidentId} did not remain resolved for ${stabilitySeconds} seconds within the ${timeoutSeconds}-second timeout. Last status: ${error.lastIncident.status}; active signals: ${activeSignals}.`,
      hints: [
        `Run stacktape incidents:show --incidentId ${args.incidentId} to inspect current evidence.`,
        'After deploying another fix, run incidents:watch again.'
      ]
    });
  }
};
