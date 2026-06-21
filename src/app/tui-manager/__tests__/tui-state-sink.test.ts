import { describe, test, expect, beforeEach } from 'bun:test';
import { scrollbackFeed, type ScrollbackItem } from '../scrollback-feed';
import { tuiState } from '../state';
import { TuiStateSink } from '../tui-state-sink';

let sink: TuiStateSink;
let received: ScrollbackItem[];

beforeEach(() => {
  tuiState.reset();
  scrollbackFeed.reset();
  scrollbackFeed.enable();
  received = [];
  scrollbackFeed.setConsumer((item) => received.push(item));
  sink = new TuiStateSink();
});

describe('TuiStateSink scrollback emission', () => {
  test('setHeader emits a header item once', () => {
    const header = { projectName: 'app', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' as const };
    sink.setHeader(header);
    sink.setHeader(header);

    const headers = received.filter((i) => i.kind === 'header');
    expect(headers).toHaveLength(1);
  });

  test('finished top-level event streams with a lazy phase header', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    sink.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: 'done' });

    expect(received.map((i) => i.kind)).toEqual(['phase-header', 'event']);
    const eventItem = received[1] as Extract<ScrollbackItem, { kind: 'event' }>;
    expect(eventItem.event.description).toBe('Packaging artifacts');
    expect(eventItem.event.status).toBe('success');
  });

  test('second event in the same phase emits no duplicate phase header', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'first' });
    sink.finishEvent({ eventType: 'PACKAGE_ARTIFACTS' });
    sink.startEvent({ eventType: 'BUILD_IMAGE', description: 'second' });
    sink.finishEvent({ eventType: 'BUILD_IMAGE' });

    expect(received.filter((i) => i.kind === 'phase-header')).toHaveLength(1);
    expect(received.filter((i) => i.kind === 'event')).toHaveLength(2);
  });

  test('child events do not stream on their own', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'parent' });
    sink.startEvent({
      eventType: 'BUILD_CODE',
      description: 'child',
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'api'
    });
    sink.finishEvent({ eventType: 'BUILD_CODE', parentEventType: 'PACKAGE_ARTIFACTS', instanceId: 'api' });

    expect(received.filter((i) => i.kind === 'event')).toHaveLength(0);

    sink.finishEvent({ eventType: 'PACKAGE_ARTIFACTS' });
    const events = received.filter((i) => i.kind === 'event') as Extract<ScrollbackItem, { kind: 'event' }>[];
    expect(events).toHaveLength(1);
    expect(events[0].event.children).toHaveLength(1);
  });

  test('phase headers are suppressed in simple mode', () => {
    tuiState.setShowPhaseHeaders(false);
    sink.setPhase('INITIALIZE');
    sink.startEvent({ eventType: 'LOAD_METADATA_FROM_AWS', description: 'Loading' });
    sink.finishEvent({ eventType: 'LOAD_METADATA_FROM_AWS' });

    expect(received.filter((i) => i.kind === 'phase-header')).toHaveLength(0);
    expect(received.filter((i) => i.kind === 'event')).toHaveLength(1);
  });

  test('addMessage streams a message item', () => {
    sink.addMessage('warn', 'careful');
    expect(received).toEqual([{ kind: 'message', type: 'warn', text: 'careful' }]);
  });

  test('event output streams line-by-line, unprefixed when a single source is active', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({
      eventType: 'RUN_SCRIPT',
      description: 'Running script db-migrate',
      instanceId: 'manual-db-migrate'
    });
    sink.appendEventOutput({ eventType: 'RUN_SCRIPT', instanceId: 'manual-db-migrate', lines: ['line 1', 'line 2'] });

    const outputs = received.filter((i) => i.kind === 'output-line') as Extract<
      ScrollbackItem,
      { kind: 'output-line' }
    >[];
    expect(outputs.map((o) => o.line)).toEqual(['line 1', 'line 2']);
    expect(outputs.every((o) => o.source === undefined)).toBe(true);
    // phase header must precede the streamed output
    expect(received[0].kind).toBe('phase-header');
  });

  test('concurrent sources get a [source] prefix', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({ eventType: 'RUN_SCRIPT', description: 'a', instanceId: 'manual-a' });
    sink.startEvent({ eventType: 'BUILD_IMAGE', description: 'b', instanceId: 'b' });
    sink.appendEventOutput({ eventType: 'RUN_SCRIPT', instanceId: 'manual-a', lines: ['from a'] });
    sink.appendEventOutput({ eventType: 'BUILD_IMAGE', instanceId: 'b', lines: ['from b'] });

    const outputs = received.filter((i) => i.kind === 'output-line') as Extract<
      ScrollbackItem,
      { kind: 'output-line' }
    >[];
    // first source alone → no prefix; once the second streams, both are prefixed
    expect(outputs[0]).toMatchObject({ line: 'from a', source: undefined });
    expect(outputs[1]).toMatchObject({ line: 'from b', source: 'BUILD_IMAGE-b' });
  });

  test('finished event one-liner streams without repeating its output lines', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({
      eventType: 'RUN_SCRIPT',
      description: 'Running script db-migrate',
      instanceId: 'manual-db-migrate'
    });
    sink.appendEventOutput({ eventType: 'RUN_SCRIPT', instanceId: 'manual-db-migrate', lines: ['out'] });
    sink.finishEvent({ eventType: 'RUN_SCRIPT', instanceId: 'manual-db-migrate' });

    const events = received.filter((i) => i.kind === 'event') as Extract<ScrollbackItem, { kind: 'event' }>[];
    expect(events).toHaveLength(1);
    expect(events[0].event.outputLines).toBeUndefined();
  });
});
