import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathExists, readJson } from 'fs-extra';
import { addDefaultTsConfigIfNeeded } from './utils';

const temporaryDirectories: string[] = [];
const metadata: Parameters<typeof addDefaultTsConfigIfNeeded>[0]['metadata'] = {
  projectType: 'es',
  hasOwnTsConfig: false,
  hasTypescript: true,
  isWebsite: false,
  hasReact: false,
  hasNextJs: false,
  tags: ['Typescript']
};

const createProjectDirectory = async () => {
  const directoryPath = await mkdtemp(join(tmpdir(), 'stacktape-downloaded-starter-'));
  temporaryDirectories.push(directoryPath);
  return directoryPath;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directoryPath) => rm(directoryPath, { recursive: true })));
});

describe('downloaded starter TypeScript config', () => {
  test('preserves an authored config even when metadata says the starter does not own one', async () => {
    const projectPath = await createProjectDirectory();
    const authoredConfig = '{\n  "extends": "@framework/tsconfig"\n}\n';
    await writeFile(join(projectPath, 'tsconfig.json'), authoredConfig);

    await addDefaultTsConfigIfNeeded({ absoluteProjectPath: projectPath, metadata });

    expect(await readFile(join(projectPath, 'tsconfig.json'), 'utf8')).toBe(authoredConfig);
  });

  test('generates the default when the downloaded starter has no config', async () => {
    const projectPath = await createProjectDirectory();

    await addDefaultTsConfigIfNeeded({ absoluteProjectPath: projectPath, metadata });

    expect(await pathExists(join(projectPath, 'tsconfig.json'))).toBe(true);
    expect(await readJson(join(projectPath, 'tsconfig.json'))).toEqual(
      expect.objectContaining({
        compilerOptions: expect.objectContaining({
          target: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          noEmit: true
        })
      })
    );
  });
});
