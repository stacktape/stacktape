import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, win32 } from 'node:path';
import { containerPlannerArguments, createPlannerImageEnsurer, createRailpackPrepare } from './railpack-command';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const sourceDirectory = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stp-railpack-command-test-'));
  roots.push(root);
  return root;
};

const writeResults = (outputDirectory: string, info: object = { success: true }) =>
  Promise.all([
    writeFile(join(outputDirectory, 'plan.json'), JSON.stringify({ deploy: { startCommand: 'node index.js' } })),
    writeFile(join(outputDirectory, 'info.json'), JSON.stringify(info))
  ]);

describe('railpack prepare', () => {
  test('returns the result files and removes its temporary directory only after reading them', async () => {
    const sourceDirectoryPath = await sourceDirectory();
    let plannerOutputDirectory = '';
    const prepare = createRailpackPrepare(async ({ outputDirectory }) => {
      plannerOutputDirectory = outputDirectory;
      await writeResults(outputDirectory);
      return { stdout: '', stderr: '' };
    });

    // Many plans at once: a directory removed before its files are read fails here.
    const results = await Promise.all(
      Array.from({ length: 24 }, () => prepare({ sourceDirectoryPath, variables: {} }))
    );

    for (const result of results) {
      expect(result.plan).toEqual({ deploy: { startCommand: 'node index.js' } });
      expect(result.info).toEqual({ success: true });
    }
    expect(await Bun.file(join(plannerOutputDirectory, 'plan.json')).exists()).toBe(false);
  });

  test('an inline configuration exists beneath the source only while the planner runs', async () => {
    const sourceDirectoryPath = await sourceDirectory();
    let seenConfig: unknown;
    const prepare = createRailpackPrepare(async ({ outputDirectory, configFile }) => {
      seenConfig = await Bun.file(join(sourceDirectoryPath, configFile!)).json();
      await writeResults(outputDirectory);
      return {};
    });

    await prepare({ sourceDirectoryPath, variables: {}, config: { deploy: { aptPackages: ['ffmpeg'] } } });

    expect(seenConfig).toEqual({ deploy: { aptPackages: ['ffmpeg'] } });
    expect(await readdir(sourceDirectoryPath)).toEqual([]);
  });

  test('a failed detection returns the info file instead of throwing', async () => {
    const sourceDirectoryPath = await sourceDirectory();
    const prepare = createRailpackPrepare(async ({ outputDirectory }) => {
      await writeFile(join(outputDirectory, 'info.json'), JSON.stringify({ success: false, logs: [] }));
      throw Object.assign(new Error('exit 1'), { exitCode: 1 });
    });

    expect(await prepare({ sourceDirectoryPath, variables: {} })).toEqual({
      plan: undefined,
      info: { success: false, logs: [] }
    });
  });

  test('a planner that succeeds without result files reports its output with build variable values redacted', async () => {
    const sourceDirectoryPath = await sourceDirectory();
    const prepare = createRailpackPrepare(async () => ({
      stdout: 'resolved NPM_TOKEN=tok-5f2c9e',
      stderr: 'warning: tok-5f2c9e looks like a credential'
    }));

    const failure = await prepare({ sourceDirectoryPath, variables: { NPM_TOKEN: 'tok-5f2c9e' } }).then(
      () => undefined,
      (error: Error & { code?: string }) => error
    );

    expect(failure?.code).toBe('RAILPACK_COMMAND_FAILED');
    expect(failure?.message).toContain('Railpack exited without writing its plan');
    expect(failure?.message).toContain('resolved NPM_TOKEN=[redacted]');
    expect(failure?.message).not.toContain('tok-5f2c9e');
  });

  // r2bd: on Windows the containerized planner got `--plan-out \out\plan.json`. The Linux planner exited 0 and wrote
  // nothing to the mounted directory, so every Railpack workload failed with "Railpack exited without writing its plan".
  test('the containerized planner gets Linux paths for its files when the CLI runs on Windows', () => {
    const args = containerPlannerArguments({
      sourceDirectoryPath: 'C:\\Users\\dev\\Shop žluťoučký\\orders',
      outputDirectory: 'C:\\Users\\dev\\AppData\\Local\\Temp\\stp-railpack-a1b2c3',
      variableNames: ['GOFLAGS'],
      configFile: '.stacktape-railpack-0a1b2c3d4e5f.json',
      hostPaths: win32
    });

    expect(args).toContain('C:\\Users\\dev\\Shop žluťoučký\\orders:/src/orders:ro');
    expect(args).toContain('C:\\Users\\dev\\AppData\\Local\\Temp\\stp-railpack-a1b2c3:/out');
    const prepare = args.slice(args.indexOf('prepare'));
    expect(prepare).toEqual([
      'prepare',
      '/src/orders',
      '--plan-out',
      '/out/plan.json',
      '--info-out',
      '/out/info.json',
      '--config-file',
      '.stacktape-railpack-0a1b2c3d4e5f.json',
      '--env',
      'GOFLAGS'
    ]);
  });
});

// r2bd: Buildx was missing, the planner image build failed, and after installing Buildx every rebuild in the same
// session repeated the old error instantly because the rejected build was kept for the process lifetime.
describe('railpack planner image', () => {
  test('a failed build is tried again by the next plan, and concurrent plans share one build', async () => {
    const calls: string[] = [];
    let buildxInstalled = false;
    const ensure = createPlannerImageEnsurer(async (args) => {
      calls.push(args[0]!);
      if (args[0] === 'image') return { stdout: '' };
      await Bun.sleep(5);
      if (!buildxInstalled)
        throw new Error('ERROR: BuildKit is enabled but the buildx component is missing or broken.');
      return { stdout: '' };
    });

    await expect(ensure()).rejects.toThrow('buildx component is missing');
    buildxInstalled = true;
    await Promise.all([ensure(), ensure(), ensure()]);
    await ensure();

    expect(calls).toEqual(['image', 'build', 'image', 'build']);
  });
});
