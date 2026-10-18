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
    build.onLoad({ filter: /packages\/packaging\/src\/buildpacks\/js-bundle-image\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkImage } from ${JSON.stringify(runtime)};\n` + contents;
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
    });
    build.onLoad({ filter: /commands\/_utils\/cw-deployment\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkSwap } from ${JSON.stringify(runtime)};\n` + contents;
      contents = replaceOnce(
        contents,
        'const updateWorkloadLogger = operationReporter.createChildLogger({',
        'if (await benchmarkSwap({ workload, ecsServiceArn, newCfTaskDefinition, blueGreen, ecsTaskDefinition, ecsService })) return {};\nconst updateWorkloadLogger = operationReporter.createChildLogger({'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /commands\/deploy\/index\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkComplete } from ${JSON.stringify(runtime)};\n` + contents;
      contents = replaceOnce(
        contents,
        'await notification.waitForQueuedEvents();',
        'await notification.waitForQueuedEvents();\nawait benchmarkComplete();'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /deployment-artifact-manager\/index\.ts$/ }, async ({ path }) => {
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
const main = async () => {
  const output = resolve(process.argv[2] ?? '.stacktape/code-swap-cli');
  await mkdir(output, { recursive: true });
  const result = await Bun.build({
    entrypoints: ['scripts/code-swap/entrypoint.ts'],
    outdir: output,
    target: 'bun',
    minify: false,
    plugins: [benchmarkBuildPlugin(), createStacktapeOpenTuiBuildPlugin()],
    external: ['follow-redirects', '@opentui/core-*', 'web-tree-sitter', 'web-tree-sitter/*'],
    tsconfig: 'tsconfig.json',
    define: { STACKTAPE_VERSION: JSON.stringify(packageJson.version) }
  });
  if (!result.success) throw new Error(result.logs.map(({ message }) => message).join('\n'));
  console.log(result.outputs[0]!.path);
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
