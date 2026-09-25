/**
 * One offline packaging run, in the fresh process `packaging-harness.ts` starts for every sample.
 *
 * It calls the packaging package's entrypoints in the order `PackagingManager` does for Node Lambdas and passes them
 * the CLI's real callbacks: the production archiver, `createCliPackagingError`, the grouping policy, the digest inputs,
 * the split function digest and the artifact names. Keep the two sequences equal when either changes: this file
 * mirrors `#packageNodeLambdasWithSplitBundling` and the ES branch of `packageWorkload`, because both read
 * invocation-global CLI state that an offline process does not have.
 *
 * Nothing here may reach the network. Dependency installation verifies the vendored tree and refuses to install;
 * Docker callbacks refuse unless the harness asked for the opt-in container shape; the process is started with the
 * test network guard, which also replaces AWS credentials. What is excluded from the measurement is listed in the
 * harness report, not repeated here.
 */
import type { ArchiveItem, PackagingProgressLogger } from '@stacktape/packaging/runtime-contracts';
import type { SplitBundleTimings } from '@stacktape/packaging/split-bundler/types';
import { readFileSync, realpathSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { join } from 'node:path';
import { buildLayerS3Key } from '@domain-services/deployment-artifact-manager/artifact-names';
import { getStableBuildpackDigestProps } from '@domain-services/packaging-manager/artifact-digest-inputs';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { selectSplitBundlingGroup } from '@domain-services/packaging-manager/split-bundling-policy';
import {
  getLambdaCombinedUnzippedSizeBytes,
  LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES,
  LAMBDA_MAX_LAYERS
} from '@stacktape/packaging/artifact/lambda-limits';
import { buildUsingStacktapeEsImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-es-image-buildpack';
import { buildUsingStacktapeEsLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-es-lambda-buildpack';
import { STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION } from '@stacktape/packaging/bundlers/constants';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';
import { findProjectRoot } from '@stacktape/packaging/es/project-root';
import { getFileSizeBytes, getFolderSizeBytes } from '@stacktape/packaging/fs/files';
import { buildSplitBundle } from '@stacktape/packaging/split-bundler/bundler';
import { assignChunksToLayers, DEFAULT_LAYER_CONFIG } from '@stacktape/packaging/split-bundler/layer-assignment';
import { createLayerArtifacts } from '@stacktape/packaging/split-bundler/layer-builder';
import { getSplitFunctionDigest } from '@stacktape/packaging/split-bundler/function-digest';
import { LAMBDA_ARCHIVE_FORMAT } from '@stacktape/packaging/artifact/archive-entries';
import { getJobName } from '@stacktape/naming/workload-names';
import type { ArchiveResult } from '@utils/zip';
import { createArchive } from '@utils/zip';
import objectHash from 'object-hash';
import { rename } from 'fs-extra';
import yauzl from 'yauzl';
import { fsPaths } from 'src/config/runtime-paths';

export type RunRequest = {
  mode: 'lambda' | 'container';
  /** Also the process working directory, as for a CLI started in the project. */
  fixtureRoot: string;
  invocationId: string;
  functions: { name: string; entryfilePath: string }[];
  containerEntryfilePath: string;
  /** Unique tag for the container shape's image; the harness removes it afterwards. */
  imageTag: string;
  /** Also zip every layer, as `publishSharedLayer` does at upload time when the bucket holds none of them. */
  zipLayers: boolean;
  resultPath: string;
};

type ArchiveCall = { source: string; ms: number } & Pick<ArchiveResult, 'backend' | 'nativeFailure'>;

export type FunctionArtifact = {
  name: string;
  path: 'split' | 'per-function';
  digest: string;
  unzippedBytes: number;
  zipBytes: number;
  zipEntries: number;
  /** Unix permission bits stored in the ZIP, counted per value, e.g. `{ "644": 5, "755": 2 }`. */
  zipModes: Record<string, number>;
  layers: number[];
  /** Function package plus every attached layer, unzipped: what Lambda counts against its 250 MiB limit. */
  combinedUnzippedBytes: number;
};

export type LayerArtifact = {
  layerNumber: number;
  contentHash: string;
  s3Key: string;
  chunks: number;
  usedBy: number;
  unzippedBytes: number;
  zipBytes: number | null;
  zipModes: Record<string, number> | null;
};

export type RunResult = {
  ok: boolean;
  error?: { message: string; stack?: string | undefined };
  /** Process start until this module and its imports had loaded. */
  readyMs: number;
  /** Packaging all functions: the split build and per-function builds, concurrently as the CLI runs them. */
  packagingMs: number;
  /** Zipping every layer, as an upload does when the bucket holds none of them; not `package`. Null without layers. */
  layerZipMs: number | null;
  split: null | {
    functions: number;
    bundle: SplitBundleTimings;
    layerAssignmentMs: number;
    /** Copying and rewriting layered chunks, hashing layers and rewriting function imports. */
    layerArtifactsMs: number;
    /** Hashing, sizing and zipping every function, in parallel as the CLI does. */
    finalizeMs: number;
    hashMs: { total: number; max: number };
    zipMs: { total: number; max: number };
  };
  perFunction: null | { functions: number; ms: number; zipMs: { total: number; max: number } };
  container: null | { ms: number; digest: string; imageBytes: number };
  archiveFormat: string;
  archiveCalls: number;
  /** Archives written, per backend that actually wrote them. */
  archiveBackends: Record<string, number>;
  /** Native attempts that failed or produced the wrong entries and were replaced by the fallback archiver. */
  nativeFailures: { tool: string; message: string }[];
  resolvedModules: string[];
  functions: FunctionArtifact[];
  layers: LayerArtifact[];
};

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

const refuse = (action: string) => async (): Promise<never> => {
  throw new Error(`The offline packaging harness does not ${action}. Use --docker for the opt-in container shape.`);
};

/** Stands in for the CLI's dependency installer: it proves the vendored tree is complete and never installs. */
const verifyInstalledDependencies = (fixtureRoot: string) => async () => {
  const { dependencies = {} } = JSON.parse(await readFile(join(fixtureRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  for (const [name, version] of Object.entries(dependencies)) {
    const installed = await readFile(join(fixtureRoot, 'node_modules', name, 'package.json'), 'utf8')
      .then((manifest) => (JSON.parse(manifest) as { version?: string }).version)
      .catch(() => undefined);
    if (installed !== version) {
      throw new Error(
        `${name}@${version} would have to be installed (found ${installed ?? 'nothing'}). The offline harness never runs a package manager.`
      );
    }
  }
};

const inspectZip = (zipPath: string): Promise<{ entries: number; modes: Record<string, number> }> =>
  new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error(`Could not open ${zipPath}.`));
        return;
      }
      const modes: Record<string, number> = {};
      let entries = 0;
      zipFile.on('error', reject);
      zipFile.on('entry', (entry: { fileName: string; externalFileAttributes: number }) => {
        if (!entry.fileName.endsWith('/')) {
          entries += 1;
          // Unix permissions live in the high 16 bits of the external attributes.
          const mode = ((entry.externalFileAttributes >>> 16) & 0o7777).toString(8);
          modes[mode] = (modes[mode] ?? 0) + 1;
        }
        zipFile.readEntry();
      });
      zipFile.on('end', () => resolve({ entries, modes }));
      zipFile.readEntry();
    });
  });

