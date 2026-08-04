import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import { tuiState } from '../../state';
import { ProgressDashboard } from '../dashboard';

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

const renderDashboard = async (opts = { width: 100, height: 13 }) => {
  testSetup = await testRender(() => <ProgressDashboard onQuit={() => {}} onCancel={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

const frameLines = (frame: string) => frame.replace(/\n$/, '').split('\n');

const initDeployState = () => {
  tuiState.setHeader({ projectName: 'my-app', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
  tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
};

const cfDetail = (completed: number) => ({
  kind: 'cloudformation-progress',
  stackAction: 'update',
  status: 'active',
  completedCount: completed,
  totalPlanned: 14,
  inProgressCount: 2,
  inProgressResources: ['web-service', 'main-database'],
  inProgressDetails: [
    { name: 'web-service', action: 'UPDATE' as const, resourceType: 'AWS::ECS::Service', since: 1 },
    { name: 'main-database', action: 'UPDATE' as const, resourceType: 'AWS::RDS::DBCluster', since: 2 }
  ],
  waitingResources: ['cdn'],
  changeCounts: { created: 3, updated: 9, deleted: 2 }
});

describe('ProgressDashboard footer', () => {
  test('renders divider, identity and clock', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('stacktape / deploy');
    expect(frame).toContain('my-app / dev');
    expect(frame).toContain('eu-west-1');
    expect(frame).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('renders the phase rail with a spinner on the active phase', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('✓ Initialize');
    expect(frame).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] Package/);
    expect(frame).toContain('· Deploy');
    expect(frame).toContain('· Finalize');
  });

  test('hides the rail in simple mode and keeps 9-row layout', async () => {
    initDeployState();
    tuiState.setShowPhaseHeaders(false);
    const frame = await renderDashboard({ width: 100, height: 9 });
    expect(frame).not.toContain('Finalize');
    expect(frameLines(frame)).toHaveLength(9);
  });

  test('live area shows running events but not finished ones', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    tuiState.startEvent({ eventType: 'LOAD_METADATA_FROM_AWS', description: 'Loading metadata' });
    tuiState.finishEvent({ eventType: 'LOAD_METADATA_FROM_AWS' });

    const frame = await renderDashboard();
    expect(frame).toContain('Packaging artifacts');
    expect(frame).not.toContain('Loading metadata');
  });

  test('finished children show only their outcome message', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
    tuiState.startEvent({
      eventType: 'BUILD_CODE',
      description: 'Building api-lambda',
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'api-lambda'
    });
    tuiState.finishEvent({
      eventType: 'BUILD_CODE',
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'api-lambda',
      finalMessage: 'api-lambda packaged (4.1 MB)'
    });

    const frame = await renderDashboard();
    // Name column + outcome column, with the repeated name prefix stripped.
    expect(frame).toContain('api-lambda  packaged (4.1 MB)');
    expect(frame).not.toContain('api-lambda  api-lambda');
  });

  test('buffered output never surfaces while an event is running', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
    tuiState.appendEventOutput({
      eventType: 'PACKAGE_ARTIFACTS',
      lines: ['#2 transferring context', '#6 RUN bun install']
    });

    const frame = await renderDashboard();
    expect(frame).toContain('Packaging workloads');
    expect(frame).not.toContain('#6 RUN bun install');
    expect(frame).not.toContain('#2 transferring context');
  });

  test('CF panel renders verb columns, honest progress and queue aggregate', async () => {
    initDeployState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.updateEvent({ eventType: 'UPDATE_STACK', data: cfDetail(5) });

    const frame = await renderDashboard();
    expect(frame).toContain('CloudFormation update');
    expect(frame).toContain('36% ·  5/14 complete');
    expect(frame).toContain('UPDATE  web-service');
    expect(frame).toContain('AWS::ECS::Service');
    expect(frame).toContain('3 CREATE · 9 UPDATE · 2 DELETE');
  });

  test('hints are phase-honest', async () => {
    initDeployState();
    const early = await renderDashboard();
    // Before a cancellable operation exists, only plain cancel is offered.
    expect(early).toContain('ctrl+c cancel');
    expect(early).not.toContain('roll back');

    tuiState.setCancelDeployment({ message: 'Deployment in progress.', onCancel: () => {} });
    await flushAndRender();
    const during = testSetup.captureCharFrame();
    expect(during).toContain('c cancel & roll back');
    expect(during).toContain('detach (deployment continues in AWS)');
  });

  test('active prompt replaces the live area within the same geometry', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    tuiState.setActivePrompt({
      type: 'confirm',
      message: 'Proceed with deployment?',
      resolve: () => {},
      reject: () => {}
    });

    const frame = await renderDashboard();
    expect(frame).toContain('Proceed with deployment?');
    expect(frame).not.toContain('Packaging artifacts');
    expect(frameLines(frame)).toHaveLength(13);
  });

  test('complete state shows the summary banner', async () => {
    initDeployState();
    tuiState.setComplete(true, 'DEPLOYED', []);

    const frame = await renderDashboard();
    expect(frame).toContain('✓ DEPLOYED');
  });

  test('delete action renders deletion phases and verb', async () => {
    tuiState.setPhasePreset('delete');
    tuiState.setHeader({ projectName: 'my-app', stageName: 'dev', region: 'eu-west-1', action: 'DELETING' });
    tuiState.setCurrentPhase('DEPLOY');

    const frame = await renderDashboard();
    expect(frame).toContain('stacktape / delete');
    expect(frame).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] Delete/);
  });
});

