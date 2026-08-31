import { describe, expect, test } from 'bun:test';
import type { IncidentStatusResponse } from '../../stacktape-api/api-key-protected';
import { IncidentWatchTimeoutError, waitForIncidentResolution } from './watch-incident';

const incident = (
  status: IncidentStatusResponse['status'],
  resolvedAtMs: number | null = null
): IncidentStatusResponse => ({
  id: 'incident-1',
  status,
  severity: 'ERROR',
  title: 'API is unavailable',
  project: 'api',
  stage: 'production',
  region: 'eu-west-1',
  isProduction: true,
  openedAt: new Date(0).toISOString(),
  acknowledgedAt: null,
  resolvedAt: resolvedAtMs === null ? null : new Date(resolvedAtMs).toISOString(),
  resolveReason: resolvedAtMs === null ? null : 'RECOVERED',
  deploymentVersion: null,
  gitCommit: null,
  signals: [{ kind: 'UPTIME_DOWN', state: status === 'RESOLVED' ? 'RECOVERED' : 'ACTIVE', title: 'API down' }]
});

const createClock = () => {
  let currentMs = 0;
  return {
    now: () => currentMs,
    sleep: async (durationMs: number) => {
      currentMs += durationMs;
    }
  };
};

const sequenceFetcher = (incidents: IncidentStatusResponse[]) => {
  let index = 0;
  return async () => incidents[Math.min(index++, incidents.length - 1)]!;
};

describe('waitForIncidentResolution', () => {
  test('succeeds only after the incident stays resolved for the stability window', async () => {
    const clock = createClock();
    const observations: string[] = [];

    const result = await waitForIncidentResolution({
      fetchIncident: sequenceFetcher([
        incident('OPEN'),
        incident('RESOLVED', 5_000),
        incident('RESOLVED', 5_000),
        incident('RESOLVED', 5_000)
      ]),
      timeoutMs: 30_000,
      stabilityMs: 10_000,
      pollIntervalMs: 5_000,
      ...clock,
      onObservation: ({ incident: current, stableForMs }) => observations.push(`${current.status}:${stableForMs}`)
    });

    expect(result.incident.status).toBe('RESOLVED');
    expect(result.stableForMs).toBe(10_000);
    expect(observations).toEqual(['OPEN:0', 'RESOLVED:0', 'RESOLVED:5000', 'RESOLVED:10000']);
  });

  test('resets the stability window when the incident reopens', async () => {
    const clock = createClock();

    const result = await waitForIncidentResolution({
      fetchIncident: sequenceFetcher([
        incident('RESOLVED', 0),
        incident('OPEN'),
        incident('RESOLVED', 10_000),
        incident('RESOLVED', 10_000),
        incident('RESOLVED', 10_000)
      ]),
      timeoutMs: 30_000,
      stabilityMs: 10_000,
      pollIntervalMs: 5_000,
      ...clock
    });

    expect(result.observedAtMs).toBe(20_000);
    expect(result.stableForMs).toBe(10_000);
  });

  test('times out with the last observed incident state', async () => {
    const clock = createClock();

    const result = waitForIncidentResolution({
      fetchIncident: sequenceFetcher([incident('OPEN')]),
      timeoutMs: 12_000,
      stabilityMs: 5_000,
      pollIntervalMs: 5_000,
      ...clock
    });

    await expect(result).rejects.toBeInstanceOf(IncidentWatchTimeoutError);
    await result.catch((error: unknown) => {
      expect(error).toBeInstanceOf(IncidentWatchTimeoutError);
      expect((error as IncidentWatchTimeoutError).lastIncident.status).toBe('OPEN');
      expect(clock.now()).toBe(12_000);
    });
  });

  test('accepts an incident whose recorded recovery already exceeds the stability window', async () => {
    let currentMs = 60_000;
    const result = await waitForIncidentResolution({
      fetchIncident: async () => incident('RESOLVED', 20_000),
      timeoutMs: 30_000,
      stabilityMs: 30_000,
      now: () => currentMs,
      sleep: async (durationMs) => {
        currentMs += durationMs;
      }
    });

    expect(result.stableForMs).toBe(40_000);
  });
});