const sumAndMax = (values: number[]) => ({
  total: values.reduce((sum, value) => sum + value, 0),
  max: Math.max(0, ...values)
});

const assertHermeticModules = (resolvedModules: string[], fixtureRoot: string) => {
  const { dependencies = {} } = JSON.parse(readFileSync(join(fixtureRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  // The Lambda runtime provides these families; the build leaves them out without resolving them anywhere.
  const outside = resolvedModules.filter(
    (name) =>
      !(name in dependencies) &&
      !isBuiltin(name) &&
      !name.startsWith('@aws-sdk/client-') &&
      !name.startsWith('@aws-sdk/lib-')
  );
  if (outside.length > 0) {
    throw new Error(
      `The fixture resolved packages it does not vendor: ${outside.join(', ')}. The run is not hermetic.`
    );
  }
};

const run = async (request: RunRequest, readyMs: number): Promise<RunResult> => {
  const { fixtureRoot, invocationId } = request;
  if (realpathSync(process.cwd()) !== realpathSync(fixtureRoot)) {
    throw new Error('The runner must start in the fixture root, as the CLI starts in the project.');
  }
  if ((await findProjectRoot(fixtureRoot)) !== fixtureRoot) {
    throw new Error(
      `Project-root discovery escapes ${fixtureRoot}; the fixture would not be packaged as a standalone project.`
    );
  }
  // Native-tool detection is left to the first archive, inside the timed packaging, as in the CLI; the backend each
  // archive actually used is recorded instead of asking the archiver ahead of time.
  const installDependencies = verifyInstalledDependencies(fixtureRoot);
  const archiveCalls: ArchiveCall[] = [];
  const timedArchiveItem: ArchiveItem = async (input) => {
    const startedAt = performance.now();
    const { path, backend, nativeFailure } = await createArchive(input);
    archiveCalls.push({ source: input.absoluteSourcePath, ms: performance.now() - startedAt, backend, nativeFailure });
    return path;
  };
  const describeArchiveCalls = () => ({
    archiveFormat: LAMBDA_ARCHIVE_FORMAT,
    archiveCalls: archiveCalls.length,
    archiveBackends: archiveCalls.reduce<Record<string, number>>(
      (counts, { backend }) => ({ ...counts, [backend]: (counts[backend] ?? 0) + 1 }),
      {}
    ),
    nativeFailures: archiveCalls.flatMap(({ nativeFailure }) => (nativeFailure ? [nativeFailure] : []))
  });
  const artifactFolder = (jobName: string) => fsPaths.absoluteLambdaArtifactFolderPath({ jobName, invocationId });

  if (request.mode === 'container') {
    const docker = await import('@utils/docker');
    const packagingProperties = { entryfilePath: request.containerEntryfilePath };
    const nodeVersion = resolveNodeVersion({ nodeVersion: undefined, runtime: undefined, target: 'container' });
    const buildpackProps = {
      ...packagingProperties,
      minify: true,
      nodeTarget: String(nodeVersion),
      entryfilePath: join(fixtureRoot, packagingProperties.entryfilePath),
      ...(nodeVersion >= 24 && { outputModuleFormat: 'esm' as const })
    };
    const startedAt = performance.now();
    const output = await buildUsingStacktapeEsImageBuildpack({
      ...buildpackProps,
      name: request.imageTag,
      existingDigests: [],
      cwd: fixtureRoot,
      progressLogger,
      invocationId,
      dockerBuildOutputArchitecture: 'linux/amd64',
      buildDockerImage: docker.buildDockerImage,
      checkDockerImageExists: docker.checkDockerImageExists,
      createPackagingError: createCliPackagingError,
      getDockerImageDetails: docker.getDockerImageDetails,
      installDependencies,
      nativeDependencyInstallationRootPath: join(fsPaths.absoluteBuildFolderPath({ invocationId }), '_bin-install'),
      runDocker: docker.execDocker,
      requiresGlibcBinaries: false,
      debug: false,
      distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
        jobName: getJobName({ workloadName: 'api', workloadType: 'web-service' }),
        invocationId
      }),
      additionalDigestInput: objectHash({
        buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
        props: getStableBuildpackDigestProps({ props: buildpackProps, configured: packagingProperties })
      }),
      devMode: false
    });
    const ms = performance.now() - startedAt;
    const { stdout } = await docker.execDocker(['image', 'inspect', '--format', '{{.Size}}', request.imageTag]);
    return {
      ok: true,
      readyMs,
      packagingMs: ms,
      layerZipMs: null,
      split: null,
      perFunction: null,
      container: { ms, digest: output.digest, imageBytes: Number(stdout.trim()) },
      ...describeArchiveCalls(),
      resolvedModules: [],
      functions: [],
      layers: []
    };
  }

  const candidates = request.functions.map(({ name, entryfilePath }) => ({
    name,
    packaging: { type: 'stacktape-lambda-buildpack' as const, properties: { entryfilePath } },
    tracingEnabled: false
  }));
  const { split: splitCandidates, perFunction: perFunctionCandidates } = selectSplitBundlingGroup(candidates);

  // PackagingManager#packageNodeLambdasWithSplitBundling, with default packaging properties and no user layers.
  const packageSplitGroup = async () => {
    if (splitCandidates.length === 0) return null;
    const nodeVersion = resolveNodeVersion({ nodeVersion: undefined, runtime: undefined, target: 'lambda' });
    const entrypoints = splitCandidates.map(({ name, packaging }) => {
      const jobName = getJobName({ workloadName: name, workloadType: 'function' });
      return {
        name,
        jobName,
        entryfilePath: join(fixtureRoot, packaging.properties.entryfilePath),
        distFolderPath: artifactFolder(jobName)
      };
    });
    const splitResult = await buildSplitBundle({
      entrypoints,
      sharedOutdir: fsPaths.absoluteSplitBundleOutdir({ invocationId }),
      cwd: fixtureRoot,
      tsConfigPath: join(fixtureRoot, 'tsconfig.json'),
      minify: true,
      minifyIdentifiers: false,
      bundleAwsSdk: false,
      sourceMaps: 'external',
      sourceMapBannerType: 'pre-compiled',
      excludeDependencies: [],
      dependenciesToExcludeFromBundle: [],
      isLambda: true,
      nodeTarget: nodeVersion,
      installDependencies,
      createPackagingError: ({ message, hint, cause }) =>
        createCliPackagingError({ type: 'PACKAGING', message, hint, cause })
    });
    const nativeDependencies = [...splitResult.lambdaOutputs.values()].flatMap(
      (output) => output.dependenciesToInstallInDocker
    );
    if (nativeDependencies.length > 0) {
      await refuse(`build native dependency layers (${nativeDependencies.map(({ name }) => name).join(', ')})`)();
    }

    const assignmentStartedAt = performance.now();
    // The fixture attaches no layers of its own and has no native layer, so nothing else claims a layer slot.
    const userLayersOnOneLambda = 0;
    const chunkLayerBudget = Math.max(
      1,
      Math.min(DEFAULT_LAYER_CONFIG.maxLayers, LAMBDA_MAX_LAYERS - userLayersOnOneLambda)
    );
    const layerAssignment = assignChunksToLayers(splitResult.chunkAnalysis, {
      ...DEFAULT_LAYER_CONFIG,
      maxLayers: chunkLayerBudget
    });
    const layerArtifactsStartedAt = performance.now();
    const layerArtifacts =
      layerAssignment.layeredChunks.length > 0
        ? (
            await createLayerArtifacts({
              lambdaOutputs: splitResult.lambdaOutputs,
              layerAssignment,
              layerBasePath: `${fsPaths.absoluteBuildFolderPath({ invocationId })}/layers`
            })
          ).layerArtifacts.map((layer) => ({
            ...layer,
            s3Key: buildLayerS3Key(layer.layerNumber, layer.contentHash, '')
          }))
        : [];
    const layerArtifactsFinishedAt = performance.now();

    const lambdaLayerMap = new Map<string, Set<number>>();
    for (const layeredChunk of layerAssignment.layeredChunks) {
      const analysis = splitResult.chunkAnalysis.find(({ chunkName }) => chunkName === layeredChunk.chunkName);
      for (const lambdaName of analysis?.usedByLambdas ?? []) {
        lambdaLayerMap.set(lambdaName, (lambdaLayerMap.get(lambdaName) ?? new Set()).add(layeredChunk.layerNumber));
      }
    }

    const hashMs: number[] = [];
    const zipMs: number[] = [];
    const finalizeStartedAt = performance.now();
    // `package` never reuses a previous digest (`commandCanUseCache: false`), so every function is zipped.
    const functions = await Promise.all(
      entrypoints.map(async ({ name, jobName, distFolderPath }) => {
        const layerNumbers = lambdaLayerMap.get(name);
        const hashStartedAt = performance.now();
        const digest = await getSplitFunctionDigest({
          distFolderPath,
          chunkLayers: Array.from(layerNumbers ?? []).map((layerNumber) => ({
            layerNumber,
            contentHash: layerArtifacts.find((layer) => layer.layerNumber === layerNumber)?.contentHash
          })),
          nativeLayer: null
        });
        hashMs.push(performance.now() - hashStartedAt);
        const functionSizeBytes = await getFolderSizeBytes(distFolderPath);
        const combinedUnzippedBytes = getLambdaCombinedUnzippedSizeBytes({
          functionSizeBytes,
          layerSizeBytes: Array.from(layerNumbers ?? []).map(
            (layerNumber) => layerArtifacts.find((layer) => layer.layerNumber === layerNumber)!.sizeBytes
          )
        });
        if (combinedUnzippedBytes > LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES) {
          throw new Error(`Function ${name} exceeds the combined unzipped size limit.`);
        }
        const zipStartedAt = performance.now();
        await timedArchiveItem({ absoluteSourcePath: distFolderPath, format: 'zip', useNativeZip: true });
        zipMs.push(performance.now() - zipStartedAt);
        const artifactPath = `${distFolderPath}-${digest}.zip`;
        await rename(`${distFolderPath}.zip`, artifactPath);
        return {
          name,
          jobName,
          digest,
          artifactPath,
          functionSizeBytes,
          combinedUnzippedBytes,
          layers: Array.from(layerNumbers ?? []).toSorted((left, right) => left - right)
        };
      })
    );
    const finalizeFinishedAt = performance.now();
    return {
      functions,
      layerArtifacts,
      resolvedModules: [...splitResult.lambdaOutputs.values()].flatMap((output) => output.resolvedModules),
      timings: {
        functions: entrypoints.length,
        bundle: splitResult.timings,
        layerAssignmentMs: layerArtifactsStartedAt - assignmentStartedAt,
        layerArtifactsMs: layerArtifactsFinishedAt - layerArtifactsStartedAt,
        finalizeMs: finalizeFinishedAt - finalizeStartedAt,
        hashMs: sumAndMax(hashMs),
        zipMs: sumAndMax(zipMs)
      }
    };
  };

  // The ES branch of PackagingManager#packageWorkload for a default `stacktape-lambda-buildpack` function. ESM output
  // needs no source-map-support banner file, so `sourceMapInstallPath` is not passed.
  const packagePerFunction = async ({ name, packaging }: (typeof perFunctionCandidates)[number]) => {
    const jobName = getJobName({ workloadName: name, workloadType: 'function' });
    const nodeVersion = resolveNodeVersion({ nodeVersion: undefined, runtime: undefined, target: 'lambda' });
    const buildpackProps = {
      ...packaging.properties,
      minify: true,
      nodeTarget: String(nodeVersion),
      entryfilePath: join(fixtureRoot, packaging.properties.entryfilePath),
      ...(nodeVersion >= 24 && { outputModuleFormat: 'esm' as const })
    };
    const output = await buildUsingStacktapeEsLambdaBuildpack({
      ...buildpackProps,
      name: jobName,
      existingDigests: [],
      cwd: fixtureRoot,
      progressLogger,
      invocationId,
      dockerBuildOutputArchitecture: 'linux/amd64',
      archiveItem: timedArchiveItem,
      createPackagingError: createCliPackagingError,
      installDependencies,
      nativeDependencyInstallationRootPath: join(fsPaths.absoluteBuildFolderPath({ invocationId }), '_bin-install'),
      runDocker: refuse('run Docker'),
      sizeLimit: 250,
      debug: false,
      distFolderPath: artifactFolder(jobName),
      additionalDigestInput: objectHash({
        buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
        props: getStableBuildpackDigestProps({ props: buildpackProps, configured: packaging.properties })
      })
    });
    const functionSizeBytes = await getFolderSizeBytes(artifactFolder(jobName));
    return {
      name,
      jobName,
      digest: output.digest,
      artifactPath: output.artifactPath!,
      functionSizeBytes,
      combinedUnzippedBytes: functionSizeBytes,
      layers: [] as number[],
      resolvedModules: output.resolvedModules ?? [],
      zipMs: archiveCalls.filter(({ source }) => source === artifactFolder(jobName)).map(({ ms }) => ms)
    };
  };

  const packagingStartedAt = performance.now();
  let perFunctionFinishedAt = packagingStartedAt;
  const [splitGroup, perFunctionResults] = await Promise.all([
    packageSplitGroup(),
    Promise.all(perFunctionCandidates.map(packagePerFunction)).then((results) => {
      perFunctionFinishedAt = performance.now();
      return results;
    })
  ]);
  const packagingMs = performance.now() - packagingStartedAt;

  const resolvedModules = [
    ...new Set([
      ...(splitGroup?.resolvedModules ?? []),
      ...perFunctionResults.flatMap((result) => result.resolvedModules)
    ])
  ].toSorted();
  assertHermeticModules(resolvedModules, fixtureRoot);

  let layerZipMs: number | null = null;
  const layerZips = new Map<number, string>();
  if (request.zipLayers && splitGroup && splitGroup.layerArtifacts.length > 0) {
    const startedAt = performance.now();
    await Promise.all(
      splitGroup.layerArtifacts.map(async (layer) =>
        layerZips.set(
          layer.layerNumber,
          await timedArchiveItem({ absoluteSourcePath: layer.layerPath, format: 'zip', useNativeZip: true })
        )
      )
    );
    layerZipMs = performance.now() - startedAt;
  }

  // Inventory, outside every timed region.
  const functions: FunctionArtifact[] = [];
  for (const [path, results] of [
    ['split', splitGroup?.functions ?? []],
    ['per-function', perFunctionResults]
  ] as const) {
    for (const result of results) {
      const { entries, modes } = await inspectZip(result.artifactPath);
      functions.push({
        name: result.name,
        path,
        digest: result.digest,
        unzippedBytes: result.functionSizeBytes,
        zipBytes: await getFileSizeBytes(result.artifactPath),
        zipEntries: entries,
        zipModes: modes,
        layers: result.layers,
        combinedUnzippedBytes: result.combinedUnzippedBytes
      });
    }
  }
  functions.sort((left, right) => (left.name < right.name ? -1 : 1));
  const layers: LayerArtifact[] = [];
  for (const layer of splitGroup?.layerArtifacts ?? []) {
    const zipPath = layerZips.get(layer.layerNumber);
    const inventory = zipPath ? await inspectZip(zipPath) : null;
    layers.push({
      layerNumber: layer.layerNumber,
      contentHash: layer.contentHash,
      s3Key: layer.s3Key,
      chunks: layer.chunks.length,
      usedBy: functions.filter((artifact) => artifact.layers.includes(layer.layerNumber)).length,
      unzippedBytes: layer.sizeBytes,
      zipBytes: zipPath ? (await stat(zipPath)).size : null,
      zipModes: inventory?.modes ?? null
    });
  }

  return {
    ok: true,
    readyMs,
    packagingMs,
    layerZipMs,
    split: splitGroup?.timings ?? null,
    perFunction:
      perFunctionResults.length > 0
        ? {
            functions: perFunctionResults.length,
            ms: perFunctionFinishedAt - packagingStartedAt,
            zipMs: sumAndMax(perFunctionResults.flatMap((result) => result.zipMs))
          }
        : null,
    container: null,
    ...describeArchiveCalls(),
    resolvedModules,
    functions,
    layers
  };
};

const main = async () => {
  const readyMs = performance.now();
  const requestPath = process.argv[2];
  if (!requestPath) throw new Error('Usage: packaging-run.ts <request.json>');
  const request = JSON.parse(readFileSync(requestPath, 'utf8')) as RunRequest;
  try {
    await writeFile(request.resultPath, `${JSON.stringify(await run(request, readyMs), null, 2)}\n`);
  } catch (error) {
    const failure =
      error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    await writeFile(request.resultPath, `${JSON.stringify({ ok: false, error: failure, readyMs }, null, 2)}\n`);
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  void main();
}
