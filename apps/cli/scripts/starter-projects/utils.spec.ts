import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
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

  test('restores a suffixed config to its corresponding live name', async () => {
    const projectPath = await createTemporaryDirectory();
    const templateContents = '{\n  "compilerOptions": { "composite": true }\n}\n';
    await writeFile(join(projectPath, 'tsconfig.node.template.json'), templateContents);

    await restoreStarterTsConfigNames({ absoluteProjectPath: projectPath });

    expect(await readFile(join(projectPath, 'tsconfig.node.json'), 'utf8')).toBe(templateContents);
    expect(await pathExists(join(projectPath, 'tsconfig.node.template.json'))).toBe(false);
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

  test('fails before renaming any configs when a target already exists', async () => {
    const projectPath = await createTemporaryDirectory();
    const nestedPath = join(projectPath, 'packages', 'server');
    await ensureDir(nestedPath);
    await writeFile(join(projectPath, 'tsconfig.template.json'), '{"template":true}');
    await writeFile(join(nestedPath, 'tsconfig.node.template.json'), '{"template":"node"}');
    await writeFile(join(nestedPath, 'tsconfig.node.json'), '{"target":true}');

    await expect(restoreStarterTsConfigNames({ absoluteProjectPath: projectPath })).rejects.toThrow('target "');
    expect(await pathExists(join(projectPath, 'tsconfig.template.json'))).toBe(true);
    expect(await pathExists(join(projectPath, 'tsconfig.json'))).toBe(false);
    expect(await pathExists(join(nestedPath, 'tsconfig.node.template.json'))).toBe(true);
    expect(await readJson(join(nestedPath, 'tsconfig.node.json'))).toEqual({ target: true });
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
    const templateConfigs = sourceConfigs.filter(isTemplateTsConfig);
    expect(templateConfigs).toHaveLength(sourceConfigs.length);
    expect(templateConfigs.length).toBeGreaterThan(0);
    expect(
      templateConfigs.some((filePath) => filePath.endsWith(join('react-spa-vitejs', 'tsconfig.node.template.json')))
    ).toBe(true);

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
    expect(outputConfigs.some(isTemplateTsConfig)).toBe(false);
    expect(outputConfigs).toHaveLength(templateConfigs.length);
    expect(await pathExists(join(projectPath, 'react-spa-vitejs', 'tsconfig.node.json'))).toBe(true);
    expect(await readJson(join(projectPath, 'react-spa-vitejs', 'tsconfig.json'))).toEqual(
      expect.objectContaining({
        references: [{ path: './tsconfig.node.json' }]
      })
    );
  });
});

const isTemplateTsConfig = (filePath: string): boolean => {
  const fileName = basename(filePath);
  return fileName.startsWith('tsconfig') && fileName.endsWith('.template.json');
};

const findConfigFiles = async (directoryPath: string): Promise<string[]> => {
  const glob = new Bun.Glob('**/tsconfig*.json');
  const files: string[] = [];
  for await (const filePath of glob.scan({ cwd: directoryPath, absolute: true, onlyFiles: true })) {
    files.push(filePath);
  }
  return files;
};
