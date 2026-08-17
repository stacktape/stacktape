import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import type { SessionOutcome } from '../agent/transport';
import { runGreenfieldMission, type AgentRunner } from './greenfield';

let root: string;

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'stp-greenfield-'));
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await writeFile(absolute, contents, 'utf8');
  }
  return root;
};

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const EXPRESS_APP = {
  'package.json': JSON.stringify({
    name: 'shop',
    scripts: { build: 'tsc -p .', start: 'node dist/index.js' },
    dependencies: { express: '^5.0.0', pg: '^8.11.0' }
  }),
  'package-lock.json': '{}',
  'src/index.ts': 'import express from "express";\nconst app = express();\napp.listen(4000);'
};

const agentReturning =
  (outcome: Partial<SessionOutcome>): AgentRunner =>
  async () => ({
    usage: { inputTokens: 100, outputTokens: 10 },
    stopReason: 'complete',
    ...outcome
  });

describe('runGreenfieldMission', () => {
  it('produces a deployable configuration with no agent at all', async () => {
    // The no-agent path is a supported outcome and the eval baseline, not a failure mode.
    const repoRoot = await makeRepo(EXPRESS_APP);

    const result = await runGreenfieldMission({ repositoryRoot: repoRoot, projectName: 'shop' });

    expect(result.agent).toBeUndefined();
    expect(Object.keys(result.composition.config.resources).sort()).toEqual([
      'databaseBastion',
      'mainDatabase',
      'shop'
    ]);
    expect(result.composition.deployable).toBe(true);
  });

  it('folds a submission in and keeps the probe provenance intact', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);

    const result = await runGreenfieldMission({
      repositoryRoot: repoRoot,
      runAgent: agentReturning({
        submission: {
          schemaVersion: 1,
          services: [
            {
              name: 'shop',
              path: '.',
              language: 'javascript',
              exposesHttp: true,
              port: 4000,
              longLivedConnections: 'none',
              executionModel: 'long-running',
              functionTriggers: [],
              environmentVariables: [{ name: 'STRIPE_KEY', role: 'third-party-secret', required: true, evidence: [] }],
              evidence: [{ file: 'src/index.ts', line: 3, quote: 'app.listen(4000);' }]
            }
          ],
          dependencies: [],
          migrations: [],
          unknowns: []
        }
      })
    });

    const service = result.facts.services.find((entry) => entry.path === '.');
    // The probe found the service; the agent filled the gaps it left.
    expect(service?.source).toBe('probe');
    expect(service?.port).toBe(4000);
    expect(service?.environmentVariables.map((variable) => variable.name)).toEqual(['STRIPE_KEY']);
  });

  it('turns an unsupported agent claim into a recorded assumption rather than silent infrastructure', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);

    const result = await runGreenfieldMission({
      repositoryRoot: repoRoot,
      runAgent: agentReturning({
        submission: {
          schemaVersion: 1,
          services: [],
          // Nothing in this repository mentions Redis.
          dependencies: [{ name: 'cache', kind: 'redis', extensions: [], consumedBy: ['shop'], evidence: [] }],
          migrations: [],
          unknowns: []
        }
      })
    });

    expect(result.facts.uncertainties.some((entry) => entry.kind === 'unconfirmed-claim')).toBe(true);
    // Downgraded, decided, and recorded — never silently composed as though it had been confirmed.
    expect(result.composition.assumptions.some((entry) => entry.kind === 'unconfirmed-claim')).toBe(true);
  });

  it('degrades to the probe draft when the agent fails', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);

    const result = await runGreenfieldMission({
      repositoryRoot: repoRoot,
      projectName: 'shop',
      runAgent: agentReturning({ stopReason: 'error', errorMessage: 'claude exited 1' })
    });

    expect(result.agent?.stopReason).toBe('error');
    // A failed session costs the user quality, never the whole feature.
    expect(Object.keys(result.composition.config.resources)).toContain('shop');
  });

  it('reports the agent transcript as events', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    const seen: string[] = [];

    await runGreenfieldMission({
      repositoryRoot: repoRoot,
      onEvent: (event) => seen.push(event.type),
      runAgent: async (_input, hooks) => {
        hooks.onEvent({ type: 'tool-call', name: 'read_file', summary: 'package.json' });
        return { usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'complete' };
      }
    });

    expect(seen).toEqual(['tool-call']);
  });

  it('hands the agent the probe draft rather than an empty form', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    let briefServices = -1;

    await runGreenfieldMission({
      repositoryRoot: repoRoot,
      runAgent: async (input) => {
        briefServices = input.brief.services.length;
        expect(input.files).toContain('package.json');
        expect(input.systemPrompt).toContain('draft to review');
        return { usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'complete' };
      }
    });

    expect(briefServices).toBe(1);
  });

  it('spends zero tokens when the scan leaves nothing material open', async () => {
    // A static site the probes fully resolve: no commands to find, no dependencies, no ports.
    const repoRoot = await makeRepo({ 'index.html': '<!doctype html><html><body>hi</body></html>' });
    let agentRuns = 0;

    const result = await runGreenfieldMission({
      repositoryRoot: repoRoot,
      runAgent: async () => {
        agentRuns += 1;
        return { usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'complete' };
      }
    });

    // The chosen agent was not run at all, and the result says so rather than staying silent.
    expect(agentRuns).toBe(0);
    expect(result.agentSkipped).toBe(true);
    expect(result.agent).toBeUndefined();
  });

  it('points the agent at the open items instead of the whole repository', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    let userPrompt = '';

    await runGreenfieldMission({
      repositoryRoot: repoRoot,
      runAgent: async (input) => {
        userPrompt = input.userPrompt;
        return { usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'complete' };
      }
    });

    // The prompt is the gap list, not an invitation to re-review a draft the scan already settled.
    expect(userPrompt).toContain('ONLY these open items');
    expect(userPrompt).toContain('port');
  });
});
