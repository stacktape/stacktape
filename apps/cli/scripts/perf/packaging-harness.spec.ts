import type { FixtureEdit } from './packaging-fixture';
import type { Sample } from './packaging-harness';
import type { RunRequest, RunResult } from './packaging-run';
import { afterEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { applyFixtureEdit, FIXTURE_EDITS, getFixtureIdentity, writePackagingFixture } from './packaging-fixture';
import { LAMBDA_ARCHIVE_FORMAT } from '@stacktape/packaging/artifact/archive-entries';
import { summarizeState } from './packaging-harness';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const directories: string[] = [];

// Inside the CLI's ignored `.stacktape` directory, where the harness itself keeps fixtures.
const createDirectory = async () => {
  const directory = join(CLI_ROOT, '.stacktape', `packaging-harness-test-${randomUUID().slice(0, 8)}`);
  await mkdir(directory, { recursive: true });
  directories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('packaging harness fixtures', () => {
  test('write identical bytes in any directory, and a different project for a different size', async () => {
    const directory = await createDirectory();
    await writePackagingFixture({ root: join(directory, 'first'), functions: 3 });
    await writePackagingFixture({ root: join(directory, 'second'), functions: 3 });
    await writePackagingFixture({ root: join(directory, 'larger'), functions: 4 });

    const first = await getFixtureIdentity(join(directory, 'first'));
    expect(await getFixtureIdentity(join(directory, 'second'))).toEqual(first);
    expect((await getFixtureIdentity(join(directory, 'larger'))).contentSha256).not.toBe(first.contentSha256);
  });

  test.each<FixtureEdit>([...FIXTURE_EDITS])(
    'the %s edit changes the fixture and reverting restores every byte',
    async (edit) => {
      const root = join(await createDirectory(), 'project');
      await writePackagingFixture({ root, functions: 2 });
      const before = await getFixtureIdentity(root);

      const { revert } = await applyFixtureEdit({ root, edit });
      expect((await getFixtureIdentity(root)).contentSha256).not.toBe(before.contentSha256);
      await revert();

      expect(await getFixtureIdentity(root)).toEqual(before);
    }
  );
});

/** Runs one offline packaging sample in its own process, as the harness does. */
const runOffline = async (directory: string, root: string, functions: RunRequest['functions']) => {
  const request: RunRequest = {
    mode: 'lambda',
    fixtureRoot: root,
    invocationId: 'offline-test',
    functions,
    containerEntryfilePath: 'src/server.ts',
    imageTag: '',
    zipLayers: true,
    resultPath: join(directory, 'result.json')
  };
  await writeFile(join(directory, 'request.json'), JSON.stringify(request));
  const child = Bun.spawnSync(
    [
      process.execPath,
      '--preload',
      join(CLI_ROOT, 'scripts', 'test-preload.ts'),
      join(CLI_ROOT, 'scripts', 'perf', 'packaging-run.ts'),
      join(directory, 'request.json')
    ],
    { cwd: root, stdout: 'pipe', stderr: 'pipe' }
  );
  return {
    exitCode: child.exitCode,
    result: JSON.parse(await readFile(request.resultPath, 'utf8')) as RunResult
  };
};

describe('offline packaging run', () => {
  test('fails instead of installing a missing dependency', async () => {
    const directory = await createDirectory();
    const root = join(directory, 'project');
    const manifest = await writePackagingFixture({ root, functions: 2 });
    await rm(join(root, 'node_modules', '@perf-fixture', 'dates'), { recursive: true });

    const { exitCode, result } = await runOffline(directory, root, manifest.functions);

    expect(exitCode).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('@perf-fixture/dates@1.9.0 would have to be installed');
  });

  test('fails instead of starting Docker for a dependency with a native build step', async () => {
    const directory = await createDirectory();
    const root = join(directory, 'project');
    const manifest = await writePackagingFixture({ root, functions: 2 });
    const packageJsonPath = join(root, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    packageJson.dependencies['fixture-native'] = '1.0.0';
    await writeFile(packageJsonPath, JSON.stringify(packageJson));
    await mkdir(join(root, 'node_modules', 'fixture-native'), { recursive: true });
    await writeFile(
      join(root, 'node_modules', 'fixture-native', 'package.json'),
      JSON.stringify({ name: 'fixture-native', version: '1.0.0', main: 'index.js', gypfile: true })
    );
    await writeFile(join(root, 'node_modules', 'fixture-native', 'index.js'), 'module.exports = { native: true };');
    const handlerPath = join(root, 'src', 'handlers', 'handler-01.ts');
    await writeFile(handlerPath, `import 'fixture-native';\n${await readFile(handlerPath, 'utf8')}`);

    const { exitCode, result } = await runOffline(directory, root, manifest.functions);

    expect(exitCode).toBe(1);
    expect(result.error?.message).toContain('does not build native dependency layers (fixture-native)');
  });

  test('measures a shape and reports which artifacts each edit changes', async () => {
    const directory = await createDirectory();
    const child = Bun.spawnSync(
      [
        process.execPath,
        join(CLI_ROOT, 'scripts', 'perf', 'packaging-harness.ts'),
        '--functions',
        '2',
        '--samples',
        '1',
        '--states',
        'cold,unchanged,handler,shared',
        '--out',
        directory
      ],
      { cwd: CLI_ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const reportText = await readFile(join(directory, 'report.json'), 'utf8');
    const report = JSON.parse(reportText);
    const states = Object.fromEntries(
      report.lambdaShapes[0].states.map((state: { state: string }) => [state.state, state])
    );

    expect(report.label).toBe('Offline packaging harness');
    // Which tool wrote the archives is recorded, not inferred from detection; this process has no native zip on PATH.
    expect(report.archives).toMatchObject({ format: LAMBDA_ARCHIVE_FORMAT, nativeFailures: { count: 0 } });
    expect(
      Object.values(report.archives.backends as Record<string, number>).reduce((sum, count) => sum + count, 0)
    ).toBe(
      report.lambdaShapes[0].states.reduce(
        (sum: number, state: { samples: { result: { archiveCalls: number } }[] }) =>
          sum + state.samples.reduce((stateSum, { result }) => stateSum + result.archiveCalls, 0),
        0
      )
    );
    expect(report.source.check).toBe('unchanged');
    expect(report.source.before).toMatchObject({ available: true, reason: null });
    expect(report.source.after.changesSha256).toBe(report.source.before.changesSha256);
    expect(states.cold.source).toBe('unchanged');
    expect(states.cold.identicalArtifactsAcrossSamples).toBe(true);
    expect(states.cold.artifacts).toMatchObject({ functions: 2 });
    expect(states.cold.artifacts.layers).toBeGreaterThan(0);
    expect(states.cold.samples[0].result.split.bundle.bunBuildMs).toBeGreaterThan(0);
    expect(states.unchanged.comparedToColdBuild.changedFunctions).toEqual([]);
    expect(states.handler.comparedToColdBuild.changedFunctions).toEqual(['handler01']);
    expect(states.shared.comparedToColdBuild.changedFunctions).toEqual(['handler01', 'handler02']);
    expect(reportText).not.toContain(directory);
  }, 120_000);

  test('refuses an output directory that already has content and leaves that content untouched', async () => {
    const directory = await createDirectory();
    const sentinel = join(directory, 'workspace', 'sentinel.txt');
    await mkdir(join(directory, 'workspace'));
    await writeFile(sentinel, 'keep me\n');

    const child = Bun.spawnSync(
      [
        process.execPath,
        join(CLI_ROOT, 'scripts', 'perf', 'packaging-harness.ts'),
        '--functions',
        '1',
        '--out',
        directory
      ],
      { cwd: CLI_ROOT, stdout: 'pipe', stderr: 'pipe' }
    );

    expect(child.exitCode).toBe(1);
    expect(child.stderr.toString()).toContain('it is not empty');
    expect(await readFile(sentinel, 'utf8')).toBe('keep me\n');
    expect(existsSync(join(directory, 'report.json'))).toBe(false);
  });
});

/** A sample as the harness records it; `digest` stands for the artifacts the run produced. */
const sample = (index: number, outcome: { ok: true; digest: string } | { ok: false }): Sample => ({
  state: 'cold',
  sample: index,
  exitCode: outcome.ok ? 0 : 1,
  wallMs: 100,
  loadAverage: 0,
  source: 'unchanged',
  result: {
    ok: outcome.ok,
    readyMs: 10,
    packagingMs: 50,
    layerZipMs: null,
    split: null,
    perFunction: null,
    container: null,
    archiveFormat: 'stacktape-lambda-archive-2',
    archiveCalls: 1,
    archiveBackends: { archiver: 1 },
    nativeFailures: [],
    resolvedModules: [],
    functions: outcome.ok
      ? [
          {
            name: 'handler01',
            path: 'per-function',
            digest: outcome.digest,
            unzippedBytes: 1,
            zipBytes: 1,
            zipEntries: 1,
            zipModes: { '644': 1 },
            layers: [],
            combinedUnzippedBytes: 1
          }
        ]
      : [],
    layers: []
  }
});

describe('state summary', () => {
  const summarize = (samples: Sample[]) => summarizeState({ state: 'cold', samples, reference: null });

  test('does not claim identical artifacts when every sample failed', () => {
    const summary = summarize([sample(1, { ok: false }), sample(2, { ok: false })]);

    expect(summary.ok).toBe(false);
    expect(summary.identicalArtifactsAcrossSamples).toBeNull();
    expect(summary.artifacts).toBeNull();
  });

  test('leaves identity unknown when a sample failed and the others agree', () => {
    const summary = summarize([sample(1, { ok: true, digest: 'same' }), sample(2, { ok: false })]);

    expect(summary.ok).toBe(false);
    expect(summary.identicalArtifactsAcrossSamples).toBeNull();
  });

  test('reports different artifacts even when another sample failed', () => {
    const summary = summarize([
      sample(1, { ok: true, digest: 'first' }),
      sample(2, { ok: false }),
      sample(3, { ok: true, digest: 'second' })
    ]);

    expect(summary.ok).toBe(false);
    expect(summary.identicalArtifactsAcrossSamples).toBe(false);
  });

  test('confirms identical artifacts only when every sample succeeded with the same digests', () => {
    expect(
      summarize([sample(1, { ok: true, digest: 'same' }), sample(2, { ok: true, digest: 'same' })])
        .identicalArtifactsAcrossSamples
    ).toBe(true);
  });

  test('carries a source change in any sample to the state', () => {
    const changed = { ...sample(2, { ok: true, digest: 'same' }), source: 'changed' as const };

    expect(summarize([sample(1, { ok: true, digest: 'same' }), changed]).source).toBe('changed');
  });
});
