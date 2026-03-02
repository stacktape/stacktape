import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { renderSparkline, printMetricsChart, printAlarmsTable, printFormattedLogs } from '../debug-formatters';

// ─── Mock tuiManager ─────────────────────────────────────
// The formatter functions call tuiManager.colorize, printTable, etc.
// We mock the module to capture output without needing the real TUI.

const outputLines: string[] = [];
let printTableCalls: { header: string[]; rows: string[][] }[] = [];
let printBoxCalls: { title: string; lines: string[] }[] = [];

mock.module('@application-services/tui-manager', () => ({
  tuiManager: {
    info: (msg: string) => outputLines.push(msg),
    printLines: (lines: string[]) => outputLines.push(...lines),
    printTable: (args: { header: string[]; rows: string[][] }) => printTableCalls.push(args),
    printBox: (args: { title: string; lines: string[] }) => printBoxCalls.push(args),
    colorize: (_color: string, text: string) => text,
    makeBold: (text: string) => text
  }
}));

beforeEach(() => {
  outputLines.length = 0;
  printTableCalls = [];
  printBoxCalls = [];
});

// ─── renderSparkline (pure function) ─────────────────────

describe('renderSparkline', () => {
  test('returns empty string for empty array', () => {
    expect(renderSparkline([])).toBe('');
  });

  test('handles single value', () => {
    const result = renderSparkline([5]);
    expect(result).toHaveLength(1);
    // Single value maps to some sparkline character
    expect(result).toMatch(/[▁▂▃▄▅▆▇█]/);
  });

  test('handles all identical values', () => {
    const result = renderSparkline([10, 10, 10, 10, 10]);
    expect(result).toHaveLength(5);
    // All same → all same char (▁ since min=max, range fallback=1, (0/1)*7=0 → ▁)
    const uniqueChars = new Set(result.split(''));
    expect(uniqueChars.size).toBe(1);
  });

  test('ascending values produce ascending sparkline', () => {
    const result = renderSparkline([0, 25, 50, 75, 100]);
    expect(result).toHaveLength(5);
    // First char should be lowest, last should be highest
    expect(result[0]).toBe('▁');
    expect(result[4]).toBe('█');
  });

  test('descending values produce descending sparkline', () => {
    const result = renderSparkline([100, 75, 50, 25, 0]);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('█');
    expect(result[4]).toBe('▁');
  });

  test('respects width parameter for downsampling', () => {
    const values = Array.from({ length: 200 }, (_, i) => i);
    const result = renderSparkline(values, 20);
    expect(result).toHaveLength(20);
  });

  test('does not downsample when values fit in width', () => {
    const values = [0, 50, 100];
    const result = renderSparkline(values, 60);
    expect(result).toHaveLength(3);
  });

  test('handles negative values', () => {
    const result = renderSparkline([-100, -50, 0, 50, 100]);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('▁');
    expect(result[4]).toBe('█');
  });

  test('handles floating point values', () => {
    const result = renderSparkline([0.1, 0.5, 0.9]);
    expect(result).toHaveLength(3);
    expect(result).toMatch(/^[▁▂▃▄▅▆▇█]{3}$/);
  });

  test('produces monotonically increasing chars for linear input', () => {
    const values = Array.from({ length: 9 }, (_, i) => i);
    const result = renderSparkline(values);
    for (let i = 1; i < result.length; i++) {
      expect(result.charCodeAt(i)).toBeGreaterThanOrEqual(result.charCodeAt(i - 1));
    }
  });
});

// ─── printMetricsChart ───────────────────────────────────

