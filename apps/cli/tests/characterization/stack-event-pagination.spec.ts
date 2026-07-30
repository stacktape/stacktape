import { afterEach, describe, expect, test } from 'bun:test';
import { CloudFormationClient, DescribeStackEventsCommand } from '@aws-sdk/client-cloudformation';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import type { StackEvent } from '@aws-sdk/client-cloudformation';

const originalSend = CloudFormationClient.prototype.send;

const CUTOFF = new Date('2026-01-01T12:00:00.000Z');
const at = (minutesFromCutoff: number) => new Date(CUTOFF.getTime() + minutesFromCutoff * 60_000);

/**
 * A complete, monitorable resource event.
 *
 * Fixtures are `Partial<StackEvent>` on purpose. `StackId`, `EventId`, `StackName` and `Timestamp` are required keys
 * on the SDK type — their *values* may be `undefined`, but the keys must be written — while the resource fields are
 * optional keys. These fixtures model the raw page instead: what CloudFormation can actually put on the wire,
 * including whole keys it omits. That is precisely the shape this boundary exists to survive, and a `StackEvent`
 * annotation could not express it without a cast.
 */
const resourceEvent = (id: string, timestamp: Date, overrides: Partial<StackEvent> = {}): Partial<StackEvent> => ({
  EventId: id,
  Timestamp: timestamp,
  LogicalResourceId: `Resource${id}`,
  ResourceStatus: 'CREATE_COMPLETE',
  StackId: 'stack-id',
  StackName: 'test-stack',
  ...overrides
});

/**
 * `getStackEvents` is the boundary between the pages CloudFormation returns and the events the deployment monitor can
 * act on. These pin what it keeps, what it drops, and when it stops asking for more.
 *
 * The only seam is `CloudFormationClient.prototype.send`, which is global to the process, so the same discipline the
 * AWS-manager suite uses applies here and for the same reasons: `describe.serial` states the intent but does not by
 * itself override `bun test --concurrent` on Bun 1.3.9, so every case is `test.serial`; restoration is
 * ownership-based, so a case that never stubbed cannot put the real network method back while another is mid-flight;
 * and `fetchEvents` refuses to run un-stubbed, so a missing stub fails in-process instead of reaching CloudFormation.
 *
 * This suite deliberately does not share a file with the STS suite — one global stub per file keeps the ownership
 * flag unambiguous.
 */
