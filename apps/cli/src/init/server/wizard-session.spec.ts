import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from '@stacktape/config-inference/facts';
import type { GreenfieldResult } from '../missions/greenfield';
import { startWizardSession, toTimelineEntry, type WizardSession } from './wizard-session';

let session: WizardSession | undefined;

afterEach(async () => {
  await session?.close();
  session = undefined;
});

const service = {
  name: 'api',
  path: '.',
  language: 'javascript',
  exposesHttp: true,
  executionModel: 'long-running' as const,
  startCommand: 'node index.js',
  evidence: [],
  source: 'probe' as const
};

const factsWith = (overrides: Record<string, unknown>): ProjectFacts =>
  projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION, services: [service], ...overrides });

describe('startWizardSession', () => {
  const resultFor = (facts: ProjectFacts): GreenfieldResult => ({
    facts,
    composition: composeConfig({ facts, projectName: 'demo' }),
    verification: [],
    completeness: []
  });

  it('recomposes when a decision is changed, without editing the facts', async () => {
    const facts = factsWith({
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['api'],
          currentlyHostedOn: 'supabase',
          evidence: [],
          source: 'probe'
        }
      ]
    });
    const result = resultFor(facts);
    // Decided for them: keep the live database, create nothing.
    expect(result.composition.config.resources.mainDatabase).toBeUndefined();
    expect(result.composition.assumptions[0]).toMatchObject({ chosen: 'point-at-existing' });

    session = await startWizardSession({ projectName: 'demo', result });
    const origin = `http://127.0.0.1:${session.server.port}`;
    const token = new URL(session.server.url).hash.replace('#token=', '');

    const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
      method: 'POST',
      headers: { Origin: origin }
    });
    const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
    const { csrfToken } = (await handshake.json()) as { csrfToken: string };

    const answered = await fetch(`${origin}/api/answer`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ id: 'external-database:mainDatabase', value: 'create-new' })
    });

    const state = (await answered.json()) as {
      composition: { deployable: boolean; resources: Record<string, unknown> };
    };
    // Changing the decision changes the configuration, because everything is recomposed from the
    // original facts plus the decision — not patched on top of what was there.
    expect(state.composition.resources.mainDatabase).toMatchObject({ type: 'relational-database' });
  });

  it('sends decisions as values, never as agent-written words', async () => {
    const facts = factsWith({
      uncertainties: [
        {
          kind: 'command-unknown',
          id: 'command-unknown:api',
          blocksDeploy: true,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          command: 'start',
          suggestions: []
        }
      ]
    });

    session = await startWizardSession({ projectName: 'demo', result: resultFor(facts) });
    const origin = `http://127.0.0.1:${session.server.port}`;
    const token = new URL(session.server.url).hash.replace('#token=', '');
    const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
      method: 'POST',
      headers: { Origin: origin }
    });
    const { state } = (await handshake.json()) as {
      state: { facts: { decisions: Array<{ kind: string; chosen: string; parameters: Record<string, unknown> }> } };
    };

    const decision = state.facts.decisions[0]!;
    expect(decision.kind).toBe('command-unknown');
    // Nobody was asked: the convention was assumed, and the parameters say what it was about.
    expect(decision.chosen).toBe('npm start');
    expect(decision.parameters).toMatchObject({ serviceName: 'api', command: 'start' });
    // The interface supplies every word; nothing the agent wrote reaches the page.
    expect(JSON.stringify(decision)).not.toContain('source');
  });

  describe('starting the analysis from the page', () => {
    const agents = [
      {
        id: 'claude-code',
        label: 'Claude Code',
        description: 'Reads your project locally.',
        models: [
          { id: 'default', label: 'Your default', description: '' },
          { id: 'opus', label: 'Opus', description: '' }
        ]
      }
    ];

    const openSession = async (
      start: Parameters<typeof startWizardSession>[0]['start']
    ): Promise<{ origin: string; cookie: string; csrfToken: string; state: { phase: string } }> => {
      session = await startWizardSession({ projectName: 'demo', agents, ...(start === undefined ? {} : { start }) });
      const origin = `http://127.0.0.1:${session.server.port}`;
      const token = new URL(session.server.url).hash.replace('#token=', '');
      const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
        method: 'POST',
        headers: { Origin: origin }
      });
      const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
      const { csrfToken, state } = (await handshake.json()) as { csrfToken: string; state: { phase: string } };
      return { origin, cookie, csrfToken, state };
    };

    const post = (
      where: { origin: string; cookie: string; csrfToken: string },
      body: Record<string, unknown>
    ): Promise<Response> =>
      fetch(`${where.origin}/api/start`, {
        method: 'POST',
        headers: {
          Origin: where.origin,
          Cookie: where.cookie,
          'Content-Type': 'application/json',
          'x-csrf-token': where.csrfToken
        },
        body: JSON.stringify(body)
      });

    it('waits on the user rather than reading anything, and reports what it will offer', async () => {
      const opened = await openSession(async () => resultFor(factsWith({})));

      // The whole point of the phase: the agent subscription is not spent until someone asks.
      expect(opened.state.phase).toBe('ready');
    });

    it('runs the mission for the chosen agent and publishes the result', async () => {
      const chosen: Array<{ agentId: string; modelId: string }> = [];
      const opened = await openSession(async (choice, onProgress) => {
        chosen.push(choice);
        onProgress({ kind: 'tool', label: 'read_file package.json' });
        return resultFor(factsWith({}));
      });

      const response = await post(opened, { agentId: 'claude-code', modelId: 'opus' });
      expect(response.status).toBe(200);
      // The request does not wait for the run — a real one takes tens of seconds and reports over
      // the event stream. It answers with wherever the session has got to, which for a mission this
      // fast may already be past `analysing`; what matters is that it is no longer waiting to start.
      expect(((await response.json()) as { phase: string }).phase).not.toBe('ready');

      const finished = await Promise.race([
        (async () => {
          for (let attempt = 0; attempt < 50; attempt += 1) {
            const state = (await (
              await fetch(`${opened.origin}/api/state`, { headers: { Origin: opened.origin, Cookie: opened.cookie } })
            ).json()) as { phase: string; timeline: unknown[] };
            if (state.phase !== 'analysing') return state;
            await new Promise((settle) => setTimeout(settle, 20));
          }
          return { phase: 'timed-out', timeline: [] };
        })(),
        new Promise<{ phase: string; timeline: unknown[] }>((settle) =>
          setTimeout(() => settle({ phase: 'timed-out', timeline: [] }), 5000)
        )
      ]);

      expect(chosen).toEqual([{ agentId: 'claude-code', modelId: 'opus' }]);
      expect(finished.phase).toBe('reviewing');
      expect(finished.timeline).toHaveLength(1);
    });

    it('refuses an agent or model it never offered', async () => {
      const opened = await openSession(async () => resultFor(factsWith({})));

      expect((await post(opened, { agentId: 'something-else', modelId: 'default' })).status).toBe(400);
      expect((await post(opened, { agentId: 'claude-code', modelId: 'gpt-9' })).status).toBe(400);
    });

    it('starts once, however many times the button is pressed', async () => {
      let runs = 0;
      const opened = await openSession(async () => {
        runs += 1;
        await new Promise((settle) => setTimeout(settle, 50));
        return resultFor(factsWith({}));
      });

      await Promise.all([
        post(opened, { agentId: 'claude-code', modelId: 'default' }),
        post(opened, { agentId: 'claude-code', modelId: 'default' })
      ]);

      expect(runs).toBe(1);
    });

    it('writes the configuration the user is looking at, in the format they chose', async () => {
      const written: Array<{ format: string; resources: string[] }> = [];
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async ({ composition, format }) => {
          written.push({ format, resources: Object.keys(composition.config.resources) });
          return { path: `/repo/stacktape.${format === 'typescript' ? 'ts' : 'yml'}`, filename: 'stacktape.yml' };
        }
      });
      const origin = `http://127.0.0.1:${session.server.port}`;
      const token = new URL(session.server.url).hash.replace('#token=', '');
      const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
        method: 'POST',
        headers: { Origin: origin }
      });
      const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
      const { csrfToken } = (await handshake.json()) as { csrfToken: string };

      const response = await fetch(`${origin}/api/write`, {
        method: 'POST',
        headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ format: 'typescript' })
      });

      expect(response.status).toBe(200);
      expect(written).toHaveLength(1);
      expect(written[0]!.format).toBe('typescript');
      // The file has to be the configuration on screen, which is the recomposed one the session
      // holds — not something re-derived after the fact.
      expect(written[0]!.resources).toEqual(Object.keys(resultFor(factsWith({})).composition.config.resources));
      expect(((await response.json()) as { configFile?: { format: string } }).configFile?.format).toBe('typescript');
    });

    it('streams a deploy to the page and ends with its outcome', async () => {
      let emit: ((event: unknown) => void) | undefined;
      let settle: ((outcome: { ok: boolean; code: string; message: string }) => void) | undefined;

      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        deploy: async ({ onEvent, onCommand }) => {
          onCommand('stacktape deploy --stage dev');
          emit = onEvent;
          return new Promise((resolveDeploy) => {
            settle = resolveDeploy;
          });
        }
      });
      const origin = `http://127.0.0.1:${session.server.port}`;
      const token = new URL(session.server.url).hash.replace('#token=', '');
      const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
        method: 'POST',
        headers: { Origin: origin }
      });
      const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
      const { csrfToken } = (await handshake.json()) as { csrfToken: string };
      const headers = { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken };
      const readState = async () =>
        (await (await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } })).json()) as {
          deployment?: { status: string; events: unknown[]; commandLine: string; outcome?: { ok: boolean } };
        };

      // Nothing to deploy before the configuration is written.
      await fetch(`${origin}/api/deploy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'dev', region: 'eu-west-1' })
      });
      expect((await readState()).deployment).toBeUndefined();

      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });
      await fetch(`${origin}/api/deploy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'dev', region: 'eu-west-1' })
      });

      const running = await readState();
      expect(running.deployment?.status).toBe('running');
      expect(running.deployment?.commandLine).toBe('stacktape deploy --stage dev');

      emit!({ type: 'event', phase: 'DEPLOY', message: 'Creating resources' });
      // Progress publishing is coalesced, so the page sees this a beat later rather than instantly.
      await new Promise((wait) => setTimeout(wait, 300));
      expect((await readState()).deployment?.events).toHaveLength(1);

      settle!({ ok: true, code: 'OK', message: 'Deployed' });
      await new Promise((wait) => setTimeout(wait, 50));

      const finished = await readState();
      expect(finished.deployment?.status).toBe('succeeded');
      expect(finished.deployment?.outcome?.ok).toBe(true);
    });

    it('refuses a format it does not emit', async () => {
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' })
      });
      const origin = `http://127.0.0.1:${session.server.port}`;
      const token = new URL(session.server.url).hash.replace('#token=', '');
      const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
        method: 'POST',
        headers: { Origin: origin }
      });
      const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
      const { csrfToken } = (await handshake.json()) as { csrfToken: string };

      const response = await fetch(`${origin}/api/write`, {
        method: 'POST',
        headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ format: '../../etc/passwd' })
      });

      expect(response.status).toBe(400);
    });

    it('tells the page why, when the mission fails', async () => {
      const opened = await openSession(async () => {
        throw new Error('claude exited with 1');
      });

      await post(opened, { agentId: 'claude-code', modelId: 'default' });
      await new Promise((settle) => setTimeout(settle, 50));

      const state = (await (
        await fetch(`${opened.origin}/api/state`, { headers: { Origin: opened.origin, Cookie: opened.cookie } })
      ).json()) as { phase: string; error?: string };
      expect(state.phase).toBe('failed');
      expect(state.error).toBe('claude exited with 1');
    });
  });
});

describe('toTimelineEntry', () => {
  it('renders a tool call and a thought, and ignores accounting', () => {
    expect(toTimelineEntry({ type: 'tool-call', name: 'read_file', summary: 'package.json' })).toEqual({
      kind: 'tool',
      label: 'read_file package.json'
    });
    expect(toTimelineEntry({ type: 'text', text: 'Checking the manifest.' })).toEqual({
      kind: 'thought',
      label: 'Checking the manifest.'
    });
    expect(toTimelineEntry({ type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } })).toBeUndefined();
  });
});
