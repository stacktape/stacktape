import { tuiManager } from '@application-services/tui-manager';

// ─── Sparkline chart for debug-metrics ───────────────────

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

export const renderSparkline = (values: number[], width = 60): string => {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  if (values.length <= width) {
    return values.map((v) => SPARK_CHARS[Math.round(((v - min) / range) * (SPARK_CHARS.length - 1))]).join('');
  }

  // Downsample by averaging buckets
  const bucketSize = values.length / width;
  const sampled: number[] = [];
  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const bucket = values.slice(start, end);
    sampled.push(bucket.reduce((a, b) => a + b, 0) / bucket.length);
  }
  return sampled.map((v) => SPARK_CHARS[Math.round(((v - min) / range) * (SPARK_CHARS.length - 1))]).join('');
};

const formatMetricValue = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toPrecision(3);
};

export const printMetricsChart = ({
  metric,
  resourceName,
  stat,
  period,
  datapoints
}: {
  metric: string;
  resourceName: string;
  stat: string;
  period: number;
  datapoints: { timestamp: string; value: number }[];
}) => {
  if (datapoints.length === 0) {
    tuiManager.info(`No data found for ${metric} on ${resourceName}`);
    return;
  }

  const values = datapoints.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const sum = values.reduce((a, b) => a + b, 0);

  const spark = renderSparkline(values);
  const firstTs = new Date(datapoints[0].timestamp).toLocaleTimeString();
  const lastTs = new Date(datapoints[datapoints.length - 1].timestamp).toLocaleTimeString();

  tuiManager.printBox({
    title: `${metric} — ${resourceName}`,
    lines: [
      `${tuiManager.colorize('gray', `${stat}, ${period}s period, ${datapoints.length} datapoints`)}`,
      '',
      tuiManager.colorize('cyan', spark),
      `${tuiManager.colorize('gray', firstTs)}${' '.repeat(Math.max(1, spark.length - firstTs.length - lastTs.length))}${tuiManager.colorize('gray', lastTs)}`,
      '',
      `${tuiManager.makeBold('Min')} ${formatMetricValue(min)}  ${tuiManager.makeBold('Max')} ${formatMetricValue(max)}  ${tuiManager.makeBold('Avg')} ${formatMetricValue(avg)}  ${tuiManager.makeBold('Sum')} ${formatMetricValue(sum)}`
    ]
  });
};

// ─── Table for debug-alarms ──────────────────────────────

type AlarmInfo = {
  name: string;
  resource?: string;
  state: string;
  metric: string;
  threshold: string;
  comparison: string;
  lastUpdated: string;
  reason?: string;
};

const STATE_COLORS: Record<string, string> = {
  OK: 'green',
  ALARM: 'red',
  INSUFFICIENT_DATA: 'yellow'
};

export const printAlarmsTable = (alarms: AlarmInfo[]) => {
  if (alarms.length === 0) {
    tuiManager.info('No alarms found.');
    return;
  }

  const header = ['State', 'Resource', 'Metric', 'Condition', 'Updated'];
  const rows = alarms.map((a) => [
    tuiManager.colorize(STATE_COLORS[a.state] || 'gray', a.state),
    a.resource || tuiManager.colorize('gray', a.name),
    a.metric,
    `${a.comparison} ${a.threshold}`,
    a.lastUpdated ? new Date(a.lastUpdated).toLocaleString() : ''
  ]);

  tuiManager.printTable({ header, rows });

  // Print reasons for alarms in ALARM state
  const alarming = alarms.filter((a) => a.state === 'ALARM' && a.reason);
  if (alarming.length > 0) {
    tuiManager.printLines(['']);
    for (const a of alarming) {
      tuiManager.printLines([
        `  ${tuiManager.colorize('red', '!')} ${tuiManager.makeBold(a.resource || a.name)}: ${a.reason}`
      ]);
    }
  }

  const stateCount = alarms.reduce(
    (acc, a) => {
      acc[a.state] = (acc[a.state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summaryParts = Object.entries(stateCount).map(
    ([state, count]) => `${tuiManager.colorize(STATE_COLORS[state] || 'gray', String(count))} ${state}`
  );

  tuiManager.printLines(['', `  ${alarms.length} alarm(s): ${summaryParts.join(', ')}`]);
};

// ─── Level-aware log formatting for debug-logs ──────────

const LOG_LEVEL_PATTERNS: [RegExp, string][] = [
  [/\bERROR\b|\bFATAL\b|\bCRITICAL\b|"level"\s*:\s*"?error/i, 'red'],
  [/\bWARN(?:ING)?\b|"level"\s*:\s*"?warn/i, 'yellow'],
  [/\bDEBUG\b|"level"\s*:\s*"?debug/i, 'gray']
];

const detectLogLevel = (message: string): string | undefined => {
  for (const [pattern, color] of LOG_LEVEL_PATTERNS) {
    if (pattern.test(message)) return color;
  }
  return undefined;
};

export const printFormattedLogs = (
  events: { timestamp?: number; logStreamName?: string; message?: string }[],
  _logGroupName: string
) => {
  if (events.length === 0) {
    tuiManager.info('No log events found.');
    return;
  }

  const counts = { error: 0, warn: 0, info: 0 };

  const formatted = events.map((event) => {
    const ts = tuiManager.colorize('yellow', event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—');
    const msg = (event.message || '').trimEnd();
    const levelColor = detectLogLevel(msg);

    if (levelColor === 'red') counts.error++;
    else if (levelColor === 'yellow') counts.warn++;
    else counts.info++;

    const coloredMsg = levelColor ? tuiManager.colorize(levelColor, msg) : msg;
    return `${ts}  ${coloredMsg}`;
  });

  tuiManager.printLines(formatted);

  // Summary footer
  const parts = [`${events.length} event(s)`];
  if (counts.error > 0) parts.push(tuiManager.colorize('red', `${counts.error} error(s)`));
  if (counts.warn > 0) parts.push(tuiManager.colorize('yellow', `${counts.warn} warning(s)`));
  tuiManager.printLines(['', `  ${parts.join('  ')}`]);
};
