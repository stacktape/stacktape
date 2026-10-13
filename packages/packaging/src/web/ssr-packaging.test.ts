import { expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archiveItem, createPackagingError, progressLogger, run, write } from '../../scripts/e2e-helpers';
import { createSsrWebArtifacts, type SsrWebBuildConfig } from './ssr-web-shared';
import { resolveInstalledNodePackage } from './node-runtime-files';
import type { ExecuteProcess } from '../runtime-contracts';

const executeProcess: ExecuteProcess = async (command, args, options) =>
  run(command, args, options.cwd, {
    PATH: process.env.PATH,
    ...Object.fromEntries(Object.entries(options.env ?? {}).map(([key, value]) => [key, String(value)])),
    npm_config_offline: 'true',
    npm_config_cache: join(options.cwd!, '.npm-cache')
  });

// A small build executable stands at the framework boundary. Everything after it is production packaging:
// coordination, output selection, tracing, wrapper creation, digesting and ZIP creation.
const setup = async (root: string) => {
  // npx resolves the fixture's local framework binary. It must never install a "node" package from npm.
  const binary = join(root, 'node_modules/.bin/ssr-fixture-build');
  await write(binary, `#!${process.execPath}\nimport '../../build.mjs';\n`);
  await chmod(binary, 0o755);
  await write(`${binary}.cmd`, `@echo off\r\n"${process.execPath}" "%~dp0..\\..\\build.mjs"\r\n`);
  await write(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'ssr-fixture',
      type: 'module',
      dependencies: { plugin: '1.0.0', framework: '1.0.0', bundled: '1.0.0' },
      devDependencies: { adapter: '1.0.0' }
    })
  );
  await write(join(root, 'node_modules/plugin/package.json'), '{"name":"plugin","type":"module","main":"index.js"}');
  await write(join(root, 'node_modules/plugin/index.js'), 'export default "runtime-plugin";');
  await write(join(root, 'node_modules/plugin/runtime.txt'), 'runtime-asset');
  await write(
    join(root, 'node_modules/framework/package.json'),
    '{"name":"framework","type":"module","main":"index.js"}'
  );
  await write(join(root, 'node_modules/framework/index.js'), 'export default "traced-framework";');
  await write(join(root, 'node_modules/framework/unused.bin'), 'must-not-be-shipped');
  await write(join(root, 'node_modules/bundled/package.json'), '{"name":"bundled","main":"index.js"}');
  await write(join(root, 'node_modules/bundled/index.js'), 'must-not-be-shipped');
  await write(
    join(root, 'build.mjs'),
    `import { open, mkdir, rm, writeFile, access } from 'node:fs/promises';
const lock = await open('building.lock', 'wx').catch(() => { throw new Error('Overlapping builds corrupted framework output'); });
try {
  if (process.env.FAIL_BUILD === 'yes') throw new Error('Framework configuration is invalid');
  if (process.env.PEER_BUILD_BARRIER) {
    await writeFile(process.env.PEER_BUILD_BARRIER + '/' + process.env.MARKER, 'building');
    const deadline = Date.now() + 25000;
    while (!(await access(process.env.PEER_BUILD_BARRIER + '/release').then(() => true, () => false))) {
      if (Date.now() > deadline) throw new Error('The concurrent build fixture was not released');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  await rm('output', { recursive: true, force: true });
  await mkdir(process.env.SERVER_OUTPUT_PATH, { recursive: true });
  await mkdir(process.env.STATIC_OUTPUT_PATH, { recursive: true });
  await writeFile(process.env.STATIC_OUTPUT_PATH + '/asset.txt', process.env.MARKER);
  await writeFile(process.env.SERVER_OUTPUT_PATH + '/entry.mjs', \`
    import framework from 'framework';
    import { readFile } from 'node:fs/promises';
    export default async (req, res) => {
      const pluginName = req.headers['x-plugin'];
      const plugin = (await import(pluginName)).default;
      const asset = await readFile(new URL('./runtime.txt', import.meta.resolve('plugin')), 'utf8');
      const clientAsset = \${process.env.PRESERVE_LAYOUT === 'yes'}
        ? '|' + await readFile(new URL('../client/asset.txt', import.meta.url), 'utf8') : '';
      res.setHeader('content-type', 'text/plain');
      res.setHeader('set-cookie', ['first=one; Path=/', 'second=two; Path=/']);
      res.end("\${process.env.MARKER}" + '|' + framework + '|' + plugin + '|' + asset + clientAsset);
    };
  \`);
  await new Promise(resolve => setTimeout(resolve, 100));
} finally { await lock.close(); await rm('building.lock'); }
`
  );
};

