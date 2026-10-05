import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from '@stacktape/config-inference/facts';
import type { GreenfieldResult } from '../missions/greenfield';
import { INIT_TARGET_SCHEMA_VERSION } from '../deploy/stack-expectation';
import type { WizardState } from './wizard-server';
import { startWizardSession, toTimelineEntry, type WizardSession } from './wizard-session';
import type { SignInFailure, WizardSignInDependencies } from './wizard-sign-in';

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

describe('signing in to Stacktape from the page', () => {
  /** Distinctive, so finding any of them in something the page was sent is unambiguous. */
  const PASSWORD = 'pw-Secret-93!x';
  const EMAIL_CODE = '482913';
  const TOTP_CODE = '771204';

  type FakeUser = {
    password: string;
    confirmed: boolean;
    totp?: string;
    organizations: Array<{ id: string; name: string }>;
  };

  /**
   * Cognito, the control plane and the CLI's persisted state, as one in-memory directory.
   *
   * It keeps the rules that matter to the flow — an unconfirmed email cannot sign in, a wrong code
   * is refused, a user in two organizations has to choose — so the scenarios below run the real
   * session, flow and HTTP server against something that can say no.
   */
  const fakeStacktape = (users: Record<string, FakeUser> = {}) => {
    const savedKeys: string[] = [];
    const codesSentTo: string[] = [];
    const google = {
      cancelled: 0,
      finish: (_outcome: { ok: true; idToken: string } | SignInFailure): void => {}
    };
    const idTokenFor = (email: string) => `id-token-secret:${email}`;
    const apiKeyFor = (email: string, organizationId: string) => `api-key-secret:${email}:${organizationId}`;

    const dependencies: WizardSignInDependencies = {
      startGoogle: async () => ({
        ok: true,
        authorizationUrl: 'https://login.example.test/oauth2/authorize?identity_provider=Google',
        completed: new Promise((resolve) => {
          google.finish = resolve;
        }),
        cancel: () => {
          google.cancelled += 1;
        }
      }),
      signUp: async ({ email, password }) => {
        if (users[email] !== undefined) return { ok: false, code: 'account-exists' };
        if (password.length < 8) return { ok: false, code: 'password-rejected' };
        users[email] = {
          password,
          confirmed: false,
          organizations: [{ id: 'org_personal', name: 'dev-personal-org' }]
        };
        codesSentTo.push(email);
        return { ok: true, confirmed: false };
      },
      confirmSignUp: async ({ email, code }) => {
        const user = users[email];
        if (user === undefined || code !== EMAIL_CODE) return { ok: false, code: 'code-mismatch' };
        user.confirmed = true;
        return { ok: true };
      },
      resendCode: async ({ email }) => {
        codesSentTo.push(email);
        return { ok: true };
      },
      signIn: async ({ email, password }) => {
        const user = users[email];
        if (user === undefined || user.password !== password) return { ok: false, code: 'invalid-credentials' };
        if (!user.confirmed) return { ok: true, next: 'confirm-email' };
        if (user.totp !== undefined) {
          return { ok: true, next: 'mfa', challenge: { username: email, session: `mfa-session-secret:${email}` } };
        }
        return { ok: true, next: 'authenticated', idToken: idTokenFor(email) };
      },
      answerMfa: async ({ username, session, code }) => {
        if (session !== `mfa-session-secret:${username}`) return { ok: false, code: 'session-expired' };
        if (users[username]?.totp !== code) return { ok: false, code: 'mfa-code-mismatch' };
        return { ok: true, idToken: idTokenFor(username) };
      },
      exchange: async (idToken) => {
        const email = idToken.replace('id-token-secret:', '');
        const organizations = users[email]?.organizations ?? [];
        if (organizations.length === 0) return { ok: false, code: 'exchange-failed', detail: 'No organization found.' };
        if (organizations.length === 1) return { ok: true, apiKey: apiKeyFor(email, organizations[0]!.id) };
        return {
          ok: true,
          organizations,
          choose: async (organizationId) => ({ ok: true, apiKey: apiKeyFor(email, organizationId) })
        };
      },
      saveApiKey: async (apiKey) => {
        savedKeys.push(apiKey);
      }
    };

    return {
      dependencies,
      savedKeys,
      codesSentTo,
      google,
      idTokenFor,
      // The account check reads what was saved, the way `info:whoami` reads the persisted key.
      stacktapeAccount: async () =>
        savedKeys.length === 0
          ? { signedIn: false, detail: 'Not signed in.' }
          : { signedIn: true, detail: 'Signed in.', email: savedKeys.at(-1)!.split(':')[1]!, organization: 'Acme' }
    };
  };

  const open = async (fake: ReturnType<typeof fakeStacktape>) => {
    let deployCalls = 0;
    session = await startWizardSession({
      projectName: 'demo',
      result: {
        facts: factsWith({}),
        composition: composeConfig({ facts: factsWith({}), projectName: 'demo' }),
        verification: [],
        completeness: []
      },
      write: async () => ({ path: '/repo/stacktape.yml', filename: 'stacktape.yml' }),
      deploy: async () => {
        deployCalls += 1;
        return { ok: true, code: 'OK', message: 'Deployed.' };
      },
      stacktapeAccount: fake.stacktapeAccount,
      signIn: fake.dependencies
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

    /** Everything the page was sent, by any channel, so a leak anywhere is caught by one search. */
    const sentToPage: string[] = [];
    const read = async (path: string): Promise<string> => {
      const text = await (await fetch(`${origin}${path}`, { headers: { Origin: origin, Cookie: cookie } })).text();
      sentToPage.push(text);
      return text;
    };
    const leave = new AbortController();
    const events = await fetch(`${origin}/api/events`, {
      headers: { Origin: origin, Cookie: cookie },
      signal: leave.signal
    });
    const decoder = new TextDecoder();
    void (async () => {
      try {
        for await (const chunk of events.body!) sentToPage.push(decoder.decode(chunk as Uint8Array));
      } catch {
        // Aborted when the scenario is done reading.
      }
    })();

    const state = async (): Promise<WizardState> => JSON.parse(await read('/api/state')) as WizardState;
    const until = async (accept: (candidate: WizardState) => boolean): Promise<WizardState> => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = await state();
        if (accept(candidate)) return candidate;
        await new Promise((settle) => setTimeout(settle, 10));
      }
      throw new Error('The wizard never reached the expected state.');
    };
    const post = async (path: string, body: unknown = {}): Promise<{ status: number; state: WizardState }> => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
      const text = await response.text();
      sentToPage.push(text);
      return { status: response.status, state: JSON.parse(text) as WizardState };
    };

    // The first account check runs in the background; every scenario starts from its answer.
    await until((candidate) => candidate.stacktapeAccount !== undefined);

    return {
      state,
      until,
      post,
      signIn: (route: string, body: unknown = {}) => post(`/api/sign-in/${route}`, body),
      deployCalls: () => deployCalls,
      sentToPage: async () => {
        await read('/api/session');
        await read('/api/state');
        leave.abort();
        return sentToPage.join('\n');
      }
    };
  };

  it('signs a new user up with a code, and only then lets the deploy through', async () => {
    const fake = fakeStacktape();
    const page = await open(fake);
    await page.post('/api/write', { format: 'yaml' });
    const deploy = () => page.post('/api/deploy', { stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } });

    expect((await page.state()).signIn).toEqual({ step: 'signed-out' });
    await deploy();
    expect(page.deployCalls()).toBe(0);

    const signedUp = await page.signIn('email', { intent: 'sign-up', email: 'new@example.com', password: PASSWORD });
    expect(signedUp.state.signIn).toEqual({ step: 'needs-code', email: 'new@example.com' });
    expect(fake.codesSentTo).toEqual(['new@example.com']);

    // A wrong code is an error on the same step, not a reason to start again.
    const wrong = await page.signIn('code', { code: '000000' });
    expect(wrong.state.signIn).toMatchObject({
      step: 'needs-code',
      email: 'new@example.com',
      error: { code: 'code-mismatch' }
    });
    expect(fake.savedKeys).toEqual([]);

    const confirmed = await page.signIn('code', { code: EMAIL_CODE });
    expect(confirmed.state.stacktapeAccount).toMatchObject({ signedIn: true, email: 'new@example.com' });
    // Signed in: there is no step left to render.
    expect(confirmed.state.signIn).toBeUndefined();
    expect(fake.savedKeys).toEqual(['api-key-secret:new@example.com:org_personal']);

    await deploy();
    expect(page.deployCalls()).toBe(1);
  });

  it('keeps passwords, codes, tokens and the API key out of everything the page is sent', async () => {
    const fake = fakeStacktape({
      'mfa@example.com': {
        password: PASSWORD,
        confirmed: true,
        totp: TOTP_CODE,
        organizations: [
          { id: 'org_a', name: 'Acme' },
          { id: 'org_b', name: 'Globex' }
        ]
      }
    });
    const page = await open(fake);

    // Sign-up through a wrong and a right code, then abandon it, then every remaining step once.
    await page.signIn('email', { intent: 'sign-up', email: 'new@example.com', password: PASSWORD });
    await page.signIn('code', { code: '000000' });
    await page.signIn('code/resend');
    await page.signIn('cancel');
    await page.signIn('email', { intent: 'sign-in', email: 'mfa@example.com', password: PASSWORD });
    await page.signIn('mfa', { code: TOTP_CODE });
    await page.signIn('organization', { organizationId: 'org_b' });
    expect(fake.savedKeys).toEqual(['api-key-secret:mfa@example.com:org_b']);

    const sent = await page.sentToPage();
    for (const secret of [
      PASSWORD,
      EMAIL_CODE,
      TOTP_CODE,
      '000000',
      'id-token-secret',
      'api-key-secret',
      'mfa-session-secret'
    ]) {
      expect(sent).not.toContain(secret);
    }
    // The search above means something only if the page really was sent these states.
    expect(sent).toContain('"step":"needs-code"');
    expect(sent).toContain('"step":"needs-organization"');
  });

  it('sends a fresh code when an existing account never confirmed its email', async () => {
    const fake = fakeStacktape({
      'late@example.com': { password: PASSWORD, confirmed: false, organizations: [{ id: 'org_1', name: 'Acme' }] }
    });
    const page = await open(fake);

    const signedIn = await page.signIn('email', { intent: 'sign-in', email: 'late@example.com', password: PASSWORD });
    expect(signedIn.state.signIn).toEqual({ step: 'needs-code', email: 'late@example.com' });
    expect(fake.codesSentTo).toEqual(['late@example.com']);

    await page.signIn('code/resend');
    expect(fake.codesSentTo).toEqual(['late@example.com', 'late@example.com']);

    const confirmed = await page.signIn('code', { code: EMAIL_CODE });
    expect(confirmed.state.stacktapeAccount?.signedIn).toBe(true);
    expect(fake.savedKeys).toEqual(['api-key-secret:late@example.com:org_1']);
  });

  it('asks for the authenticator code when the account has one, and keeps the step on a wrong code', async () => {
    const fake = fakeStacktape({
      'mfa@example.com': {
        password: PASSWORD,
        confirmed: true,
        totp: TOTP_CODE,
        organizations: [{ id: 'org_1', name: 'Acme' }]
      }
    });
    const page = await open(fake);

    const challenged = await page.signIn('email', { intent: 'sign-in', email: 'mfa@example.com', password: PASSWORD });
    expect(challenged.state.signIn).toEqual({ step: 'needs-mfa', email: 'mfa@example.com' });

    const wrong = await page.signIn('mfa', { code: '000000' });
    expect(wrong.state.signIn).toMatchObject({ step: 'needs-mfa', error: { code: 'mfa-code-mismatch' } });
    expect(fake.savedKeys).toEqual([]);

    const answered = await page.signIn('mfa', { code: TOTP_CODE });
    expect(answered.state.stacktapeAccount?.signedIn).toBe(true);
    expect(fake.savedKeys).toEqual(['api-key-secret:mfa@example.com:org_1']);
  });

  it('asks which organization when there are several, and accepts only one it offered', async () => {
    const fake = fakeStacktape({
      'two@example.com': {
        password: PASSWORD,
        confirmed: true,
        organizations: [
          { id: 'org_a', name: 'Acme' },
          { id: 'org_b', name: 'Globex' }
        ]
      }
    });
    const page = await open(fake);

    const asked = await page.signIn('email', { intent: 'sign-in', email: 'two@example.com', password: PASSWORD });
    expect(asked.state.signIn).toEqual({
      step: 'needs-organization',
      organizations: [
        { id: 'org_a', name: 'Acme' },
        { id: 'org_b', name: 'Globex' }
      ]
    });

    expect((await page.signIn('organization', { organizationId: 'org_someone_elses' })).status).toBe(400);
    expect(fake.savedKeys).toEqual([]);

    const chosen = await page.signIn('organization', { organizationId: 'org_b' });
    expect(chosen.state.stacktapeAccount?.signedIn).toBe(true);
    expect(fake.savedKeys).toEqual(['api-key-secret:two@example.com:org_b']);
  });

  it('reports a failure on the step it happened at, with a way forward', async () => {
    const fake = fakeStacktape({
      'known@example.com': { password: PASSWORD, confirmed: true, organizations: [{ id: 'org_1', name: 'Acme' }] }
    });
    const page = await open(fake);

    const exists = await page.signIn('email', { intent: 'sign-up', email: 'known@example.com', password: PASSWORD });
    expect(exists.state.signIn).toMatchObject({ step: 'signed-out', error: { code: 'account-exists' } });

    const wrong = await page.signIn('email', { intent: 'sign-in', email: 'known@example.com', password: 'not-it' });
    expect(wrong.state.signIn).toMatchObject({ step: 'signed-out', error: { code: 'invalid-credentials' } });
    // The sentence has to cover the commonest reason a password is "wrong": there never was one.
    expect((wrong.state.signIn as { error: { message: string } }).error.message).toContain('Continue with Google');
    expect(fake.savedKeys).toEqual([]);
  });

  it('waits for Google in another tab, and signs in when it answers', async () => {
    const fake = fakeStacktape({
      'g@example.com': { password: '', confirmed: true, organizations: [{ id: 'org_1', name: 'Acme' }] }
    });
    const page = await open(fake);

    const started = await page.signIn('google');
    // The address stays in the state so the page can open the tab again, also after a reload.
    expect(started.state.signIn).toEqual({
      step: 'google-pending',
      authorizationUrl: 'https://login.example.test/oauth2/authorize?identity_provider=Google'
    });

    fake.google.finish({ ok: true, idToken: fake.idTokenFor('g@example.com') });
    // Nobody is holding a request open for this; the page learns it from the pushed state.
    const signedIn = await page.until((candidate) => candidate.stacktapeAccount?.signedIn === true);
    expect(signedIn.signIn).toBeUndefined();
    expect(fake.savedKeys).toEqual(['api-key-secret:g@example.com:org_1']);
  });

  it('says why when Google does not finish', async () => {
    const fake = fakeStacktape();
    const page = await open(fake);

    await page.signIn('google');
    fake.google.finish({ ok: false, code: 'google-failed', detail: 'access_denied' });

    const failed = await page.until((candidate) => candidate.signIn?.step === 'signed-out');
    expect(failed.signIn).toMatchObject({ step: 'signed-out', error: { code: 'google-failed' } });
    expect((failed.signIn as { error: { message: string } }).error.message).toContain('access_denied');
  });

  it('cancels a pending attempt, and ignores an answer that arrives afterwards', async () => {
    const fake = fakeStacktape({
      'g@example.com': { password: '', confirmed: true, organizations: [{ id: 'org_1', name: 'Acme' }] }
    });
    const page = await open(fake);

    await page.signIn('google');
    const cancelled = await page.signIn('cancel');
    expect(cancelled.state.signIn).toEqual({ step: 'signed-out' });
    expect(fake.google.cancelled).toBe(1);

    fake.google.finish({ ok: true, idToken: fake.idTokenFor('g@example.com') });
    await new Promise((settle) => setTimeout(settle, 30));
    expect(fake.savedKeys).toEqual([]);
    expect((await page.state()).stacktapeAccount?.signedIn).toBe(false);

    // Cancelling the code step forgets the address and the password kept for it.
    await page.signIn('email', { intent: 'sign-up', email: 'new@example.com', password: PASSWORD });
    await page.signIn('cancel');
    const afterCancel = await page.signIn('code', { code: EMAIL_CODE });
    expect(afterCancel.state.signIn).toEqual({ step: 'signed-out' });
    expect(fake.savedKeys).toEqual([]);
  });

  it('stops waiting for Google when the session ends', async () => {
    const fake = fakeStacktape();
    const page = await open(fake);
    await page.signIn('google');

    await session!.close();
    session = undefined;

    expect(fake.google.cancelled).toBe(1);
  });

  it('notices a sign-in made in a terminal, and drops the attempt it was in the middle of', async () => {
    const fake = fakeStacktape();
    const page = await open(fake);
    await page.signIn('email', { intent: 'sign-up', email: 'new@example.com', password: PASSWORD });

    // `stacktape login` in a terminal writes the key the account check reads.
    fake.savedKeys.push('api-key-secret:elsewhere@example.com:org_1');
    await page.post('/api/recheck');

    const rechecked = await page.until((candidate) => candidate.stacktapeAccount?.signedIn === true);
    expect(rechecked.signIn).toBeUndefined();
    expect(rechecked.stacktapeAccount).toMatchObject({ email: 'elsewhere@example.com' });
  });
});
