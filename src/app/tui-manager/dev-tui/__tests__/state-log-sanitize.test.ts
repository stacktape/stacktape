import { beforeEach, describe, expect, test } from 'bun:test';
import { devTuiState } from '../state';

describe('devTuiState log sanitization', () => {
  beforeEach(() => {
    devTuiState.reset();
  });

  test('strips ANSI and carriage return from log lines', () => {
    devTuiState.addLogLine('api', '\x1B[31mERROR\x1B[0m progress\r');
    const logs = devTuiState.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('ERROR progress');
  });

  test('splits multiline logs into individual entries', () => {
    devTuiState.addLogLine('worker', 'line one\nline two\n');
    const logs = devTuiState.getState().logs;
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe('line one');
    expect(logs[1].message).toBe('line two');
  });
});
