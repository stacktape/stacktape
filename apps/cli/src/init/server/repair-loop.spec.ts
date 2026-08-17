/**
 * The deploy-repair loop.
 *
 * Driven through the real session over HTTP, because every interesting decision here is about
 * *when* to try again, and those conditions live in the session: how many attempts have been made,
 * whether the failure was one our code could be wrong about, whether the agent actually changed
 * anything, and whether the user consented to an agent at all. A test of an extracted helper would
 * prove none of it.
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from '@stacktape/config-inference/facts';
import type { GreenfieldResult } from '../missions/greenfield';
import { startWizardSession, type WizardSession } from './wizard-session';

let session: WizardSession | undefined;

afterEach(async () => {
  await session?.close();
  session = undefined;
});

const factsFor = (startCommand: string): ProjectFacts =>
  projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    services: [
      {
        name: 'api',
        path: '.',
        language: 'javascript',
        exposesHttp: true,
        executionModel: 'long-running',
        startCommand,
        evidence: [],
        source: 'probe'
      }
    ]
  });

const resultFor = (facts: ProjectFacts): GreenfieldResult => ({
  facts,
  composition: composeConfig({ facts, projectName: 'demo' }),
  verification: [],
  completeness: []
});

type Outcome = { ok: boolean; code: string; message: string };

/** One planned attempt: its outcome, and which CloudFormation action it visibly performed. */
type Attempt = { outcome: Outcome; action?: 'create' | 'update' };

type Deployment = {
  status: string;
  repairs?: Array<{ attempt: number; applied: boolean; changedResources?: string[] }>;
};

type Client = {
  origin: string;
  cookie: string;
  headers: Record<string, string>;
};

const connectClient = async (server: WizardSession['server']): Promise<Client> => {
  const origin = `http://127.0.0.1:${server.port}`;
  const token = new URL(server.url).hash.replace('#token=', '');
  const handshake = await fetch(`${origin}/api/handshake?token=${token}`, {
    method: 'POST',
    headers: { Origin: origin }
  });
  const cookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
  const { csrfToken } = (await handshake.json()) as { csrfToken: string };
  return {
    origin,
    cookie,
    headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }
  };
};

const stateOf = async (client: Client): Promise<{ phase?: string; deployment?: Deployment }> =>
  (await (
    await fetch(`${client.origin}/api/state`, { headers: { Origin: client.origin, Cookie: client.cookie } })
  ).json()) as {
    phase?: string;
    deployment?: Deployment;
  };

