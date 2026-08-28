import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { operationSession } from '@application-services/operation-manager';
import { stripAnsi } from '../../format/text';
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
});