describe.serial('stack event pagination', () => {
  let sentCommands: DescribeStackEventsCommand[] = [];
  let stubInstalledByThisTest = false;

  const stubPages = (pages: { StackEvents?: Partial<StackEvent>[]; NextToken?: string }[]) => {
    sentCommands = [];
    // `unknown`, because `send` is overloaded across every CloudFormation command and this stub sits in front of all
    // of them. Anything that is not the command under test is refused rather than answered with a stack-events page,
    // so a stray call cannot quietly consume a fixture or read as a passing assertion.
    const stubbedSend = (command: unknown) => {
      if (!(command instanceof DescribeStackEventsCommand)) {
        throw new Error('Refusing to answer a non-DescribeStackEvents command with stack event pages.');
      }
      sentCommands.push(command);
      const page = pages[sentCommands.length - 1];
      if (!page) {
        throw new Error(`Unexpected DescribeStackEvents request number ${sentCommands.length}.`);
      }
      return Promise.resolve(page);
    };
    CloudFormationClient.prototype.send = stubbedSend as unknown as typeof originalSend;
    stubInstalledByThisTest = true;
  };

  const fetchEvents = (since = CUTOFF) => {
    if (!stubInstalledByThisTest) {
      throw new Error('Refusing to call DescribeStackEvents without a stubbed CloudFormationClient.prototype.send.');
    }
    const manager = new AwsSdkManager();
    manager.init({ credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' }, region: 'eu-west-1' });
    return manager.getStackEvents('test-stack', since);
  };

  afterEach(() => {
    if (stubInstalledByThisTest) {
      CloudFormationClient.prototype.send = originalSend;
      stubInstalledByThisTest = false;
    }
    sentCommands = [];
  });

  const tokensOf = () => sentCommands.map((command) => command.input.NextToken);

  test.serial('asks for the stack by name first and then follows each page token', async () => {
    stubPages([
      { StackEvents: [resourceEvent('a', at(3))], NextToken: 'page-2' },
      { StackEvents: [resourceEvent('b', at(2))], NextToken: 'page-3' },
      { StackEvents: [resourceEvent('c', at(1))] }
    ]);

    await fetchEvents();

    expect(sentCommands).toHaveLength(3);
    expect(sentCommands[0].input).toEqual({ StackName: 'test-stack' });
    expect(tokensOf()).toEqual([undefined, 'page-2', 'page-3']);
    expect(sentCommands.every((command) => command.input.StackName === 'test-stack')).toBe(true);
  });

  test.serial('keeps CloudFormation newest-first order across pages', async () => {
    stubPages([
      { StackEvents: [resourceEvent('a', at(4)), resourceEvent('b', at(3))], NextToken: 'page-2' },
      { StackEvents: [resourceEvent('c', at(2)), resourceEvent('d', at(1))] }
    ]);

    const events = await fetchEvents();

    expect(events.map(({ EventId }) => EventId)).toEqual(['a', 'b', 'c', 'd']);
  });

  test.serial('a single reversal by the monitor yields oldest-first processing order', async () => {
    // The monitor reverses once before processing; that is only correct while this stays newest-first.
    stubPages([{ StackEvents: [resourceEvent('a', at(3)), resourceEvent('b', at(2)), resourceEvent('c', at(1))] }]);

    const events = await fetchEvents();
    events.reverse();

    expect(events.map(({ EventId }) => EventId)).toEqual(['c', 'b', 'a']);
    expect(events.map(({ Timestamp }) => Timestamp.getTime())).toEqual([
      at(1).getTime(),
      at(2).getTime(),
      at(3).getTime()
    ]);
  });

  test.serial('drops events older than the cutoff on the terminal page too', async () => {
    // The terminal page used to be appended wholesale, so a stale event from it could seed monitoring state. Both
    // pages are filtered now.
    // Page one stays entirely at or after the cutoff so that it is not itself the boundary page; page two is the
    // terminal one, and it is the page the old implementation appended without filtering.
    stubPages([
      { StackEvents: [resourceEvent('new', at(2))], NextToken: 'page-2' },
      { StackEvents: [resourceEvent('boundary', at(0)), resourceEvent('stale-last-page', at(-5))] }
    ]);

    const events = await fetchEvents();

    // The cutoff is inclusive, exactly as before.
    expect(events.map(({ EventId }) => EventId)).toEqual(['new', 'boundary']);
  });

  test.serial('stops at the page whose oldest event predates the cutoff without asking for another', async () => {
    stubPages([
      { StackEvents: [resourceEvent('a', at(5))], NextToken: 'page-2' },
      { StackEvents: [resourceEvent('b', at(1)), resourceEvent('c', at(-1))], NextToken: 'page-3' }
    ]);

    const events = await fetchEvents();

    expect(sentCommands).toHaveLength(2);
    expect(events.map(({ EventId }) => EventId)).toEqual(['a', 'b']);
  });

  test.serial('continues past an empty page that still carries a token', async () => {
    stubPages([
      { StackEvents: [resourceEvent('a', at(3))], NextToken: 'page-2' },
      { StackEvents: [], NextToken: 'page-3' },
      { StackEvents: [resourceEvent('b', at(1))] }
    ]);

    const events = await fetchEvents();

    expect(sentCommands).toHaveLength(3);
    expect(events.map(({ EventId }) => EventId)).toEqual(['a', 'b']);
  });

  test.serial('treats an omitted event array as an empty page and keeps going', async () => {
    stubPages([
      { StackEvents: [resourceEvent('a', at(3))], NextToken: 'page-2' },
      { NextToken: 'page-3' },
      { StackEvents: [resourceEvent('b', at(1))] }
    ]);

    const events = await fetchEvents();

    expect(sentCommands).toHaveLength(3);
    expect(events.map(({ EventId }) => EventId)).toEqual(['a', 'b']);
  });

  test.serial('continues past a page whose events carry no usable timestamp', async () => {
    // A page made only of hook events has no boundary to compare against, so it cannot end pagination early.
    stubPages([
      { StackEvents: [resourceEvent('a', at(3))], NextToken: 'page-2' },
      { StackEvents: [{ EventId: 'hook', StackName: 'test-stack' }], NextToken: 'page-3' },
      { StackEvents: [resourceEvent('b', at(1))] }
    ]);

    const events = await fetchEvents();

    expect(sentCommands).toHaveLength(3);
    expect(events.map(({ EventId }) => EventId)).toEqual(['a', 'b']);
  });

  test.serial('excludes hook and incomplete events from the monitorable result', async () => {
    stubPages([
      {
        StackEvents: [
          resourceEvent('complete', at(5)),
          { EventId: 'hook-no-resource-fields', Timestamp: at(4), StackName: 'test-stack' },
          resourceEvent('no-event-id', at(3), { EventId: undefined }),
          resourceEvent('no-logical-id', at(3), { LogicalResourceId: undefined }),
          resourceEvent('no-status', at(3), { ResourceStatus: undefined }),
          resourceEvent('no-timestamp', at(3), { Timestamp: undefined }),
          resourceEvent('invalid-timestamp', at(3), { Timestamp: new Date('nonsense') }),
          resourceEvent('also-complete', at(1))
        ]
      }
    ]);

    const events = await fetchEvents();

    // Only the two events carrying all four monitored fields survive; the rest are ignored rather than crashing
    // monitoring on a missing field.
    expect(events.map(({ EventId }) => EventId)).toEqual(['complete', 'also-complete']);
  });

  test.serial('returns nothing when a single page holds only events older than the cutoff', async () => {
    stubPages([{ StackEvents: [resourceEvent('stale', at(-1))] }]);

    const events = await fetchEvents();

    expect(sentCommands).toHaveLength(1);
    expect(events).toEqual([]);
  });

  test.serial('routes a request failure through the configured error handler', async () => {
    stubPages([]);
    CloudFormationClient.prototype.send = (() =>
      Promise.reject(new Error('Throttling'))) as unknown as typeof originalSend;
    const seen: string[] = [];
    const manager = new AwsSdkManager();
    manager.init({
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
      region: 'eu-west-1',
      getErrorHandlerFn: (message: string) => (error: Error) => {
        seen.push(message);
        throw error;
      }
    });

    await expect(manager.getStackEvents('test-stack', CUTOFF)).rejects.toThrow('Throttling');

    expect(seen).toEqual(['Failed to fetch stack events.']);
  });

  test.serial('refuses a CloudFormation command other than DescribeStackEvents', async () => {
    // Keeps the guard above non-vacuous: `getStackResources` reaches the same stubbed `send` with a different command.
    stubPages([{ StackEvents: [resourceEvent('a', at(1))] }]);
    const manager = new AwsSdkManager();
    manager.init({ credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' }, region: 'eu-west-1' });

    await expect(manager.getStackResources('test-stack')).rejects.toThrow(/non-DescribeStackEvents command/);

    // The refused call is not recorded, so it cannot be mistaken for a page request.
    expect(sentCommands).toHaveLength(0);
  });

  test.serial('restores the real send implementation between tests', () => {
    expect(CloudFormationClient.prototype.send).toBe(originalSend);
  });
});
