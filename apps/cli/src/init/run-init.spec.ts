import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import type { DetectedAgent } from './agent/detect';
import { canOpenBrowser, chooseAgent, describeResult, runInit } from './run-init';
import type { GreenfieldResult } from './missions/greenfield';

let root: string;
let close: (() => Promise<void>) | undefined;

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'stp-run-init-'));
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await writeFile(absolute, contents, 'utf8');
  }
  return root;
};

afterEach(async () => {
  await close?.();
  close = undefined;
  if (root) await rm(root, { recursive: true, force: true });
});

const EXPRESS_APP = {
  'package.json': JSON.stringify({
    name: 'orders',
    scripts: { start: 'node index.js' },
    dependencies: { express: '^5.0.0', pg: '^8.11.0' }
  }),
  'package-lock.json': '{}',
  'src/index.ts': 'import express from "express";\nconst app = express();\napp.listen(3000);'
};

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

describe('runInit', () => {
  it('produces a configuration with no agent installed, and says so plainly', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    const said: string[] = [];

    const outcome = await runInit({
      repositoryRoot: repoRoot,
      projectName: 'orders',
      presentation: 'terminal',
      detect: async () => [],
      onOutput: (line) => said.push(line)
    });

    // Having no agent is a degraded result, never a refusal to start.
    expect(outcome.agent).toBeUndefined();
    expect(Object.keys(outcome.result!.composition.config.resources)).toContain('orders');
    expect(said.join('\n')).toContain('No coding agent found');
  });

  it('says nothing about agents when the user asked for none', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    const said: string[] = [];

    await runInit({
      repositoryRoot: repoRoot,
      presentation: 'terminal',
      codingAgent: 'none',
      onOutput: (line) => said.push(line)
    });

    // Explicitly disabling the agent is a choice, not a missing dependency to nag about.
    expect(said.join('\n')).not.toContain('No coding agent found');
  });

  it('tells the user their code is not sent to us', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    const said: string[] = [];

    await runInit({
      repositoryRoot: repoRoot,
      presentation: 'terminal',
      detect: async () => [agent('claude-code')],
      // Stubbed rather than spawned: this asserts what we tell the user, not what Claude does.
      runSession: async () => ({ usage: { inputTokens: 0, outputTokens: 0 }, stopReason: 'complete' }),
      onOutput: (line) => said.push(line)
    });

    expect(said.join('\n')).toContain('not sent to Stacktape');
  });

  it('fails loudly when the requested agent is not installed', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);

    await expect(
      runInit({ repositoryRoot: repoRoot, presentation: 'terminal', codingAgent: 'codex', detect: async () => [] })
    ).rejects.toThrow('not installed');
  });

  it('decides a live external database rather than stopping for it', async () => {
    const repoRoot = await makeRepo({
      ...EXPRESS_APP,
      '.env': 'DATABASE_URL=postgres://\${DATABASE_USER}:\${DATABASE_PASSWORD}@db.abc.supabase.co:5432/postgres\n'
    });

    const withoutDefaults = await runInit({
      repositoryRoot: repoRoot,
      presentation: 'terminal',
      codingAgent: 'none',

      onOutput: () => {}
    });
    // Nothing blocks any more: a live external database is decided — keep using it — and recorded.
    expect(withoutDefaults.result!.composition.deployable).toBe(true);
    expect(withoutDefaults.result!.composition.config.resources.mainDatabase).toBeUndefined();
    expect(withoutDefaults.result!.composition.assumptions).toContainEqual(
      expect.objectContaining({ kind: 'external-database-disposition', chosen: 'point-at-existing' })
    );
  });

  it('opens a wizard and hands back a URL in browser mode', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    const opened: string[] = [];

    const outcome = await runInit({
      repositoryRoot: repoRoot,
      projectName: 'orders',
      presentation: 'browser',
      detect: async () => [],
      openBrowser: async (url) => opened.push(url),
      onOutput: () => {}
    });
    close = outcome.close;

    expect(outcome.wizardUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/#token=/);
    expect(opened).toEqual([outcome.wizardUrl!]);
  });

  it('still returns the URL when the browser refuses to open', async () => {
    const repoRoot = await makeRepo(EXPRESS_APP);
    const said: string[] = [];

    const outcome = await runInit({
      repositoryRoot: repoRoot,
      presentation: 'browser',
      detect: async () => [],
      openBrowser: async () => {
        throw new Error('no browser here');
      },
      onOutput: (line) => said.push(line)
    });
    close = outcome.close;

    // Printed above the attempt, so a failed launch costs nothing.
    expect(said.join('\n')).toContain(outcome.wizardUrl!);
  });
});

describe('describeResult', () => {
  const resultWith = (overrides: Partial<GreenfieldResult['composition']>): GreenfieldResult =>
    ({
      facts: {} as never,
      verification: [],
      completeness: [],
      composition: {
        config: { resources: { orders: { type: 'web-service', properties: {} } } },
        provenance: {
          orders: { reason: 'A container runs this exactly as your own start command does.', evidence: [] }
        },
        gaps: [],
        assumptions: [],
        unresolved: [],
        mode: 'standard',
        deployable: true,
        ...overrides
      }
    }) as GreenfieldResult;

  it('names each resource and why it exists', () => {
    const lines = describeResult(resultWith({})).join('\n');

    expect(lines).toContain('orders  web-service');
    expect(lines).toContain('A container runs this');
  });

  it('says what it decided for you, and where to change it', () => {
    const lines = describeResult(
      resultWith({
        assumptions: [{ kind: 'external-database-disposition', chosen: 'point-at-existing', notable: true } as never]
      })
    ).join('\n');

    expect(lines).toContain('external-database-disposition');
    expect(lines).toContain('--headless');
  });

  it('reports an empty project without pretending otherwise', () => {
    const lines = describeResult(resultWith({ config: { resources: {} } })).join('\n');

    expect(lines).toContain('Nothing here needs deploying');
  });
});
