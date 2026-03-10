import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import { tuiState } from '../../../state';
import { PhaseList } from '../phase-list';
import { DetailPanel } from '../detail-panel';
import { Footer } from '../footer';
import { DeployDashboard } from '../deploy-dashboard';
import { DeployPhaseDetail } from '../deploy-progress';
import type { TuiEvent, TuiPhase, CfProgressData } from '../../../types';

type TestSetup = Awaited<ReturnType<typeof testRender>>;
let testSetup: TestSetup;

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy();
  }
  tuiState.reset();
});

const flushAndRender = async () => {
  tuiState.flushPendingNotifications();
  await new Promise((r) => setTimeout(r, 20));
  await testSetup.renderOnce();
};

const configureDeleteState = () => {
  tuiState.configureForDelete();
  tuiState.setHeader({ projectName: 'my-app', stageName: 'staging', region: 'eu-west-1', action: 'DELETING' });
};

const renderDeleteDashboard = async (opts: { width: number; height: number }) => {
  testSetup = await testRender(() => <DeployDashboard onQuit={() => {}} onCancel={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

// ─── Delete: Phase Configuration ─────────────────────────

describe('Delete: phase configuration', () => {
  test('configureForDelete sets exactly 2 phases', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    testSetup = await testRender(() => <PhaseList />, { width: 40, height: 20 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Initialize');
    expect(frame).toContain('Delete');
    expect(frame).not.toContain('Build & Package');
    expect(frame).not.toContain('Upload');
    expect(frame).not.toContain('Finalize');
  });

  test('only 2 phases rendered in PhaseList', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    const Wrapper = () => (
      <box height={12} width={30}>
        <PhaseList />
      </box>
    );
    testSetup = await testRender(() => <Wrapper />, { width: 40, height: 14 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Phases');
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Delete');
    expect(frame).toContain('┌');
    expect(frame).toContain('└');
  });

  test('Initialize phase shows spinner when active', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    testSetup = await testRender(() => <PhaseList />, { width: 40, height: 20 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('⠋');
  });

  test('Delete phase shows spinner when active, Initialize shows checkmark', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    tuiState.setCurrentPhase('DEPLOY');
    testSetup = await testRender(() => <PhaseList />, { width: 40, height: 20 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('✓');
    expect(frame).toContain('⠋');
  });
});

// ─── Delete: Header ──────────────────────────────────────

describe('Delete: header', () => {
  test('shows DELETING action in header', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDeleteDashboard({ width: 120, height: 40 });
    expect(frame).toContain('DELETING');
    expect(frame).toContain('my-app');
    expect(frame).toContain('staging');
    expect(frame).toContain('eu-west-1');
  });

  test('shows COMPLETED on success', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'DELETION SUCCESSFUL');
    const frame = await renderDeleteDashboard({ width: 120, height: 40 });
    expect(frame).toContain('COMPLETED');
    expect(frame).not.toContain('DELETING');
  });

  test('shows FAILED on error', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(false, 'Deletion failed');
    const frame = await renderDeleteDashboard({ width: 120, height: 40 });
    expect(frame).toContain('FAILED');
  });
});

// ─── Delete: Detail Panel ────────────────────────────────

describe('Delete: detail panel', () => {
  test('shows "Waiting for deletion" before phase starts', async () => {
    configureDeleteState();
    testSetup = await testRender(() => <DetailPanel />, { width: 60, height: 20 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Waiting for deletion');
  });

  test('Initialize phase shows events', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    tuiState.startEvent({
      eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
      description: 'Loading stack data',
      phase: 'INITIALIZE'
    });
    testSetup = await testRender(() => <DetailPanel />, { width: 80, height: 20 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Loading stack data');
  });

  test('Delete phase shows CF delete progress', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      description: 'Deleting via CloudFormation',
      phase: 'DEPLOY'
    });
    tuiState.updateEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      additionalMessage:
        'Status: Deleting resources. Progress: 5/15. Currently updating: MyLambda, MyApi. Estimate: ~33%'
    });
    testSetup = await testRender(() => <DetailPanel />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Deleting via CloudFormation');
    expect(frame).toContain('5/15');
    expect(frame).toContain('33%');
  });
});

// ─── Delete: DeployPhaseDetail with structured data ──────

describe('Delete: DeployPhaseDetail (structured data)', () => {
  const makeDeletePhase = (events: TuiEvent[]): TuiPhase => ({
    id: 'DEPLOY' as DeploymentPhase,
    name: 'Delete',
    status: 'running',
    startTime: Date.now(),
    events
  });

  const makeDeleteCfData = (overrides: Partial<CfProgressData> = {}): CfProgressData => ({
    kind: 'cloudformation-progress',
    stackAction: 'DELETE_STACK',
    status: 'active',
    completedCount: 5,
    totalPlanned: 18,
    inProgressCount: 3,
    inProgressResources: ['MyLambdaFunc', 'MyApiGateway', 'MyDynamoTable'],
    waitingResources: ['MyS3Bucket', 'MyLogGroup'],
    changeCounts: { created: 0, updated: 0, deleted: 18 },
    ...overrides
  });

  const makeDeleteEvent = (data: CfProgressData, overrides: Partial<TuiEvent> = {}): TuiEvent => ({
    id: 'DELETE_STACK',
    eventType: 'DELETE_STACK' as LoggableEventType,
    description: 'Deleting via CloudFormation',
    status: 'running',
    startTime: Date.now() - 5000,
    children: [],
    additionalMessage: 'Estimate: ~28%',
    data,
    ...overrides
  });

  test('shows "Deleting via CloudFormation" title', async () => {
    const data = makeDeleteCfData();
    const phase = makeDeletePhase([makeDeleteEvent(data)]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Deleting via CloudFormation');
  });

  test('shows delete progress from structured data', async () => {
    const data = makeDeleteCfData({ completedCount: 7, totalPlanned: 20 });
    const phase = makeDeletePhase([makeDeleteEvent(data, { additionalMessage: 'Estimate: ~35%' })]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('7/20');
    expect(frame).toContain('35%');
    expect(frame).toContain('█');
  });

  test('shows resources being deleted', async () => {
    const data = makeDeleteCfData({ inProgressResources: ['DeletingLambda', 'DeletingBucket'] });
    const phase = makeDeletePhase([makeDeleteEvent(data)]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('In progress');
    expect(frame).toContain('DeletingLambda');
    expect(frame).toContain('DeletingBucket');
  });

  test('shows queued resources for deletion', async () => {
    const data = makeDeleteCfData({ waitingResources: ['QueuedTable', 'QueuedApi'] });
    const phase = makeDeletePhase([makeDeleteEvent(data)]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Queued');
    expect(frame).toContain('QueuedTable');
    expect(frame).toContain('QueuedApi');
  });

  test('shows planned delete count', async () => {
    const data = makeDeleteCfData({ changeCounts: { created: 0, updated: 0, deleted: 15 } });
    const phase = makeDeletePhase([makeDeleteEvent(data)]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('-15 delete');
  });

  test('finished success: shows checkmark and deleted count', async () => {
    const data = makeDeleteCfData({ changeCounts: { created: 0, updated: 0, deleted: 18 } });
    const phase = makeDeletePhase([
      makeDeleteEvent(data, {
        status: 'success',
        duration: 45000,
        additionalMessage:
          'Summary: created=0 updated=0 deleted=18 Details: created=none; updated=none; deleted=Res1, Res2.'
      })
    ]);
    phase.status = 'success';
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('✓');
    expect(frame).toContain('Deleted 18');
  });

  test('finished error: shows error icon', async () => {
    const data = makeDeleteCfData({ changeCounts: { created: 0, updated: 0, deleted: 10 } });
    const phase = makeDeletePhase([makeDeleteEvent(data, { status: 'error', duration: 30000 })]);
    phase.status = 'error';
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('✗');
  });

  test('cleanup phase: shows 100% and cleanup message', async () => {
    const data = makeDeleteCfData({ status: 'cleanup' });
    const phase = makeDeletePhase([makeDeleteEvent(data)]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('100%');
    expect(frame).toContain('Cleaning up');
  });

  test('no data yet: shows waiting message', async () => {
    const event: TuiEvent = {
      id: 'DELETE_STACK',
      eventType: 'DELETE_STACK' as LoggableEventType,
      description: 'Deleting via CloudFormation',
      status: 'running',
      startTime: Date.now() - 1000,
      children: []
    };
    const phase = makeDeletePhase([event]);
    testSetup = await testRender(() => <DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Deleting via CloudFormation');
    expect(frame).toContain('Waiting for CloudFormation to start');
  });
});

// ─── Delete: Footer ──────────────────────────────────────

describe('Delete: footer', () => {
  test('shows "cancel deletion" instead of "cancel & rollback"', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDeleteDashboard({ width: 120, height: 40 });
    expect(frame).toContain('cancel deletion');
    expect(frame).not.toContain('cancel & rollback');
    expect(frame).toContain('ctrl+c');
    expect(frame).toContain('force quit');
    expect(frame).toContain('scroll');
  });

  test('shows "Cancelling deletion..." when cancelling', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    testSetup = await testRender(() => <Footer isCancelling={true} />, { width: 80, height: 3 });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Cancelling deletion');
    expect(frame).not.toContain('Rolling back');
  });

  test('shows exit hint when complete', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'DELETION SUCCESSFUL');
    const frame = await renderDeleteDashboard({ width: 120, height: 40 });
    expect(frame).toContain('q');
    expect(frame).toContain('exit');
  });
});

// ─── Delete: Cancel Confirmation Overlay ─────────────────

describe('Delete: cancel overlay', () => {
  test('pressing c shows delete-specific cancel confirmation', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });

    testSetup.mockInput.pressKey('c');
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Cancel deletion?');
    expect(frame).not.toContain('Cancel deployment?');
    expect(frame).toContain('yes, cancel');
    expect(frame).toContain('keep deleting');
  });

  test('pressing n dismisses cancel overlay', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });

    testSetup.mockInput.pressKey('c');
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Cancel deletion?');

    testSetup.mockInput.pressKey('n');
    await flushAndRender();
    expect(testSetup.captureCharFrame()).not.toContain('Cancel deletion?');
  });

  test('pressing y confirms cancellation', async () => {
    let cancelCalled = false;
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');

    testSetup = await testRender(
      () => (
        <DeployDashboard
          onQuit={() => {}}
          onCancel={() => {
            cancelCalled = true;
          }}
        />
      ),
      { width: 120, height: 40 }
    );
    await flushAndRender();

    testSetup.mockInput.pressKey('c');
    await flushAndRender();

    testSetup.mockInput.pressKey('y');
    await flushAndRender();

    expect(cancelCalled).toBe(true);
  });

  test('c is ignored when deletion is complete', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'DELETION SUCCESSFUL');
    await renderDeleteDashboard({ width: 120, height: 40 });

    testSetup.mockInput.pressKey('c');
    await flushAndRender();
    expect(testSetup.captureCharFrame()).not.toContain('Cancel deletion?');
  });
});

