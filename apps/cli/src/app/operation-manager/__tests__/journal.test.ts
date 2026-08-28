import { describe, expect, test } from 'bun:test';
import { OperationJournal } from '../journal';
import { createInitialOperationState, replayOperationRecords } from '../reducer';

describe('OperationJournal', () => {
  test('assigns monotonic sequence numbers and replays from a cursor', () => {
    const journal = new OperationJournal();
    const first = journal.append({ type: 'phase-entered', phase: 'INITIALIZE' }, 10);
    const second = journal.append({ type: 'phase-entered', phase: 'DEPLOY' }, 20);

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(journal.replay(1)).toEqual([second]);
  });

  test('replay is deterministic and retains stable activity identity', () => {
    const journal = new OperationJournal();
    journal.append({ type: 'session-configured', preset: 'deploy', showPhaseHeaders: true }, 1);
    journal.append({ type: 'phase-entered', phase: 'BUILD_AND_PACKAGE' }, 2);
    journal.append(
      {
        type: 'activity-started',
        activity: {
          id: 'activity-1',
          eventType: 'PACKAGE_ARTIFACTS',
          description: 'Packaging',
          phase: 'BUILD_AND_PACKAGE',
          status: 'running',
          startTime: 3,
          outputLines: []
        }
      },
      3
    );
    journal.append({ type: 'activity-output', activityId: 'activity-1', lines: ['one'], stream: 'stdout' }, 4);
    journal.append(
      { type: 'activity-finished', activityId: 'activity-1', status: 'success', finalMessage: 'Packaged' },
      5
    );

    const initial = createInitialOperationState('deploy', 1);
    const first = replayOperationRecords(journal.replay(), initial);
    const second = replayOperationRecords(journal.replay(), initial);
    expect(second).toEqual(first);
    expect(first.activities['activity-1']).toMatchObject({
      id: 'activity-1',
      status: 'success',
      finalMessage: 'Packaged',
      outputLines: ['one']
    });
  });
});
