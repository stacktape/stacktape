import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { pathExists, readJson } from 'fs-extra';

const cliPath = join(import.meta.dir, '..');
const workspacePath = join(cliPath, '..', '..');

describe('TypeScript project ownership', () => {
  test('declares only the outputs owned by ordinary CLI generation', async () => {
    const [workspaceTurboConfig, cliTurboConfig] = await Promise.all([
      readJson(join(workspacePath, 'turbo.json')),
      readJson(join(cliPath, 'turbo.json'))
    ]);

    expect(cliTurboConfig.tasks.generate.outputs).toEqual([
      '@generated/schemas/validate-config-zod.ts',
      'starter-projects-metadata.json'
    ]);
    expect(workspaceTurboConfig.tasks['generate:monaco'].outputs).toEqual(['generated/monaco-declarations/**']);
  });

  test('keeps workspace tools in the standard root project', async () => {
    const [packageJson, tsConfig] = await Promise.all([
      readJson(join(workspacePath, 'package.json')),
      readJson(join(workspacePath, 'tsconfig.json'))
    ]);

    expect(packageJson.scripts['typecheck:tools']).toBe('tsc -p tsconfig.json');
    expect(tsConfig.include).toEqual(['scripts/**/*.ts']);
    expect(await pathExists(join(workspacePath, 'tsconfig.tools.json'))).toBe(false);
  });

  test('keeps every CLI project in the scripted typecheck lane', async () => {
    const packageJson = await readJson(join(cliPath, 'package.json'));
    const projectPaths = packageJson.scripts.typecheck
      .split(' && ')
      .map((command: string) => command.slice(command.lastIndexOf('-p ') + 3));

    expect(projectPaths).toEqual([
      'tsconfig.json',
      'tsconfig.build.json',
      'tests/tsconfig.json',
      '_test-stacks/config-loading-smoke/tsconfig.json',
      '_test-stacks/packaging-smoke/tsconfig.json',
      '@generated/tsconfig.json'
    ]);
    expect(packageJson.scripts['test:generated-types']).toContain('-p @generated/tsconfig.json');
  });

  test('owns characterization tests and every committed generated TypeScript surface', async () => {
    const [testsConfig, generatedConfig] = await Promise.all([
      readJson(join(cliPath, 'tests', 'tsconfig.json')),
      readJson(join(cliPath, '@generated', 'tsconfig.json'))
    ]);

    expect(testsConfig.include).toEqual(['../src/environment.d.ts', './characterization/**/*.ts']);
    expect(generatedConfig.include).toEqual([
      './cloudform/**/*.ts',
      './cloudformation-ts-types/**/*.ts',
      './schemas/validate-config-zod.ts'
    ]);
    expect(await pathExists(join(cliPath, 'tsconfig.generated.json'))).toBe(false);
  });
});
