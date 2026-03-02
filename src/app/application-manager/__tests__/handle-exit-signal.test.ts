import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { applicationManager } from '../index';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';

describe('applicationManager.handleExitSignal()', () => {
  const originalExit = process.exit;
  const originalTuiStop = tuiManager.stop.bind(tuiManager);
  const originalTuiInfo = tuiManager.info.bind(tuiManager);

  beforeEach(() => {
    applicationManager.isInterrupted = false;
    applicationManager.cleanUpHooks = [];
    globalStateManager.rawArgs = { preserveTempFiles: true } as any;
    globalStateManager.rawCommands = ['dev'] as any;
    globalStateManager.invokedFrom = 'server';
  });

  afterEach(() => {
    process.exit = originalExit;
    tuiManager.stop = originalTuiStop;
    tuiManager.info = originalTuiInfo;
    tuiManager.setDevTuiActive(false);
    applicationManager.isInterrupted = false;
    applicationManager.cleanUpHooks = [];
  });

  test('does not stop primary TUI when DevTui is active', async () => {
    const stopSpy = mock(async () => {});
    const infoSpy = mock(() => {});
    const exitSpy = mock(() => undefined as never);
    let cleanupCalled = false;

    tuiManager.stop = stopSpy as any;
    tuiManager.info = infoSpy as any;
    process.exit = exitSpy as any;
    tuiManager.setDevTuiActive(true);

    applicationManager.registerCleanUpHook(async () => {
      cleanupCalled = true;
    });

    await applicationManager.handleExitSignal('SIGINT');

    expect(stopSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(cleanupCalled).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
