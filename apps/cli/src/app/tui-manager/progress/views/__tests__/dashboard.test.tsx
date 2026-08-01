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

const renderDashboard = async (opts = { width: 100, height: 12 }) => {
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

  test('renders the phase rail with short labels', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('✓ Initialize');
    expect(frame).toContain('● Package');
    expect(frame).toContain('· Deploy');
    expect(frame).toContain('· Finalize');
  });

  test('hides the rail in simple mode and keeps 8-row layout', async () => {
    initDeployState();
    tuiState.setShowPhaseHeaders(false);
    const frame = await renderDashboard({ width: 100, height: 8 });
    expect(frame).not.toContain('Finalize');
    expect(frameLines(frame)).toHaveLength(8);
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
    expect(frame).toContain('api-lambda packaged (4.1 MB)');
    expect(frame).not.toContain('api-lambda  api-lambda');
  });

  test('CF panel renders verb columns, honest progress and queue aggregate', async () => {
    initDeployState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.updateEvent({ eventType: 'UPDATE_STACK', data: cfDetail(5) });

    const frame = await renderDashboard();
    expect(frame).toContain('CloudFormation update');
    expect(frame).toContain('36% · 5/14 resources');
    expect(frame).toContain('UPDATE  web-service');
    expect(frame).toContain('AWS::ECS::Service');
    expect(frame).toContain('1 queued');
    expect(frame).toContain('3 create · 9 update · 2 delete');
  });

  test('shows cancel hint while running', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('cancel & roll back');
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
    expect(frameLines(frame)).toHaveLength(12);
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
    expect(frame).toContain('● Delete');
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
    // (6-7) may change; identity, rail, title, queue and hints must not move.
    for (const row of changedRows) {
      expect(row).toBeGreaterThanOrEqual(5);
      expect(row).toBeLessThanOrEqual(7);
    }
  });

  test('cancel offer and hints never overlap', async () => {
    initDeployState();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.setCancelDeployment({ message: 'Deployment in progress.', onCancel: () => {} });

    const frame = await renderDashboard();
    const lines = frameLines(frame);
    expect(lines).toHaveLength(12);
    expect(frame).toContain('Press c to cancel and roll back.');
    expect(frame).toContain('cancel & roll back');
    // The status strip and the hint row are separate, uncorrupted rows.
    const statusRow = lines.findIndex((l) => l.includes('Press c to cancel'));
    const hintsRow = lines.findIndex((l) => l.includes('ctrl+c'));
    expect(statusRow).toBe(10);
    expect(hintsRow).toBe(11);
  });

  test('every footer state keeps exactly 12 rows', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    const runningFrame = await renderDashboard();
    expect(frameLines(runningFrame)).toHaveLength(12);

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
    expect(frameLines(testSetup.captureCharFrame())).toHaveLength(12);

    tuiState.clearActivePrompt();
    tuiState.setComplete(true, 'DEPLOYED', []);
    await flushAndRender();
    expect(frameLines(testSetup.captureCharFrame())).toHaveLength(12);
  });
});
