/* eslint-disable no-await-in-loop -- Fixture package trees are created sequentially for readable failure boundaries. */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { copyTracedNodeRuntimeFiles, resolveInstalledNodePackage } from './node-runtime-files';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

const write = async (path: string, contents: string) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
};

describe('Node SSR runtime file tracing', () => {
  test('includes complete declared production dependencies selected dynamically at runtime', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-node-trace-'));
    roots.push(root);
    const output = join(root, 'artifact');
    await write(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'app',
        dependencies: { 'runtime-plugin': '1.0.0' }
      })
    );
    await write(join(root, 'server', 'entry.mjs'), 'export const load = (name) => import(name);\n');
    await write(
      join(root, 'node_modules', 'runtime-plugin', 'package.json'),
      JSON.stringify({
        name: 'runtime-plugin',
        version: '1.0.0',
        type: 'module',
        main: 'index.js'
      })
    );
    await write(join(root, 'node_modules', 'runtime-plugin', 'index.js'), 'export { default } from "./feature.js";\n');
    await write(join(root, 'node_modules', 'runtime-plugin', 'feature.js'), 'export default "dynamic-ok";\n');
    await write(join(root, 'node_modules', 'runtime-plugin', 'runtime-only.txt'), 'plugin-asset');

    await copyTracedNodeRuntimeFiles({
      entrypointPath: join(root, 'server', 'entry.mjs'),
      processCwd: root,
      serverFunctionPath: output,
      traceBasePath: root
    });

    expect(await readFile(join(output, 'node_modules', 'runtime-plugin', 'feature.js'), 'utf8')).toContain(
      'dynamic-ok'
    );
    expect(await readFile(join(output, 'node_modules', 'runtime-plugin', 'runtime-only.txt'), 'utf8')).toBe(
      'plugin-asset'
    );
  });

  test('keeps statically traced production packages file-level pruned', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-node-trace-pruned-'));
    roots.push(root);
    const output = join(root, 'artifact');
    await write(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'app',
        dependencies: { 'runtime-framework': '1.0.0' }
      })
    );
    await write(join(root, 'server', 'entry.mjs'), 'export { default } from "runtime-framework";\n');
    await write(
      join(root, 'node_modules', 'runtime-framework', 'package.json'),
      JSON.stringify({
        name: 'runtime-framework',
        version: '1.0.0',
        type: 'module',
        main: 'index.js'
      })
    );
    await write(join(root, 'node_modules', 'runtime-framework', 'index.js'), 'export default "static-ok";\n');
    await write(join(root, 'node_modules', 'runtime-framework', 'unused-build-fixture.bin'), 'large-unused-file');

    await copyTracedNodeRuntimeFiles({
      entrypointPath: join(root, 'server', 'entry.mjs'),
      processCwd: root,
      serverFunctionPath: output,
      traceBasePath: root
    });

    expect(await Bun.file(join(output, 'node_modules', 'runtime-framework', 'index.js')).exists()).toBe(true);
    expect(await Bun.file(join(output, 'node_modules', 'runtime-framework', 'unused-build-fixture.bin')).exists()).toBe(
      false
    );
  });

  test('does not recopy framework packages proven to be bundled into the server output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-node-trace-bundled-'));
    roots.push(root);
    const output = join(root, 'artifact');
    await write(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'app',
        dependencies: {
          'bundled-framework': '1.0.0',
          'runtime-plugin': '1.0.0'
        }
      })
    );
    await write(join(root, 'server', 'entry.mjs'), 'export const load = (name) => import(name);\n');
    for (const packageName of ['bundled-framework', 'runtime-plugin']) {
      await write(
        join(root, 'node_modules', packageName, 'package.json'),
        JSON.stringify({
          name: packageName,
          version: '1.0.0',
          type: 'module',
          main: 'index.js'
        })
      );
      await write(
        join(root, 'node_modules', packageName, 'index.js'),
        `export default ${JSON.stringify(packageName)};\n`
      );
    }

    await copyTracedNodeRuntimeFiles({
      bundledApplicationPackages: ['bundled-framework'],
      entrypointPath: join(root, 'server', 'entry.mjs'),
      processCwd: root,
      serverFunctionPath: output,
      traceBasePath: root
    });

    expect(await Bun.file(join(output, 'node_modules', 'bundled-framework', 'index.js')).exists()).toBe(false);
    expect(await Bun.file(join(output, 'node_modules', 'runtime-plugin', 'index.js')).exists()).toBe(true);
  });

  test('resolves a transitive native runtime from the framework package graph', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-node-runtime-resolve-'));
    roots.push(root);
    const frameworkRoot = join(root, 'node_modules', 'framework');
    const nativeRoot = join(frameworkRoot, 'node_modules', 'native-runtime');
    await write(join(root, 'package.json'), JSON.stringify({ name: 'app', dependencies: { framework: '1.0.0' } }));
    await write(
      join(frameworkRoot, 'package.json'),
      JSON.stringify({
        name: 'framework',
        version: '1.0.0',
        dependencies: { 'native-runtime': '2.3.4' }
      })
    );
    await write(join(nativeRoot, 'package.json'), JSON.stringify({ name: 'native-runtime', version: '2.3.4' }));

    expect(
      await resolveInstalledNodePackage({
        applicationRoot: root,
        packageName: 'native-runtime',
        resolveFromPackage: 'framework',
        traceBasePath: root
      })
    ).toEqual({
      name: 'native-runtime',
      path: await realpath(nativeRoot),
      version: '2.3.4'
    });
  });
});
