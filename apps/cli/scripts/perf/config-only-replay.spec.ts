import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { replayConfigOnly } from './config-only-replay';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-config-only-replay-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const CONFIG = {
  packageInstall: 'instrumented-3',
  configOnlySamples: 11,
  installs: [{ name: 'instrumented-3', helperLambdas: [{ path: 'helper-lambdas/service-1.zip', sha256: 'h' }] }]
};

const writeRun = async (name: string, config: unknown, inner: unknown) => {
  const run = join(root, name);
  await mkdir(run, { recursive: true });
  await writeFile(join(run, 'harness-config.json'), JSON.stringify(config));
  await writeFile(join(run, 'inner-report.json'), JSON.stringify(inner));
  return run;
};

describe('replayConfigOnly', () => {
  test('fails closed on a run without config-only evidence, and leaves its inputs as they were', async () => {
    const run = await writeRun('empty', CONFIG, { samples: [], configOnly: null, fixtures: {} });
    const before = await Promise.all(
      ['harness-config.json', 'inner-report.json'].map((name) => readFile(join(run, name)))
    );
    const out = join(root, 'empty-replay.json');
    const replay = await replayConfigOnly({ run, out });
    expect(replay.passed).toBe(false);
    expect(replay.inputs.unchanged).toBe(true);
    expect(replay.retainedWanted).toBe(11);
    expect(replay.populationProblems).toContain('1 function: no setup');
    expect(replay.populationProblems).toContain('10 functions: 0 controls instead of 1');
    expect(replay.checks.every(({ passed }) => !passed)).toBe(true);
    expect(JSON.parse(await readFile(out, 'utf8'))).toEqual(JSON.parse(JSON.stringify(replay)));
    const after = await Promise.all(
      ['harness-config.json', 'inner-report.json'].map((name) => readFile(join(run, name)))
    );
    expect(after).toEqual(before);
  });

  test("derives a control's refused entries from its saved logs only when asked, hashing those logs", async () => {
    const id = 'config-only-1-functions-invalid-deployment-value-instrumented-3-12';
    // A control as the harness saved it before `refusedEntries` existed: everything but that field.
    const control = {
      id,
      suite: 'config-only',
      scenario: '1-functions-invalid-deployment-value',
      round: 12,
      warmUp: false,
      exitCode: 1,
      analysis: { failedAt: 'config:validate' },
      fixtureRequests: [],
      dnsQueries: [],
      artifacts: null,
      configOnly: {
        functions: 1,
        state: 'invalid-deployment-value',
        variant: 'invalid-deployment-value',
        configSha256: 'config',
        preparation: { action: 'edited', ms: 1 },
        before: null,
        after: null,
        runtime: null
      }
    };
    const run = await writeRun('control-logs', CONFIG, { samples: [control], configOnly: null, fixtures: {} });
    await mkdir(join(run, 'samples', id), { recursive: true });
    await writeFile(
      join(run, 'samples', id, 'stdout.log'),
      '[x] Config is invalid at `.resources.handler01.properties.environment[0].value`\n'
    );
    await writeFile(join(run, 'samples', id, 'stderr.log'), '');
    const strict = await replayConfigOnly({ run, out: join(root, 'strict.json') });
    expect(strict.refusedEntriesFromLogs).toEqual([]);
    expect(Object.keys(strict.inputs.before)).toEqual(['harness-config.json', 'inner-report.json']);
    const completed = await replayConfigOnly({ run, out: join(root, 'completed.json'), controlLogs: true });
    expect(completed.refusedEntriesFromLogs).toEqual([{ id, refusedEntries: ['handler01'] }]);
    expect(Object.keys(completed.inputs.before)).toEqual([
      'harness-config.json',
      'inner-report.json',
      `samples/${id}/stdout.log`,
      `samples/${id}/stderr.log`
    ]);
    expect(completed.inputs.unchanged).toBe(true);
  });

  test('refuses to write inside the run or over a file, and refuses a configuration it cannot read', async () => {
    const run = await writeRun('refusals', CONFIG, { samples: [], configOnly: null, fixtures: {} });
    await expect(replayConfigOnly({ run, out: join(run, 'replay.json') })).rejects.toThrow('is inside the run');
    await writeFile(join(root, 'taken.json'), '{}');
    await expect(replayConfigOnly({ run, out: join(root, 'taken.json') })).rejects.toThrow('exists already');
    const broken = await writeRun('broken', { ...CONFIG, configOnlySamples: 'eleven' }, { samples: [] });
    await expect(replayConfigOnly({ run: broken, out: join(root, 'broken.json') })).rejects.toThrow(
      'harness-config.json has no configOnlySamples.'
    );
    const noSamples = await writeRun('no-samples', CONFIG, {});
    await expect(replayConfigOnly({ run: noSamples, out: join(root, 'no-samples.json') })).rejects.toThrow(
      'inner-report.json has no samples.'
    );
  });
});
