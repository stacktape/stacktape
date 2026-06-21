import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import type { ScrollbackItem } from '../../../scrollback-feed';
import type { TuiEvent } from '../../../types';
import { ScrollbackItemView } from '../scrollback-view';

type TestSetup = Awaited<ReturnType<typeof testRender>>;
let testSetup: TestSetup;

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy();
  }
});

const renderItem = async (item: ScrollbackItem, opts = { width: 80, height: 14 }) => {
  testSetup = await testRender(() => <ScrollbackItemView item={item} width={opts.width} />, opts);
  await testSetup.renderOnce();
  return testSetup.captureCharFrame();
};

const finishedEvent = (overrides: Partial<TuiEvent> = {}): TuiEvent => ({
  id: 'PACKAGE_ARTIFACTS',
  eventType: 'PACKAGE_ARTIFACTS',
  description: 'Packaging artifacts',
  status: 'success',
  startTime: Date.now() - 5000,
  endTime: Date.now(),
  duration: 5000,
  children: [],
  ...overrides
});

describe('ScrollbackItemView', () => {
  test('header renders action and target', async () => {
    const frame = await renderItem({
      kind: 'header',
      header: { projectName: 'my-app', stageName: 'dev', region: 'eu-west-1', action: 'DEPLOYING' }
    });
    expect(frame).toContain('DEPLOYING');
    expect(frame).toContain('my-app');
    expect(frame).toContain('dev');
    expect(frame).toContain('eu-west-1');
  });

  test('phase header renders the phase name', async () => {
    const frame = await renderItem({ kind: 'phase-header', name: 'Build & Package' });
    expect(frame).toContain('Build & Package');
  });

  test('finished event renders icon, description and duration', async () => {
    const frame = await renderItem({ kind: 'event', event: finishedEvent() });
    expect(frame).toContain('✓');
    expect(frame).toContain('Packaging artifacts');
    expect(frame).toContain('5.0s');
  });

  test('finished event includes child rows (output streams separately, not in the block)', async () => {
    const frame = await renderItem({
      kind: 'event',
      event: finishedEvent({
        children: [
          {
            ...finishedEvent({ id: 'BUILD_CODE-api', eventType: 'BUILD_CODE', description: 'api' }),
            instanceId: 'api',
            finalMessage: '4.2 MB'
          }
        ],
        outputLines: ['hook output line']
      })
    });
    expect(frame).toContain('api');
    expect(frame).toContain('4.2 MB');
    // Output lines stream live as their own scrollback items; the finished block must NOT repeat them.
    expect(frame).not.toContain('hook output line');
  });

  test('output-line renders the raw line, no source prefix when alone', async () => {
    const frame = await renderItem({ kind: 'output-line', line: 'Applying migration 20260101_init' });
    expect(frame).toContain('Applying migration 20260101_init');
    expect(frame).not.toContain('[');
  });

  test('output-line shows a [source] prefix when one is provided', async () => {
    const frame = await renderItem({ kind: 'output-line', source: 'db-migrate', line: '2 migrations applied' });
    expect(frame).toContain('[db-migrate]');
    expect(frame).toContain('2 migrations applied');
  });

  test('failed event renders error icon', async () => {
    const frame = await renderItem({ kind: 'event', event: finishedEvent({ status: 'error' }) });
    expect(frame).toContain('✗');
  });

  test('message renders symbol and text', async () => {
    const frame = await renderItem({ kind: 'message', type: 'warn', text: 'something needs attention' });
    expect(frame).toContain('▲');
    expect(frame).toContain('something needs attention');
  });

  test('error renders type label, message and hints as a styled block', async () => {
    const frame = await renderItem(
      {
        kind: 'error',
        error: {
          errorType: 'CONFIG',
          message: 'Invalid value for property "memory"',
          hints: ['memory must be between 128 and 10240'],
          isExpected: true
        }
      },
      { width: 100, height: 12 }
    );
    expect(frame).toContain('✗');
    expect(frame).toContain('CONFIG Error');
    expect(frame).toContain('Invalid value for property "memory"');
    expect(frame).toContain('Hints:');
    expect(frame).toContain('memory must be between 128 and 10240');
  });

  test('summary renders message, phase recap, links and total duration', async () => {
    const frame = await renderItem(
      {
        kind: 'summary',
        summary: {
          success: true,
          message: 'DEPLOYMENT SUCCESSFUL',
          links: [{ label: 'API URL', url: 'https://api.example.com' }],
          consoleUrl: 'https://console.stacktape.com/stacks/my-app'
        },
        phases: [
          { id: 'INITIALIZE', name: 'Initialize', status: 'success', duration: 2000, events: [] },
          { id: 'DEPLOY', name: 'Deploy', status: 'success', duration: 60000, events: [] }
        ],
        totalDurationMs: 62000
      },
      { width: 100, height: 14 }
    );
    expect(frame).toContain('DEPLOYMENT SUCCESSFUL');
    expect(frame).toContain('Initialize 2.0s');
    expect(frame).toContain('API URL');
    expect(frame).toContain('https://api.example.com');
    expect(frame).toContain('https://console.stacktape.com/stacks/my-app');
  });
});