describe('printMetricsChart', () => {
  test('prints "no data" message when datapoints empty', () => {
    printMetricsChart({
      metric: 'Invocations',
      resourceName: 'my-fn',
      stat: 'Sum',
      period: 300,
      datapoints: []
    });
    expect(outputLines.some((l) => l.includes('No data found'))).toBe(true);
  });

  test('renders box with metric name and resource', () => {
    printMetricsChart({
      metric: 'Duration',
      resourceName: 'api-handler',
      stat: 'Average',
      period: 60,
      datapoints: [
        { timestamp: '2025-01-01T00:00:00Z', value: 100 },
        { timestamp: '2025-01-01T00:01:00Z', value: 200 },
        { timestamp: '2025-01-01T00:02:00Z', value: 150 }
      ]
    });
    expect(printBoxCalls).toHaveLength(1);
    expect(printBoxCalls[0].title).toContain('Duration');
    expect(printBoxCalls[0].title).toContain('api-handler');
  });

  test('box lines contain sparkline characters', () => {
    printMetricsChart({
      metric: 'CPU',
      resourceName: 'svc',
      stat: 'Average',
      period: 300,
      datapoints: [
        { timestamp: '2025-01-01T00:00:00Z', value: 10 },
        { timestamp: '2025-01-01T00:05:00Z', value: 90 }
      ]
    });
    const allText = printBoxCalls[0].lines.join('\n');
    expect(allText).toMatch(/[▁▂▃▄▅▆▇█]/);
  });

  test('box lines contain min/max/avg summary', () => {
    printMetricsChart({
      metric: 'Errors',
      resourceName: 'fn',
      stat: 'Sum',
      period: 300,
      datapoints: [
        { timestamp: '2025-01-01T00:00:00Z', value: 2 },
        { timestamp: '2025-01-01T00:05:00Z', value: 8 },
        { timestamp: '2025-01-01T00:10:00Z', value: 5 }
      ]
    });
    const allText = printBoxCalls[0].lines.join('\n');
    expect(allText).toContain('Min');
    expect(allText).toContain('Max');
    expect(allText).toContain('Avg');
    expect(allText).toContain('Sum');
    expect(allText).toContain('2');
    expect(allText).toContain('8');
    expect(allText).toContain('5');
    expect(allText).toContain('15');
  });

  test('box contains stat and period info', () => {
    printMetricsChart({
      metric: 'Latency',
      resourceName: 'api',
      stat: 'p99',
      period: 60,
      datapoints: [{ timestamp: '2025-01-01T00:00:00Z', value: 42 }]
    });
    const allText = printBoxCalls[0].lines.join('\n');
    expect(allText).toContain('p99');
    expect(allText).toContain('60s period');
  });
});

// ─── printAlarmsTable ────────────────────────────────────

describe('printAlarmsTable', () => {
  test('prints "no alarms" message for empty array', () => {
    printAlarmsTable([]);
    expect(outputLines.some((l) => l.includes('No alarms found'))).toBe(true);
  });

  test('calls printTable with correct header', () => {
    printAlarmsTable([
      {
        name: 'stack-fn-errors',
        resource: 'fn',
        state: 'OK',
        metric: 'Errors',
        threshold: '5',
        comparison: 'GreaterThanThreshold',
        lastUpdated: '2025-01-01T00:00:00Z'
      }
    ]);
    expect(printTableCalls).toHaveLength(1);
    expect(printTableCalls[0].header).toEqual(['State', 'Resource', 'Metric', 'Condition', 'Updated']);
  });

  test('includes alarm state in row', () => {
    printAlarmsTable([
      {
        name: 'alarm-1',
        resource: 'my-api',
        state: 'ALARM',
        metric: 'Errors',
        threshold: '10',
        comparison: '>',
        lastUpdated: '2025-06-01T12:00:00Z'
      }
    ]);
    expect(printTableCalls[0].rows[0][0]).toBe('ALARM');
  });

  test('uses alarm name when no resource mapped', () => {
    printAlarmsTable([
      {
        name: 'unknown-alarm',
        state: 'OK',
        metric: 'CPU',
        threshold: '80',
        comparison: '>',
        lastUpdated: ''
      }
    ]);
    expect(printTableCalls[0].rows[0][1]).toBe('unknown-alarm');
  });

  test('prints reason for alarms in ALARM state', () => {
    printAlarmsTable([
      {
        name: 'critical-alarm',
        resource: 'db',
        state: 'ALARM',
        metric: 'CPU',
        threshold: '90',
        comparison: '>',
        lastUpdated: '',
        reason: 'CPU exceeded 90% for 5 minutes'
      }
    ]);
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('CPU exceeded 90% for 5 minutes');
  });

  test('does not print reason for OK alarms', () => {
    printAlarmsTable([
      {
        name: 'ok-alarm',
        resource: 'fn',
        state: 'OK',
        metric: 'Errors',
        threshold: '5',
        comparison: '>',
        lastUpdated: '',
        reason: 'Should not appear'
      }
    ]);
    const allOutput = outputLines.join('\n');
    expect(allOutput).not.toContain('Should not appear');
  });

  test('prints summary count line', () => {
    printAlarmsTable([
      { name: 'a1', state: 'OK', metric: 'M', threshold: '1', comparison: '>', lastUpdated: '' },
      { name: 'a2', state: 'ALARM', metric: 'M', threshold: '1', comparison: '>', lastUpdated: '' },
      { name: 'a3', state: 'OK', metric: 'M', threshold: '1', comparison: '>', lastUpdated: '' }
    ]);
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('3 alarm(s)');
    expect(allOutput).toContain('2 OK');
    expect(allOutput).toContain('1 ALARM');
  });

  test('handles multiple alarm states in summary', () => {
    printAlarmsTable([
      { name: 'a1', state: 'OK', metric: 'M', threshold: '1', comparison: '>', lastUpdated: '' },
      { name: 'a2', state: 'ALARM', metric: 'M', threshold: '1', comparison: '>', lastUpdated: '' },
      {
        name: 'a3',
        state: 'INSUFFICIENT_DATA',
        metric: 'M',
        threshold: '1',
        comparison: '>',
        lastUpdated: ''
      }
    ]);
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('3 alarm(s)');
  });
});

