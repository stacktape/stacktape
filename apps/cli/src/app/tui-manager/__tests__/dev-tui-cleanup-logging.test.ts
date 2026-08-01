import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { tuiManager } from '../index';

describe('tuiManager cleanup logging', () => {
  const originalConsoleInfo = console.info;
  const originalOutputMode = tuiManager.mode;
  const originalStdoutWrite = process.stdout.write;
  const originalStdoutIsTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  beforeEach(() => {
    (tuiManager as any).outputMode = 'tty';
    (tuiManager as any)._isEnabled = false;
    tuiManager.setDevTuiActive(true);
  });

  afterEach(() => {
    console.info = originalConsoleInfo;
    process.stdout.write = originalStdoutWrite;
    if (originalStdoutIsTtyDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', originalStdoutIsTtyDescriptor);
    } else {
      delete (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
    }
    tuiManager.setOutputFormat(originalOutputMode);
    tuiManager.setDevTuiActive(false);
  });

  test('prints logs when devTuiActive is true but TUI is disabled', () => {
    const spy = mock(() => {});
    console.info = spy as unknown as typeof console.info;

    tuiManager.info('Stopping tunnels...');

    expect(spy).toHaveBeenCalled();
  });

  test('plain-mode shutdown does not write terminal control bytes', async () => {
    const output: string[] = [];
    tuiManager.setOutputFormat('plain');
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
    process.stdout.write = mock((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    Reflect.set(tuiManager, '_wasEverStarted', true);
    Reflect.set(tuiManager, '_openTuiDestroyed', false);
    Reflect.set(tuiManager, '_openTuiInitPromise', null);

    await tuiManager.stop();

    expect(output.join('')).not.toContain('\x1B');
  });
});