// ─── Delete: Keyboard Interaction ────────────────────────

describe('Delete: keyboard interaction', () => {
  test('q exits when deletion is complete', async () => {
    let quitCalled = false;
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'DELETION SUCCESSFUL');

    testSetup = await testRender(
      () => (
        <DeployDashboard
          onQuit={() => {
            quitCalled = true;
          }}
          onCancel={() => {}}
        />
      ),
      { width: 120, height: 40 }
    );
    await flushAndRender();

    testSetup.mockInput.pressKey('q');
    await flushAndRender();
    expect(quitCalled).toBe(true);
  });

  test('q is ignored during active deletion', async () => {
    let quitCalled = false;
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');

    testSetup = await testRender(
      () => (
        <DeployDashboard
          onQuit={() => {
            quitCalled = true;
          }}
          onCancel={() => {}}
        />
      ),
      { width: 120, height: 40 }
    );
    await flushAndRender();

    testSetup.mockInput.pressKey('q');
    await flushAndRender();
    expect(quitCalled).toBe(false);
  });

  test('ctrl+c triggers hard abort during deletion', async () => {
    let cancelCalled = false;
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');

    testSetup = await testRender(
      () => (
        <DeployDashboard
          onQuit={() => {}}
          onCancel={() => {
            cancelCalled = true;
          }}
        />
      ),
      { width: 120, height: 40 }
    );
    await flushAndRender();

    testSetup.mockInput.pressCtrlC();
    await flushAndRender();
    expect(cancelCalled).toBe(true);
  });
});

