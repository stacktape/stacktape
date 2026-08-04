import { describe, test, expect, afterEach } from 'bun:test';
import { testRender } from '@opentui/solid';
import type { ScrollbackItem } from '../../feed';
import type { TuiEvent } from '../../types';
import { ScrollbackItemView } from '../scrollback-items';

type TestSetup = Awaited<ReturnType<typeof testRender>>;
let testSetup: TestSetup;

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy();
  }
});

const renderItem = async (item: ScrollbackItem, opts = { width: 100, height: 20 }) => {
  testSetup = await testRender(() => <ScrollbackItemView item={item} width={opts.width} />, opts);
  await new Promise((r) => setTimeout(r, 20));
  await testSetup.renderOnce();
  return testSetup.captureCharFrame();
};

const finishedEvent = (overrides: Partial<TuiEvent> = {}): TuiEvent => ({
  id: 'PACKAGE_ARTIFACTS',
  eventType: 'PACKAGE_ARTIFACTS',
  description: 'Packaging workloads',
  status: 'success',
  startTime: Date.now() - 4200,
  endTime: Date.now(),
  duration: 4200,
  finalMessage: '3 workloads packaged',
  children: [],
  ...overrides
});

describe('scrollback document grammar', () => {
  test('command header block', async () => {
    const frame = await renderItem({
      kind: 'header',
      header: { projectName: 'demo-app', stageName: 'prod', region: 'eu-west-1', action: 'DEPLOYING' }
    });
    expect(frame).toContain('▌ DEPLOY');
    expect(frame).toContain('demo-app / prod');
    expect(frame).toContain('eu-west-1');
  });

  test('phase divider is a titled rule', async () => {
    const frame = await renderItem({ kind: 'phase-header', name: 'Build & Package' });
    expect(frame).toContain('── Build & Package ──');
  });

  test('event line shows one outcome message with a duration rail', async () => {
    const frame = await renderItem({ kind: 'event', event: finishedEvent() });
    expect(frame).toContain('✓ 3 workloads packaged');
    expect(frame).toContain('4.2s');
    // Never description AND finalMessage together.
    expect(frame).not.toContain('Packaging workloads');
  });

  test('children render as tree branches without name duplication', async () => {
    const frame = await renderItem({
      kind: 'event',
      event: finishedEvent({
        children: [
          {
            id: 'BUILD_CODE-web',
            eventType: 'BUILD_CODE',
            description: 'Building web',
            status: 'success',
            startTime: Date.now() - 3600,
            duration: 3600,
            finalMessage: 'web packaged (38.2 MB)',
            instanceId: 'web',
            children: []
          },
          {
            id: 'BUILD_CODE-api',
            eventType: 'BUILD_CODE',
            description: 'Building api',
            status: 'success',
            startTime: Date.now() - 2300,
            duration: 2300,
            finalMessage: 'api packaged (4.1 MB)',
            instanceId: 'api',
            children: []
          }
        ]
      })
    });
    expect(frame).toContain('├ ✓ web packaged (38.2 MB)');
    expect(frame).toContain('└ ✓ api packaged (4.1 MB)');
  });

  test('buffered output is a failure diagnostic: hidden on success, attached on error', async () => {
    const success = await renderItem({
      kind: 'event',
      event: finishedEvent({ outputLines: ['$ docker build .', '#10 exporting to image'] })
    });
    expect(success).not.toContain('$ docker build .');

    const failed = await renderItem({
      kind: 'event',
      event: finishedEvent({
        status: 'error',
        finalMessage: 'Packaging failed',
        outputLines: ['$ docker build .', '#10 ERROR: process exited with code 1']
      })
    });
    const lines = failed.split('\n');
    const eventRow = lines.findIndex((l) => l.includes('✗ Packaging failed'));
    const firstOutput = lines.findIndex((l) => l.includes('│ $ docker build .'));
    // The log is attached under its failed event, never orphaned above it.
    expect(firstOutput).toBeGreaterThan(eventRow);
    expect(failed).toContain('│ #10 ERROR: process exited with code 1');
  });

  test('finished CF event is a single line with change counts', async () => {
    const frame = await renderItem({
      kind: 'event',
      event: finishedEvent({
        id: 'UPDATE_STACK',
        eventType: 'UPDATE_STACK',
        description: 'Updating CloudFormation stack',
        duration: 92000,
        data: {
          kind: 'cloudformation-progress',
          stackAction: 'update',
          completedCount: 14,
          changeCounts: { created: 3, updated: 9, deleted: 2 }
        }
      })
    });
    expect(frame).toContain('✓ CloudFormation update · 3 created · 9 updated · 2 deleted');
    expect(frame).toContain('1m 32s');
  });

  test('output lines use the gutter, with a source tag only when given', async () => {
    const plain = await renderItem({ kind: 'output-line', line: 'built in 3.42s' });
    expect(plain).toContain('│ built in 3.42s');

    const sourced = await renderItem({ kind: 'output-line', source: 'build-web', line: 'built in 3.42s' });
    expect(sourced).toContain('│ build-web');
  });

  test('messages use the ascii info/warning glyphs', async () => {
    const info = await renderItem({ kind: 'message', type: 'info', text: 'Issues: enabled.' });
    expect(info).toContain('i Issues: enabled.');

    const warn = await renderItem({ kind: 'message', type: 'warn', text: 'Hook was slow.' });
    expect(warn).toContain('! Hook was slow.');
  });

  test('prompt answer keeps the answer on the right rail', async () => {
    const frame = await renderItem({ kind: 'prompt-answer', message: 'Deploy to prod?', answer: 'yes' });
    expect(frame).toContain('? Deploy to prod?');
    expect(frame.split('\n')[0]!.trimEnd().endsWith('yes')).toBe(true);
  });

  test('error block: command verb title, intact gutter on wrapped lines, Fix section', async () => {
    const frame = await renderItem({
      kind: 'error',
      header: { projectName: 'demo-app', stageName: 'prod', region: 'eu-west-1', action: 'DEPLOYING' },
      error: {
        errorType: 'STACK',
        message:
          'Resource MainDatabaseCluster (part of main-database): The specified instance class is not available in this region and the stack was rolled back to its previous working state after the failure.',
        hints: ['Use a supported instance class.'],
        isExpected: true
      }
    });
    expect(frame).toContain('▌ DEPLOY FAILED');
    expect(frame).toContain('demo-app / prod · eu-west-1');
    expect(frame).toContain('main-database · MainDatabaseCluster');
    expect(frame).toContain('Next steps');
    expect(frame).toContain('› Use a supported instance class.');
    // Every non-empty body line keeps the gutter column.
    const body = frame.split(String.fromCharCode(10)).filter((line) => line.trim() && !line.includes('DEPLOY FAILED'));
    for (const line of body) {
      expect(line.trimStart().startsWith('│') || line.trimStart().startsWith('›')).toBe(true);
    }
  });

  test('deployment receipt: brand rule, links, changes and timing', async () => {
    const frame = await renderItem({
      kind: 'summary',
      header: { projectName: 'demo-app', stageName: 'prod', region: 'eu-west-1', action: 'DEPLOYING' },
      summary: {
        success: true,
        message: 'DEPLOYED',
        links: [{ label: 'web-service', url: 'https://demo-app.example.com' }],
        consoleUrl: 'https://console.stacktape.com/projects/demo-app'
      },
      phases: [
        { id: 'INITIALIZE', name: 'Initialize', status: 'success', duration: 1400, events: [] },
        {
          id: 'DEPLOY',
          name: 'Deploy',
          status: 'success',
          duration: 9800,
          events: [
            finishedEvent({
              id: 'UPDATE_STACK',
              eventType: 'UPDATE_STACK',
              data: {
                kind: 'cloudformation-progress',
                stackAction: 'update',
                completedCount: 14,
                totalPlanned: 14,
                changeCounts: { created: 3, updated: 9, deleted: 2 }
              }
            })
          ]
        }
      ],
      totalDurationMs: 17800
    });
    expect(frame).toContain('── stacktape ── ✓ DEPLOYED');
    expect(frame).toContain('total 17.8s');
    expect(frame).toContain('demo-app / prod · eu-west-1');
    expect(frame).toContain('web-service');
    expect(frame).toContain('console');
    expect(frame).toContain('14 resources · +3 created · ~9 updated · -2 deleted');
    expect(frame).toContain('init 1.4s');
  });

  test('document measure is capped at 100 cells', async () => {
    const frame = await renderItem(
      {
        kind: 'event',
        event: finishedEvent()
      },
      { width: 140, height: 20 }
    );
    for (const line of frame.split('\n')) {
      expect(line.trimEnd().length).toBeLessThanOrEqual(100);
    }
  });
});
