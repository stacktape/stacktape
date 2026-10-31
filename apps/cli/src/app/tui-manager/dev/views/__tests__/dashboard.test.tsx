import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import { devTuiState } from '../../state';
import { resetWorkloadColors } from '../../utils';
import { DevDashboard } from '../dashboard';

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

const renderDashboard = async (opts = { width: 100, height: 16 }) => {
  testSetup = await testRender(() => <DevDashboard onRebuild={() => {}} onQuit={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

const initRunningState = () => {
  devTuiState.init({ projectName: 'test-project', stageName: 'dev' });
  devTuiState.addWorkload({ name: 'api', type: 'container' });
  devTuiState.addWorkload({ name: 'worker', type: 'function' });
  devTuiState.setWorkloadStatus('api', 'running', { url: 'http://localhost:3000' });
  devTuiState.setWorkloadStatus('worker', 'starting', { statusMessage: 'building' });
  devTuiState.setPhase('running');
};

describe('full-screen DevDashboard', () => {
  test('startup phase shows header and running setup steps', async () => {
    devTuiState.init({ projectName: 'test-project', stageName: 'dev' });
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
    devTuiState.setWorkloadStatus('worker', 'error', { error: 'Cannot build the worker' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Cannot build the worker');
  });

  // r2at: the overview listed workloads only, so a local database and its port were missing from it.
  test('running phase lists local databases with engine, port and state', async () => {
    initRunningState();
    devTuiState.addLocalResource({ name: 'maindb', type: 'postgres' });
    devTuiState.addLocalResource({ name: 'cache', type: 'redis' });
    devTuiState.addLocalResource({ name: 'orders', type: 'dynamodb' });
    devTuiState.setLocalResourceStatus('maindb', 'running', { port: 5433 });
    devTuiState.setLocalResourceStatus('cache', 'running', { port: 6380 });
    devTuiState.setLocalResourceStatus('orders', 'error', { error: 'Docker is not running' });

    const frame = await renderDashboard();
    const row = (name: string) => frame.split('\n').find((line) => line.includes(` ${name} `)) ?? '';
    expect(row('maindb')).toContain('PostgreSQL');
    expect(row('maindb')).toContain('localhost:5433');
    expect(row('cache')).toContain('Redis');
    expect(row('cache')).toContain('localhost:6380');
    expect(row('orders')).toContain('DynamoDB Local');
    expect(row('orders')).toContain('Docker is not running');

    devTuiState.setLocalResourceStatus('maindb', 'stopped', { port: 5433 });
    await flushAndRender();
    const stopped = testSetup.captureCharFrame();
    expect(stopped.split('\n').find((line) => line.includes(' maindb '))).toContain('stopped');
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

  test('Tab switches to the integrated log view', async () => {
    initRunningState();
    devTuiState.addLog({
      source: 'api',
      sourceType: 'workload',
      level: 'info',
      message: 'GET /health 200',
      timestamp: Date.now()
    });
    await renderDashboard();
    testSetup.mockInput.pressTab();
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('GET /health 200');
    expect(frame).not.toContain('http://localhost:3000');
  });
});