// ─── Delete: State Transitions ───────────────────────────

describe('Delete: state transitions', () => {
  test('phase advances from Initialize to Delete', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain('Initialize');

    tuiState.setCurrentPhase('DEPLOY');
    await flushAndRender();
    frame = testSetup.captureCharFrame();

    expect(frame).toContain('✓');
    expect(frame).toContain('Delete');
  });

  test('log messages appear during deletion', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });

    expect(testSetup.captureCharFrame()).toContain('No log entries');

    tuiState.addMessage('info', 'info', 'Deleting all deployment artifacts');
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Deleting all deployment artifacts');
    expect(frame).not.toContain('No log entries');
  });

  test('events appear in detail panel during initialization', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });

    tuiState.startEvent({
      eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
      description: 'Loading stack metadata',
      phase: 'INITIALIZE'
    });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Loading stack metadata');
  });

  test('completion transitions header from DELETING to COMPLETED', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    await renderDeleteDashboard({ width: 120, height: 40 });

    expect(testSetup.captureCharFrame()).toContain('DELETING');

    tuiState.setComplete(true, 'DELETION SUCCESSFUL');
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('COMPLETED');
    expect(frame).not.toContain('DELETING');
  });

  test('footer changes to exit hint when complete', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    await renderDeleteDashboard({ width: 120, height: 40 });

    expect(testSetup.captureCharFrame()).toContain('cancel deletion');

    tuiState.setComplete(true, 'DELETION SUCCESSFUL');
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('exit');
    expect(frame).not.toContain('cancel deletion');
  });

  test('warnings appear in log panel', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.addWarning('Termination protection was already disabled');
    await renderDeleteDashboard({ width: 120, height: 40 });
    expect(testSetup.captureCharFrame()).toContain('Termination protection was already disabled');
  });
});

