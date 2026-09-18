import type { IncidentStatusResponse } from '../../stacktape-api/api-key-protected';

export type IncidentWatchObservation = {
  incident: IncidentStatusResponse;
  observedAtMs: number;
  stableForMs: number;
};

type WaitForIncidentResolutionOptions = {
  fetchIncident: () => Promise<IncidentStatusResponse>;
  timeoutMs: number;
  stabilityMs: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
  onObservation?: (observation: IncidentWatchObservation) => void;
};

export class IncidentWatchTimeoutError extends Error {
  constructor(
    readonly lastIncident: IncidentStatusResponse,
    readonly timeoutMs: number
  ) {
    super(`Incident did not remain resolved within ${timeoutMs}ms.`);
    this.name = 'IncidentWatchTimeoutError';
  }
}

const defaultSleep = async (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const getResolvedSinceMs = (incident: IncidentStatusResponse, observedAtMs: number) => {
  if (!incident.resolvedAt) return observedAtMs;
  const resolvedAtMs = new Date(incident.resolvedAt).getTime();
  if (!Number.isFinite(resolvedAtMs)) return observedAtMs;
  return Math.min(resolvedAtMs, observedAtMs);
};

/**
 * Polls the control plane until an incident has remained resolved for the requested quiet window.
 * Reopening the incident discards all previously accumulated stable time.
 */
export const waitForIncidentResolution = async ({
  fetchIncident,
  timeoutMs,
  stabilityMs,
  pollIntervalMs = 5_000,
  now = Date.now,
  sleep = defaultSleep,
  onObservation
}: WaitForIncidentResolutionOptions): Promise<IncidentWatchObservation> => {
  const deadlineMs = now() + timeoutMs;
  let resolvedSinceMs: number | undefined;
  let lastIncident: IncidentStatusResponse | undefined;

  while (true) {
    const incident = await fetchIncident();
    const observedAtMs = now();
    lastIncident = incident;

    if (incident.status === 'RESOLVED') {
      resolvedSinceMs ??= getResolvedSinceMs(incident, observedAtMs);
    } else {
      resolvedSinceMs = undefined;
    }

    const stableForMs = resolvedSinceMs === undefined ? 0 : Math.max(0, observedAtMs - resolvedSinceMs);
    const observation = { incident, observedAtMs, stableForMs };
    onObservation?.(observation);

    if (incident.status === 'RESOLVED' && stableForMs >= stabilityMs) return observation;
    if (observedAtMs >= deadlineMs) throw new IncidentWatchTimeoutError(lastIncident, timeoutMs);

    await sleep(Math.min(pollIntervalMs, deadlineMs - observedAtMs));
  }
};
