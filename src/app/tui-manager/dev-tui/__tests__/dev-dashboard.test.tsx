/** @jsxImportSource @opentui/react */

import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import { KeyEvent } from '@opentui/core';
import { devTuiState } from '../state';
import { DevDashboard } from '../components/dev-dashboard';
import { resetWorkloadColors } from '../utils';

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy();
  }
  devTuiState.reset();
  resetWorkloadColors();
});

const emitKey = (name: string, opts?: { ctrl?: boolean; sequence?: string }) => {
  const key = new KeyEvent({
    name,
    sequence: opts?.sequence ?? name,
    ctrl: opts?.ctrl ?? false,
    shift: false,
    meta: false,
    option: false,
    number: false,
    raw: opts?.sequence ?? name,
    eventType: 'press',
    source: 'raw'
  });
  testSetup.renderer.keyInput.emit('keypress', key);
};

const flushAndRender = async (cycles = 4) => {
  devTuiState.flushPendingNotifications();
  await new Promise((r) => setTimeout(r, 20));
  for (let i = 0; i < cycles; i++) {
    await testSetup.renderOnce();
  }
};

const renderDashboard = async (opts: { width: number; height: number }) => {
  testSetup = await testRender(<DevDashboard onRebuild={() => {}} onQuit={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

const initRunningState = () => {
  devTuiState.init({ projectName: 'test-project', stageName: 'dev', devMode: 'normal' });
  devTuiState.addWorkload({ name: 'api', type: 'container' });
  devTuiState.addWorkload({ name: 'worker', type: 'function' });
  devTuiState.setWorkloadStatus('api', 'running', { url: 'http://localhost:3000' });
  devTuiState.setWorkloadStatus('worker', 'running', { url: 'http://localhost:3001' });
  devTuiState.setPhase('running');
};

describe('DevDashboard: startup phase', () => {
  test('renders header with project and stage info', async () => {
    devTuiState.init({ projectName: 'my-app', stageName: 'staging', devMode: 'normal' });
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('my-app');
    expect(frame).toContain('staging');
    expect(frame).toContain('STARTING');
  });

  test('renders local resources section during startup', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addLocalResource({ name: 'my-db', type: 'postgres' });
    devTuiState.setLocalResourceStatus('my-db', 'starting');
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('Local resources');
    expect(frame).toContain('my-db');
  });

  test('renders setup steps section during startup', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addSetupStep({ id: 'tunnel-1', label: 'SSM tunnel' });
    devTuiState.setSetupStepStatus('tunnel-1', 'running');
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('Creating tunnels');
    expect(frame).toContain('SSM tunnel');
  });

  test('renders hooks section during startup', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addHook({ name: 'beforeDev' });
    devTuiState.setHookStatus('beforeDev', 'running');
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('Executing hooks');
    expect(frame).toContain('beforeDev');
  });

  test('renders workloads section during startup', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addWorkload({ name: 'my-api', type: 'container' });
    devTuiState.setWorkloadStatus('my-api', 'starting', { statusMessage: 'Packaging...' });
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('Starting workloads');
    expect(frame).toContain('my-api');
    expect(frame).toContain('Packaging...');
  });

  test('shows spinner for starting items', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addWorkload({ name: 'svc', type: 'container' });
    devTuiState.setWorkloadStatus('svc', 'starting');
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('⠋');
  });

  test('shows checkmark for completed items', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addLocalResource({ name: 'db', type: 'postgres' });
    devTuiState.setLocalResourceStatus('db', 'running', { port: 5432 });
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('✓');
    expect(frame).toContain('5432');
  });

  test('shows error icon for failed items', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addWorkload({ name: 'broken', type: 'container' });
    devTuiState.setWorkloadStatus('broken', 'error', { error: 'Port conflict' });
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('✗');
    expect(frame).toContain('Port conflict');
  });

  test('footer shows ctrl+c during startup', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    const frame = await renderDashboard({ width: 100, height: 30 });
    expect(frame).toContain('ctrl+c');
    expect(frame).toContain('stop');
  });
});

