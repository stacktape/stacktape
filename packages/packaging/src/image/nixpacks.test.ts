import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import * as fsExtra from 'fs-extra';
import { buildUsingNixpacks } from './nixpacks';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('Nixpacks packaging failures', () => {
  test('preserves an application error and removes the temporary config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-nixpacks-'));
    temporaryDirectories.push(root);
    const sourceDirectory = join(root, 'service');
    await mkdir(sourceDirectory);
    const customerConfigPath = join(sourceDirectory, 'stp-nixpacks-tmp.json');
    await writeFile(customerConfigPath, 'customer-owned');

    const semanticError = Object.assign(new Error('Nixpacks command failed'), {
      category: 'NIXPACKS',
      code: 'NIXPACKS_COMMAND_FAILED',
      hints: ['Fix the detected build configuration.']
    });
    let configPath: string | undefined;

    const operation = buildUsingNixpacks({
      name: 'worker',
      progressLogger: {
        eventContext: {},
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      },
      existingDigests: [],
      cwd: root,
      sourceDirectoryPath: 'service',
      getDockerImageDetails: async () => {
        throw new Error('Image inspection should not run after a failed build.');
      },
      runNixpacks: async ({ args, cwd }) => {
        const configArgumentIndex = args.indexOf('--config');
        const configArgument = args[configArgumentIndex + 1]!;
        configPath = isAbsolute(configArgument) ? configArgument : join(cwd, configArgument);
        throw semanticError;
      }
    });

    await expect(operation).rejects.toBe(semanticError);
    expect(configPath).toBeDefined();
    expect(configPath).not.toBe(customerConfigPath);
    expect(await readdir(sourceDirectory)).not.toContain(configPath!.split(/[\\/]/).at(-1));
    expect(await readFile(customerConfigPath, 'utf8')).toBe('customer-owned');
  });

  test('does not replace a build failure with a cleanup failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-nixpacks-'));
    temporaryDirectories.push(root);
    await mkdir(join(root, 'service'));

    const semanticError = new Error('Nixpacks command failed');
    const removeSpy = spyOn(fsExtra, 'remove').mockImplementation(() =>
      Promise.reject(new Error('Temporary file is locked'))
    );
    const operation = buildUsingNixpacks({
      name: 'worker',
      progressLogger: {
        eventContext: {},
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      },
      existingDigests: [],
      cwd: root,
      sourceDirectoryPath: 'service',
      getDockerImageDetails: async () => {
        throw new Error('Image inspection should not run after a failed build.');
      },
      runNixpacks: async () => {
        throw semanticError;
      }
    });

    await expect(operation).rejects.toBe(semanticError);
    removeSpy.mockRestore();
  });
});

describe('Nixpacks configuration', () => {
  test('parses TOML arrays and nested phases before applying Stacktape overrides', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-nixpacks-config-'));
    temporaryDirectories.push(root);
    const sourceDirectory = join(root, 'service');
    await mkdir(sourceDirectory);
    await writeFile(
      join(sourceDirectory, 'nixpacks.toml'),
      '[phases.setup]\nnixPkgs = ["nodejs_22", "openssl"]\n[phases.build]\ncmds = ["npm run build"]\n[start]\ncmd = "node old.js"\n'
    );
    let generatedConfig: Record<string, unknown> | undefined;

    await buildUsingNixpacks({
      name: 'worker',
      progressLogger: {
        eventContext: {},
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      },
      existingDigests: [],
      cwd: root,
      sourceDirectoryPath: 'service',
      startCmd: 'node server.js',
      phases: [{ name: 'build', cmds: ['npm run compile'] }],
      getDockerImageDetails: async () => ({ size: 1, id: 'image', created: 1 }),
      runNixpacks: async ({ args, cwd }) => {
        const configArgumentIndex = args.indexOf('--config');
        const configArgument = args[configArgumentIndex + 1]!;
        const configPath = isAbsolute(configArgument) ? configArgument : join(cwd, configArgument);
        generatedConfig = JSON.parse(await readFile(configPath, 'utf8'));
        return { stdout: '', stderr: '', exitCode: 0 };
      }
    });

    expect(generatedConfig).toEqual({
      phases: {
        setup: { nixPkgs: ['nodejs_22', 'openssl'] },
        build: { cmds: ['npm run compile'] }
      },
      start: { cmd: 'node server.js' }
    });
  });

  test('rejects start-only filtering without a separate runtime image', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-nixpacks-config-'));
    temporaryDirectories.push(root);
    await mkdir(join(root, 'service'));

    await expect(
      buildUsingNixpacks({
        name: 'worker',
        progressLogger: {
          eventContext: {},
          startEvent: () => {},
          updateEvent: () => {},
          finishEvent: () => {}
        },
        existingDigests: [],
        cwd: root,
        sourceDirectoryPath: 'service',
        startOnlyIncludeFiles: ['src/**'],
        getDockerImageDetails: async () => ({ size: 1, id: 'image', created: 1 }),
        runNixpacks: async () => ({ stdout: '', stderr: '', exitCode: 0 })
      })
    ).rejects.toThrow('requires startRunImage');
  });
});
