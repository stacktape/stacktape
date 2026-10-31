import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { describe, expect, test } from 'bun:test';
import kleur from 'kleur';
import { isTextStylingEnabled, setTextStylingEnabled } from '../app/tui-manager/format/text';
import { LambdaCloudwatchLogPrinter } from './cloudwatch-logs';

const HOUR = 3_600_000;
const UNTIL = 1_800_000_000_000;

/**
 * A log group as `FilterLogEvents` reads it: events between `startTime` and `endTime` (both inclusive), oldest first, at
 * most `limit` (and `pageSize`) per request, with a token for the next page. Like CloudWatch (seen live in us-west-2 on
 * 27 Oct 2026), it returns a token after every page with events, also the last one; the page after it is empty.
 */
const logGroup = ({
  pageSize = 10_000,
  scanPages = () => 0
}: {
  pageSize?: number;
  /** How many empty pages with a token a read returns first, as CloudWatch does while it scans with a filter. */
  scanPages?: (startTime: number, endTime: number) => number;
} = {}) => {
  const events: FilteredLogEvent[] = [];
  const requests: {
    startTime: number;
    endTime?: number;
    limit?: number;
    nextToken?: string;
    filterPattern?: string;
  }[] = [];
  const firstAtOrAfter = (time: number) => {
    let low = 0;
    let high = events.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (events[middle].timestamp! < time) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  return {
    requests,
    add: (timestamp: number, message = `line ${events.length}`) => {
      const event = { eventId: `e${events.length}`, timestamp, ingestionTime: timestamp, message, logStreamName: 's' };
      events.splice(firstAtOrAfter(timestamp + 1), 0, event);
      return event;
    },
    fetchPage: async (params: {
      logGroupName: string;
      startTime: number;
      endTime?: number;
      limit?: number;
      nextToken?: string;
      filterPattern?: string;
    }) => {
      requests.push(params);
      // A token `scan:<n>:<from>` stands for the n-th empty page of a read that is still scanning.
      const scanning = /^scan:(\d+):(\d+)$/.exec(params.nextToken ?? '');
      const scanned = scanning ? Number(scanning[1]) : params.nextToken ? Infinity : 0;
      if (scanned < scanPages(params.startTime, params.endTime ?? Infinity)) {
        return { events: [], nextToken: `scan:${scanned + 1}:${params.startTime}` };
      }
      const end = params.endTime === undefined ? events.length : firstAtOrAfter(params.endTime + 1);
      const from = params.nextToken && !scanning ? Number(params.nextToken) : firstAtOrAfter(params.startTime);
      const to = Math.min(end, from + Math.min(params.limit ?? pageSize, pageSize));
      return { events: events.slice(from, to), nextToken: to > from ? String(to) : undefined };
    }
  };
};

const printerFor = (
  group: ReturnType<typeof logGroup>,
  options: { since: number; backlog?: number; filterPattern?: string }
) => {
  const printed: string[] = [];
  const notices: string[] = [];
  const printer = new LambdaCloudwatchLogPrinter({
    fetchSince: options.since,
    logGroupAwsResourceName: '/aws/lambda/orders',
    fetchPage: group.fetchPage,
    filterPattern: options.filterPattern,
    onLog: (message) => {
      const line = /line \w+/.exec(message);
      if (line) printed.push(line[0]);
      else notices.push(message);
    },
    ...(options.backlog ? { backlog: { lines: options.backlog, until: UNTIL } } : {})
  });
  /** Polls until the backlog is shown, as the scheduler does while a poll asks for more. */
  const readBacklog = async () => {
    for (let poll = 0; poll < 50; poll++) if (!(await printer.printLogs()).more) return;
    throw new Error('The backlog did not finish');
  };
  return { printer, printed, notices, readBacklog };
};

// The #343 review: `stacktape logs` in a terminal read the whole last hour of a busy production log group, every page,
// before it followed new lines.
describe('the backlog `stacktape logs` shows before it follows', () => {
  test('a busy log group: the newest lines of the hour in a few requests', async () => {
    const group = logGroup();
    // 500 lines a second for the last 10 minutes of the hour.
    for (let time = UNTIL - 600_000; time <= UNTIL; time += 2) group.add(time);
    const { printer, printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 100 });
    await readBacklog();

    expect(group.requests.length).toBeLessThanOrEqual(8);
    expect(printed).toEqual(Array.from({ length: 100 }, (_, index) => `line ${299_901 + index}`));
    // Following starts after the backlog: lines of the window it read but did not show stay hidden.
    printed.length = 0;
    while ((await printer.printLogs()).more);
    expect(printed).toEqual([]);
  });

  test('`--filter` applies to the backlog and to following', async () => {
    const group = logGroup();
    group.add(UNTIL - 1000);
    const { printer, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 100, filterPattern: 'ERROR' });
    await readBacklog();
    await printer.printLogs();
    expect(group.requests.length).toBeGreaterThan(1);
    expect(group.requests.every(({ filterPattern }) => filterPattern === 'ERROR')).toBeTrue();
  });

  test('a quiet log group: every line of the hour in a few requests', async () => {
    const group = logGroup();
    for (let index = 0; index < 30; index++) group.add(UNTIL - HOUR + 1 + index * 100_000);
    const { printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 100 });
    await readBacklog();
    // The last minute, the 10 minutes before it and the rest of the hour, with an empty page after each with lines.
    expect(group.requests.length).toBeLessThanOrEqual(6);
    expect(printed).toEqual(Array.from({ length: 30 }, (_, index) => `line ${index}`));
  });

  test('a burst 40 minutes ago and a busy last minute: exactly the newest lines', async () => {
    const group = logGroup();
    for (let index = 0; index < 50; index++) group.add(UNTIL - 40 * 60_000 + index);
    for (let index = 0; index < 80; index++) group.add(UNTIL - 60_000 + index * 700);
    const { printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 100 });
    await readBacklog();
    expect(group.requests.length).toBeLessThanOrEqual(12);
    expect(printed).toEqual(Array.from({ length: 100 }, (_, index) => `line ${index + 30}`));
  });

  test('following after the backlog shows new lines and lines that arrived late, each once', async () => {
    const group = logGroup();
    for (let time = UNTIL - 30_000; time <= UNTIL; time += 100) group.add(time);
    const { printer, printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 20 });
    await readBacklog();
    expect(printed).toHaveLength(20);
    printed.length = 0;

    group.add(UNTIL + 500, 'line new');
    // Written before the backlog was read but ingested after it.
    group.add(UNTIL - 50, 'line late');
    await printer.printLogs();
    expect(printed).toEqual(['line late', 'line new']);
    await printer.printLogs();
    expect(printed).toEqual(['line late', 'line new']);
  });
});

