import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
        configPath = join(cwd, args[configArgumentIndex + 1]!);
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
