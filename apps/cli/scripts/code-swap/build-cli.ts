import type { BunPlugin } from 'bun';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createStacktapeOpenTuiBuildPlugin } from '../support/opentui-loader';
import packageJson from '../../package.json';

const replaceOnce = (source: string, before: string, after: string) => {
  if (source.split(before).length !== 2) throw new Error(`Benchmark hook no longer matches: ${before}`);
  return source.replace(before, after);
};
// Only this explicit build connects prototype code. Release/dev builds never install this plugin.
export const benchmarkBuildPlugin = (): BunPlugin => ({
  name: 'owned-code-swap-benchmark',
  setup(build) {
    const runtime = resolve('scripts/code-swap/runtime.ts');
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
    build.onLoad({ filter: /aws[\\/]fetch-handler\.ts$/ }, async () => ({
      contents: `export { createMeasuredHandler as createFetchHandler } from ${JSON.stringify(resolve('scripts/code-swap/transport.ts'))};`,
      loader: 'ts'
    }));
    build.onLoad({ filter: /stacktape-api[\\/]client\.ts$/ }, async ({ path }) => ({
      contents:
        `import { measuredConsoleFetch } from ${JSON.stringify(resolve('scripts/code-swap/transport.ts'))};\n` +
        replaceOnce(await readFile(path, 'utf8'), 'return await fetch(url,', 'return await measuredConsoleFetch(url,'),
      loader: 'ts'
    }));
    build.onLoad(
      { filter: /packages[\\/]packaging[\\/]src[\\/]buildpacks[\\/]js-bundle-image\.ts$/ },
      async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        contents = `import { benchmarkImage, benchmarkImageName } from ${JSON.stringify(runtime)};\n` + contents;
        contents = replaceOnce(contents, 'imageTag: name,', 'imageTag: await benchmarkImageName(name),');
        contents = replaceOnce(
          contents,
          'outcome,\n    imageName: name,',
          'outcome,\n    imageName: await benchmarkImageName(name),'
        );
        contents = replaceOnce(
          contents,
          'const dockerfileContents = await createEsDockerFile(',
          'let dockerfileContents = await createEsDockerFile('
        );
        contents = replaceOnce(
          contents,
          "await progressLogger.finishEvent({ eventType: 'CREATE_DOCKERFILE' });",
          "dockerfileContents = await benchmarkImage({ dockerfileContents, buildContextPath, runtime, nodeVersion, nodeTarget, minify, dockerBuildOutputArchitecture, languageSpecificBundleOutput });\nawait progressLogger.finishEvent({ eventType: 'CREATE_DOCKERFILE' });"
        );
        return { contents, loader: 'ts' };
      }
    );
    build.onLoad({ filter: /commands[\\/]_utils[\\/]cw-deployment\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkSwap } from ${JSON.stringify(runtime)};\n` + contents;
      contents = replaceOnce(
        contents,
        'const updateWorkloadLogger = operationReporter.createChildLogger({',
        'if (await benchmarkSwap({ workload, ecsServiceArn, newCfTaskDefinition, blueGreen, ecsTaskDefinition, ecsService })) return {};\nconst updateWorkloadLogger = operationReporter.createChildLogger({'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /commands[\\/]deploy[\\/]index\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkComplete, benchmarkBootstrapBucket } from ${JSON.stringify(runtime)};\n` + contents;
      contents = replaceOnce(
        contents,
        'await stack.createResourcesForArtifacts();',
        'await stack.createResourcesForArtifacts();\nawait benchmarkBootstrapBucket();'
      );
      contents = replaceOnce(
        contents,
        'await notification.waitForQueuedEvents();',
        'await notification.waitForQueuedEvents();\nawait benchmarkComplete();'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /deployment-artifact-manager[\\/]index\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkReleaseIdentity } from ${JSON.stringify(runtime)};\n` + contents;
      contents = replaceOnce(
        contents,
        'JSON.stringify({ version, invocationId: globalStateManager.invocationId })',
        'JSON.stringify({ version, invocationId: globalStateManager.invocationId, codeSwapBenchmark: benchmarkReleaseIdentity() })'
      );
      return { contents, loader: 'ts' };
    });
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