describe('ProgressDashboard stability', () => {
  test('CF progress tick repaints only bar, counters and resource cells', async () => {
    initDeployState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.updateEvent({ eventType: 'UPDATE_STACK', data: cfDetail(5) });

    const before = await renderDashboard();
    tuiState.updateEvent({ eventType: 'UPDATE_STACK', data: cfDetail(6) });
    await flushAndRender();
    const after = testSetup.captureCharFrame();

    const beforeLines = frameLines(before);
    const afterLines = frameLines(after);
    expect(afterLines).toHaveLength(beforeLines.length);
    const changedRows = beforeLines
      .map((line, index) => (line === afterLines[index] ? null : index))
      .filter((index) => index !== null);
    // Only the progress row (5) and possibly spinner cells on resource rows
    // (6-8) may change; identity, rail, title and hints must not move.
    for (const row of changedRows) {
      expect(row).toBeGreaterThanOrEqual(5);
      expect(row).toBeLessThanOrEqual(8);
    }
  });

  test('rollback state keeps status strip and hints on separate rows', async () => {
    initDeployState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.setCancelDeployment({ message: 'Deployment in progress.', onCancel: () => {}, isCancelling: true });

    const frame = await renderDashboard();
    const lines = frameLines(frame);
    expect(lines).toHaveLength(13);
    expect(frame).toContain('CloudFormation rollback');
    expect(frame).toContain('Rolling back to the previous working state');
    expect(frame).toContain('detach (rollback continues in AWS)');
    const statusRow = lines.findIndex((l) => l.includes('Rolling back to the previous'));
    const hintsRow = lines.findIndex((l) => l.includes('ctrl+c'));
    expect(statusRow).toBe(10);
    expect(hintsRow).toBe(11);
  });

  test('every footer state keeps exactly 13 rows', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    const runningFrame = await renderDashboard();
    expect(frameLines(runningFrame)).toHaveLength(13);

    tuiState.setActivePrompt({
      type: 'select',
      message: 'Pick one',
      options: [
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b' }
      ],
      resolve: () => {},
      reject: () => {}
    });
    await flushAndRender();
    expect(frameLines(testSetup.captureCharFrame())).toHaveLength(13);

    tuiState.clearActivePrompt();
    tuiState.setComplete(true, 'DEPLOYED', []);
    await flushAndRender();
    expect(frameLines(testSetup.captureCharFrame())).toHaveLength(13);
  });
});
