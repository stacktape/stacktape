import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRailpackPrepare } from './railpack-command';

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
});