/** The deploy is deliberately not awaited by its request, so poll until the loop settles. */
const settledDeployment = async (client: Client): Promise<Deployment> => {
  const started = Date.now();
  for (;;) {
    const { deployment } = await stateOf(client);
    if (deployment !== undefined && deployment.status !== 'running' && deployment.status !== 'repairing') {
      return deployment;
    }
    if (Date.now() - started > 5000) throw new Error('Timed out waiting for the deploy loop to settle.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

/** Runs one session to a finished deploy and reports what happened along the way. */
const runDeploy = async ({
  plan,
  repairs
}: {
  /** One per attempt, in order. */
  plan: readonly Attempt[];
  /** What the agent finds, per repair call. Omit entirely to model "no agent installed". */
  repairs?: ReadonlyArray<{ changed: boolean }>;
}) => {
  const attempts: boolean[] = [];
  let repairCalls = 0;

  session = await startWizardSession({
    projectName: 'demo',
    result: resultFor(factsFor('npm start')),
    write: async () => ({ path: '/tmp/stacktape.yml', filename: 'stacktape.yml' }),
    deploy: async ({ keepPartialProgress, onEvent }) => {
      const step = plan[attempts.length];
      attempts.push(keepPartialProgress === true);
      if (step?.action !== undefined) {
        // The one part of the stream the retry decision reads: which action the stack was under.
        onEvent({ type: 'event', detail: { kind: 'cloudformation-progress', stackAction: step.action } });
      }
      return step?.outcome ?? { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' };
    },
    ...(repairs === undefined
      ? {}
      : {
          repair: async ({ facts }) => {
            const changed = repairs[repairCalls]?.changed === true;
            repairCalls += 1;
            const next = changed ? factsFor(`node server.js ${repairCalls}`) : facts;
            return { facts: next, composition: composeConfig({ facts: next, projectName: 'demo' }), changed };
          }
        })
  });

  const client = await connectClient(session.server);

  // There has to be a file before there can be a deploy, exactly as in the browser.
  await fetch(`${client.origin}/api/write`, {
    method: 'POST',
    headers: client.headers,
    body: JSON.stringify({ format: 'yaml' })
  });
  await fetch(`${client.origin}/api/deploy`, {
    method: 'POST',
    headers: client.headers,
    body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
  });

  const deployment = await settledDeployment(client);
  return { attempts, repairCalls, deployment };
};

const FAILED: Outcome = { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' };
const DEPLOYED: Outcome = { ok: true, code: 'OK', message: 'Deployed' };

describe('deploying with repairs', () => {
  it('deploys once when the deploy works', async () => {
    const run = await runDeploy({ plan: [{ outcome: DEPLOYED }], repairs: [] });

    expect(run.attempts).toHaveLength(1);
    expect(run.repairCalls).toBe(0);
    expect(run.deployment.status).toBe('succeeded');
  });

  it('keeps partial progress on retry only when the failed attempt was an update', async () => {
    const run = await runDeploy({
      plan: [{ outcome: FAILED, action: 'update' }, { outcome: DEPLOYED }],
      repairs: [{ changed: true }]
    });

    // A failed update stops at UPDATE_FAILED, which `deploy` runs over — so the retry may keep
    // whatever the failed attempt managed to create. The repair entry also names what it rewrote,
    // diffed from the compositions, so the page can say where the deployed file differs.
    expect(run.attempts).toEqual([false, true]);
    expect(run.deployment.status).toBe('succeeded');
    expect(run.deployment.repairs).toEqual([{ attempt: 1, applied: true, changedResources: ['api'] }]);
  });

  it('never disables rollback while the stack is still being created', async () => {
    const run = await runDeploy({
      plan: [{ outcome: FAILED, action: 'create' }, { outcome: DEPLOYED }],
      repairs: [{ changed: true }]
    });

    // A no-rollback create that fails strands the stack in CREATE_FAILED, which the deploy gate
    // refuses to touch — the retry would die on a state error and the stack would stay stuck until
    // someone ran cf:rollback by hand. So a failed create always rolls back before the retry.
    expect(run.attempts).toEqual([false, false]);
    expect(run.deployment.status).toBe('succeeded');
  });

  it('stops after two repairs rather than trying forever', async () => {
    const run = await runDeploy({
      plan: [{ outcome: FAILED }, { outcome: FAILED }, { outcome: FAILED }],
      repairs: [{ changed: true }, { changed: true }, { changed: true }]
    });

    expect(run.attempts).toHaveLength(3);
    expect(run.repairCalls).toBe(2);
    expect(run.deployment.status).toBe('failed');
  });

  it('stops as soon as the agent has nothing to change', async () => {
    const run = await runDeploy({
      plan: [{ outcome: FAILED }, { outcome: DEPLOYED }],
      repairs: [{ changed: false }]
    });

    // Redeploying an unchanged configuration fails identically, after another few minutes of wait.
    expect(run.attempts).toHaveLength(1);
    expect(run.deployment.status).toBe('failed');
    expect(run.deployment.repairs).toEqual([{ attempt: 1, applied: false }]);
  });

  it('does not ask an agent about a problem with the AWS account', async () => {
    const run = await runDeploy({
      plan: [
        {
          outcome: {
            ok: false,
            code: 'DEPLOY_FAILED',
            message: 'The security token included in the request is expired'
          }
        }
      ],
      repairs: [{ changed: true }]
    });

    expect(run.attempts).toHaveLength(1);
    expect(run.repairCalls).toBe(0);
    expect(run.deployment.status).toBe('failed');
  });

  it('does not retry at all when there is no agent', async () => {
    const run = await runDeploy({ plan: [{ outcome: FAILED }] });

    expect(run.attempts).toHaveLength(1);
    expect(run.deployment.status).toBe('failed');
  });

  it('ignores a second deploy request while a repair is thinking', async () => {
    let deployCalls = 0;
    let releaseRepair: (() => void) | undefined;
    const repairGate = new Promise<void>((resolve) => {
      releaseRepair = resolve;
    });

    session = await startWizardSession({
      projectName: 'demo',
      result: resultFor(factsFor('npm start')),
      write: async () => ({ path: '/tmp/stacktape.yml', filename: 'stacktape.yml' }),
      deploy: async () => {
        deployCalls += 1;
        return FAILED;
      },
      repair: async ({ facts }) => {
        await repairGate;
        return { facts, composition: composeConfig({ facts, projectName: 'demo' }), changed: false };
      }
    });

    const client = await connectClient(session.server);
    await fetch(`${client.origin}/api/write`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ format: 'yaml' })
    });
    const deployBody = JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } });
    await fetch(`${client.origin}/api/deploy`, { method: 'POST', headers: client.headers, body: deployBody });

    // Wait until the failure has been handed to the (blocked) repair, then press Deploy again.
    const started = Date.now();
    while ((await stateOf(client)).deployment?.status !== 'repairing') {
      if (Date.now() - started > 5000) throw new Error('The session never entered the repairing state.');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await fetch(`${client.origin}/api/deploy`, { method: 'POST', headers: client.headers, body: deployBody });
    releaseRepair!();

    const deployment = await settledDeployment(client);
    // One loop, one attempt. The second click must not start a competing deploy underneath it.
    expect(deployCalls).toBe(1);
    expect(deployment.status).toBe('failed');
  });

  it('never repairs when the user chose to keep agents away from their code', async () => {
    let repairCalls = 0;

    session = await startWizardSession({
      projectName: 'demo',
      agents: [
        {
          id: 'none',
          label: 'Files only, no agent',
          description: 'Static analysis only.',
          models: [{ id: 'default', label: 'No model', description: 'Nothing is sent to a model.' }]
        }
      ],
      start: async () => resultFor(factsFor('npm start')),
      write: async () => ({ path: '/tmp/stacktape.yml', filename: 'stacktape.yml' }),
      deploy: async () => FAILED,
      repair: async ({ facts }) => {
        repairCalls += 1;
        return { facts, composition: composeConfig({ facts, projectName: 'demo' }), changed: true };
      }
    });

    const client = await connectClient(session.server);
    await fetch(`${client.origin}/api/start`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ agentId: 'none', modelId: 'default' })
    });
    const started = Date.now();
    while ((await stateOf(client)).phase !== 'reviewing') {
      if (Date.now() - started > 5000) throw new Error('The session never reached review.');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await fetch(`${client.origin}/api/write`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ format: 'yaml' })
    });
    await fetch(`${client.origin}/api/deploy`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'create' } })
    });

    const deployment = await settledDeployment(client);
    // "Files only" was an explicit decision that no agent reads this code. A failed deploy does
    // not revoke it — the deploy just fails, plainly.
    expect(repairCalls).toBe(0);
    expect(deployment.status).toBe('failed');
  });
});
