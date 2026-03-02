/** @jsxImportSource @opentui/react */

import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import { KeyEvent } from '@opentui/core';
import { tuiState } from '../../../state';
import { PhaseList } from '../PhaseList';
import { StatusIcon, PhaseIcon, Spinner } from '../StatusIcon';
import { EventTree } from '../EventTree';
import { LogPanel } from '../LogPanel';
import { Footer } from '../Footer';
import { DetailPanel } from '../DetailPanel';
import { DeployDashboard } from '../DeployDashboard';
import { DeployPhaseDetail } from '../DeployProgress';
import type { TuiEvent, TuiPhase, CfProgressData } from '../../../types';

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy();
  }
  tuiState.reset();
});

// Helper for keypress simulation
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

// Helper: flush state + render enough cycles for React to reconcile
const flushAndRender = async (cycles = 4) => {
  tuiState.flushPendingNotifications();
  // Allow microtasks/timers to fire (React scheduling)
  await new Promise((r) => setTimeout(r, 20));
  for (let i = 0; i < cycles; i++) {
    await testSetup.renderOnce();
  }
};

// Helper: renders dashboard with state flushed
const renderDashboard = async (opts: { width: number; height: number }) => {
  testSetup = await testRender(<DeployDashboard onQuit={() => {}} onCancel={() => {}} />, opts);
  await flushAndRender();
  return testSetup.captureCharFrame();
};

// ─── StatusIcon ──────────────────────────────────────────

