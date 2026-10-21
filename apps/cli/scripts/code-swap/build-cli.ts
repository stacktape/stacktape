import type { BunPlugin } from 'bun';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createStacktapeOpenTuiBuildPlugin } from '../support/opentui-loader';
import packageJson from '../../package.json';

const replaceOnce = (source: string, before: string, after: string) => {
  if (source.split(before).length !== 2) throw new Error(`Benchmark hook no longer matches: ${before}`);
  return source.replace(before, after);
};
// Benchmark builds add timing transport only. Customer activation lives in ordinary CLI source.
export const benchmarkBuildPlugin = (): BunPlugin => ({
  name: 'owned-code-swap-benchmark',
  setup(build) {
    const tracing = resolve('scripts/code-swap/trace.ts');
    build.onLoad({ filter: /tui-manager[\\/]output[\\/]jsonl\.ts$/ }, async ({ path }) => ({
      contents:
        `import { trace } from ${JSON.stringify(tracing)};\n` +
        replaceOnce(
          await readFile(path, 'utf8'),
          'JSON.stringify(event);',
          "(trace('event', { eventType: 'eventType' in event ? String(event.eventType) : event.type, status: 'status' in event ? String(event.status) : undefined }), JSON.stringify(event));"
        ),
      loader: 'ts'
    }));
    build.onLoad({ filter: /aws[\\/]identity\.ts$/ }, async ({ path }) => ({
      contents: replaceOnce(
        await readFile(path, 'utf8'),
        '`Unable to get identity for credentials (access key id: ${credentials.accessKeyId}).`',
        "'Unable to get identity for configured credentials.'"
      ),
      loader: 'ts'
    }));
    build.onLoad({ filter: /aws[\\/]fetch-handler\.ts$/ }, async () => ({
      contents: `export { createMeasuredHandler as createFetchHandler } from ${JSON.stringify(resolve('scripts/code-swap/transport.ts'))};`,
      loader: 'ts'
    }));
    build.onLoad({ filter: /aws[\\/]ecs-deployment-monitoring\.ts$/ }, async ({ path }) => ({
      contents: replaceOnce(
        await readFile(path, 'utf8'),
        '({ createdAt }) => new Date(createdAt) > new Date(this.#targetDeploymentOrTaskSet.createdAt)',
        '({ createdAt, taskDefinitionArn }) => taskDefinitionArn === this.#targetDeploymentOrTaskSet.taskDefinition && new Date(createdAt) > new Date(this.#targetDeploymentOrTaskSet.createdAt)'
      ),
      loader: 'ts'
    }));
    build.onLoad({ filter: /stacktape-api[\\/]client\.ts$/ }, async ({ path }) => ({
      contents:
        `import { measuredConsoleFetch } from ${JSON.stringify(resolve('scripts/code-swap/transport.ts'))};\n` +
        replaceOnce(await readFile(path, 'utf8'), 'return await fetch(url,', 'return await measuredConsoleFetch(url,'),
      loader: 'ts'
    }));
  }
});
export const buildBenchmarkCli = async (outputDirectory: string) => {
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const result = await Bun.build({
    entrypoints: ['scripts/code-swap/entrypoint.ts'],
    outdir: output,
    target: 'bun',
    minify: true,
    splitting: true,
    plugins: [benchmarkBuildPlugin(), createStacktapeOpenTuiBuildPlugin()],
    external: ['follow-redirects', '@opentui/core-*', 'web-tree-sitter', 'web-tree-sitter/*'],
    tsconfig: 'tsconfig.json',
    define: { STACKTAPE_VERSION: JSON.stringify(packageJson.version) }
  });
  if (!result.success) throw new Error(result.logs.map(({ message }) => message).join('\n'));
  return result.outputs;
};
if (import.meta.main)
  buildBenchmarkCli(process.argv[2] ?? '.stacktape/code-swap-cli')
    .then(() => console.log(resolve(process.argv[2] ?? '.stacktape/code-swap-cli', 'entrypoint.js')))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
