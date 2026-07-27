import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import { devTuiState } from '../../../dev-tui/state';
import { resetWorkloadColors } from '../../../dev-tui/utils';
import { DevDashboard } from '../dev-dashboard';

type TestSetup = Awaited<ReturnType<typeof testRender>>;
let testSetup: TestSetup;

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy();
  }
  devTuiState.reset();
  resetWorkloadColors();
});

const flushAndRender = async () => {
  devTuiState.flushPendingNotifications();
  await new Promise((r) => setTimeout(r, 20));
  await testSetup.renderOnce();
};

const renderDashboard = async (opts = { width: 100, height: 10 }) => {
  testSetup = await testRender(() => <DevDashboard onRebuild={() => {}} onQuit={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

const initRunningState = () => {
  devTuiState.init({ projectName: 'test-project', stageName: 'dev', devMode: 'normal' });
  devTuiState.addWorkload({ name: 'api', type: 'container' });
  devTuiState.addWorkload({ name: 'worker', type: 'function' });
  devTuiState.setWorkloadStatus('api', 'running', { url: 'http://localhost:3000' });
  devTuiState.setWorkloadStatus('worker', 'starting', { statusMessage: 'building' });
  devTuiState.setPhase('running');
};

describe('DevDashboard footer', () => {
  test('startup phase shows header and running setup steps', async () => {
    devTuiState.init({ projectName: 'test-project', stageName: 'dev', devMode: 'normal' });
    devTuiState.addSetupStep({ id: 'deploy', label: 'Deploying dev stack' });
    devTuiState.setSetupStepStatus('deploy', 'running');

    const frame = await renderDashboard();
    expect(frame).toContain('STARTING');
    expect(frame).toContain('test-project');
    expect(frame).toContain('Deploying dev stack');
  });

  test('running phase shows workload rows with status and url', async () => {
    initRunningState();
    const frame = await renderDashboard();
    expect(frame).toContain('DEV MODE');
    expect(frame).toContain('api');
    expect(frame).toContain('http://localhost:3000');
    expect(frame).toContain('worker');
    expect(frame).toContain('building');
    expect(frame).toContain('rebuild all');
  });

  test('rebuilding phase shows rebuild step per workload', async () => {
    initRunningState();
    devTuiState.startRebuild(['api'], new Map([['api', 'container']]));
    devTuiState.setRebuildWorkloadStep('api', 'packaging', 'bundling code');

    const frame = await renderDashboard();
    expect(frame).toContain('REBUILDING');
    expect(frame).toContain('packaging');
    expect(frame).toContain('bundling code');
  });

  test('rebuild picker lists active workloads', async () => {
    initRunningState();
    devTuiState.setWorkloadStatus('worker', 'running', { url: 'http://localhost:3001' });
    devTuiState.setRebuildPickerActive(true);

    const frame = await renderDashboard();
    expect(frame).toContain('Rebuild which workload?');
    expect(frame).toContain('api');
    expect(frame).toContain('worker');
  });
});