describe('StatusIcon', () => {
  test('renders success icon', async () => {
    testSetup = await testRender(<StatusIcon status="success" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('✓');
  });

  test('renders error icon', async () => {
    testSetup = await testRender(<StatusIcon status="error" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('✗');
  });

  test('renders running as animated spinner (not static arrow)', async () => {
    testSetup = await testRender(<StatusIcon status="running" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain('▸');
    expect(frame).toContain('⠋');
  });

  test('renders pending icon', async () => {
    testSetup = await testRender(<StatusIcon status="pending" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('·');
  });

  test('renders warning icon', async () => {
    testSetup = await testRender(<StatusIcon status="warning" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('▲');
  });
});

// ─── PhaseIcon ───────────────────────────────────────────

describe('PhaseIcon', () => {
  test('renders phase success checkmark', async () => {
    testSetup = await testRender(<PhaseIcon status="success" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('✓');
  });

  test('renders running phase as spinner (not arrow)', async () => {
    testSetup = await testRender(<PhaseIcon status="running" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain('▸');
    expect(frame).toContain('⠋');
  });

  test('renders error phase', async () => {
    testSetup = await testRender(<PhaseIcon status="error" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('✗');
  });

  test('renders pending as space (no icon clutter)', async () => {
    testSetup = await testRender(<PhaseIcon status="pending" />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain('✓');
    expect(frame).not.toContain('✗');
    expect(frame).not.toContain('⠋');
  });
});

// ─── Spinner ─────────────────────────────────────────────

describe('Spinner', () => {
  test('renders first braille spinner frame', async () => {
    testSetup = await testRender(<Spinner />, { width: 10, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('⠋');
  });
});

// ─── PhaseList ───────────────────────────────────────────

describe('PhaseList', () => {
  test('renders all five phases with border', async () => {
    // Wrap in a height-constrained parent so the border box renders its bottom edge
    const Wrapper = () => (
      <box height={12} width={30}>
        <PhaseList />
      </box>
    );
    testSetup = await testRender(<Wrapper />, { width: 40, height: 14 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Phases');
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Build & Package');
    expect(frame).toContain('Upload');
    expect(frame).toContain('Deploy');
    expect(frame).toContain('Finalize');
    expect(frame).toContain('┌');
    expect(frame).toContain('└');
  });

  test('active phase shows spinner', async () => {
    tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
    testSetup = await testRender(<PhaseList />, { width: 40, height: 20 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('⠋');
  });

  test('completed phase shows checkmark', async () => {
    tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
    testSetup = await testRender(<PhaseList />, { width: 40, height: 20 });
    await testSetup.renderOnce();
    // Initialize is marked success when BUILD_AND_PACKAGE starts
    expect(testSetup.captureCharFrame()).toContain('✓');
  });
});

// ─── EventTree ───────────────────────────────────────────

describe('EventTree', () => {
  test('renders nothing for empty events', async () => {
    testSetup = await testRender(<EventTree events={[]} />, { width: 40, height: 10 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame().trim()).toBe('');
  });

  test('renders single running event with spinner', async () => {
    const events: TuiEvent[] = [
      {
        id: 'e1',
        eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
        description: 'Loading metadata',
        status: 'running',
        startTime: Date.now(),
        children: []
      }
    ];
    testSetup = await testRender(<EventTree events={events} />, { width: 60, height: 10 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Loading metadata');
    expect(frame).toContain('⠋');
  });

  test('renders completed event with checkmark', async () => {
    const events: TuiEvent[] = [
      {
        id: 'e1',
        eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
        description: 'Loaded metadata',
        status: 'success',
        startTime: Date.now() - 2000,
        duration: 2000,
        children: []
      }
    ];
    testSetup = await testRender(<EventTree events={events} />, { width: 60, height: 10 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('✓');
    expect(frame).toContain('Loaded metadata');
  });

  test('renders parent with child events', async () => {
    const events: TuiEvent[] = [
      {
        id: 'parent',
        eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
        description: 'Packaging',
        status: 'running',
        startTime: Date.now(),
        children: [
          {
            id: 'c1',
            eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
            description: 'my-api',
            status: 'success',
            startTime: Date.now() - 5000,
            endTime: Date.now(),
            duration: 5000,
            instanceId: 'my-api',
            finalMessage: 'Built 2.3 MB',
            children: []
          },
          {
            id: 'c2',
            eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
            description: 'my-worker',
            status: 'running',
            startTime: Date.now() - 1000,
            instanceId: 'my-worker',
            additionalMessage: 'Bundling...',
            children: []
          }
        ]
      }
    ];
    testSetup = await testRender(<EventTree events={events} />, { width: 80, height: 20 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('my-api');
    expect(frame).toContain('my-worker');
  });

  test('renders 25 children when given enough height', async () => {
    const children: TuiEvent[] = Array.from({ length: 25 }, (_, i) => ({
      id: `child-${i}`,
      eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      description: `workload-${i}`,
      status: i < 10 ? 'success' : ('running' as TuiEvent['status']),
      startTime: Date.now() - (25 - i) * 1000,
      instanceId: `workload-${i}`,
      duration: i < 10 ? 2000 : undefined,
      children: []
    }));
    const events: TuiEvent[] = [
      {
        id: 'parent',
        eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
        description: 'Packaging',
        status: 'running',
        startTime: Date.now(),
        children
      }
    ];
    testSetup = await testRender(<EventTree events={events} />, { width: 80, height: 40 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('workload-0');
    expect(frame).toContain('workload-24');
  });
});

// ─── LogPanel ────────────────────────────────────────────

describe('LogPanel', () => {
  test('renders empty log with title', async () => {
    testSetup = await testRender(<LogPanel />, { width: 60, height: 10 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Log');
    expect(frame).toContain('No log entries');
  });

  test('renders info messages', async () => {
    tuiState.setCurrentPhase('INITIALIZE');
    tuiState.addMessage('info', 'info', 'Test info message');
    testSetup = await testRender(<LogPanel />, { width: 80, height: 15 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Test info message');
  });

  test('renders warnings', async () => {
    tuiState.addWarning('Something might be wrong');
    testSetup = await testRender(<LogPanel />, { width: 80, height: 15 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Something might be wrong');
  });

  test('has border', async () => {
    testSetup = await testRender(<LogPanel />, { width: 60, height: 10 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('┌');
    expect(frame).toContain('└');
  });

  test('has left padding on content', async () => {
    tuiState.addMessage('info', 'info', 'Padded message');
    testSetup = await testRender(<LogPanel />, { width: 80, height: 15 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    // Log title should be indented from border (paddingX=1)
    const lines = frame.split('\n');
    const logTitleLine = lines.find((l) => l.includes('Log'));
    // Should have space between border '│' and 'Log'
    expect(logTitleLine).toMatch(/│\s+Log/);
  });
});

// ─── Footer ──────────────────────────────────────────────

describe('Footer', () => {
  test('shows cancel and force quit shortcuts during deployment', async () => {
    testSetup = await testRender(<Footer />, { width: 80, height: 3 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('c');
    expect(frame).toContain('cancel & rollback');
    expect(frame).toContain('ctrl+c');
    expect(frame).toContain('force quit');
    expect(frame).toContain('scroll');
  });

  test('shows separator between cancel and abort', async () => {
    testSetup = await testRender(<Footer />, { width: 80, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('│');
  });

  test('shows rolling back state', async () => {
    testSetup = await testRender(<Footer isCancelling={true} />, { width: 80, height: 3 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Rolling back');
  });

  test('shows exit hint when complete', async () => {
    tuiState.setComplete(true, 'Deployment complete');
    testSetup = await testRender(<Footer />, { width: 60, height: 3 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('q');
    expect(frame).toContain('exit');
  });

  test('has fixed height of 1 row', async () => {
    testSetup = await testRender(<Footer />, { width: 40, height: 5 });
    await testSetup.renderOnce();
    const lines = testSetup
      .captureCharFrame()
      .split('\n')
      .filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(1);
  });
});

// ─── DetailPanel ─────────────────────────────────────────

describe('DetailPanel', () => {
  test('shows waiting message when no phase active', async () => {
    testSetup = await testRender(<DetailPanel />, { width: 60, height: 20 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Waiting');
  });

  test('renders Initialize phase detail with events', async () => {
    tuiState.setCurrentPhase('INITIALIZE');
    tuiState.startEvent({
      eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
      description: 'Loading stack data',
      phase: 'INITIALIZE'
    });
    testSetup = await testRender(<DetailPanel />, { width: 80, height: 20 });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('Loading stack data');
  });

  test('BUILD_AND_PACKAGE shows counter and workload names', async () => {
    tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
    tuiState.startEvent({
      eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      description: 'Packaging',
      phase: 'BUILD_AND_PACKAGE'
    });
    tuiState.startEvent({
      eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      description: 'my-api',
      phase: 'BUILD_AND_PACKAGE',
      parentEventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      instanceId: 'my-api'
    });
    testSetup = await testRender(<DetailPanel />, { width: 80, height: 20 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Build & Package');
    expect(frame).toContain('my-api');
  });

  test('has border around detail panel', async () => {
    tuiState.setCurrentPhase('INITIALIZE');
    testSetup = await testRender(<DetailPanel />, { width: 60, height: 20 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('┌');
    expect(frame).toContain('└');
  });
});

// ─── DeployDashboard (full layout) ──────────────────────

describe('DeployDashboard', () => {
  test('renders header, phases, detail, log, and footer', async () => {
    tuiState.setHeader({ projectName: 'test-project', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDashboard({ width: 120, height: 40 });
    expect(frame).toContain('test-project');
    expect(frame).toContain('dev');
    expect(frame).toContain('eu-west-1');
    expect(frame).toContain('DEPLOYING');
    expect(frame).toContain('Phases');
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Log');
    expect(frame).toContain('ctrl+c');
    expect(frame).toContain('scroll');
  });

  test('header is visible (not clipped by flexGrow siblings)', async () => {
    tuiState.setHeader({ projectName: 'my-stack', stageName: 'prod', region: 'us-east-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDashboard({ width: 80, height: 24 });
    expect(frame).toContain('my-stack');
    expect(frame).toContain('prod');
  });

  test('footer is visible (not clipped by flexGrow siblings)', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDashboard({ width: 80, height: 24 });
    expect(frame).toContain('ctrl+c');
    expect(frame).toContain('scroll');
  });

  test('renders COMPLETED state with exit instruction', async () => {
    tuiState.setHeader({ projectName: 'test-project', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'Stack deployed successfully', [{ label: 'API URL', url: 'https://api.example.com' }]);
    const frame = await renderDashboard({ width: 120, height: 40 });
    expect(frame).toContain('COMPLETED');
    expect(frame).toContain('exit');
  });

  test('renders FAILED state', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(false, 'Deployment failed');
    const frame = await renderDashboard({ width: 120, height: 40 });
    expect(frame).toContain('FAILED');
  });

  test('BUILD_AND_PACKAGE shows workloads', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
    tuiState.startEvent({
      eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      description: 'Packaging',
      phase: 'BUILD_AND_PACKAGE'
    });
    tuiState.startEvent({
      eventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      description: 'Building my-api',
      phase: 'BUILD_AND_PACKAGE',
      parentEventType: 'PACKAGE_ARTIFACTS' as LoggableEventType,
      instanceId: 'my-api'
    });
    const frame = await renderDashboard({ width: 120, height: 40 });
    expect(frame).toContain('Build & Package');
    expect(frame).toContain('my-api');
  });

  test('works at narrow width (80 cols)', async () => {
    tuiState.setHeader({ projectName: 'narrow', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDashboard({ width: 80, height: 24 });
    expect(frame).toContain('Phases');
    expect(frame).toContain('Initialize');
    expect(frame).toContain('Log');
  });

  test('works at minimal height (20 rows)', async () => {
    tuiState.setHeader({ projectName: 'short', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    const frame = await renderDashboard({ width: 120, height: 20 });
    expect(frame).toContain('short');
    expect(frame).toContain('Phases');
  });
});

// ─── Keyboard Interaction ────────────────────────────────

describe('Keyboard: cancel flow', () => {
  test('pressing c opens cancel confirmation modal', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDashboard({ width: 120, height: 40 });

    // Press 'c' to open cancel confirm
    emitKey('c', { sequence: 'c' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('Cancel deployment?');
    expect(frame).toContain('rollback');
  });

  test('pressing n in cancel modal dismisses it', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDashboard({ width: 120, height: 40 });

    // Open cancel modal
    emitKey('c', { sequence: 'c' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Cancel deployment?');

    // Press 'n' to dismiss
    emitKey('n', { sequence: 'n' });
    await flushAndRender();
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain('Cancel deployment?');
  });

  test('pressing escape in cancel modal dismisses it', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDashboard({ width: 120, height: 40 });

    emitKey('c', { sequence: 'c' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).toContain('Cancel deployment?');

    emitKey('escape', { sequence: '\x1B' });
    await flushAndRender();
    expect(testSetup.captureCharFrame()).not.toContain('Cancel deployment?');
  });

  test('pressing y in cancel modal triggers cancel', async () => {
    let cancelCalled = false;
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');

    testSetup = await testRender(
      <DeployDashboard
        onQuit={() => {}}
        onCancel={() => {
          cancelCalled = true;
        }}
      />,
      { width: 120, height: 40 }
    );
    await flushAndRender();

    emitKey('c', { sequence: 'c' });
    await flushAndRender();

    emitKey('y', { sequence: 'y' });
    await flushAndRender();

    expect(cancelCalled).toBe(true);
  });

  test('c is ignored when deployment is complete', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'Done');
    await renderDashboard({ width: 120, height: 40 });

    emitKey('c', { sequence: 'c' });
    await flushAndRender();

    expect(testSetup.captureCharFrame()).not.toContain('Cancel deployment?');
  });
});

describe('Keyboard: quit flow', () => {
  test('q exits when deployment is complete', async () => {
    let quitCalled = false;
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.setComplete(true, 'Done');

    testSetup = await testRender(
      <DeployDashboard
        onQuit={() => {
          quitCalled = true;
        }}
        onCancel={() => {}}
      />,
      { width: 120, height: 40 }
    );
    await flushAndRender();

    emitKey('q', { sequence: 'q' });
    await flushAndRender();

    expect(quitCalled).toBe(true);
  });

  test('q is ignored during active deployment', async () => {
    let quitCalled = false;
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');

    testSetup = await testRender(
      <DeployDashboard
        onQuit={() => {
          quitCalled = true;
        }}
        onCancel={() => {}}
      />,
      { width: 120, height: 40 }
    );
    await flushAndRender();

    emitKey('q', { sequence: 'q' });
    await flushAndRender();

    expect(quitCalled).toBe(false);
  });

  test('ctrl+c triggers hard abort', async () => {
    let cancelCalled = false;
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');

    testSetup = await testRender(
      <DeployDashboard
        onQuit={() => {}}
        onCancel={() => {
          cancelCalled = true;
        }}
      />,
      { width: 120, height: 40 }
    );
    await flushAndRender();

    emitKey('c', { ctrl: true, sequence: '\x03' });
    await flushAndRender();

    expect(cancelCalled).toBe(true);
  });
});

// ─── State Transitions ──────────────────────────────────

describe('State transitions', () => {
  test('phase advances from INITIALIZE to BUILD_AND_PACKAGE', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDashboard({ width: 120, height: 40 });

    // Phase list should show Initialize as active
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain('Initialize');

    // Advance to BUILD_AND_PACKAGE
    tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
    await flushAndRender();
    frame = testSetup.captureCharFrame();

    // Initialize should be complete (✓), BUILD_AND_PACKAGE active (⠋)
    expect(frame).toContain('✓');
    expect(frame).toContain('Build & Package');
  });

  test('log messages appear after being added', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDashboard({ width: 120, height: 40 });

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain('No log entries');

    // Add a message
    tuiState.addMessage('info', 'info', 'New log entry appeared');
    await flushAndRender();
    frame = testSetup.captureCharFrame();

    expect(frame).toContain('New log entry appeared');
    expect(frame).not.toContain('No log entries');
  });

  test('events appear in detail panel as they are added', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('INITIALIZE');
    await renderDashboard({ width: 120, height: 40 });

    // Add an event
    tuiState.startEvent({
      eventType: 'LOAD_METADATA_FROM_AWS' as LoggableEventType,
      description: 'Fetching stack info',
      phase: 'INITIALIZE'
    });
    await flushAndRender();

    expect(testSetup.captureCharFrame()).toContain('Fetching stack info');
  });

  test('completion transitions from DEPLOYING to COMPLETED in header', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('DEPLOY');
    await renderDashboard({ width: 120, height: 40 });

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain('DEPLOYING');

    tuiState.setComplete(true, 'All done!');
    await flushAndRender();
    frame = testSetup.captureCharFrame();

    expect(frame).toContain('COMPLETED');
    expect(frame).not.toContain('DEPLOYING');
  });

  test('footer changes from cancel/force quit to exit when complete', async () => {
    tuiState.setHeader({ projectName: 'test', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
    tuiState.setCurrentPhase('DEPLOY');
    await renderDashboard({ width: 120, height: 40 });

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain('cancel & rollback');
    expect(frame).toContain('force quit');

    tuiState.setComplete(true, 'Done');
    await flushAndRender();
    frame = testSetup.captureCharFrame();

    expect(frame).toContain('exit');
    expect(frame).not.toContain('force quit');
  });
});

// ─── DeployPhaseDetail (CF deploy progress) ─────────────

describe('DeployPhaseDetail', () => {
  const makePhase = (events: TuiEvent[]): TuiPhase => ({
    id: 'DEPLOY' as DeploymentPhase,
    name: 'Deploy',
    status: 'running',
    startTime: Date.now(),
    events
  });

  const makeCfEvent = (overrides: Partial<TuiEvent> = {}): TuiEvent => ({
    id: 'UPDATE_STACK',
    eventType: 'UPDATE_STACK' as LoggableEventType,
    description: 'Deploying via CloudFormation',
    status: 'running',
    startTime: Date.now() - 5000,
    children: [],
    additionalMessage:
      'Status: Updating resources. Progress: 3/25. Currently updating: MyLambda, MyApi. Waiting: MyBucket. Estimate: ~45% Summary: created=0 updated=25 deleted=0 Details: created=none; updated=Res1, Res2; deleted=none.',
    ...overrides
  });

  test('in-progress: does NOT show "Done" label with planned counts', async () => {
    const phase = makePhase([makeCfEvent()]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    // Should NOT show "Done Updated 25" — that was the bug
    expect(frame).not.toContain('Done');
    // Should show progress
    expect(frame).toContain('45%');
  });

  test('in-progress: shows progress bar and resource counts', async () => {
    const phase = makePhase([makeCfEvent()]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('3/25');
    expect(frame).toContain('█');
  });

  test('in-progress: shows active resources with "In progress" label', async () => {
    const phase = makePhase([makeCfEvent()]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('In progress');
    expect(frame).toContain('MyLambda');
    expect(frame).toContain('MyApi');
  });

  test('in-progress: shows queued resources', async () => {
    const phase = makePhase([makeCfEvent()]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Queued');
    expect(frame).toContain('MyBucket');
  });

  test('in-progress: shows planned changes summary', async () => {
    const phase = makePhase([makeCfEvent()]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    // Should show planned changes as informational, not as "Done"
    expect(frame).toContain('~25 update');
  });

  test('finished success: shows checkmark and summary counts', async () => {
    const phase = makePhase([
      makeCfEvent({
        status: 'success',
        duration: 120000,
        additionalMessage:
          'Summary: created=2 updated=23 deleted=0 Details: created=ResA, ResB; updated=ResC; deleted=none.'
      })
    ]);
    phase.status = 'success';
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('✓');
    expect(frame).toContain('Created 2');
    expect(frame).toContain('Updated 23');
  });

  test('finished error: shows error icon', async () => {
    const phase = makePhase([
      makeCfEvent({
        status: 'error',
        duration: 60000,
        additionalMessage: 'Summary: created=0 updated=5 deleted=0'
      })
    ]);
    phase.status = 'error';
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('✗');
  });

  test('cleanup phase: shows 100% and cleanup status', async () => {
    const phase = makePhase([
      makeCfEvent({
        additionalMessage:
          'Status: Cleaning up. Removing 2 old resources. Removed: 1. Estimate: ~100% Summary: created=0 updated=25 deleted=0 Details: created=none; updated=Res1; deleted=none.'
      })
    ]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('100%');
    expect(frame).toContain('Cleaning up');
  });

  test('no additional message: shows title only', async () => {
    const phase = makePhase([
      makeCfEvent({
        additionalMessage: undefined
      })
    ]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Deploying via CloudFormation');
  });

  test('delete operation: shows "Deleting via CloudFormation"', async () => {
    const deleteEvent: TuiEvent = {
      id: 'DELETE_STACK',
      eventType: 'DELETE_STACK' as LoggableEventType,
      description: 'Deleting via CloudFormation',
      status: 'running',
      startTime: Date.now() - 5000,
      children: [],
      additionalMessage: 'Status: Deleting resources. Progress: 2/10. Estimate: ~30%'
    };
    const phase = makePhase([deleteEvent]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Deleting via CloudFormation');
  });
});

// ─── DeployPhaseDetail with structured CfProgressData ───

describe('DeployPhaseDetail (structured data path)', () => {
  const makePhase = (events: TuiEvent[]): TuiPhase => ({
    id: 'DEPLOY' as DeploymentPhase,
    name: 'Deploy',
    status: 'running',
    startTime: Date.now(),
    events
  });

  const makeCfData = (overrides: Partial<CfProgressData> = {}): CfProgressData => ({
    kind: 'cloudformation-progress',
    stackAction: 'UPDATE_STACK',
    status: 'active',
    completedCount: 8,
    totalPlanned: 20,
    inProgressCount: 3,
    inProgressResources: ['MyLambdaFunc', 'MyApiGateway', 'MyDynamo'],
    waitingResources: ['MyS3Bucket', 'MyCdnDistribution'],
    changeCounts: { created: 2, updated: 15, deleted: 3 },
    ...overrides
  });

  const makeCfEventWithData = (data: CfProgressData, overrides: Partial<TuiEvent> = {}): TuiEvent => ({
    id: 'UPDATE_STACK',
    eventType: 'UPDATE_STACK' as LoggableEventType,
    description: 'Deploying via CloudFormation',
    status: 'running',
    startTime: Date.now() - 5000,
    children: [],
    // additionalMessage is still set (for Estimate parsing), but data is the preferred source
    additionalMessage: 'Estimate: ~40%',
    data,
    ...overrides
  });

  test('reads progress from structured data instead of parsing strings', async () => {
    const data = makeCfData({ completedCount: 12, totalPlanned: 30 });
    const phase = makePhase([makeCfEventWithData(data, { additionalMessage: 'Estimate: ~55%' })]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('12/30');
    expect(frame).toContain('55%');
    expect(frame).toContain('█');
  });

  test('shows active resources from structured data', async () => {
    const data = makeCfData({ inProgressResources: ['LambdaA', 'LambdaB'] });
    const phase = makePhase([makeCfEventWithData(data)]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('In progress');
    expect(frame).toContain('LambdaA');
    expect(frame).toContain('LambdaB');
  });

  test('shows waiting resources from structured data', async () => {
    const data = makeCfData({ waitingResources: ['QueueAlpha', 'TopicBeta'] });
    const phase = makePhase([makeCfEventWithData(data)]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Queued');
    expect(frame).toContain('QueueAlpha');
    expect(frame).toContain('TopicBeta');
  });

  test('shows planned change counts from structured data', async () => {
    const data = makeCfData({ changeCounts: { created: 5, updated: 10, deleted: 2 } });
    const phase = makePhase([makeCfEventWithData(data)]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('+5 create');
    expect(frame).toContain('~10 update');
    expect(frame).toContain('-2 delete');
  });

  test('cleanup status from structured data shows 100% and cleanup message', async () => {
    const data = makeCfData({ status: 'cleanup' });
    const phase = makePhase([makeCfEventWithData(data)]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('100%');
    expect(frame).toContain('Cleaning up');
  });

  test('finished success with structured data shows summary counts', async () => {
    const data = makeCfData({ changeCounts: { created: 3, updated: 17, deleted: 1 } });
    const phase = makePhase([
      makeCfEventWithData(data, {
        status: 'success',
        duration: 90000,
        additionalMessage:
          'Summary: created=3 updated=17 deleted=1 Details: created=ResA, ResB, ResC; updated=ResD; deleted=ResE.'
      })
    ]);
    phase.status = 'success';
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('✓');
    expect(frame).toContain('Created 3');
    expect(frame).toContain('Updated 17');
    expect(frame).toContain('Deleted 1');
  });

  test('finished error with structured data shows error icon', async () => {
    const data = makeCfData({ changeCounts: { created: 0, updated: 5, deleted: 0 } });
    const phase = makePhase([makeCfEventWithData(data, { status: 'error', duration: 60000 })]);
    phase.status = 'error';
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('✗');
    expect(frame).toContain('Updated 5');
  });

  test('structured data with zero changeCounts hides change line', async () => {
    const data = makeCfData({ changeCounts: { created: 0, updated: 0, deleted: 0 } });
    const phase = makePhase([makeCfEventWithData(data)]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).not.toContain('+');
    expect(frame).not.toContain('create');
    expect(frame).not.toContain('update');
    expect(frame).not.toContain('delete');
  });

  test('structured data is preferred over additionalMessage parsing', async () => {
    // Structured data says 8/20, but additionalMessage string says 3/25 — structured should win
    const data = makeCfData({
      completedCount: 8,
      totalPlanned: 20,
      inProgressResources: ['FromData']
    });
    const phase = makePhase([
      makeCfEventWithData(data, {
        additionalMessage: 'Status: Updating resources. Progress: 3/25. Currently updating: FromString. Estimate: ~40%'
      })
    ]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    // Should use structured data values
    expect(frame).toContain('8/20');
    expect(frame).toContain('FromData');
    // Should NOT contain the string-parsed values
    expect(frame).not.toContain('3/25');
    expect(frame).not.toContain('FromString');
  });

  test('delete operation with structured data', async () => {
    const data: CfProgressData = {
      kind: 'cloudformation-progress',
      stackAction: 'DELETE_STACK',
      status: 'active',
      completedCount: 4,
      totalPlanned: 12,
      inProgressResources: ['DeletingResource'],
      waitingResources: [],
      changeCounts: { created: 0, updated: 0, deleted: 12 }
    };
    const deleteEvent: TuiEvent = {
      id: 'DELETE_STACK',
      eventType: 'DELETE_STACK' as LoggableEventType,
      description: 'Deleting via CloudFormation',
      status: 'running',
      startTime: Date.now() - 5000,
      children: [],
      additionalMessage: 'Estimate: ~33%',
      data
    };
    const phase = makePhase([deleteEvent]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Deleting via CloudFormation');
    expect(frame).toContain('4/12');
    expect(frame).toContain('DeletingResource');
    expect(frame).toContain('-12 delete');
  });

  test('no data and no additionalMessage shows title only', async () => {
    const event: TuiEvent = {
      id: 'UPDATE_STACK',
      eventType: 'UPDATE_STACK' as LoggableEventType,
      description: 'Deploying via CloudFormation',
      status: 'running',
      startTime: Date.now() - 1000,
      children: []
    };
    const phase = makePhase([event]);
    testSetup = await testRender(<DeployPhaseDetail phase={phase} />, { width: 80, height: 30 });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Deploying via CloudFormation');
    expect(frame).toContain('Waiting for CloudFormation to start');
  });
});
