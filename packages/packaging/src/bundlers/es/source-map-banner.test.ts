import { afterEach, describe, expect, test } from 'bun:test';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEsCode } from './index';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('source-map banner selection', () => {
  test('does not reuse the cached CommonJS banner for a later ESM build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-source-map-banner-'));
    temporaryDirectories.push(root);
    const cjsBannerPath = join(root, 'source-map-install.js');
    const cjsOutput = join(root, 'cjs.cjs');
    const esmOutput = join(root, 'esm.mjs');
    await writeFile(cjsBannerPath, 'globalThis.__stacktapeCjsBanner = true;');

    const common = {
      rawCode:
        "export const handler = () => ({ banner: globalThis.__stacktapeCjsBanner === true, basename: require('node:path').basename('/runtime/value') });",
      externals: [],
      sourceMaps: 'external' as const,
      sourceMapBannerType: 'pre-compiled' as const,
      cwd: root,
      createPackagingError: ({ message }: { message: string }) => new Error(message)
    };
    await buildEsCode({
      ...common,
      distPath: cjsOutput,
      outputModuleFormat: 'cjs',
      sourceMapInstallPath: cjsBannerPath
    });
    await buildEsCode({
      ...common,
      distPath: esmOutput,
      outputModuleFormat: 'esm',
      sourceMapInstallPath: cjsBannerPath
    });

    for (const [output, banner] of [
      [cjsOutput, true],
      [esmOutput, false]
    ] as const) {
      const execution = spawnSync(
        process.env.npm_node_execpath || 'node',
        [
          '--input-type=module',
          '--eval',
          `const module = await import(${JSON.stringify(pathToFileURL(output).href)}); console.log(JSON.stringify((module.handler ?? module.default.handler)()));`
        ],
        { cwd: root, encoding: 'utf8', timeout: 10_000 }
      );
      expect(execution.status, execution.stderr).toBe(0);
      expect(JSON.parse(execution.stdout)).toEqual({ banner, basename: 'value' });
    }
  });

  test('does not place an ESM package boundary beside an explicit mjs output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-mjs-boundary-'));
    temporaryDirectories.push(root);

    await buildEsCode({
      rawCode: 'export const value = 1;',
      distPath: join(root, 'runtime.mjs'),
      outputModuleFormat: 'esm',
      externals: [],
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      cwd: root,
      createPackagingError: ({ message }: { message: string }) => new Error(message)
    });

    await expect(access(join(root, 'package.json'))).rejects.toThrow();
  });
});