// ─── printFormattedLogs ──────────────────────────────────

describe('printFormattedLogs', () => {
  test('prints "no events" message for empty array', () => {
    printFormattedLogs([], '/aws/log-group');
    expect(outputLines.some((l) => l.includes('No log events found'))).toBe(true);
  });

  test('prints formatted log events with timestamps', () => {
    printFormattedLogs(
      [
        { timestamp: 1704067200000, logStreamName: 'stream-1', message: 'Hello world' },
        { timestamp: 1704067260000, logStreamName: 'stream-1', message: 'Another message' }
      ],
      '/aws/lambda/my-fn'
    );
    // Should have the log lines + summary
    expect(outputLines.some((l) => l.includes('Hello world'))).toBe(true);
    expect(outputLines.some((l) => l.includes('Another message'))).toBe(true);
  });

  test('detects ERROR level and counts errors', () => {
    printFormattedLogs(
      [
        { timestamp: 1704067200000, message: 'INFO: all good' },
        { timestamp: 1704067201000, message: 'ERROR: something broke' },
        { timestamp: 1704067202000, message: 'FATAL: crash' }
      ],
      '/aws/log'
    );
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('3 event(s)');
    expect(allOutput).toContain('2 error(s)');
  });

  test('detects WARN level and counts warnings', () => {
    printFormattedLogs(
      [
        { timestamp: 1704067200000, message: 'WARNING: disk space low' },
        { timestamp: 1704067201000, message: 'WARN: memory high' },
        { timestamp: 1704067202000, message: 'Info message' }
      ],
      '/aws/log'
    );
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('2 warning(s)');
  });

  test('handles JSON-format log levels', () => {
    printFormattedLogs([{ timestamp: 1704067200000, message: '{"level": "error", "msg": "oops"}' }], '/aws/log');
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('1 error(s)');
  });

  test('handles events with missing fields gracefully', () => {
    printFormattedLogs([{ message: 'no timestamp' }, { timestamp: 1704067200000 }, {}], '/aws/log');
    // Should not throw
    expect(outputLines.some((l) => l.includes('3 event(s)'))).toBe(true);
  });

  test('summary shows only total when no errors or warnings', () => {
    printFormattedLogs(
      [
        { timestamp: 1704067200000, message: 'all good' },
        { timestamp: 1704067201000, message: 'still good' }
      ],
      '/aws/log'
    );
    const allOutput = outputLines.join('\n');
    expect(allOutput).toContain('2 event(s)');
    expect(allOutput).not.toContain('error');
    expect(allOutput).not.toContain('warning');
  });

  test('trims trailing whitespace from messages', () => {
    printFormattedLogs([{ timestamp: 1704067200000, message: 'trailing spaces   \n' }], '/aws/log');
    const logLine = outputLines.find((l) => l.includes('trailing spaces'));
    expect(logLine).toBeDefined();
    // The message portion should be trimmed (no trailing newline/spaces)
    expect(logLine!.endsWith('\n')).toBe(false);
  });
});
