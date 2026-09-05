import { afterEach, describe, expect, test } from 'bun:test';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
    const cjsOutput = join(root, 'cjs.js');
    const esmOutput = join(root, 'esm.js');
    await writeFile(cjsBannerPath, 'globalThis.__stacktapeCjsBanner = true;');

    const common = {
      rawCode: 'export const handler = () => 1;',
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

    expect(await readFile(cjsOutput, 'utf8')).toContain('__stacktapeCjsBanner');
    const esm = await readFile(esmOutput, 'utf8');
    expect(esm).toContain('createRequire as __stp_createRequire');
    expect(esm).not.toContain('__stacktapeCjsBanner');
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
