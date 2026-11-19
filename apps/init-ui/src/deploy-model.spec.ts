import { describe, expect, it } from 'bun:test';
import { buildDeployModel, type DeployEvent } from './deploy-model';

const event = (overrides: Partial<DeployEvent>): DeployEvent => ({ type: 'event', status: 'started', ...overrides });

describe('the deploy model', () => {
  it('marks a phase done only once the next one starts', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', message: 'Loading configuration' }),
        event({ phase: 'BUILD_AND_PACKAGE', message: 'Building api' })
      ],
      []
    );

    expect(model.phases.map((phase) => [phase.label, phase.status])).toEqual([
      ['Getting ready', 'done'],
      ['Building your code', 'running']
    ]);
  });

  it('stops the last phase spinning once the deploy has stopped', () => {
    const events = [
      event({ phase: 'INITIALIZE', message: 'Loading configuration' }),
      event({ phase: 'DEPLOY', message: 'Creating resources' })
    ];

    expect(buildDeployModel(events, []).phases.map((phase) => phase.status)).toEqual(['done', 'running']);
    // Nothing in the stream says a phase ended — only the deploy ending does.
    expect(buildDeployModel(events, [], 'succeeded').phases.map((phase) => phase.status)).toEqual(['done', 'done']);
    // A failed deploy broke in the phase it last reported, not after every phase finished.
    expect(buildDeployModel(events, [], 'failed').phases.map((phase) => phase.status)).toEqual(['done', 'failed']);
  });

  it('keeps CloudFormation progress on the phase that reported it', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', message: 'Loading configuration' }),
        event({
          phase: 'DEPLOY',
          status: 'running',
          message: 'Creating resources',
          detail: {
            kind: 'cloudformation-progress',
            percent: 42,
            completedCount: 5,
            totalPlanned: 12,
            inProgressResources: ['ApiFunction', 'CacheCluster']
          }
        })
      ],
      []
    );

    const deploy = model.phases.find((phase) => phase.id === 'DEPLOY');
    expect(deploy?.cloudformation).toEqual({
      percent: 42,
      completed: 5,
      total: 12,
      inProgress: ['ApiFunction', 'CacheCluster']
    });
  });

  it('surfaces warnings and errors separately from the log', () => {
    const model = buildDeployModel(
      [
        { type: 'log', level: 'info', message: 'Using profile default' },
        { type: 'log', level: 'warn', message: 'Bucket name already taken, adding a suffix' },
        { type: 'log', level: 'error', message: 'Stack rolled back' }
      ],
      ['a line straight from stderr']
    );

    expect(model.notices).toEqual([
      { level: 'warn', message: 'Bucket name already taken, adding a suffix' },
      { level: 'error', message: 'Stack rolled back' }
    ]);
    // Everything is still in the log, including the unparsed output.
    expect(model.log).toContain('Using profile default');
    expect(model.log).toContain('a line straight from stderr');
  });

  it('times each phase from its first event to the next phase, and the last one to the end of the deploy', () => {
    const events = [
      event({ phase: 'INITIALIZE', ts: '2026-11-19T10:00:00.000Z' }),
      event({ phase: 'INITIALIZE', ts: '2026-11-19T10:00:04.000Z' }),
      event({ phase: 'DEPLOY', ts: '2026-11-19T10:00:10.000Z' }),
      { type: 'result', ts: '2026-11-19T10:06:10.000Z', ok: true }
    ];

    const running = buildDeployModel(events.slice(0, 3), []);
    expect(running.phases.map((phase) => [phase.id, phase.startedAt, phase.endedAt])).toEqual([
      ['INITIALIZE', Date.parse('2026-11-19T10:00:00.000Z'), Date.parse('2026-11-19T10:00:10.000Z')],
      // Still running: no end yet.
      ['DEPLOY', Date.parse('2026-11-19T10:00:10.000Z'), undefined]
    ]);
    const finished = buildDeployModel(events, [], 'succeeded');
    expect(finished.phases.at(-1)?.endedAt).toBe(Date.parse('2026-11-19T10:06:10.000Z'));
  });
});
