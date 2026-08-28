import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { operationSession } from '@application-services/operation-manager';
import { stripAnsi, visibleWidth } from '../../format/text';
import { glyphs } from '../../ui/glyphs';
import { StreamPresenter } from '../stream-presenter';

const originalWrite = process.stdout.write.bind(process.stdout);
let output = '';

beforeEach(() => {
  output = '';
  operationSession.reset({ preset: 'deploy', showPhaseHeaders: true });
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
});

afterEach(() => {
  process.stdout.write = originalWrite as typeof process.stdout.write;
});

const plainOutput = () => stripAnsi(output);

describe('StreamPresenter', () => {
  test('prints durable output once and keeps active work transient', () => {
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    presenter.start();
    operationSession.setPhase('BUILD_AND_PACKAGE');
    operationSession.reporter.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging artifacts' });
    operationSession.reporter.appendOutput({ eventType: 'PACKAGE_ARTIFACTS', lines: ['bundler output'] });
    operationSession.reporter.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: 'Packaged' });
    presenter.stop();

    const text = plainOutput();
    expect(text).toContain('── Build & Package ──');
    expect(text).toContain('bundler output');
    expect(text).toContain('✓ Packaging artifacts');
    expect(text.match(/✓ Packaging artifacts/g)).toHaveLength(1);
  });

  test('replays only records after the handoff cursor', () => {
    const first = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    first.start();
    operationSession.reporter.startEvent({ eventType: 'LOAD_CONFIG_FILE', description: 'Loading config' });
    operationSession.reporter.finishEvent({ eventType: 'LOAD_CONFIG_FILE', finalMessage: 'Loaded config' });
    const cursor = first.stop();
    output = '';

    operationSession.reporter.startEvent({ eventType: 'LOAD_USER_DATA', description: 'Loading user' });
    operationSession.reporter.finishEvent({ eventType: 'LOAD_USER_DATA', finalMessage: 'Loaded user' });
    const second = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    second.start(cursor);
    second.stop();

    const text = plainOutput();
    expect(text).not.toContain('Loading config');
    expect(text).toContain('✓ Loading user');
  });

  test('uses the workload label on generic finished child activities', () => {
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    presenter.start();
    operationSession.reporter.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
    const child = operationSession.reporter.createChild({
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'api-default',
      label: 'api'
    });
    child.startEvent({ eventType: 'BUILD_CODE', description: 'Identifying shared resources' });
    child.finishEvent({
      eventType: 'BUILD_CODE',
      finalMessage: 'Lambda bundle · 46.1 KB (12.1 KB zipped) · 1 shared layer'
    });
    presenter.stop();

    const text = plainOutput();
    expect(text).toContain('✓ api — Lambda bundle · 46.1 KB (12.1 KB zipped) · 1 shared layer');
    expect(text).not.toContain('✓ Identifying shared resources');
  });

  test('groups script output, retains safe color, and removes cursor controls', () => {
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    presenter.start();
    operationSession.reporter.startEvent({
      eventType: 'RUN_SCRIPT',
      description: 'Running script (beforeDeploy hook) migrateDb',
      instanceId: 'beforeDeploy-migrateDb',
      label: 'migrateDb',
      detail: { kind: 'script', name: 'migrateDb', trigger: 'beforeDeploy', target: 'local' }
    });
    operationSession.reporter.appendOutput({
      eventType: 'RUN_SCRIPT',
      instanceId: 'beforeDeploy-migrateDb',
      stream: 'stdout',
      lines: ['\u001b[31mPrisma migration\u001b[0m\u001b[2J\rcursor rewrite']
    });
    operationSession.reporter.finishEvent({
      eventType: 'RUN_SCRIPT',
      instanceId: 'beforeDeploy-migrateDb',
      finalMessage: 'Script migrateDb finished'
    });
    presenter.stop();

    const outputRecord = operationSession.journal.replay().find((record) => record.type === 'activity-output');
    expect(outputRecord?.type === 'activity-output' ? outputRecord.lines : []).toEqual([
      '\u001b[31mPrisma migration\u001b[0mcursor rewrite'
    ]);
    expect(outputRecord?.type === 'activity-output' ? outputRecord.lines.join('') : '').not.toContain('\r');
    expect(plainOutput()).toContain('┌ migrateDb  beforeDeploy hook');
    expect(plainOutput()).toContain('│ [migrateDb] Prisma migration');
    expect(plainOutput()).toContain('└ ✓ migrateDb finished');
    expect(
      operationSession.store.getSnapshot().activities[operationSession.store.getSnapshot().activityOrder[0]].outputLines
    ).toEqual(['Prisma migrationcursor rewrite']);
  });

  test('renders structured CloudFormation milestones and a counted final summary', () => {
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    presenter.start();
    operationSession.setPhase('DEPLOY');
    operationSession.reporter.startEvent({ eventType: 'UPDATE_STACK', description: 'Deploying infrastructure' });
    operationSession.reporter.updateEvent({
      eventType: 'UPDATE_STACK',
      additionalMessage: 'packed legacy progress text',
      detail: {
        kind: 'cloudformation-progress',
        stackAction: 'update',
        completedCount: 8,
        totalPlanned: 8,
        inProgressDetails: [],
        recentlyCompleted: [{ name: 'ApiLambdaFunction', action: 'UPDATE', resourceType: 'AWS::Lambda::Function' }],
        changeCounts: { created: 1, updated: 6, deleted: 1 }
      }
    });
    operationSession.reporter.finishEvent({ eventType: 'UPDATE_STACK', finalMessage: 'Deployment successful.' });
    presenter.stop();

    const text = plainOutput();
    expect(text).toContain('8/8 resources complete — ApiLambdaFunction');
    expect(text).toContain('✓ CloudFormation update — 8/8 resources · 1 created · 6 updated · 1 deleted');
  });

  test('advances the spinner without journal updates', async () => {
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    presenter.start();
    operationSession.reporter.startEvent({ eventType: 'UPDATE_STACK', description: 'Deploying infrastructure' });
    await new Promise((resolve) => setTimeout(resolve, 190));
    presenter.stop();

    const frames = glyphs.spinnerFrames.filter((frame) => plainOutput().includes(frame));
    expect(frames.length).toBeGreaterThan(1);
  });

  test('buffers journal records while an inherited child owns the terminal', () => {
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    presenter.start();
    operationSession.reporter.startEvent({
      eventType: 'RUN_SCRIPT',
      description: 'Running interactive child',
      label: 'child-shell'
    });
    presenter.suspendTerminal();
    const outputAtLeaseStart = output;

    operationSession.reporter.appendOutput({ eventType: 'RUN_SCRIPT', lines: ['must wait'], stream: 'stdout' });
    operationSession.reporter.finishEvent({ eventType: 'RUN_SCRIPT', finalMessage: 'Script child-shell finished' });
    expect(output).toBe(outputAtLeaseStart);

    presenter.resumeTerminal();
    presenter.stop();
    expect(plainOutput()).toContain('must wait');
    expect(plainOutput()).toContain('└ ✓ child-shell finished');
  });

  test('keeps every transient row narrower than the terminal', () => {
    const columnsDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    Object.defineProperty(process.stdout, 'columns', { configurable: true, value: 28 });
    const presenter = new StreamPresenter({ onToggle: () => {}, onCancel: () => {} });
    try {
      presenter.start();
      operationSession.reporter.startEvent({
        eventType: 'BUILD_CODE',
        description: 'Building an extremely long workload description that must never wrap'
      });
      const lines = (
        presenter as unknown as {
          activeLines(): string[];
        }
      ).activeLines();
      expect(lines.every((line) => visibleWidth(line) <= 27)).toBe(true);
    } finally {
      presenter.stop();
      if (columnsDescriptor) Object.defineProperty(process.stdout, 'columns', columnsDescriptor);
      else Reflect.deleteProperty(process.stdout, 'columns');
    }
  });
});
