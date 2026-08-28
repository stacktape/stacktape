import { beforeEach, describe, expect, test } from 'bun:test';
import { operationSession } from '@application-services/operation-manager';
import { TuiStateSink } from '../sink';
import { tuiState } from '../state';
import { sessionElapsedMs } from '../types';

let sink: TuiStateSink;

beforeEach(() => {
  tuiState.reset();
  sink = new TuiStateSink();
});

describe('TuiStateSink journal adapter', () => {
  test('allocates a stable activity id and finishes that activity', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    const running = tuiState.getSnapshot().phases[1].events[0];
    sink.updateEvent({ eventType: 'PACKAGE_ARTIFACTS', additionalMessage: '2 of 4' });
    sink.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: 'Packaged' });

    const finished = tuiState.getSnapshot().phases[1].events[0];
    expect(finished.id).toBe(running.id);
    expect(finished).toMatchObject({ status: 'success', additionalMessage: '2 of 4', finalMessage: 'Packaged' });
  });

  test('represents parent and child activity without correlation by display id', () => {
    sink.setPhase('BUILD_AND_PACKAGE');
    sink.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
    sink.startEvent({
      eventType: 'BUILD_CODE',
      description: 'Building API',
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'api-default'
    });
    sink.appendEventOutput({
      eventType: 'BUILD_CODE',
      instanceId: 'api-default',
      lines: ['\u001b[31mbuild output\u001b[0m']
    });
    sink.finishEvent({
      eventType: 'BUILD_CODE',
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'api-default',
      finalMessage: 'API built'
    });

    const parent = tuiState.getSnapshot().phases[1].events[0];
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toMatchObject({
      instanceId: 'api-default',
      status: 'success',
      finalMessage: 'API built',
      outputLines: ['build output']
    });
    expect(parent.children[0].id).not.toBe('BUILD_CODE-api-default');
  });

  test('strips all terminal control sequences before state replay', () => {
    sink.startEvent({ eventType: 'LOAD_USER_DATA', description: '\u001b[1mLoading\u001b[0m user data' });
    sink.finishEvent({
      eventType: 'LOAD_USER_DATA',
      finalMessage: 'User: \u001b]8;;https://example.com\u0007Ada\u001b]8;;\u0007'
    });
    const event = tuiState.getSnapshot().phases[0].events[0];
    expect(event.description).toBe('Loading user data');
    expect(event.finalMessage).toBe('User: Ada');
  });

  test('retains structured progress detail when finish has no detail', () => {
    sink.setPhase('DEPLOY');
    sink.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating stack' });
    sink.updateEvent({
      eventType: 'UPDATE_STACK',
      detail: {
        kind: 'cloudformation-progress',
        stackAction: 'update',
        completedCount: 3,
        totalPlanned: 8,
        changeCounts: { created: 1, updated: 2, deleted: 0 }
      }
    });
    sink.finishEvent({ eventType: 'UPDATE_STACK' });
    expect(tuiState.getSnapshot().phases.find((phase) => phase.id === 'DEPLOY')?.events[0].data).toMatchObject({
      kind: 'cloudformation-progress',
      completedCount: 3
    });
  });

  test('keeps repeated lifecycles as distinct stable activities', () => {
    sink.startEvent({ eventType: 'FETCH_STACK_DATA', description: 'First fetch' });
    sink.finishEvent({ eventType: 'FETCH_STACK_DATA' });
    sink.startEvent({ eventType: 'FETCH_STACK_DATA', description: 'Second fetch' });
    sink.finishEvent({ eventType: 'FETCH_STACK_DATA' });
    const events = tuiState.getSnapshot().phases[0].events;
    expect(events).toHaveLength(2);
    expect(events[0].id).not.toBe(events[1].id);
  });

  test('marks every active phase and activity as errored on fatal failure', () => {
    sink.setPhase('UPLOAD');
    sink.startEvent({ eventType: 'UPLOAD_IMAGE', description: 'Uploading image' });
    sink.markAllRunningAsErrored();
    const state = tuiState.getSnapshot();
    expect(state.phases.find((phase) => phase.id === 'UPLOAD')?.status).toBe('error');
    expect(state.phases.find((phase) => phase.id === 'UPLOAD')?.events[0].status).toBe('error');
  });

  test('journal sequence is monotonic across mixed records', () => {
    sink.setPhase('INITIALIZE');
    sink.startEvent({ eventType: 'LOAD_CONFIG_FILE', description: 'Loading config' });
    sink.addMessage('warn', 'A warning');
    sink.finishEvent({ eventType: 'LOAD_CONFIG_FILE' });
    const sequences = operationSession.journal.replay().map((record) => record.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(new Set(sequences).size).toBe(sequences.length);
  });
});

describe('session clock input pause', () => {
  test('excludes time spent waiting on a prompt', async () => {
    const before = Date.now();
    tuiState.setActivePrompt({ type: 'confirm', message: 'Deploy?' });
    await new Promise((resolve) => setTimeout(resolve, 12));
    tuiState.clearActivePrompt();
    const state = tuiState.getSnapshot();
    expect(state.inputPausedMs).toBeGreaterThanOrEqual(8);
    expect(sessionElapsedMs(state, Date.now())).toBeLessThan(Date.now() - before);
  });
});
