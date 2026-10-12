import { describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { DetectedAgent } from './agent/detect';
import { canOpenBrowser, chooseAgent, runInit, type InitOutcome } from './run-init';
import type { WizardState } from './server/wizard-server';

const agent = (id: DetectedAgent['id'], executable = id): DetectedAgent => ({
  id,
  executable,
  version: '1.0.0',
  capabilities: {
    canDisableBuiltInTools: true,
    enforcesTurnLimit: true,
    acceptsSystemPrompt: true,
    emitsStructuredTranscript: true,
    isolatedMcpConfig: true
  }
});

describe('chooseAgent', () => {
  it('takes the best drivable agent, in detection order', () => {
    expect(chooseAgent([agent('claude-code'), agent('codex')])?.id).toBe('claude-code');
    expect(chooseAgent([agent('codex')])?.id).toBe('codex');
  });

  it('does not pick an agent we cannot yet drive as a session', () => {
    // Copilot is detected so we can tell the user it exists, but choosing it because it happens to
    // be installed would be worse than not offering it.
    expect(chooseAgent([agent('copilot')])).toBeUndefined();
  });

  it('returns nothing when none are installed', () => {
    expect(chooseAgent([])).toBeUndefined();
  });

  it('honours an explicit request over the ranking', () => {
    expect(chooseAgent([agent('claude-code'), agent('codex')], 'codex')?.id).toBe('codex');
  });

  it('returns nothing when the requested agent is absent, rather than substituting', () => {
    // runInit turns this into an error. Quietly using a different agent, and charging someone's
    // subscription for it, is worse than stopping.
    expect(chooseAgent([agent('claude-code')], 'codex')).toBeUndefined();
  });

  it('returns nothing when the agent is declined', () => {
    expect(chooseAgent([agent('claude-code')], 'none')).toBeUndefined();
  });
});

describe('canOpenBrowser', () => {
  it('refuses in CI, where nobody is looking at a screen', () => {
    expect(canOpenBrowser({ CI: 'true' } as NodeJS.ProcessEnv)).toBe(false);
    expect(canOpenBrowser({ GITHUB_ACTIONS: 'true' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('allows a normal desktop session', () => {
    const env = (process.platform === 'linux' ? { DISPLAY: ':0' } : {}) as NodeJS.ProcessEnv;
    expect(canOpenBrowser(env)).toBe(true);
  });
});

it('the printed wizard address still starts, streams analysis and saves a project when the browser cannot open', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stp-init-browser-refusal-'));
  let outcome: InitOutcome | undefined;
  const output: string[] = [];
  try {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'orders', scripts: { start: 'node index.js' } })
    );
    await writeFile(join(root, 'index.js'), "const app = require('express')();\napp.listen(process.env.PORT);\n");
    outcome = await runInit({
      repositoryRoot: root,
      projectName: 'orders',
      presentation: 'browser',
      codingAgent: 'claude-code',
      detect: async () => [agent('claude-code')],
      // The vendor is the external boundary. Scanning, mission, wizard HTTP and file writing remain real.
      runSession: async (_input, hooks) => {
        hooks.onEvent({ type: 'tool-call', name: 'read_file', summary: 'index.js' });
        hooks.onEvent({ type: 'text', text: 'UNTRUSTED_AGENT_PROSE' });
        return { stopReason: 'no-submission', usage: { inputTokens: 0, outputTokens: 0 } };
      },
      estimateCost: async () => undefined,
      openBrowser: async () => {
        throw new Error('No desktop browser is available.');
      },
      onOutput: (line) => output.push(line)
    });
    // Use the address available to the terminal user, rather than reaching around the presentation layer.
    const printedUrl = output.join('\n').match(/http:\/\/127\.0\.0\.1:\d+\/[^\s]*/)?.[0];
    expect(printedUrl).toBe(outcome.wizardUrl);
    expect(printedUrl).toBeDefined();
    const url = new URL(printedUrl!);
    const origin = url.origin;
    const handshake = await fetch(`${origin}/api/handshake?token=${url.hash.replace('#token=', '')}`, {
      method: 'POST',
      headers: { Origin: origin }
    });
    expect(handshake.status).toBe(200);
    const { csrfToken, state } = (await handshake.json()) as { csrfToken: string; state: WizardState };
    expect(state.phase).toBe('ready');
    const headers = {
      Origin: origin,
      Cookie: handshake.headers.get('set-cookie')!.split(';')[0]!,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    };
    const started = await fetch(`${origin}/api/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ agentId: 'claude-code', modelId: 'default' })
    });
    expect(started.status).toBe(200);
    let reviewed: WizardState = (await started.json()) as WizardState;
    const deadline = Date.now() + 5000;
    while (reviewed.phase === 'analysing' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      reviewed = (await (await fetch(`${origin}/api/state`, { headers })).json()) as WizardState;
    }
    expect(reviewed.phase).toBe('reviewing');
    expect(reviewed.timeline).toContainEqual({ kind: 'tool', label: 'read_file index.js' });
    expect(JSON.stringify(reviewed.timeline)).not.toContain('UNTRUSTED_AGENT_PROSE');
    expect(output.join('\n')).toContain('read_file index.js');
    const written = await fetch(`${origin}/api/write`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format: 'yaml' })
    });
    expect(written.status).toBe(200);
    expect(parseYaml(await readFile(join(root, 'stacktape.yml'), 'utf8'))).toMatchObject({
      resources: { orders: { type: 'web-service' } }
    });
  } finally {
    await outcome?.close?.();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);