// ─── Delete: Layout at Different Sizes ───────────────────

describe('Delete: responsive layout', () => {
  test('renders at standard width (120 cols)', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDeleteDashboard({ width: 120, height: 40 });
    expect(frame).toContain('DELETING');
    expect(frame).toContain('Phases');
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Delete');
    expect(frame).toContain('Log');
  });

  test('renders at narrow width (80 cols)', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDeleteDashboard({ width: 80, height: 24 });
    expect(frame).toContain('DELETING');
    expect(frame).toContain('Phases');
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Log');
  });

  test('renders at minimal height (20 rows)', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDeleteDashboard({ width: 120, height: 20 });
    expect(frame).toContain('my-app');
    expect(frame).toContain('Phases');
  });

  test('header is visible at narrow width', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    const frame = await renderDeleteDashboard({ width: 80, height: 24 });
    expect(frame).toContain('my-app');
    expect(frame).toContain('staging');
  });

  test('footer is visible at narrow width', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('DEPLOY');
    const frame = await renderDeleteDashboard({ width: 80, height: 24 });
    expect(frame).toContain('ctrl+c');
  });
});

// ─── Delete: Full Lifecycle Simulation ───────────────────

describe('Delete: full lifecycle', () => {
  test('simulates complete delete flow: init → delete → complete', async () => {
    configureDeleteState();

    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain('DELETING');
    expect(frame).toContain('⠋');

    tuiState.startEvent({
      eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
      description: 'Loading stack metadata',
      phase: 'INITIALIZE'
    });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Loading stack metadata');

    tuiState.finishEvent({
      eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
      finalMessage: 'Stack found'
    });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('✓');

    tuiState.setCurrentPhase('DEPLOY');
    await flushAndRender();
    frame = testSetup.captureCharFrame();
    expect(frame).toContain('Delete');

    tuiState.startEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      description: 'Deleting via CloudFormation',
      phase: 'DEPLOY'
    });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Deleting via CloudFormation');

    tuiState.updateEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      additionalMessage: 'Status: Deleting resources. Progress: 8/15. Currently updating: MyFunc. Estimate: ~53%'
    });
    await flushAndRender();
    frame = testSetup.captureCharFrame();
    expect(frame).toContain('8/15');
    expect(frame).toContain('53%');

    tuiState.finishEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      finalMessage: 'Stack deleted'
    });
    await flushAndRender();

    tuiState.setComplete(true, 'DELETION SUCCESSFUL');
    await flushAndRender();
    frame = testSetup.captureCharFrame();
    expect(frame).toContain('COMPLETED');
    expect(frame).toContain('exit');
    expect(frame).not.toContain('DELETING');
  });

  test('simulates failed delete flow', async () => {
    configureDeleteState();
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDeleteDashboard({ width: 120, height: 40 });

    tuiState.setCurrentPhase('DEPLOY');
    await flushAndRender();

    tuiState.startEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      description: 'Deleting via CloudFormation',
      phase: 'DEPLOY'
    });
    await flushAndRender();

    tuiState.finishEvent({
      eventType: 'DELETE_STACK' as LoggableEventType,
      status: 'error'
    });
    tuiState.setComplete(false, 'Deletion failed');
    await flushAndRender();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('FAILED');
    expect(frame).toContain('✗');
    expect(frame).toContain('exit');
  });
});