// #346 review: with `--filter`, CloudWatch returns empty pages while it scans. The backlog read the whole window from
// its oldest events, spent its requests there, and never showed the recent matches.
describe('a filtered backlog of a large log group', () => {
  test('shows the recent matches first, and says when it could not search further back', async () => {
    // Reading anything older than 10 minutes takes 20 empty pages.
    const group = logGroup({ scanPages: (startTime) => (startTime < UNTIL - 600_000 ? 20 : 0) });
    for (let index = 0; index < 5; index++) group.add(UNTIL - 50 * 60_000 + index);
    for (let index = 0; index < 10; index++) group.add(UNTIL - 30_000 + index * 1000);
    const { printer, printed, notices, readBacklog } = printerFor(group, {
      since: UNTIL - HOUR,
      backlog: 100,
      filterPattern: 'ERROR'
    });
    await readBacklog();
    expect(group.requests.length).toBeLessThanOrEqual(12);
    expect(printed).toEqual(Array.from({ length: 10 }, (_, index) => `line ${index + 5}`));
    expect(notices).toHaveLength(1);
    expect(notices[0]).toStartWith('Only the log lines since ');
    expect(notices[0]).toContain('more than 12 requests to search further back with this filter');

    printed.length = 0;
    group.add(UNTIL + 500, 'line new');
    while ((await printer.printLogs()).more);
    expect(printed).toEqual(['line new']);
  });

  test('says so when even the last minute could not be searched, and follows new lines', async () => {
    const group = logGroup({ scanPages: () => 20 });
    group.add(UNTIL - 10_000);
    const { printer, printed, notices, readBacklog } = printerFor(group, {
      since: UNTIL - HOUR,
      backlog: 100,
      filterPattern: 'ERROR'
    });
    await readBacklog();
    expect(printed).toEqual([]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toStartWith('Earlier log lines were not read: ');
    group.add(UNTIL + 500, 'line new');
    for (let poll = 0; poll < 25; poll++) await printer.printLogs();
    expect(printed).toEqual(['line new']);
  });
});

describe('following a log group', () => {
  // #346 review: lines with the time of the oldest backlog line, cut by the line limit, appeared later out of order.
  test('lines of the backlog window cut by the line limit stay hidden, also those with the same time', async () => {
    const group = logGroup();
    for (let index = 0; index < 5; index++) group.add(UNTIL - 1000);
    const { printer, printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 3 });
    await readBacklog();
    expect(printed).toEqual(['line 2', 'line 3', 'line 4']);
    printed.length = 0;
    while ((await printer.printLogs()).more);
    expect(printed).toEqual([]);
  });

  // The #343 review: the dedupe set kept the last 5,000 event IDs, fewer than a busy group writes in the 10 s each read
  // reaches back, so lines printed again.
  test('a group writing 1,000 lines a second prints each line once', async () => {
    const group = logGroup();
    const { printer, printed } = printerFor(group, { since: UNTIL });
    const added: string[] = [];
    for (let second = 0; second < 30; second++) {
      for (let index = 0; index < 1000; index++) {
        added.push(group.add(UNTIL + second * 1000 + index + 1).message!);
      }
      while ((await printer.printLogs()).more);
    }
    expect(printed).toHaveLength(added.length);
    expect(new Set(printed).size).toBe(added.length);
  });

  test('a read that needs several pages makes one request per poll and asks for the next page', async () => {
    const group = logGroup({ pageSize: 50 });
    const { printer, printed } = printerFor(group, { since: UNTIL });
    for (let index = 0; index < 120; index++) group.add(UNTIL + 1 + index);
    const results = [];
    for (let poll = 0; poll < 4; poll++) results.push(await printer.printLogs());
    expect(group.requests).toHaveLength(4);
    expect(results).toEqual([
      { found: 50, more: true },
      { found: 50, more: true },
      { found: 20, more: true },
      { found: 0, more: false }
    ]);
    expect(printed).toHaveLength(120);
  });
});

