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
    const lifecycle = resolve('scripts/code-swap/lifecycle-hooks.ts');
    build.onLoad({ filter: /multi-container-workloads[\\/]cloud-map-drain\.ts$/ }, async ({ path }) => {
      let contents =
        `import { benchmarkOmitsDrain } from ${JSON.stringify(resolve('scripts/code-swap/ecs-policy.ts'))};\n` +
        (await readFile(path, 'utf8'));
      contents = replaceOnce(
        contents,
        "workload.containers.some(({ events }) => events?.some(({ type }) => type === 'http-api-gateway'));",
        "!benchmarkOmitsDrain() && workload.containers.some(({ events }) => events?.some(({ type }) => type === 'http-api-gateway'));"
      );
      contents = replaceOnce(
        contents,
        '  const servers = workload.containers.filter(',
        '  if (benchmarkOmitsDrain()) return undefined;\n  const servers = workload.containers.filter('
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /multi-container-workloads[\\/]utils\.ts$/ }, async ({ path }) => {
      let contents =
        `import { benchmarkContainerPolicy } from ${JSON.stringify(resolve('scripts/code-swap/ecs-policy.ts'))};\n` +
        (await readFile(path, 'utf8'));
      contents = replaceOnce(
        contents,
        '      LogConfiguration: isLoggingEnabled',
        '      ...benchmarkContainerPolicy(workload, container, configManager.config.resources[workload.name]?.overrides?.[cfLogicalNames.ecsService(workload.name, false)], configManager.config.resources[workload.name]?.overrides?.[cfLogicalNames.autoScalingTarget(workload.name)]),\n      LogConfiguration: isLoggingEnabled'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /cloudformation-stack-manager[\\/]index\.ts$/ }, async ({ path }) => ({
      contents:
        `import { benchmarkPrimeIdentity } from ${JSON.stringify(runtime)};\nimport { benchmarkNextVersion } from ${JSON.stringify(lifecycle)};\n` +
        replaceOnce(
          (await readFile(path, 'utf8')).replace(
            'return this.#nextVersionAfterRefetch ?? getNextVersionString(this.lastVersion);',
            'return this.#nextVersionAfterRefetch ?? benchmarkNextVersion(getNextVersionString(this.lastVersion));'
          ),
          '      this.#getDetailOfSelectedResources(this.existingStackResources),',
          '      this.#getDetailOfSelectedResources(this.existingStackResources),\n      benchmarkPrimeIdentity(),'
        ),
      loader: 'ts'
    }));
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
    build.onLoad(
      { filter: /packages[\\/]packaging[\\/]src[\\/]buildpacks[\\/]js-bundle-image\.ts$/ },
      async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        contents =
          `import { benchmarkImage, benchmarkImageName, benchmarkBuildInputs } from ${JSON.stringify(runtime)};\n` +
          contents;
        contents = replaceOnce(contents, 'imageTag: name,', 'imageTag: await benchmarkImageName(name),');
        contents = replaceOnce(
          contents,
          'additionalDigestInput: objectHash({',
          'additionalDigestInput: objectHash({ ...(await benchmarkBuildInputs()),'
        );
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
      contents = `import { benchmarkSwap, benchmarkResolveRole } from ${JSON.stringify(runtime)};\n` + contents;
      contents = replaceOnce(
        contents,
        'const updateWorkloadLogger = operationReporter.createChildLogger({',
        'if (await benchmarkSwap({ workload, ecsServiceArn, newCfTaskDefinition, blueGreen, ecsTaskDefinition, ecsService })) return {};\nawait benchmarkResolveRole(newCfTaskDefinition);\nconst updateWorkloadLogger = operationReporter.createChildLogger({'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /commands[\\/]deploy[\\/]index\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkComplete, benchmarkBootstrapBucket } from ${JSON.stringify(runtime)};\n` + contents;
      contents = `import { benchmarkOperation } from ${JSON.stringify(lifecycle)};\n` + contents;
      contents = replaceOnce(
        contents,
        '  config.validateGuardrails({ hasConfig: true });',
        "  await benchmarkOperation('deploy');\n  config.validateGuardrails({ hasConfig: true });"
      );
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
    build.onLoad({ filter: /commands[\\/](?:rollback|delete)[\\/]index\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      const operation = /rollback[\\/]/.test(path) ? 'rollback' : 'delete';
      contents = `import { benchmarkOperation } from ${JSON.stringify(lifecycle)};\n` + contents;
      if (operation === 'rollback') {
        contents = `import { benchmarkRollbackComplete } from ${JSON.stringify(runtime)};\n` + contents;
        contents = replaceOnce(
          contents,
          '  // Restore bucket-synced content if versioning manifests are available',
          '  await benchmarkRollbackComplete(newVersion, targetVersion, Boolean(template.Resources.StacktapeCodeSwapTable));\n  // Restore bucket-synced content if versioning manifests are available'
        );
      }
      const marker =
        operation === 'rollback' ? '  await configManager.loadGlobalConfig();' : '  await config.loadGlobalConfig();';
      contents = replaceOnce(contents, marker, `  await benchmarkOperation('${operation}');\n${marker}`);
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /template-manager[\\/]finalize\.ts$/ }, async ({ path }) => ({
      contents:
        `import { benchmarkTemplate } from ${JSON.stringify(lifecycle)};\n` +
        replaceOnce(
          await readFile(path, 'utf8'),
          '  stampLambdaVersionPublishers(templateManager.template);',
          '  await benchmarkTemplate(templateManager.template);\n  stampLambdaVersionPublishers(templateManager.template);'
        ),
      loader: 'ts'
    }));
    build.onLoad({ filter: /aws[\\/]cloudformation-stacks\.ts$/ }, async ({ path }) => {
      let contents =
        `import { benchmarkTeardownAccepted } from ${JSON.stringify(lifecycle)};\n` + (await readFile(path, 'utf8'));
      contents = replaceOnce(
        contents,
        '.then((result) => ({ ...result, skipped: false as const }))',
        '.then((result) => benchmarkTeardownAccepted({ ...result, skipped: false as const }, stackParams.StackName))'
      );
      contents = replaceOnce(
        contents,
        '.send(new DeleteStackCommand({ StackName: stackName, RoleARN: roleArn }))',
        '.send(new DeleteStackCommand({ StackName: stackName, RoleARN: roleArn })).then((result) => benchmarkTeardownAccepted(result, stackName))'
      );
      return { contents, loader: 'ts' };
    });
    build.onLoad({ filter: /deployment-artifact-manager[\\/]index\.ts$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      contents = `import { benchmarkReleaseIdentity } from ${JSON.stringify(runtime)};\n` + contents;
      contents = `import { benchmarkRollbackTemplate } from ${JSON.stringify(lifecycle)};\n` + contents;
      contents = replaceOnce(
        contents,
        '    const template = await this.getTemplate({ version: sourceVersion });',
        '    const template = await this.getTemplate({ version: sourceVersion });\n    benchmarkRollbackTemplate(template);'
      );
      contents = replaceOnce(
        contents,
        '      if (s3Key.startsWith(SOURCE_MAP_KEY_PREFIX)) {',
        "      if (s3Key.startsWith('code-swap/')) { this.previousObjects.push({ s3Key, name: 'code-swap', version: 'v999999', digest: null, type: 'user-lambda' }); return; }\n      if (s3Key.startsWith(SOURCE_MAP_KEY_PREFIX)) {"
      );
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
