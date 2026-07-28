import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { copy, ensureDir, pathExists, readJson } from 'fs-extra';
import { STARTER_PROJECTS_SOURCE_PATH } from '../../shared/naming/project-fs-paths';
import { ensureStarterProjectTsConfig, restoreStarterTsConfigNames } from './utils';

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async () => {
  const directoryPath = await mkdtemp(join(tmpdir(), 'stacktape-starter-tsconfig-'));
  temporaryDirectories.push(directoryPath);
  return directoryPath;
};

const typescriptStarterMetadata: Parameters<typeof ensureStarterProjectTsConfig>[0]['metadata'] = {
  projectType: 'es',
  hasOwnTsConfig: false,
  hasTypescript: true,
  isWebsite: false,
  hasReact: false,
  hasNextJs: false,
  tags: ['Typescript']
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directoryPath) => rm(directoryPath, { recursive: true })));
});

describe('starter TypeScript config materialization', () => {
  test('restores a root template config without changing its contents', async () => {
    const projectPath = await createTemporaryDirectory();
    const templateContents = '{\n  "compilerOptions": { "strict": true }\n}\n';
    await writeFile(join(projectPath, 'tsconfig.template.json'), templateContents);

    await restoreStarterTsConfigNames({ absoluteProjectPath: projectPath });

    expect(await readFile(join(projectPath, 'tsconfig.json'), 'utf8')).toBe(templateContents);
    expect(await pathExists(join(projectPath, 'tsconfig.template.json'))).toBe(false);
  });

  test('restores nested monorepo configs and preserves extends paths', async () => {
    const projectPath = await createTemporaryDirectory();
    const packagePath = join(projectPath, 'packages', 'server');
    await ensureDir(packagePath);
    await writeFile(
      join(projectPath, 'tsconfig.template.json'),
      JSON.stringify({ files: [], references: [{ path: './packages/server' }] })
    );
    await writeFile(
      join(packagePath, 'tsconfig.template.json'),
      JSON.stringify({ extends: '../../tsconfig.json', compilerOptions: { composite: true } })
    );

    await restoreStarterTsConfigNames({ absoluteProjectPath: projectPath });

    expect(await readJson(join(projectPath, 'tsconfig.json'))).toEqual({
      files: [],
      references: [{ path: './packages/server' }]
    });
    expect(await readJson(join(packagePath, 'tsconfig.json'))).toEqual({
      extends: '../../tsconfig.json',
      compilerOptions: { composite: true }
    });
    expect(await pathExists(join(packagePath, 'tsconfig.template.json'))).toBe(false);
  });

  test('fails before renaming when a target config already exists', async () => {
    const projectPath = await createTemporaryDirectory();
    await writeFile(join(projectPath, 'tsconfig.template.json'), '{"template":true}');
    await writeFile(join(projectPath, 'tsconfig.json'), '{"target":true}');

    await expect(restoreStarterTsConfigNames({ absoluteProjectPath: projectPath })).rejects.toThrow('target "');
    expect(await pathExists(join(projectPath, 'tsconfig.template.json'))).toBe(true);
    expect(await readJson(join(projectPath, 'tsconfig.json'))).toEqual({ target: true });
  });

  test('generates the existing default for a TypeScript starter without a template config', async () => {
    const projectPath = await createTemporaryDirectory();

    await ensureStarterProjectTsConfig({
      absoluteProjectPath: projectPath,
      metadata: typescriptStarterMetadata
    });

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

  test('keeps source configs editor-inert and restores every config in copied output', async () => {
    const sourceConfigs = await findConfigFiles(STARTER_PROJECTS_SOURCE_PATH);
    expect(sourceConfigs.some((filePath) => filePath.endsWith('tsconfig.json'))).toBe(false);

    const templateConfigs = sourceConfigs.filter((filePath) => filePath.endsWith('tsconfig.template.json'));
    expect(templateConfigs.length).toBeGreaterThan(0);

    const projectPath = await createTemporaryDirectory();
    await Promise.all(
      templateConfigs.map(async (templatePath) => {
        const relativePath = relative(STARTER_PROJECTS_SOURCE_PATH, templatePath);
        const outputPath = join(projectPath, relativePath);
        await ensureDir(join(outputPath, '..'));
        await copy(templatePath, outputPath);
      })
    );

    await restoreStarterTsConfigNames({ absoluteProjectPath: projectPath });

    const outputConfigs = await findConfigFiles(projectPath);
    expect(outputConfigs.some((filePath) => filePath.endsWith('tsconfig.template.json'))).toBe(false);
    expect(outputConfigs.filter((filePath) => filePath.endsWith('tsconfig.json'))).toHaveLength(templateConfigs.length);
  });
});

const findConfigFiles = async (directoryPath: string): Promise<string[]> => {
  const glob = new Bun.Glob('**/tsconfig*.json');
  const files: string[] = [];
  for await (const filePath of glob.scan({ cwd: directoryPath, absolute: true, onlyFiles: true })) {
    files.push(filePath);
  }
  return files;
};
