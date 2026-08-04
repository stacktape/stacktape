import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { applicationManager } from '../index';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { shouldWriteTerminalControlSequences } from '@application-services/tui-manager/output/mode';

describe('applicationManager.handleExitSignal()', () => {
  const originalExit = process.exit;
  const originalOutputMode = tuiManager.mode;
  const originalStdoutWrite = process.stdout.write;
  const originalStdoutIsTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const originalTuiStop = tuiManager.stop.bind(tuiManager);
  const originalTuiInfo = tuiManager.info.bind(tuiManager);

  beforeEach(() => {
    applicationManager.isInterrupted = false;
    applicationManager.cleanUpHooks = [];
    globalStateManager.rawArgs = { preserveTempFiles: true } as any;
    globalStateManager.rawCommands = ['dev'] as any;
    globalStateManager.isInitialized = false;
  });

  afterEach(() => {
    process.exit = originalExit;
    process.stdout.write = originalStdoutWrite;
    if (originalStdoutIsTtyDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', originalStdoutIsTtyDescriptor);
    } else {
      delete (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
    }
    tuiManager.setOutputFormat(originalOutputMode);
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

  test('does not write terminal control bytes when machine output is interrupted', async () => {
    const output: string[] = [];
    const exitSpy = mock(() => undefined as never);

    tuiManager.setOutputFormat('jsonl');
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
    process.stdout.write = mock((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.exit = exitSpy as typeof process.exit;
    tuiManager.stop = mock(async () => {}) as typeof tuiManager.stop;

    await applicationManager.handleExitSignal('SIGTERM');

    expect(output.join('')).not.toContain('\x1B');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('terminal restoration on process exit', () => {
  test('never appends terminal control bytes to machine or plain output', () => {
    expect(shouldWriteTerminalControlSequences({ outputMode: 'jsonl', stdoutIsTty: true })).toBe(false);
    expect(shouldWriteTerminalControlSequences({ outputMode: 'jsonl', stdoutIsTty: false })).toBe(false);
    expect(shouldWriteTerminalControlSequences({ outputMode: 'plain', stdoutIsTty: true })).toBe(false);
  });

  test('restores the cursor only for an interactive TTY renderer', () => {
    expect(shouldWriteTerminalControlSequences({ outputMode: 'tty', stdoutIsTty: true })).toBe(true);
    expect(shouldWriteTerminalControlSequences({ outputMode: 'tty', stdoutIsTty: false })).toBe(false);
  });
});
