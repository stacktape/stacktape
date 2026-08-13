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
      'starter-projects-metadata.json',
      '@generated/schemas/validate-config-zod.ts',
      '@generated/schemas/enhanced-config-schema.json',
      '@generated/schemas/api-reference-data.json',
      '@generated/llm-docs/**'
    ]);
    expect(workspaceTurboConfig.tasks['generate:monaco'].outputs).toEqual(['.generated/monaco-declarations/**']);
  });

  test('prepares fixed CLI development artifacts through Turbo rather than the source launcher', async () => {
    const [workspacePackageJson, cliPackageJson, cliTurboConfig] = await Promise.all([
      readJson(join(workspacePath, 'package.json')),
      readJson(join(cliPath, 'package.json')),
      readJson(join(cliPath, 'turbo.json'))
    ]);

    expect(workspacePackageJson.scripts['dev:cli']).toBe(
      'turbo run build:dev-artifacts --filter=@stacktape/cli && pnpm --filter @stacktape/cli run dev'
    );
    expect(cliTurboConfig.tasks['build:dev-artifacts'].outputs).toEqual([
      '__stacktape-dist/dev/helper-lambdas/**',
      '__stacktape-dist/source-map-install.js'
    ]);
    expect(cliPackageJson.scripts['build:dev-artifacts']).toBe('bun scripts/package-helper-lambdas.ts --dev');
  });

  test('declares cross-workspace development prerequisites in Turbo', async () => {
    const workspaceTurboConfig = await readJson(join(workspacePath, 'turbo.json'));

    expect(workspaceTurboConfig.tasks['@stacktape/console-ui#dev'].dependsOn).toEqual([
      'generate',
      'generate:monaco',
      '@stacktape/ui-react#build'
    ]);
    expect(workspaceTurboConfig.tasks['@stacktape/init-ui#build:watch'].dependsOn).toEqual([
      '@stacktape/ui-react#build'
    ]);
    expect(workspaceTurboConfig.tasks['@stacktape/website#dev'].dependsOn).toEqual([
      '@stacktape/design-tokens#generate'
    ]);
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

  test('owns characterization tests and the committed generated schema validator', async () => {
    const [testsConfig, generatedConfig] = await Promise.all([
      readJson(join(cliPath, 'tests', 'tsconfig.json')),
      readJson(join(cliPath, '@generated', 'tsconfig.json'))
    ]);

    expect(testsConfig.include).toEqual(['../src/environment.d.ts', './characterization/**/*.ts']);
    expect(generatedConfig.include).toEqual(['./schemas/validate-config-zod.ts']);
    expect(await pathExists(join(cliPath, 'tsconfig.generated.json'))).toBe(false);
  });
});