describe('DevDashboard: running phase layout', () => {
  test('shows DEV header when running', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('DEV');
    expect(frame).toContain('test-project');
    expect(frame).toContain('dev');
  });

  test('shows sidebar with workloads section', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('Workloads');
    expect(frame).toContain('api');
    expect(frame).toContain('worker');
  });

  test('shows workload type icons in sidebar', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('⬢');
    expect(frame).toContain('λ');
  });

  test('shows workload URLs/ports in sidebar', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain(':3000');
    expect(frame).toContain(':3001');
  });

  test('keeps workload row spacing readable', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('[1] ● api');
    expect(frame).toContain('[2] ● worker');
    expect(frame).not.toContain('open http');
  });

  test('shows numbered workload entries', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('1');
    expect(frame).toContain('2');
  });

  test('shows running status dots for running workloads', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('●');
  });

  test('shows log panel', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('Logs');
  });

  test('shows log entries in log panel', async () => {
    initRunningState();
    devTuiState.addLogLine('api', 'GET /users 200 12ms');
    devTuiState.addLogLine('worker', 'Processing job #42');
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('GET /users 200 12ms');
    expect(frame).toContain('Processing job #42');
  });

  test('shows source labels when multiple workloads', async () => {
    initRunningState();
    devTuiState.addLogLine('api', 'hello');
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('api');
  });

  test('shows footer with keyboard shortcuts during running', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('rebuild');
    expect(frame).toContain('sidebar');
    expect(frame).toContain('ctrl+c');
    expect(frame).toContain('clear');
  });

  test('shows resources section in sidebar when local resources exist', async () => {
    initRunningState();
    devTuiState.addLocalResource({ name: 'my-db', type: 'postgres' });
    devTuiState.setLocalResourceStatus('my-db', 'running', { port: 5432 });
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('Resources');
    expect(frame).toContain('my-db');
    expect(frame).toContain(':5432');
  });
});

