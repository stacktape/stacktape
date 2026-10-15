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
 * `cloudFormation.getEvents` is the boundary between the pages CloudFormation returns and the events the deployment monitor can
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
    return manager.cloudFormation.getEvents('test-stack', since);
  };

  afterEach(() => {
    if (stubInstalledByThisTest) {
      CloudFormationClient.prototype.send = originalSend;
      stubInstalledByThisTest = false;
    }
    sentCommands = [];
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
});
