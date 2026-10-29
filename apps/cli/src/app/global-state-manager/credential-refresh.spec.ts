import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { operationReporter, operationSession } from '@application-services/operation-manager';
import { GlobalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { resetAwsClockSync } from '@utils/time';

class TestGlobalStateManager extends GlobalStateManager {
  runScheduledRefresh = () => this.refreshCredentialsAfterTimeout();
  scheduleRefresh = (expiration: Date) => this.scheduleCredentialRefresh(expiration);
}

describe.serial('automatic AWS credential refresh', () => {
  const restores: (() => void)[] = [];

  // Every test reads AWS's clock through its own fetch stub; the measured offset is otherwise reused for a minute.
  beforeEach(() => resetAwsClockSync());

  afterEach(() => {
    for (const restore of restores.splice(0).toReversed()) restore();
    resetAwsClockSync();
  });

  test('owns a refresh rejection, retains the current credentials and schedules a bounded retry', async () => {
    const manager = new TestGlobalStateManager();
    const credentials = manager.credentials;
    const warnings: string[] = [];
    const originalWarn = tuiManager.warn;
    operationSession.reset();
    tuiManager.warn = (message: string) => warnings.push(message);
    restores.push(() => {
      tuiManager.warn = originalWarn;
      operationSession.reset();
      manager.stopCredentialRefresh();
    });
    manager.loadValidatedAwsCredentials = async () => {
      operationReporter.startEvent({ eventType: 'LOAD_AWS_CREDENTIALS', description: 'Loading AWS credentials' });
      throw new Error('temporary refresh failure');
    };

    await expect(manager.runScheduledRefresh()).resolves.toBeUndefined();

    const activity = Object.values(operationSession.store.getSnapshot().activities).find(
      ({ eventType }) => eventType === 'LOAD_AWS_CREDENTIALS'
    );
    expect(activity?.status).not.toBe('running');
    expect(activity?.finalMessage).toBe('Automatic AWS credential refresh failed.');
    expect(manager.credentials).toBe(credentials);
    expect(manager.credentialsRefreshTimeout).toBeDefined();
    expect(warnings).toEqual(['Automatic AWS credential refresh failed. Retrying in 30 seconds.']);
  });

  test('does not refresh or retry after shutdown', async () => {
    const manager = new TestGlobalStateManager();
    let refreshCalls = 0;
    manager.loadValidatedAwsCredentials = async () => {
      refreshCalls += 1;
      throw new Error('should not be reached');
    };

    manager.stopCredentialRefresh();
    await manager.runScheduledRefresh();

    expect(refreshCalls).toBe(0);
    expect(manager.credentialsRefreshTimeout).toBeUndefined();
  });

  test('leaves enough credential lifetime for a failed refresh to retry before expiration', async () => {
    const manager = new TestGlobalStateManager();
    const synchronizedNow = new Date('2026-08-03T10:00:00.000Z');
    const expiration = new Date(synchronizedNow.getTime() + 10 * 60 * 1000);
    const scheduledDelays: number[] = [];
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const originalWarn = tuiManager.warn;
    const originalFinishEvent = operationReporter.finishEvent;
    globalThis.fetch = Object.assign(
      async () => new Response(null, { headers: { date: synchronizedNow.toUTCString() } }),
      { preconnect: originalFetch.preconnect }
    );
    globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
      const [callback, delay, ...callbackArgs] = args;
      scheduledDelays.push(delay ?? 0);
      return originalSetTimeout(callback, 2_147_483_647, ...callbackArgs);
    }) as typeof setTimeout;
    tuiManager.warn = () => undefined;
    operationReporter.finishEvent = async () => undefined;
    restores.push(() => {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
      tuiManager.warn = originalWarn;
      operationReporter.finishEvent = originalFinishEvent;
      manager.stopCredentialRefresh();
    });

    await manager.scheduleRefresh(expiration);
    const initialRefreshDelay = scheduledDelays.find((delay) => delay > 5000);
    clearTimeout(manager.credentialsRefreshTimeout);
    manager.credentialsRefreshTimeout = undefined;
    manager.loadValidatedAwsCredentials = async () => {
      throw new Error('temporary refresh failure');
    };
    await manager.runScheduledRefresh();
    const retryDelay = scheduledDelays.at(-1);

    expect(initialRefreshDelay).toBe(5 * 60 * 1000);
    expect(retryDelay).toBe(30 * 1000);
    expect(initialRefreshDelay! + retryDelay!).toBeLessThan(expiration.getTime() - synchronizedNow.getTime());
  });

  test('does not install a timer when shutdown happens during time synchronization', async () => {
    const manager = new TestGlobalStateManager();
    const originalFetch = globalThis.fetch;
    let resolveFetch: (response: Response) => void;
    globalThis.fetch = Object.assign(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      { preconnect: originalFetch.preconnect }
    );
    restores.push(() => {
      globalThis.fetch = originalFetch;
      manager.stopCredentialRefresh();
    });

    const scheduling = manager.scheduleRefresh(new Date(Date.now() + 60 * 60 * 1000));
    manager.stopCredentialRefresh();
    resolveFetch!(new Response(null, { headers: { date: new Date().toUTCString() } }));
    await scheduling;

    expect(manager.credentialsRefreshTimeout).toBeUndefined();
  });

  test('lets only the newest concurrent schedule own a refresh timer', async () => {
    const manager = new TestGlobalStateManager();
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const resolveFetches: Array<(response: Response) => void> = [];
    const refreshDelays: number[] = [];
    globalThis.fetch = Object.assign(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetches.push(resolve);
        }),
      { preconnect: originalFetch.preconnect }
    );
    globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
      const [callback, delay, ...callbackArgs] = args;
      if ((delay ?? 0) > 60_000) refreshDelays.push(delay ?? 0);
      return originalSetTimeout(callback, delay, ...callbackArgs);
    }) as typeof setTimeout;
    restores.push(() => {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
      manager.stopCredentialRefresh();
    });

    const first = manager.scheduleRefresh(new Date(Date.now() + 60 * 60 * 1000));
    const second = manager.scheduleRefresh(new Date(Date.now() + 30 * 60 * 1000));
    // Both schedules wait for the same reading of AWS's clock.
    expect(resolveFetches).toHaveLength(1);
    resolveFetches[0]!(new Response(null, { headers: { date: new Date().toUTCString() } }));
    await Promise.all([first, second]);

    expect(manager.credentialsRefreshTimeout).toBeDefined();
    // Only the newest schedule, for the credentials that expire in 30 minutes, installed a timer.
    expect(refreshDelays).toHaveLength(1);
    expect(refreshDelays[0]).toBeLessThan(26 * 60 * 1000);
  });
});
