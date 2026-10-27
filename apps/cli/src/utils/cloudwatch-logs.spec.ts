import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { describe, expect, test } from 'bun:test';
import { LambdaCloudwatchLogPrinter } from './cloudwatch-logs';

const HOUR = 3_600_000;
const UNTIL = 1_800_000_000_000;

/**
 * A log group as `FilterLogEvents` reads it: events between `startTime` and `endTime` (both inclusive), oldest first, at
 * most `limit` (and `pageSize`) per request, with a token for the next page. Like CloudWatch (seen live in us-west-2 on
 * 27 Oct 2026), it returns a token after every page with events, also the last one; the page after it is empty.
 */
const logGroup = ({ pageSize = 10_000 }: { pageSize?: number } = {}) => {
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
      const end = params.endTime === undefined ? events.length : firstAtOrAfter(params.endTime + 1);
      const from = params.nextToken ? Number(params.nextToken) : firstAtOrAfter(params.startTime);
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
  const printer = new LambdaCloudwatchLogPrinter({
    fetchSince: options.since,
    logGroupAwsResourceName: '/aws/lambda/orders',
    fetchPage: group.fetchPage,
    filterPattern: options.filterPattern,
    onLog: (message) => printed.push(/line \w+/.exec(message)![0]),
    ...(options.backlog ? { backlog: { lines: options.backlog, until: UNTIL } } : {})
  });
  /** Polls until the backlog is shown, as the scheduler does while a poll asks for more. */
  const readBacklog = async () => {
    for (let poll = 0; poll < 50; poll++) if (!(await printer.printLogs()).more) return;
    throw new Error('The backlog did not finish');
  };
  return { printer, printed, readBacklog };
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
    expect(group.requests.map(({ filterPattern }) => filterPattern)).toEqual(['ERROR', 'ERROR', 'ERROR']);
  });

  test('a quiet log group: every line of the hour in one page', async () => {
    const group = logGroup();
    for (let index = 0; index < 30; index++) group.add(UNTIL - HOUR + 1 + index * 100_000);
    const { printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 100 });
    await readBacklog();
    // And the empty page after it.
    expect(group.requests).toHaveLength(2);
    expect(printed).toEqual(Array.from({ length: 30 }, (_, index) => `line ${index}`));
  });

  test('a burst 40 minutes ago and a busy last minute: exactly the newest lines', async () => {
    const group = logGroup();
    for (let index = 0; index < 50; index++) group.add(UNTIL - 40 * 60_000 + index);
    for (let index = 0; index < 80; index++) group.add(UNTIL - 60_000 + index * 700);
    const { printed, readBacklog } = printerFor(group, { since: UNTIL - HOUR, backlog: 100 });
    await readBacklog();
    expect(group.requests.length).toBeLessThanOrEqual(6);
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

describe('following a log group', () => {
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