describe('DevDashboard: sidebar toggle', () => {
  test('sidebar hidden after pressing s', async () => {
    initRunningState();
    await renderDashboard({ width: 120, height: 30 });

    emitKey('s', { sequence: 's' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain('Workloads');
    expect(frame).toContain('Logs');
  });

  test('sidebar shown again after pressing s twice', async () => {
    initRunningState();
    await renderDashboard({ width: 120, height: 30 });

    emitKey('s', { sequence: 's' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).not.toContain('Workloads');

    emitKey('s', { sequence: 's' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Workloads');
  });

  test('header shows compact status when sidebar hidden', async () => {
    initRunningState();
    await renderDashboard({ width: 120, height: 30 });

    emitKey('s', { sequence: 's' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('✓2');
  });
});

describe('DevDashboard: log filtering', () => {
  test('pressing 1 filters logs to first workload', async () => {
    initRunningState();
    devTuiState.addLogLine('api', 'api log line');
    devTuiState.addLogLine('worker', 'worker log line');
    await renderDashboard({ width: 120, height: 30 });

    emitKey('1', { sequence: '1' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('api log line');
    expect(frame).not.toContain('worker log line');
    expect(frame).toContain('api');
    expect(frame).toContain('esc');
  });

  test('pressing escape clears log filter', async () => {
    initRunningState();
    devTuiState.addLogLine('api', 'api log line');
    devTuiState.addLogLine('worker', 'worker log line');
    await renderDashboard({ width: 120, height: 30 });

    emitKey('1', { sequence: '1' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).not.toContain('worker log line');

    emitKey('escape', { sequence: '\x1B' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('worker log line');
    expect(frame).toContain('api log line');
  });

  test('system logs visible in filtered view', async () => {
    initRunningState();
    devTuiState.addLogLine('api', 'api output');
    devTuiState.addSystemLog('system message');
    await renderDashboard({ width: 120, height: 30 });

    emitKey('1', { sequence: '1' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('api output');
    expect(frame).toContain('system message');
  });
});

describe('DevDashboard: clear logs', () => {
  test('pressing c clears logs', async () => {
    initRunningState();
    devTuiState.addLogLine('api', 'old log entry');
    await renderDashboard({ width: 120, height: 30 });
    expect(testSetup.captureCharFrame()).toContain('old log entry');

    emitKey('c', { sequence: 'c' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).not.toContain('old log entry');
  });
});

describe('DevDashboard: rebuild', () => {
  test('pressing a triggers rebuild all', async () => {
    let rebuildArg: string | null | undefined;
    initRunningState();

    testSetup = await testRender(
      <DevDashboard
        onRebuild={(name) => {
          rebuildArg = name;
        }}
        onQuit={() => {}}
      />,
      { width: 120, height: 30 }
    );
    await flushAndRender();

    emitKey('a', { sequence: 'a' });
    await flushAndRender();
    expect(rebuildArg).toBeNull();
  });

  test('pressing number in filtered mode triggers rebuild for that workload', async () => {
    let rebuildArg: string | null | undefined;
    initRunningState();

    testSetup = await testRender(
      <DevDashboard
        onRebuild={(name) => {
          rebuildArg = name;
        }}
        onQuit={() => {}}
      />,
      { width: 120, height: 30 }
    );
    await flushAndRender();

    // First press sets filter
    emitKey('1', { sequence: '1' });
    await flushAndRender();

    // Second press in filtered mode rebuilds
    emitKey('1', { sequence: '1' });
    await flushAndRender();
    expect(rebuildArg).toBe('api');
  });

  test('rebuild state shows in sidebar', async () => {
    initRunningState();
    devTuiState.startRebuild(['api'], new Map([['api', 'container']]));
    devTuiState.setRebuildWorkloadStep('api', 'packaging', '1.2MB');
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('Packaging');
    expect(frame).toContain('1.2MB');
    expect(frame).toContain('REBUILDING');
  });

  test('rebuild done shows duration in sidebar', async () => {
    initRunningState();
    devTuiState.startRebuild(['api'], new Map([['api', 'container']]));
    devTuiState.setRebuildWorkloadDone('api', '2.3MB');
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('✓');
  });

  test('rebuild error shows error message in sidebar', async () => {
    initRunningState();
    devTuiState.startRebuild(['api'], new Map([['api', 'container']]));
    devTuiState.setRebuildWorkloadError('api', 'Build failed');
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('Build failed');
  });

  test('number keys are ignored during rebuilding', async () => {
    let rebuildArg: string | null | undefined;
    initRunningState();
    devTuiState.startRebuild(['api'], new Map([['api', 'container']]));

    testSetup = await testRender(
      <DevDashboard
        onRebuild={(name) => {
          rebuildArg = name;
        }}
        onQuit={() => {}}
      />,
      { width: 120, height: 30 }
    );
    await flushAndRender();

    emitKey('a', { sequence: 'a' });
    await flushAndRender();
    expect(rebuildArg).toBeUndefined();
  });
});

describe('DevDashboard: quit', () => {
  test('ctrl+c triggers quit during running', async () => {
    let quitCalled = false;
    initRunningState();

    testSetup = await testRender(
      <DevDashboard
        onRebuild={() => {}}
        onQuit={() => {
          quitCalled = true;
        }}
      />,
      { width: 120, height: 30 }
    );
    await flushAndRender();

    emitKey('c', { ctrl: true, sequence: '\x03' });
    await flushAndRender();
    expect(quitCalled).toBe(true);
  });

  test('ctrl+c triggers quit during startup', async () => {
    let quitCalled = false;
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });

    testSetup = await testRender(
      <DevDashboard
        onRebuild={() => {}}
        onQuit={() => {
          quitCalled = true;
        }}
      />,
      { width: 120, height: 30 }
    );
    await flushAndRender();

    emitKey('c', { ctrl: true, sequence: '\x03' });
    await flushAndRender();
    expect(quitCalled).toBe(true);
  });
});

describe('DevDashboard: phase transitions', () => {
  test('transitions from startup to running view', async () => {
    devTuiState.init({ projectName: 'trans-test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addWorkload({ name: 'svc', type: 'container' });
    devTuiState.setWorkloadStatus('svc', 'starting');
    await renderDashboard({ width: 120, height: 30 });

    expect(testSetup.captureCharFrame()).toContain('STARTING');
    expect(testSetup.captureCharFrame()).toContain('Starting workloads');

    devTuiState.setWorkloadStatus('svc', 'running', { url: 'http://localhost:4000' });
    devTuiState.setPhase('running');
    await flushAndRender();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('DEV');
    expect(frame).toContain('Workloads');
    expect(frame).toContain('Logs');
    expect(frame).toContain(':4000');
    expect(frame).not.toContain('Starting workloads');
  });

  test('works at narrow width (80 cols)', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 80, height: 24 });
    expect(frame).toContain('Workloads');
    expect(frame).toContain('Logs');
    expect(frame).toContain('DEV');
  });

  test('works at minimal height (20 rows)', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 20 });
    expect(frame).toContain('test-project');
    expect(frame).toContain('Workloads');
  });
});

describe('DevDashboard: empty states', () => {
  test('shows waiting message when no logs', async () => {
    initRunningState();
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).toContain('Waiting for logs');
  });

  test('no resources section when no local resources', async () => {
    devTuiState.init({ projectName: 'test', stageName: 'dev', devMode: 'normal' });
    devTuiState.addWorkload({ name: 'api', type: 'container' });
    devTuiState.setWorkloadStatus('api', 'running');
    devTuiState.setPhase('running');
    const frame = await renderDashboard({ width: 120, height: 30 });
    expect(frame).not.toContain('Resources');
  });
});