const packageApp = (
  root: string,
  name: string,
  buildEnv: Record<string, string> = {},
  layout: Partial<SsrWebBuildConfig> = {}
) =>
  createSsrWebArtifacts({
    resourceName: name,
    resourceType: 'sveltekit-web',
    serverFunctionName: `${name}-server`,
    distFolderPath: join(root, name),
    cwd: root,
    progressLogger,
    createProgressLogger: () => progressLogger,
    buildConfig: {
      workingDir: root,
      buildCommand: 'ssr-fixture-build',
      buildEnv: {
        MARKER: name,
        SERVER_OUTPUT_PATH: layout.serverOutputPath ?? 'output/public/server',
        STATIC_OUTPUT_PATH: layout.staticOutputPath ?? 'output/public',
        ...buildEnv
      },
      serverOutputPath: 'output/public/server',
      staticOutputPath: 'output/public',
      handlerFileName: 'entry.mjs',
      requiredAdapterPackages: ['adapter'],
      bundledApplicationPackages: ['bundled'],
      adapterConfigurationHint: 'Use the Node server adapter.',
      staticAssetPrefix: '',
      wrapperType: 'node-http',
      ...layout
    },
    environmentVars: [],
    archiveItem,
    createPackagingError,
    executeProcess
  });

const invokeArtifact = async (artifactPath: string, extracted: string) => {
  await run('unzip', ['-q', artifactPath, '-d', extracted]);
  const child = Bun.spawn(
    [
      process.execPath,
      '--eval',
      `
        const { handler } = await import('./index-wrap.mjs');
        console.log(JSON.stringify(await handler({ version: '2.0', rawPath: '/', headers: { 'x-plugin': 'plugin' } })));
        process.exit(0);
      `
    ],
    { cwd: extracted, stdout: 'pipe', stderr: 'pipe', timeout: 5_000 }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  if (exitCode !== 0) throw new Error(`Packaged handler failed (${exitCode}): ${stderr}`);
  return JSON.parse(stdout) as { cookies?: string[]; multiValueHeaders?: Record<string, string[]>; body: string };
};

test('concurrent SSR applications keep runnable ZIPs without serializing independent builds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-ssr-packaging-'));
  try {
    await setup(root);
    const peerRoot = join(root, 'peer-app');
    await setup(peerRoot);
    const barrier = join(root, 'peer-barrier');
    await write(join(barrier, '.ready'), '');
    const pendingBuilds = Promise.allSettled([
      packageApp(root, 'first', { PEER_BUILD_BARRIER: barrier }),
      packageApp(root, 'second'),
      packageApp(peerRoot, 'peer', { PEER_BUILD_BARRIER: barrier })
    ]);
    let startupError: unknown;
    try {
      // Cold npx startup can differ by several seconds on Windows. Hold both framework processes until
      // the parent observes their ready files; the first child does not time the other's launcher.
      const deadline = Date.now() + 15_000;
      // oxlint-disable-next-line no-await-in-loop -- poll ready files from both real framework processes.
      while (!(await Bun.file(join(barrier, 'first')).exists()) || !(await Bun.file(join(barrier, 'peer')).exists())) {
        if (Date.now() > deadline) throw new Error('An independent application build was blocked before readiness');
        // oxlint-disable-next-line no-await-in-loop -- observe the two real framework processes with a deadline.
        await Bun.sleep(20);
      }
    } catch (error) {
      startupError = error;
    } finally {
      // Release and join our children even when serialization prevented the second ready signal.
      await write(join(barrier, 'release'), 'ready');
    }
    const builds = await pendingBuilds;
    if (startupError) throw startupError;
    const outputs = builds.map((result) => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
    await Promise.all(
      ['first', 'second', 'peer'].map(async (name, index) => {
        const artifactPath = outputs[index]?.[0]?.artifactPath;
        expect(artifactPath).toBeString();
        const extracted = join(root, `extracted-${name}`);
        const response = await invokeArtifact(artifactPath!, extracted);
        expect(response.cookies).toEqual(['first=one; Path=/', 'second=two; Path=/']);
        expect(response.multiValueHeaders).toBeUndefined();
        expect(response.body).toBe(`${name}|traced-framework|runtime-plugin|runtime-asset`);
        const buildRoot = name === 'peer' ? peerRoot : root;
        expect(await readFile(join(buildRoot, name, 'bucket-content/asset.txt'), 'utf8')).toBe(name);
        expect(await readdir(join(buildRoot, name, 'bucket-content'))).toEqual(['asset.txt']);
        expect(await Bun.file(join(extracted, 'node_modules/framework/unused.bin')).exists()).toBe(false);
        expect(await Bun.file(join(extracted, 'node_modules/bundled/index.js')).exists()).toBe(false);
      })
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('a failed SSR build explains the cause and a corrected retry emits a runnable artifact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-ssr-retry-'));
  try {
    await setup(root);
    await expect(packageApp(root, 'retry', { FAIL_BUILD: 'yes' })).rejects.toThrow(
      'Framework configuration is invalid'
    );
    await write(join(root, 'package.json'), '{"name":"ssr-fixture","type":"module"}');
    await expect(packageApp(root, 'retry')).rejects.toThrow('required server adapter adapter');
    await setup(root);
    const output = await packageApp(root, 'retry');
    expect(output[0]?.artifactPath).toBeString();
    const response = await invokeArtifact(output[0]!.artifactPath!, join(root, 'extracted-retry'));
    expect(response.body).toBe('retry|traced-framework|runtime-plugin|runtime-asset');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('the SSR artifact preserves server-relative client files required by Astro', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-ssr-layout-'));
  try {
    await setup(root);
    const output = await packageApp(
      root,
      'layout',
      { PRESERVE_LAYOUT: 'yes' },
      {
        serverOutputPath: 'output/server',
        staticOutputPath: 'output/client',
        preserveServerOutputDirectory: true,
        copyStaticAssetsToServerDirectory: 'client'
      }
    );
    const response = await invokeArtifact(output[0]!.artifactPath!, join(root, 'extracted-layout'));
    expect(response.body).toBe('layout|traced-framework|runtime-plugin|runtime-asset|layout');
    expect(await readdir(join(root, 'layout/bucket-content'))).toEqual(['asset.txt']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('native package resolution uses the framework-owned version instead of an unrelated app version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-native-graph-'));
  try {
    await write(join(root, 'package.json'), '{"name":"app","dependencies":{"astro":"7.0.0","sharp":"0.32.6"}}');
    await write(
      join(root, 'node_modules/astro/package.json'),
      '{"name":"astro","version":"7.0.0","dependencies":{"sharp":"0.34.5"}}'
    );
    await write(join(root, 'node_modules/sharp/package.json'), '{"name":"sharp","version":"0.32.6"}');
    const frameworkSharp = join(root, 'node_modules/astro/node_modules/sharp');
    await write(join(frameworkSharp, 'package.json'), '{"name":"sharp","version":"0.34.5"}');
    expect(
      await resolveInstalledNodePackage({
        applicationRoot: root,
        packageName: 'sharp',
        resolveFromPackage: 'astro',
        traceBasePath: root
      })
    ).toEqual({ name: 'sharp', path: await realpath(frameworkSharp), version: '0.34.5' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
