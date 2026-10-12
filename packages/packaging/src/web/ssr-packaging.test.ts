import { expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archiveItem, createPackagingError, progressLogger, run, write } from '../../scripts/e2e-helpers';
import { createSsrWebArtifacts } from './ssr-web-shared';
import type { ExecuteProcess } from '../runtime-contracts';

const executeProcess: ExecuteProcess = async (command, args, options) =>
  run(command, args, options.cwd, {
    PATH: process.env.PATH,
    ...Object.fromEntries(Object.entries(options.env ?? {}).map(([key, value]) => [key, String(value)])),
    npm_config_offline: 'true'
  });

// A small build executable stands at the framework boundary. Everything after it is production packaging:
// coordination, output selection, tracing, wrapper creation, digesting and ZIP creation.
const setup = async (root: string) => {
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
    `import { open, mkdir, rm, writeFile } from 'node:fs/promises';
const lock = await open('building.lock', 'wx').catch(() => { throw new Error('Overlapping builds corrupted framework output'); });
try {
  if (process.env.FAIL_BUILD === 'yes') throw new Error('Framework configuration is invalid');
  await rm('output', { recursive: true, force: true });
  await mkdir('output/public/server', { recursive: true });
  await writeFile('output/public/asset.txt', process.env.MARKER);
  await writeFile('output/public/server/entry.mjs', \`
    import framework from 'framework';
    import { readFile } from 'node:fs/promises';
    export default async (req, res) => {
      const pluginName = req.headers['x-plugin'];
      const plugin = (await import(pluginName)).default;
      const asset = await readFile(new URL('./node_modules/plugin/runtime.txt', import.meta.url), 'utf8');
      res.setHeader('content-type', 'text/plain');
      res.setHeader('set-cookie', ['first=one; Path=/', 'second=two; Path=/']);
      res.end("\${process.env.MARKER}" + '|' + framework + '|' + plugin + '|' + asset);
    };
  \`);
  await new Promise(resolve => setTimeout(resolve, 100));
} finally { await lock.close(); await rm('building.lock'); }
`
  );
};

const packageApp = (root: string, name: string, buildEnv: Record<string, string> = {}) =>
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
      buildCommand: 'node build.mjs',
      buildEnv: { MARKER: name, ...buildEnv },
      serverOutputPath: 'output/public/server',
      staticOutputPath: 'output/public',
      handlerFileName: 'entry.mjs',
      requiredAdapterPackages: ['adapter'],
      bundledApplicationPackages: ['bundled'],
      adapterConfigurationHint: 'Use the Node server adapter.',
      staticAssetPrefix: '',
      wrapperType: 'node-http'
    },
    environmentVars: [],
    archiveItem,
    createPackagingError,
    executeProcess
  });

test('concurrent SSR resources keep their own runnable ZIPs and publish only public assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-ssr-packaging-'));
  try {
    await setup(root);
    const builds = await Promise.allSettled([packageApp(root, 'first'), packageApp(root, 'second')]);
    const outputs = builds.map((result) => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
    await Promise.all(
      ['first', 'second'].map(async (name, index) => {
        const artifactPath = outputs[index]?.[0]?.artifactPath;
        expect(artifactPath).toBeString();
        const extracted = join(root, `extracted-${name}`);
        await run('unzip', ['-q', artifactPath!, '-d', extracted]);
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
        const response = JSON.parse(stdout);
        expect(response.cookies).toEqual(['first=one; Path=/', 'second=two; Path=/']);
        expect(response.multiValueHeaders).toBeUndefined();
        expect(response.body).toBe(`${name}|traced-framework|runtime-plugin|runtime-asset`);
        expect(await readFile(join(root, name, 'bucket-content/asset.txt'), 'utf8')).toBe(name);
        expect(await readdir(join(root, name, 'bucket-content'))).toEqual(['asset.txt']);
        expect(await Bun.file(join(extracted, 'node_modules/framework/unused.bin')).exists()).toBe(false);
        expect(await Bun.file(join(extracted, 'node_modules/bundled/index.js')).exists()).toBe(false);
      })
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('a failed SSR build explains the cause and a corrected retry emits an artifact', async () => {
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
