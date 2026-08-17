import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from '@stacktape/config-inference/facts';
import type { GreenfieldResult } from '../missions/greenfield';
import { INIT_TARGET_SCHEMA_VERSION } from '../deploy/stack-expectation';
import { startWizardSession, toTimelineEntry, type WizardSession } from './wizard-session';

let session: WizardSession | undefined;

const CONFIG_SHA256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

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

    it('lets a failed analysis be started again from the page', async () => {
      let attempts = 0;
      const opened = await openSession(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('The agent crashed.');
        return resultFor(factsWith({}));
      });

      const phaseAfter = async (until: (phase: string) => boolean): Promise<string> => {
        for (let attempt = 0; attempt < 50; attempt += 1) {
          const state = (await (
            await fetch(`${opened.origin}/api/state`, { headers: { Origin: opened.origin, Cookie: opened.cookie } })
          ).json()) as { phase: string };
          if (until(state.phase)) return state.phase;
          await new Promise((settle) => setTimeout(settle, 20));
        }
        return 'timed-out';
      };

      await post(opened, { agentId: 'claude-code', modelId: 'default' });
      expect(await phaseAfter((phase) => phase === 'failed')).toBe('failed');

      // The retry must clear the failure, or the page stays on `failed` forever with a run inside.
      await post(opened, { agentId: 'claude-code', modelId: 'default' });
      expect(await phaseAfter((phase) => phase === 'reviewing')).toBe('reviewing');
      expect(attempts).toBe(2);
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
      let settle: ((outcome: { ok: boolean; code: string; message: string; urls?: string[] }) => void) | undefined;
      let requestedUrlResources: string[] = [];

      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        deploy: async ({ onEvent, onCommand, urlResourceNames }) => {
          onCommand('stacktape deploy --stage dev');
          emit = onEvent;
          requestedUrlResources = urlResourceNames;
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
          deployment?: {
            status: string;
            events: Array<{ type?: string; data?: unknown }>;
            commandLine: string;
            outcome?: { ok: boolean; urls?: string[] };
            urls?: string[];
          };
        };

      // Nothing to deploy before the configuration is written.
      await fetch(`${origin}/api/deploy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
      });
      expect((await readState()).deployment).toBeUndefined();

      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });
      await fetch(`${origin}/api/deploy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
      });

      const running = await readState();
      expect(running.deployment?.status).toBe('running');
      expect(running.deployment?.commandLine).toBe('stacktape deploy --stage dev');
      expect(requestedUrlResources).toEqual(['api']);

      emit!({ type: 'event', phase: 'DEPLOY', message: 'Creating resources' });
      emit!({ type: 'result', ok: true, code: 'OK', message: 'Done', data: { secret: 'do-not-publish' } });
      // Progress publishing is coalesced, so the page sees this a beat later rather than instantly.
      await new Promise((wait) => setTimeout(wait, 300));
      const streamed = (await readState()).deployment?.events ?? [];
      expect(streamed).toHaveLength(2);
      expect(streamed[1]).toMatchObject({ type: 'result', ok: true, code: 'OK' });
      expect(streamed[1]?.data).toBeUndefined();
      expect(JSON.stringify(streamed)).not.toContain('do-not-publish');

      settle!({ ok: true, code: 'OK', message: 'Deployed', urls: ['https://api.example.com/'] });
      await new Promise((wait) => setTimeout(wait, 50));

      const finished = await readState();
      expect(finished.deployment?.status).toBe('succeeded');
      expect(finished.deployment?.outcome?.ok).toBe(true);
      expect(finished.deployment?.outcome?.urls).toBeUndefined();
      expect(finished.deployment?.urls).toEqual(['https://api.example.com/']);
    });

    it('checks with deploy credentials, then binds update consent to the exact StackId', async () => {
      const stackId = 'arn:aws:cloudformation:eu-west-1:123456789012:stack/demo-dev/one';
      const deployed: Array<{ targetExpectation?: { expected: string; stackId?: string } }> = [];
      let inspections = 0;
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        inspectDeployTarget: async () => {
          inspections += 1;
          return {
            schemaVersion: INIT_TARGET_SCHEMA_VERSION,
            status: 'updateable',
            accountId: '123456789012',
            stackName: 'demo-dev',
            projectName: 'demo',
            stage: 'dev',
            region: 'eu-west-1',
            configSha256: CONFIG_SHA256,
            stackId,
            stackStatus: 'UPDATE_COMPLETE'
          };
        },
        deploy: async (input) => {
          deployed.push(input);
          return { ok: true, code: 'OK', message: 'Deployed' };
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
      const post = (expected: { kind: string; stackId?: string }) =>
        fetch(`${origin}/api/deploy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected })
        });
      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });

      await post({ kind: 'check' });
      expect(session.server.current().deployTarget).toMatchObject({ status: 'updateable', stackId });
      expect(deployed).toHaveLength(0);

      // Neither a create confirmation nor an update for a different physical stack widens consent.
      await post({ kind: 'create' });
      await post({ kind: 'update', stackId: `${stackId}-replacement` });
      expect(deployed).toHaveLength(0);

      await post({ kind: 'update', stackId });
      for (let attempt = 0; attempt < 50 && deployed.length === 0; attempt += 1) {
        await new Promise((wait) => setTimeout(wait, 10));
      }
      expect(inspections).toBe(4);
      expect(deployed[0]?.targetExpectation).toMatchObject({
        expected: 'update',
        accountId: '123456789012',
        stackName: 'demo-dev',
        stackId
      });
    });

    it('turns a direct create confirmation into a read-only check until that exact target was displayed', async () => {
      const deployed: unknown[] = [];
      const absent = {
        schemaVersion: INIT_TARGET_SCHEMA_VERSION,
        status: 'absent' as const,
        accountId: '123456789012',
        stackName: 'demo-dev',
        projectName: 'demo',
        stage: 'dev',
        region: 'eu-west-1',
        configSha256: CONFIG_SHA256
      };
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        inspectDeployTarget: async () => absent,
        deploy: async (input) => {
          deployed.push(input);
          return { ok: true, code: 'OK', message: 'Deployed' };
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
      const postCreate = () =>
        fetch(`${origin}/api/deploy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
        });
      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });

      await postCreate();
      expect(session.server.current().deployTarget).toEqual(absent);
      expect(deployed).toEqual([]);

      await postCreate();
      for (let attempt = 0; attempt < 50 && deployed.length === 0; attempt += 1) {
        await new Promise((wait) => setTimeout(wait, 10));
      }
      expect(deployed).toHaveLength(1);
    });

    it('returns to review when the authored config bytes change after the target was displayed', async () => {
      const observation = (configSha256: string) => ({
        schemaVersion: INIT_TARGET_SCHEMA_VERSION,
        status: 'absent' as const,
        accountId: '123456789012',
        stackName: 'demo-dev',
        projectName: 'demo',
        stage: 'dev',
        region: 'eu-west-1',
        configSha256
      });
      let inspections = 0;
      const deployed: unknown[] = [];
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        inspectDeployTarget: async () => observation(++inspections === 1 ? CONFIG_SHA256 : 'b'.repeat(64)),
        deploy: async (input) => {
          deployed.push(input);
          return { ok: true, code: 'OK', message: 'Deployed' };
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
      const postCreate = () =>
        fetch(`${origin}/api/deploy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
        });
      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });

      await postCreate();
      expect(session.server.current().deployTarget).toMatchObject({ configSha256: CONFIG_SHA256 });
      await postCreate();

      expect(deployed).toEqual([]);
      expect(session.server.current().deployTarget).toMatchObject({ configSha256: 'b'.repeat(64) });
    });

    it('allows only one exact-target inspection at a time', async () => {
      const absent = {
        schemaVersion: INIT_TARGET_SCHEMA_VERSION,
        status: 'absent' as const,
        accountId: '123456789012',
        stackName: 'demo-dev',
        projectName: 'demo',
        stage: 'dev',
        region: 'eu-west-1',
        configSha256: CONFIG_SHA256
      };
      let inspections = 0;
      let announceStarted: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        announceStarted = resolve;
      });
      let finishInspection: (result: typeof absent) => void = () => {};
      const deployed: unknown[] = [];
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        inspectDeployTarget: async () => {
          inspections += 1;
          announceStarted();
          return new Promise((resolve) => {
            finishInspection = resolve;
          });
        },
        deploy: async (input) => {
          deployed.push(input);
          return { ok: true, code: 'OK', message: 'Deployed' };
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
      const post = (expected: { kind: string }) =>
        fetch(`${origin}/api/deploy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected })
        });
      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });

      const firstCheck = post({ kind: 'check' });
      await started;
      // A second tab cannot start another probe or turn its click into create consent while the
      // first read-only observation is unresolved.
      await post({ kind: 'create' });
      expect(inspections).toBe(1);
      expect(deployed).toEqual([]);

      finishInspection(absent);
      await firstCheck;
      expect(session.server.current().deployTarget).toMatchObject({ status: 'absent', accountId: '123456789012' });
      expect(deployed).toEqual([]);
    });

    it('drops an exact-target result when the reviewed configuration changes during the check', async () => {
      const absent = {
        schemaVersion: INIT_TARGET_SCHEMA_VERSION,
        status: 'absent' as const,
        accountId: '123456789012',
        stackName: 'demo-dev',
        projectName: 'demo',
        stage: 'dev',
        region: 'eu-west-1',
        configSha256: CONFIG_SHA256
      };
      let announceStarted: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        announceStarted = resolve;
      });
      let finishInspection: (result: typeof absent) => void = () => {};
      const deployed: unknown[] = [];
      session = await startWizardSession({
        projectName: 'demo',
        result: resultFor(factsWith({})),
        write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
        inspectDeployTarget: async () => {
          announceStarted();
          return new Promise((resolve) => {
            finishInspection = resolve;
          });
        },
        deploy: async (input) => {
          deployed.push(input);
          return { ok: true, code: 'OK', message: 'Deployed' };
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
      await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });
      expect(session.server.current().configFile).toBeDefined();

      const check = fetch(`${origin}/api/deploy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'check' } })
      });
      await started;
      await fetch(`${origin}/api/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'capacity', value: 'performance' })
      });
      // Changing the composition also invalidates the previously written file. It must be reviewed
      // and written again before either a target check or a paid deploy is possible.
      expect(session.server.current().configFile).toBeUndefined();
      expect(session.server.current().preferences?.capacity).toBe('performance');
      expect(session.server.current().mode).toBeUndefined();

      finishInspection(absent);
      await check;
      expect(session.server.current().deployTarget).toBeUndefined();
      expect(session.server.current().deployment).toBeUndefined();
      expect(deployed).toEqual([]);
    });

    it('enforces composition, AWS identity, and Stacktape sign-in gates on the server', async () => {
      type GateState = {
        composition?: { deployable: boolean };
        awsIdentity?: { available: boolean };
        stacktapeAccount?: { signedIn: boolean };
      };
      const ordinary = resultFor(factsWith({}));
      const emptyFacts = projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION, services: [] });
      const blockedCases: Array<{
        result: GreenfieldResult;
        awsIdentity?: Parameters<typeof startWizardSession>[0]['awsIdentity'];
        stacktapeAccount?: Parameters<typeof startWizardSession>[0]['stacktapeAccount'];
        ready: (state: GateState) => boolean;
      }> = [
        {
          result: resultFor(emptyFacts),
          ready: (state) => state.composition?.deployable === false
        },
        {
          result: ordinary,
          awsIdentity: async () => ({
            available: false,
            reason: 'no-credentials',
            detail: 'No AWS credentials were found.'
          }),
          stacktapeAccount: async () => ({ signedIn: true, detail: 'Signed in.' }),
          ready: (state) => state.awsIdentity?.available === false && state.stacktapeAccount?.signedIn === true
        },
        {
          result: ordinary,
          awsIdentity: async () => ({
            available: true,
            accountId: '123456789012',
            arn: 'arn:aws:iam::123456789012:user/test'
          }),
          stacktapeAccount: async () => ({ signedIn: false, detail: 'Not signed in.' }),
          ready: (state) => state.awsIdentity?.available === true && state.stacktapeAccount?.signedIn === false
        }
      ];

      for (const blocked of blockedCases) {
        let deployCalls = 0;
        session = await startWizardSession({
          projectName: 'demo',
          result: blocked.result,
          write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
          deploy: async () => {
            deployCalls += 1;
            return { ok: true, code: 'OK', message: 'Deployed.' };
          },
          ...(blocked.awsIdentity === undefined ? {} : { awsIdentity: blocked.awsIdentity }),
          ...(blocked.stacktapeAccount === undefined ? {} : { stacktapeAccount: blocked.stacktapeAccount })
        });
        const origin = `http://127.0.0.1:${session.server.port}`;
        const token = new URL(session.server.url).hash.replace('#token=', '');
        const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
          method: 'POST',
          headers: { Origin: origin }
        });
        const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
        const { csrfToken } = (await handshake.json()) as { csrfToken: string };
        const headers = {
          Origin: origin,
          Cookie: cookie,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        };

        for (let attempt = 0; attempt < 50; attempt += 1) {
          const response = await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } });
          if (blocked.ready((await response.json()) as GateState)) break;
          await new Promise((settle) => setTimeout(settle, 10));
        }
        await fetch(`${origin}/api/write`, { method: 'POST', headers, body: JSON.stringify({ format: 'yaml' }) });
        await fetch(`${origin}/api/deploy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
        });

        expect(deployCalls).toBe(0);
        await session.close();
        session = undefined;
      }
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
  it('renders a tool call, and drops agent prose and accounting', () => {
    expect(toTimelineEntry({ type: 'tool-call', name: 'read_file', summary: 'package.json' })).toEqual({
      kind: 'tool',
      label: 'read_file package.json'
    });
    // Model output produced while reading untrusted files never becomes something the page shows.
    expect(toTimelineEntry({ type: 'text', text: 'Checking the manifest.' })).toBeUndefined();
    expect(toTimelineEntry({ type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } })).toBeUndefined();
  });
});

describe('the local try-out', () => {
  const result = () => {
    const facts = projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION, services: [service] });
    return { facts, composition: composeConfig({ facts, projectName: 'demo' }), verification: [], completeness: [] };
  };

  const failedService = {
    serviceName: 'api',
    resourceName: 'api',
    status: 'failed' as const,
    reason: 'Exited on startup asking for: X_API_KEY.',
    observations: {
      listeningPorts: [],
      dialedDependency: false,
      missingEnvironmentVariables: ['X_API_KEY'],
      logTail: []
    }
  };

  const open = async (verify: NonNullable<Parameters<typeof startWizardSession>[0]['verify']>, deploys: unknown[]) => {
    session = await startWizardSession({
      projectName: 'demo',
      result: result(),
      write: async () => ({ path: 'C:/repo/stacktape.yml', filename: 'stacktape.yml' }),
      deploy: async (input) => {
        deploys.push(input);
        return { ok: true, code: 'OK', message: 'done' };
      },
      verify
    });
    const origin = `http://127.0.0.1:${session.server.port}`;
    const token = new URL(session.server.url).hash.replace('#token=', '');
    const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
      method: 'POST',
      headers: { Origin: origin }
    });
    const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
    const { csrfToken } = (await handshake.json()) as { csrfToken: string };
    const post = (path: string, body: Record<string, unknown> = {}) =>
      fetch(`${origin}${path}`, {
        method: 'POST',
        headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body)
      });
    const stateNow = async () =>
      (await (await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } })).json()) as {
        verification?: { status: string; services?: Array<{ status: string }> };
        deployment?: { status: string };
      };
    const until = async (predicate: (state: Awaited<ReturnType<typeof stateNow>>) => boolean) => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const state = await stateNow();
        if (predicate(state)) return state;
        await new Promise((settle) => setTimeout(settle, 10));
      }
      throw new Error('The state never reached the expected shape.');
    };
    return { post, stateNow, until };
  };

  it('holds the deploy on a proven failure until the user sets it aside', async () => {
    let finishVerify: (value: { status: 'completed'; services: Array<typeof failedService> }) => void = () => {};
    const deploys: unknown[] = [];
    const { post, until, stateNow } = await open(
      () =>
        new Promise((resolve) => {
          finishVerify = resolve as typeof finishVerify;
        }),
      deploys
    );

    await post('/api/write', { format: 'yaml' });
    await post('/api/verify');
    expect((await stateNow()).verification?.status).toBe('running');

    // While it runs, the button does nothing — a deploy racing the evidence would defeat the gate.
    await post('/api/deploy', { stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } });
    expect(deploys).toEqual([]);

    finishVerify({ status: 'completed', services: [failedService] });
    await until((state) => state.verification?.status === 'completed');

    // A proven failure holds the deploy: the click is answered by the state, not by AWS spend.
    await post('/api/deploy', { stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } });
    expect(deploys).toEqual([]);

    // Setting it aside is the user's call, and it is honoured immediately.
    await post('/api/verify/dismiss');
    expect((await stateNow()).verification?.status).toBe('dismissed');
    await post('/api/deploy', { stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } });
    await until((state) => state.deployment !== undefined);
    expect(deploys.length).toBe(1);
  });

  it('repairs a proven local failure once, then proves the fix the same way', async () => {
    const verifyCalls: number[] = [];
    let repairCalls = 0;
    let repairFailure:
      | Parameters<NonNullable<Parameters<typeof startWizardSession>[0]['repair']>>[0]['failure']
      | undefined;
    const facts = projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION, services: [service] });
    const failureWithPrivateLog = {
      ...failedService,
      observations: {
        ...failedService.observations,
        logTail: ['DATABASE_URL=postgresql://user:do-not-send@database.example/app']
      }
    };

    session = await startWizardSession({
      projectName: 'demo',
      result: { facts, composition: composeConfig({ facts, projectName: 'demo' }), verification: [], completeness: [] },
      verify: async () => {
        verifyCalls.push(Date.now());
        // First look fails; the look after the repair passes.
        return verifyCalls.length === 1
          ? { status: 'completed', services: [failureWithPrivateLog] }
          : {
              status: 'completed',
              services: [{ ...failedService, status: 'passed' as const, reason: 'Listening on port 8080.' }]
            };
      },
      repair: async ({ failure }) => {
        repairCalls += 1;
        repairFailure = failure;
        return { facts, composition: composeConfig({ facts, projectName: 'demo' }), changed: true };
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

    await fetch(`${origin}/api/verify`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: '{}'
    });

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = (await (
        await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } })
      ).json()) as { verification?: { status: string; services?: Array<{ status: string }> } };
      if (state.verification?.status === 'completed') {
        // The failure was repaired locally and re-proven locally — one repair, two looks, no AWS.
        expect(state.verification.services?.[0]?.status).toBe('passed');
        expect(repairCalls).toBe(1);
        expect(verifyCalls.length).toBe(2);
        expect(repairFailure?.output).toEqual([]);
        expect(JSON.stringify(repairFailure)).not.toContain('do-not-send');
        return;
      }
      await new Promise((settle) => setTimeout(settle, 10));
    }
    throw new Error('Verification never completed.');
  });

  it('drops a result earned against a configuration the user has since changed', async () => {
    let finishVerify: (value: { status: 'completed'; services: Array<typeof failedService> }) => void = () => {};
    const { post, stateNow } = await open(
      () =>
        new Promise((resolve) => {
          finishVerify = resolve as typeof finishVerify;
        }),
      []
    );

    await post('/api/verify');
    expect((await stateNow()).verification?.status).toBe('running');

    // Changing anything recomposes, and a different configuration is a different thing to prove.
    await post('/api/preferences', { key: 'capacity', value: 'performance' });
    expect((await stateNow()).verification).toBeUndefined();

    // The old run finishing late must not resurrect its verdict against the new configuration.
    finishVerify({ status: 'completed', services: [failedService] });
    await new Promise((settle) => setTimeout(settle, 30));
    expect((await stateNow()).verification).toBeUndefined();
  });
});
