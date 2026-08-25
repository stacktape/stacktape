import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { parse as parseYaml } from 'yaml';
import { SSR_WEB_FRAMEWORK_CONFIGS } from 'src/domain/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';

const starterRoot = join(import.meta.dir, '..', '..', 'starter-projects', 'tanstack-start-serverless');
const documentationPath = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'content',
  'resources',
  'frontend',
  'tanstack-start.mdx'
);
const configTypePath = join(import.meta.dir, '..', '..', '..', '..', 'packages', 'config', 'src', 'tanstack-web.ts');
const generatedApiReferencePath = join(import.meta.dir, '..', '..', '@generated', 'llm-docs', 'llms-api-reference.txt');

describe('the legacy TanStack Start starter', () => {
  test('overrides the current Vite default with its real Vinxi build in both config formats', async () => {
    const [manifestText, typescriptConfig, yamlConfigText, documentation, configType, generatedApiReference] =
      await Promise.all([
        readFile(join(starterRoot, 'package.json'), 'utf8'),
        readFile(join(starterRoot, 'stacktape.ts'), 'utf8'),
        readFile(join(starterRoot, 'stacktape.yml'), 'utf8'),
        readFile(documentationPath, 'utf8'),
        readFile(configTypePath, 'utf8'),
        readFile(generatedApiReferencePath, 'utf8')
      ]);
    const manifest = JSON.parse(manifestText) as { scripts?: Record<string, string> };
    const yamlConfig = parseYaml(yamlConfigText) as {
      resources?: { web?: { properties?: { buildCommand?: string } } };
    };
    const framework = SSR_WEB_FRAMEWORK_CONFIGS['tanstack-web'];

    expect(framework.defaultBuildCommand).toBe('vite build');
    expect(manifest.scripts?.build).toBe('vinxi build');
    expect(typescriptConfig).toContain("buildCommand: 'vinxi build'");
    expect(yamlConfig.resources?.web?.properties?.buildCommand).toBe('vinxi build');
    expect(framework.fallbackOutputVariants).toContainEqual(
      expect.objectContaining({
        serverOutputPath: '.output/server',
        staticOutputPath: '.output/public',
        handlerFileName: 'index.mjs',
        wrapperType: 'passthrough'
      })
    );
    expect(documentation).toContain('Stacktape runs `vite build` by default');
    expect(documentation).toContain("legacy Vinxi applications need `buildCommand: 'vinxi build'`");
    expect(documentation).not.toContain('Stacktape runs `vinxi build` by default');
    const currentAppDirectoryDescription =
      'Current apps typically use `vite.config.*` or `rsbuild.config.*`; legacy apps may use `app.config.ts`.';
    expect(configType).toContain(currentAppDirectoryDescription);
    expect(generatedApiReference).toContain(currentAppDirectoryDescription);
    expect(generatedApiReference).not.toContain(
      'Directory containing your `app.config.ts`. For monorepos, point to the TanStack Start workspace.'
    );
  });
});
