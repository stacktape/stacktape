import { afterEach, describe, expect, test } from 'bun:test';
import { InputRenderable } from '@opentui/core';
import { testRender } from '@opentui/solid';
import { PromptSink } from '../../../prompt/sink';
import { interactionCoordinator } from '../../../interaction/coordinator';
import { tuiState } from '../../state';
import { ProgressDashboard } from '../dashboard';

type TestSetup = Awaited<ReturnType<typeof testRender>>;
let setup: TestSetup | undefined;

afterEach(() => {
  interactionCoordinator.rejectAllPending();
  setup?.renderer.destroy();
  setup = undefined;
  tuiState.reset();
});

const flush = async () => {
  tuiState.flushPendingNotifications();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await setup!.renderOnce();
};

const renderDashboard = async (
  options: { width?: number; height?: number; onSwitchView?: () => void } = {}
): Promise<TestSetup> => {
  setup = await testRender(
    () => <ProgressDashboard onQuit={() => {}} onCancel={() => {}} onSwitchView={options.onSwitchView} />,
    { width: options.width ?? 100, height: options.height ?? 32 }
  );
  await flush();
  return setup;
};

const init = () => {
  tuiState.reset();
  tuiState.setHeader({ projectName: 'my-app', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' });
  tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
};

const cloudFormationDetail = () => ({
  kind: 'cloudformation-progress',
  stackAction: 'update',
  completedCount: 5,
  totalPlanned: 14,
  inProgressDetails: [
    { name: 'web-service', action: 'UPDATE' as const, resourceType: 'AWS::ECS::Service' },
    { name: 'main-database', action: 'UPDATE' as const, resourceType: 'AWS::RDS::DBCluster' }
  ],
  changeCounts: { created: 3, updated: 9, deleted: 2 }
});

describe('fullscreen progress dashboard', () => {
  test('renders session identity, phase rail, activity list and details', async () => {
    init();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
    const app = await renderDashboard();
    const frame = app.captureCharFrame();
    expect(frame).toContain('stacktape / deploy');
    expect(frame).toContain('my-app → dev');
    expect(frame).toContain('Build & Package');
    expect(frame).toContain('ACTIVITY');
    expect(frame).toContain('Packaging workloads');
  });

  test('shows structured CloudFormation progress in the details pane', async () => {
    init();
    tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Stale packaging activity' });
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.updateEvent({ eventType: 'UPDATE_STACK', data: cloudFormationDetail() });
    const frame = (await renderDashboard()).captureCharFrame();
    expect(frame).toContain('update · 36%');
    expect(frame).toContain('5/14 complete');
    expect(frame).toContain('3 create · 9 update · 2 delete');
    expect(frame).toContain('web-service');
    expect(frame).toContain('AWS::ECS::Service');
    expect(frame).not.toContain('Stale packaging activity');
  });

  test('uses a single-pane fallback on narrow terminals without overlapping cells', async () => {
    init();
    tuiState.setCurrentPhase('DEPLOY');
    tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
    tuiState.updateEvent({ eventType: 'UPDATE_STACK', data: cloudFormationDetail() });
    const app = await renderDashboard({ width: 60, height: 24 });
    const frame = app.captureCharFrame();
    expect(frame).toContain('ACTIVITY');
    expect(frame).toContain('Init');
    expect(frame).toContain('ctrl+c cancel');
    expect(frame).not.toContain('CloudFormation u3');
    for (const line of frame.replace(/\n$/, '').split('\n')) expect(line.length).toBeLessThanOrEqual(60);
  });

  test('Ctrl+T delegates mode switching to the presentation controller', async () => {
    init();
    let switches = 0;
    const app = await renderDashboard({ onSwitchView: () => switches++ });
    app.mockInput.pressKey('t', { ctrl: true });
    await flush();
    expect(switches).toBe(1);
  });

  test('renders cancellation as a modal layer without replacing operation state', async () => {
    init();
    tuiState.setCancelDeployment({ message: 'Deployment in progress', onCancel: () => {} });
    const app = await renderDashboard();
    app.mockInput.pressKey('c');
    await flush();
    const frame = app.captureCharFrame();
    expect(frame).toContain('Cancel and roll back?');
    expect(tuiState.getSnapshot().cancelDeployment).toBeDefined();
  });
});

describe('dashboard prompt controls', () => {
  test('native input submits an entire default value without dropping characters', async () => {
    init();
    const sink = new PromptSink(() => {});
    const answer = sink.text({
      config: { message: 'API key', defaultValue: 'sk-demo-123', isPassword: true },
      isEnabled: true,
      isTTY: true
    });
    const app = await renderDashboard();
    expect(app.renderer.currentFocusedEditor).toBeInstanceOf(InputRenderable);
    expect(app.captureCharFrame()).not.toContain('sk-demo-123');
    expect(app.captureCharFrame()).toContain('•••••••••••');
    app.mockInput.pressEnter();
    await expect(answer).resolves.toBe('sk-demo-123');
  });

  test('native input accepts bracketed Unicode paste', async () => {
    init();
    const sink = new PromptSink(() => {});
    const answer = sink.text({ config: { message: 'Label' }, isEnabled: true, isTTY: true });
    const app = await renderDashboard();
    await app.mockInput.pasteBracketedText('žluťoučký 🦊');
    app.mockInput.pressEnter();
    await expect(answer).resolves.toBe('žluťoučký 🦊');
  });
});
