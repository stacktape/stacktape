import { afterEach, describe, expect, test } from 'bun:test';
import { startWizardServer, type WizardServer, type WizardState } from '../../src/init/server/wizard-server';
import { connectToInitWizard, extractWizardUrl } from './init-canary-client';

const initialState = (): WizardState => ({
  phase: 'ready',
  projectName: 'v4canary-init-test',
  timeline: [],
  answers: {}
});

let server: WizardServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('init canary wizard client', () => {
  test('extracts the loopback URL from decorated CLI output', () => {
    expect(
      extractWizardUrl('\u001B[32mThe wizard is running at http://127.0.0.1:7331/#token=abc_DEF-123\u001B[0m\n')
    ).toBe('http://127.0.0.1:7331/#token=abc_DEF-123');
    expect(extractWizardUrl('No wizard here.')).toBeUndefined();
  });

  test('handshakes once, sends the CSRF token, and waits for published state', async () => {
    server = await startWizardServer({
      initialState: initialState(),
      hooks: {
        onStart: () => {
          server!.publish({ ...initialState(), phase: 'reviewing' });
        },
        onAnswer: () => initialState(),
        onMode: () => initialState(),
        onWrite: () => undefined,
        onDeploy: () => undefined,
        onVerify: () => undefined,
        onVerifyDismiss: () => initialState(),
        onPipeline: () => undefined,
        onRecheck: () => initialState()
      }
    });

    const client = await connectToInitWizard(server.url);
    await client.post('/api/start', { agentId: 'none', modelId: 'default', mode: 'low-cost' });
    const state = await client.waitForState({
      accept: (candidate) => candidate.phase === 'reviewing',
      label: 'finish analysis',
      timeoutMs: 2_000
    });

    expect(state.phase).toBe('reviewing');
    await expect(connectToInitWizard(server.url)).rejects.toThrow('already been used');
  });

  test('refuses non-loopback wizard URLs before making a request', async () => {
    await expect(connectToInitWizard('https://example.com/#token=abc')).rejects.toThrow('loopback');
  });

  test('aborts a pending state wait when the canary is interrupted', async () => {
    server = await startWizardServer({
      initialState: initialState(),
      hooks: {
        onStart: () => undefined,
        onAnswer: () => initialState(),
        onMode: () => initialState(),
        onWrite: () => undefined,
        onDeploy: () => undefined,
        onVerify: () => undefined,
        onVerifyDismiss: () => initialState(),
        onPipeline: () => undefined,
        onRecheck: () => initialState()
      }
    });
    const controller = new AbortController();
    const client = await connectToInitWizard(server.url, { signal: controller.signal });
    controller.abort(new Error('interrupted'));

    await expect(
      client.waitForState({
        accept: (candidate) => candidate.phase === 'reviewing',
        label: 'finish',
        timeoutMs: 60_000
      })
    ).rejects.toThrow('interrupted');
  });
});
