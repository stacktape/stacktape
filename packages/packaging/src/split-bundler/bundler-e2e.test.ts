/* eslint-disable no-await-in-loop -- These fixtures intentionally build and inspect each sequential generation. */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSplitBundle } from './bundler';
import type { PackagingErrorDetails } from './types';

const temporaryDirectories: string[] = [];
const createPackagingError = ({ message, cause }: PackagingErrorDetails) =>
  new Error(message, cause === undefined ? undefined : { cause });

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-split-e2e-'));
  temporaryDirectories.push(root);
  return root;
};

describe('split bundler end-to-end regressions', () => {
  test('attributes nested native dependency versions to only their importing Lambda', async () => {
    const root = await createRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    for (const [name, version] of [
      ['a', '1.0.0'],
      ['b', '2.0.0']
    ] as const) {
      const packageRoot = join(root, 'packages', name);
      const dependencyRoot = join(packageRoot, 'node_modules', 'fake-native');
      await mkdir(dependencyRoot, { recursive: true });
      await writeFile(
        join(dependencyRoot, 'package.json'),
        JSON.stringify({ name: 'fake-native', version, main: 'index.js', gypfile: true })
      );
      await writeFile(join(dependencyRoot, 'index.js'), `module.exports = { version: '${version}' };`);
      await writeFile(
        join(packageRoot, 'index.ts'),
        `import native from 'fake-native'; export const handler = () => native.version;`
      );
    }

    const result = await buildSplitBundle({
      entrypoints: ['a', 'b'].map((name) => ({
        name,
        jobName: name,
        entryfilePath: join(root, 'packages', name, 'index.ts'),
        distFolderPath: join(root, 'dist', name)
      })),
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      installDependencies: async () => {},
      createPackagingError
    });

    expect(result.lambdaOutputs.get('a')?.dependenciesToInstallInDocker.map(({ version }) => version)).toEqual([
      '1.0.0'
    ]);
    expect(result.lambdaOutputs.get('b')?.dependenciesToInstallInDocker.map(({ version }) => version)).toEqual([
      '2.0.0'
    ]);
  });

  test('cleans reused shared and Lambda output paths before a rebuild', async () => {
    const root = await createRoot();
    const entryfilePath = join(root, 'src', 'handler.ts');
    const sharedOutdir = join(root, 'shared');
    const distFolderPath = join(root, 'dist', 'handler');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(entryfilePath, 'export const handler = () => "first";');
    const options = {
      entrypoints: [{ name: 'handler', jobName: 'handler', entryfilePath, distFolderPath }],
      sharedOutdir,
      cwd: root,
      installDependencies: async () => {},
      createPackagingError
    };
    await buildSplitBundle(options);
    await writeFile(join(sharedOutdir, 'obsolete.js'), 'stale');
    await writeFile(join(distFolderPath, 'chunks', 'obsolete.js'), 'stale');
    await writeFile(entryfilePath, 'export const handler = () => "second";');

    await buildSplitBundle(options);

    expect(await Bun.file(join(sharedOutdir, 'obsolete.js')).exists()).toBe(false);
    expect(await readdir(join(distFolderPath, 'chunks'))).not.toContain('obsolete.js');
    expect(await Bun.file(join(distFolderPath, 'index.js')).text()).toContain('second');
  });

  test('copies file-loader assets and rewrites them to the Lambda task root', async () => {
    const root = await createRoot();
    const sourceRoot = join(root, 'src');
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(join(sourceRoot, 'module.wasm'), Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]));
    await writeFile(
      join(sourceRoot, 'shared.ts'),
      `import wasmPath from './module.wasm'; export const assetPath = wasmPath;`
    );
    for (const name of ['a', 'b']) {
      await writeFile(
        join(sourceRoot, `${name}.ts`),
        `import { assetPath } from './shared'; export const handler = () => assetPath;`
      );
    }
    const result = await buildSplitBundle({
      entrypoints: ['a', 'b'].map((name) => ({
        name,
        jobName: name,
        entryfilePath: join(sourceRoot, `${name}.ts`),
        distFolderPath: join(root, 'dist', name)
      })),
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      installDependencies: async () => {},
      createPackagingError
    });

    for (const output of result.lambdaOutputs.values()) {
      const assetName = (await readdir(join(root, 'dist', output.name))).find((name) => name.endsWith('.wasm'));
      expect(assetName).toBeDefined();
      const chunkName = (await readdir(join(root, 'dist', output.name, 'chunks'))).find((name) => name.endsWith('.js'));
      expect(chunkName).toBeDefined();
      expect(await Bun.file(join(root, 'dist', output.name, 'chunks', chunkName!)).text()).toContain(
        `/var/task/${assetName}`
      );
    }
  });

  test('does not bake the packaging process NODE_ENV into split Lambda output', async () => {
    const root = await createRoot();
    const entryfilePath = join(root, 'handler.ts');
    const distFolderPath = join(root, 'dist', 'handler');
    await writeFile(entryfilePath, 'export const handler = () => process.env.NODE_ENV;');

    await buildSplitBundle({
      entrypoints: [{ name: 'handler', jobName: 'handler', entryfilePath, distFolderPath }],
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      minify: true,
      installDependencies: async () => {},
      createPackagingError
    });

    const output = await Bun.file(join(distFolderPath, 'index.js')).text();
    expect(output).toContain('process.env.NODE_ENV');
    expect(output).not.toContain('"development"');
  });
});
