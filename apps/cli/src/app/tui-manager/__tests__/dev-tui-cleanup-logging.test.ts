import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { tuiManager } from '../index';

describe('tuiManager cleanup logging', () => {
  const originalConsoleInfo = console.info;

  beforeEach(() => {
    (tuiManager as any).outputMode = 'tty';
    (tuiManager as any)._isEnabled = false;
    tuiManager.setDevTuiActive(true);
  });

  afterEach(() => {
    console.info = originalConsoleInfo;
    tuiManager.setDevTuiActive(false);
  });

  test('prints logs when devTuiActive is true but TUI is disabled', () => {
    const spy = mock(() => {});
    console.info = spy as unknown as typeof console.info;

    tuiManager.info('Stopping tunnels...');

    expect(spy).toHaveBeenCalled();
  });
});
