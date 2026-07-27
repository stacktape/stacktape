import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import { tuiState } from '../../../state';
import { DeployDashboard } from '../deploy-dashboard';

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
  testSetup = await testRender(() => <DeployDashboard onQuit={() => {}} onCancel={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

const initDeployState = () => {
  tuiState.setHeader({ projectName: 'my-app', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
  tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
};

describe('DeployDashboard footer', () => {
  test('renders header line with project, stage and region', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('DEPLOYING');
    expect(frame).toContain('my-app');
    expect(frame).toContain('eu-west-1');
  });

  test('renders inline phase list', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Build & Package');
    expect(frame).toContain('Deploy');
  });

  test('hides phase list in simple mode', async () => {
    initDeployState();
    tuiState.setShowPhaseHeaders(false);
    const frame = await renderDashboard();
    expect(frame).not.toContain('Finalize');
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

  test('shows cancel hint while running', async () => {
    initDeployState();
    const frame = await renderDashboard();
    expect(frame).toContain('cancel & rollback');
  });

  test('active prompt replaces the live area', async () => {
    initDeployState();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    tuiState.setActivePrompt({
      type: 'confirm',
      message: 'Proceed with deployment?',
      resolve: () => {},
      reject: () => {}
    });

    const frame = await renderDashboard({ width: 100, height: 14 });
    expect(frame).toContain('Proceed with deployment?');
    expect(frame).not.toContain('Packaging artifacts');
  });

  test('complete state shows summary banner and exit hint', async () => {
    initDeployState();
    tuiState.setComplete(true, 'DEPLOYMENT SUCCESSFUL', []);

    const frame = await renderDashboard();
    expect(frame).toContain('COMPLETED');
    expect(frame).toContain('DEPLOYMENT SUCCESSFUL');
    expect(frame).toContain('exit');
  });

  test('delete action renders deletion phases', async () => {
    tuiState.configureForDelete();
    tuiState.setHeader({ projectName: 'my-app', stageName: 'dev', region: 'eu-west-1', action: 'DELETING' });
    tuiState.setCurrentPhase('DEPLOY');

    const frame = await renderDashboard();
    expect(frame).toContain('DELETING');
    expect(frame).toContain('Delete');
    expect(frame).toContain('cancel deletion');
  });
});