// r2w: Python's uncaught-exception record has no request ID, and dev output started it with `?`.
test('a line without a request ID gets the prefix of the request its log stream is handling', async () => {
  const request = '0f3c1b52-6d1e-4c1f-9a43-5b6f1e2d3c4a';
  const messages: string[] = [];
  const events: FilteredLogEvent[] = [
    `START RequestId: ${request} Version: $LATEST`,
    '[ERROR] ConnectionError: Error 111 connecting to 10.0.0.1:6379. Connection refused.\nTraceback (most recent call last):\n  File "/var/task/handler.py", line 12, in handler',
    `END RequestId: ${request}`,
    `REPORT RequestId: ${request}\tDuration: 3.00 ms\tBilled Duration: 4 ms\tMemory Size: 128 MB\tMax Memory Used: 40 MB`,
    'print after the request'
  ].map((message, index) => ({
    eventId: `e${index}`,
    timestamp: UNTIL + 1 + index,
    message,
    logStreamName: '2026/10/27/[$LATEST]abc'
  }));
  const printer = new LambdaCloudwatchLogPrinter({
    fetchSince: UNTIL,
    logGroupAwsResourceName: '/aws/lambda/heartbeat',
    fetchPage: async () => ({ events }),
    onLog: (message) => void messages.push(message)
  });
  // Colors tell requests apart, so the prefixes are compared with colors on.
  const styling = [isTextStylingEnabled(), kleur.enabled] as const;
  setTextStylingEnabled(true);
  kleur.enabled = true;
  try {
    await printer.printLogs();
  } finally {
    setTextStylingEnabled(styling[0]);
    kleur.enabled = styling[1];
  }

  const prefix = (message: string) => message.split(' ', 1)[0];
  const errorLine = messages.find((message) => message.includes('ConnectionError'))!;
  expect(prefix(errorLine)).toBe(prefix(messages[0]!));
  expect(prefix(errorLine)).not.toBe(prefix(messages.at(-1)!));
  expect(messages.every((message) => prefix(message).includes('>'))).toBe(true);
});

