import { afterEach, describe, expect, mock, test } from 'bun:test';
import { eventManager } from '@application-services/event-manager';
import { GlobalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';

class TestGlobalStateManager extends GlobalStateManager {
  runScheduledRefresh = () => this.refreshCredentialsAfterTimeout();
}

describe('automatic AWS credential refresh', () => {
  const restores: (() => void)[] = [];

  afterEach(() => {
    for (const restore of restores.splice(0).toReversed()) restore();
  });

  test('owns a refresh rejection, retains the current credentials and schedules a bounded retry', async () => {
    const manager = new TestGlobalStateManager();
    const credentials = manager.credentials;
    const warnings: string[] = [];
    const finishedEvents: unknown[] = [];
    const originalWarn = tuiManager.warn;
    const originalFinishEvent = eventManager.finishEvent;
    tuiManager.warn = (message: string) => warnings.push(message);
    eventManager.finishEvent = mock(async (event) => {
      finishedEvents.push(event);
    }) as typeof eventManager.finishEvent;
    restores.push(() => {
      tuiManager.warn = originalWarn;
      eventManager.finishEvent = originalFinishEvent;
      manager.stopCredentialRefresh();
    });
    manager.loadValidatedAwsCredentials = async () => {
      throw new Error('temporary refresh failure');
    };

    await expect(manager.runScheduledRefresh()).resolves.toBeUndefined();

    expect(manager.credentials).toBe(credentials);
    expect(manager.credentialsRefreshTimeout).toBeDefined();
    expect(warnings).toEqual(['Automatic AWS credential refresh failed. Retrying in one minute.']);
    expect(finishedEvents).toEqual([
      { eventType: 'LOAD_AWS_CREDENTIALS', finalMessage: 'Automatic AWS credential refresh failed.' }
    ]);
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
});
