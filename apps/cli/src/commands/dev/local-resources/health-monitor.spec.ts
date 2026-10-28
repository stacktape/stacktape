import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { DEV_CONFIG } from '../dev-config';

// r2rr bug hunt: a local database whose first automatic restart failed was never restarted again, although three
// attempts are configured. Docker is substituted at its module boundary: the container stays stopped.

let starts = 0;
mock.module('@utils/docker', () => ({
  inspectDockerContainer: async () => ({ State: { Running: false } }),
  execDocker: async (args: string[]) => {
    if (args[0] === 'start') starts++;
    return { exitCode: 1, stdout: '', stderr: 'the container cannot start' };
  }
}));

let monitor: typeof import('./health-monitor');
beforeAll(async () => {
  Object.assign(DEV_CONFIG.localResources.healthCheck, { restartSettleMs: 0 });
  monitor = await import('./health-monitor');
});
afterAll(() => monitor.startHealthMonitoring([]));

test('a database that stays down is restarted up to the configured limit, then reported as failed', async () => {
  const { maxRestartAttempts } = DEV_CONFIG.localResources.healthCheck;
  monitor.startHealthMonitoring([{ name: 'db', type: 'postgres', containerName: 'stp-test-db' } as never]);
  for (let check = 0; check < 8; check++) await monitor.triggerHealthCheck('db');
  expect(starts).toBe(maxRestartAttempts);
  expect(monitor.getHealthStatus().get('db')).toBe('failed');
});