// r2y review: with `--filter`, CloudWatch returns only matching events, so a START (or an END) can be missing. A line
// without a request ID must not take the color of a request whose END the filter hid.
test('with a filter, a line without a request ID says its request is unknown instead of taking an earlier one', async () => {
  const first = '0f3c1b52-6d1e-4c1f-9a43-5b6f1e2d3c4a';
  const stream = '2026/10/27/[$LATEST]abc';
  // What `--filter "?START ?Traceback"` returns: the first request's START, then the second request's
  // traceback; END lines and the second START do not match.
  const events: FilteredLogEvent[] = [
    `START RequestId: ${first} Version: $LATEST`,
    'Traceback (most recent call last):\n  File "/var/task/handler.py", line 12, in handler'
  ].map((message, index) => ({ eventId: `e${index}`, timestamp: UNTIL + 1 + index, message, logStreamName: stream }));
  const requests: { filterPattern?: string }[] = [];
  const messages: string[] = [];
  const printer = new LambdaCloudwatchLogPrinter({
    fetchSince: UNTIL,
    logGroupAwsResourceName: '/aws/lambda/heartbeat',
    filterPattern: '?START ?Traceback',
    fetchPage: async (params) => {
      requests.push(params);
      return { events };
    },
    onLog: (message) => void messages.push(message)
  });
  const styling = [isTextStylingEnabled(), kleur.enabled] as const;
  setTextStylingEnabled(true);
  kleur.enabled = true;
  try {
    await printer.printLogs();
  } finally {
    setTextStylingEnabled(styling[0]);
    kleur.enabled = styling[1];
  }

  const prefix = (message: string) => message.split(' ', 1)[0];
  const traceback = messages.find((message) => message.includes('Traceback'))!;
  expect(prefix(traceback)).not.toBe(prefix(messages[0]!));
  expect(traceback).toContain('request ID unknown');
  expect(traceback).not.toContain(first);
  // One filtered request, as before: correlation is not bought with extra CloudWatch reads.
  expect(requests).toHaveLength(1);
  expect(requests[0]!.filterPattern).toBe('?START ?Traceback');
});

// r2qq: Node's runtime frame `file:///var/runtime/index.mjs` was shown as the project file `./file:/var/runtime/...`.
test("a Node error record's file URL frames show their paths, the runtime's greyed out like dependencies", async () => {
  const request = '0f3c1b52-6d1e-4c1f-9a43-5b6f1e2d3c4a';
  const record = JSON.stringify({
    errorType: 'Error',
    errorMessage: 'quote failed',
    stack: [
      'Error: quote failed',
      '    at Runtime.handler (file:///var/task/index.mjs:7:37)',
      '    at Runtime.handleOnceNonStreaming (file:///var/runtime/index.mjs:1150:22)'
    ]
  });
  const messages: string[] = [];
  const printer = new LambdaCloudwatchLogPrinter({
    fetchSince: UNTIL,
    logGroupAwsResourceName: '/aws/lambda/quote',
    fetchPage: async () => ({
      events: [
        {
          eventId: 'e0',
          timestamp: UNTIL + 1,
          message: `2026-10-28T14:49:00.257Z\t${request}\tERROR\tInvoke Error \t${record}\n`,
          logStreamName: 's'
        }
      ]
    }),
    onLog: (message) => void messages.push(message)
  });
  const styling = [isTextStylingEnabled(), kleur.enabled] as const;
  setTextStylingEnabled(true);
  kleur.enabled = true;
  try {
    await printer.printLogs();
  } finally {
    setTextStylingEnabled(styling[0]);
    kleur.enabled = styling[1];
  }

  const [output] = messages;
  expect(output).not.toContain('file:');
  expect(output).toContain('at Runtime.handler (/var/task/index.mjs:7:37)');
  expect(output).toContain(kleur.gray('at Runtime.handleOnceNonStreaming (/var/runtime/index.mjs:1150:22)'));
  expect(output).not.toContain('./var/');
});

// r2gg: an invocation still running at a restart lost its START line, and one a second before the stop lost every
// line: neither session read them. The next session reads the end of the previous one again and skips what it showed.
test('a reader hands the events it showed to the next one, which shows only the rest of that time', async () => {
  const group = logGroup();
  const end = UNTIL;
  const first = printerFor(group, { since: end - 120_000 });
  group.add(end - 30_000);
  group.add(end - 20_000);
  await first.printer.printLogs();
  expect(first.printed).toEqual(['line 0', 'line 1']);
  // Written before the stop, but in CloudWatch only after the session's last read.
  group.add(end - 1000);

  const shown = first.printer.shownEventsSince(end - 60_000);
  expect(shown).toEqual([
    ['e0', end - 30_000],
    ['e1', end - 20_000]
  ]);
  const printed: string[] = [];
  const next = new LambdaCloudwatchLogPrinter({
    fetchSince: end - 60_000,
    logGroupAwsResourceName: '/aws/lambda/orders',
    fetchPage: group.fetchPage,
    alreadyShown: shown,
    onLog: (message) => void printed.push(/line \w+/.exec(message)![0])
  });
  await next.printLogs();
  expect(printed).toEqual(['line 2']);
});
