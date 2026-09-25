/**
 * Offline packaging harness: how long Stacktape takes to package Node Lambdas, and what it produces, on deterministic
 * fixtures of 1–50 functions.
 *
 *   pnpm --filter @stacktape/cli run perf:packaging -- [--functions 1,5,10,25,50] [--samples 5]
 *     [--states cold,unchanged,handler,shared,manifest,asset] [--docker] [--out <dir>] [--keep-workspace]
 *     [--keep-outputs]
 *
 * Every sample runs in a fresh process (`packaging-run.ts`), one after another. Results and fixtures go to the output
 * directory, by default a new one under the ignored `.stacktape/`. A given `--out` must be new or empty: the harness
 * owns what it creates there and refuses any existing content. `--keep-workspace` keeps the fixtures and
 * `--keep-outputs` each run's artifacts. The report states what is measured and, just as importantly, what is not; see
 * `REPORT_SCOPE`. `--docker` adds the container shape (cold, unchanged and shared states), which builds images with the
 * local Docker daemon and pulls public base images; everything else is offline and fails closed.
 *
 * The harness records the Stacktape source before the first sample and compares it after every sample. If it changed
 * or could not be read, the results are not attributable and the command fails.
 */
import type { FixtureEdit, FixtureIdentity, FixtureManifest } from './packaging-fixture';
import type { FunctionArtifact, LayerArtifact, RunRequest, RunResult } from './packaging-run';
import type { Distribution, SourceCheck } from './measurement-context';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import {
  claimOutputDirectory,
  combineSourceChecks,
  compareSourceIdentities,
  createSourceTracker,
  describeSourceIdentity,
  getHostEnvironment,
  getLoadAverage,
  summarize
} from './measurement-context';
import {
  applyFixtureEdit,
  FIXTURE_EDITS,
  FIXTURE_GENERATOR_VERSION,
  getFixtureIdentity,
  writePackagingFixture
} from './packaging-fixture';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
/** Everything the runner executes or configures it with: the packaging code, the CLI and its dependency lockfile. */
const SOURCE_SCOPES = [
  'packages/packaging',
  'packages/naming',
  'apps/cli/src',
  'apps/cli/scripts',
  'apps/cli/package.json',
  'pnpm-lock.yaml'
];
const DEFAULT_FUNCTION_COUNTS = [1, 5, 10, 25, 50];
const STATES = ['cold', 'unchanged', ...FIXTURE_EDITS] as const;
type State = (typeof STATES)[number];

const REPORT_SCOPE = {
  label: 'Offline packaging harness',
  measures:
    "Stacktape's Node Lambda packaging entrypoints (split bundler, layer assignment and layer artifacts, the per-function buildpack, directory digests) with the CLI's grouping policy, digest inputs, artifact names and production archiveItem, on deterministic fixtures. Each sample is a fresh process.",
  excludes:
    'CLI startup, configuration loading and validation, AWS credential and identity resolution, Docker probing and setup, dependency installation, template synthesis, S3 listing and upload, hooks, telemetry and progress rendering. Full CLI wall time and AWS or competitor comparisons are separate measurements.',
  dependencies:
    "Fixtures vendor generated packages. Where packaging calls the CLI's dependency installer, the harness only checks that the vendored packages are present: that time is not npm or pnpm installation.",
  layerZip:
    'Zipping every layer happens at upload time in a deploy, not during `package`, so it is reported separately from packaging.',
  cache:
    'Stacktape `package` reuses no previous artifact, so every state rebuilds every artifact. Changed and unchanged digests show what a deploy would upload. The OS page cache is never dropped.'
};

const STATE_DESCRIPTIONS: Record<State, { description: string; cacheState: string }> = {
  cold: {
    description: 'First packaging of a freshly generated fixture tree; each sample uses a new tree in a new directory.',
    cacheState: 'No earlier Stacktape output; dependencies vendored; new process.'
  },
  unchanged: {
    description: 'Packaging the first cold tree again with no change.',
    cacheState:
      'The tree was packaged before. Each run writes a new invocation directory, and the harness removes it after measuring, so no earlier output is present; new process.'
  },
  handler: {
    description: 'After changing one handler.',
    cacheState: 'As for unchanged, with one edit.'
  },
  shared: {
    description: 'After changing the library every handler imports.',
    cacheState: 'As for unchanged, with one edit.'
  },
  manifest: {
    description:
      'After installing a new, not yet imported dependency. A real CLI run would also start its dependency installer here; the harness never installs.',
    cacheState: 'As for unchanged, with one edit.'
  },
  asset: {
    description: 'After changing a binary asset that one feature module imports.',
    cacheState: 'As for unchanged, with one edit.'
  }
};

export type Sample = {
  state: State | 'warm-up';
  sample: number;
  exitCode: number | null;
  /** Measured by this driver from spawning the runner to its exit. */
  wallMs: number;
  loadAverage: number;
  /** The Stacktape source after this sample, compared with the source before the first one. */
  source: SourceCheck;
  result: RunResult;
  stderrTail?: string | undefined;
};

type ArtifactChanges = {
  changedFunctions: string[];
  unchangedFunctions: number;
  changedLayers: number[];
  addedLayers: number[];
  removedLayers: number[];
};

const compareArtifacts = (reference: RunResult, candidate: RunResult): ArtifactChanges => {
  const referenceDigests = new Map(reference.functions.map(({ name, digest }) => [name, digest]));
  const referenceLayers = new Map(reference.layers.map(({ layerNumber, contentHash }) => [layerNumber, contentHash]));
  const candidateLayers = new Map(candidate.layers.map(({ layerNumber, contentHash }) => [layerNumber, contentHash]));
  const changedFunctions = candidate.functions
    .filter(({ name, digest }) => referenceDigests.get(name) !== digest)
    .map(({ name }) => name);
  return {
    changedFunctions,
    unchangedFunctions: candidate.functions.length - changedFunctions.length,
    changedLayers: [...candidateLayers]
      .filter(([layerNumber, hash]) => referenceLayers.has(layerNumber) && referenceLayers.get(layerNumber) !== hash)
      .map(([layerNumber]) => layerNumber),
    addedLayers: [...candidateLayers.keys()].filter((layerNumber) => !referenceLayers.has(layerNumber)),
    removedLayers: [...referenceLayers.keys()].filter((layerNumber) => !candidateLayers.has(layerNumber))
  };
};

const artifactIdentity = (result: RunResult) =>
  JSON.stringify([
    result.functions.map(({ name, digest }) => [name, digest]),
    result.layers.map(({ layerNumber, contentHash }) => [layerNumber, contentHash]),
    result.container?.digest ?? null
  ]);

const summarizeArtifacts = (functions: FunctionArtifact[], layers: LayerArtifact[]) => {
  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  const modes: Record<string, number> = {};
  for (const artifact of [
    ...functions.map(({ zipModes }) => zipModes),
    ...layers.map(({ zipModes }) => zipModes ?? {})
  ]) {
    for (const [mode, count] of Object.entries(artifact)) modes[mode] = (modes[mode] ?? 0) + count;
  }
  return {
    functions: functions.length,
    functionZipBytes: total(functions.map(({ zipBytes }) => zipBytes)),
    functionUnzippedBytes: total(functions.map(({ unzippedBytes }) => unzippedBytes)),
    medianFunctionZipBytes: summarize(functions.map(({ zipBytes }) => zipBytes))?.median ?? 0,
    layers: layers.length,
    layerZipBytes: layers.some(({ zipBytes }) => zipBytes === null)
      ? null
      : total(layers.map(({ zipBytes }) => zipBytes!)),
    layerUnzippedBytes: total(layers.map(({ unzippedBytes }) => unzippedBytes)),
    medianCombinedUnzippedBytes:
      summarize(functions.map(({ combinedUnzippedBytes }) => combinedUnzippedBytes))?.median ?? 0,
    zipModes: modes
  };
};

/** Which tool wrote the measured archives: detection alone does not say, because a native attempt can fall back. */
const summarizeArchives = (samples: Sample[]) => {
  const results = samples.map(({ result }) => result).filter((result) => result.archiveBackends);
  const backends: Record<string, number> = {};
  for (const result of results) {
    for (const [backend, count] of Object.entries(result.archiveBackends)) {
      backends[backend] = (backends[backend] ?? 0) + count;
    }
  }
  const nativeFailures = results.flatMap((result) => result.nativeFailures);
  return {
    format: results.find((result) => result.archiveFormat)?.archiveFormat ?? 'unknown',
    backends,
    nativeFailures: { count: nativeFailures.length, first: nativeFailures[0]?.message.split('\n')[0] ?? null }
  };
};

type Options = {
  outDirectory: string;
  samples: number;
  keepOutputs: boolean;
  source: ReturnType<typeof createSourceTracker>;
};

const runSample = async ({
  options,
  fixtureRoot,
  manifest,
  state,
  sample,
  mode = 'lambda',
  imageTag = ''
}: {
  options: Options;
  fixtureRoot: string;
  manifest: FixtureManifest;
  state: State | 'warm-up';
  sample: number;
  mode?: RunRequest['mode'];
  imageTag?: string;
}): Promise<Sample> => {
  const invocationId = `perf-${state}-${sample}-${randomUUID().slice(0, 8)}`;
  const requestDirectory = join(options.outDirectory, 'runs');
  await mkdir(requestDirectory, { recursive: true });
  const request: RunRequest = {
    mode,
    fixtureRoot,
    invocationId,
    functions: manifest.functions,
    containerEntryfilePath: manifest.containerEntryfilePath,
    imageTag,
    zipLayers: true,
    resultPath: join(requestDirectory, `${invocationId}.result.json`)
  };
  const requestPath = join(requestDirectory, `${invocationId}.request.json`);
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  const loadAverage = getLoadAverage();
  const startedAt = performance.now();
  const child = Bun.spawnSync(
    [
      process.execPath,
      // The test network guard: no external host, and AWS credentials replaced by inert values.
      '--preload',
      join(CLI_ROOT, 'scripts', 'test-preload.ts'),
      join(CLI_ROOT, 'scripts', 'perf', 'packaging-run.ts'),
      requestPath
    ],
    {
      cwd: fixtureRoot,
      env: { ...process.env, STP_DISABLE_TELEMETRY: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 20 * 60 * 1000
    }
  );
  const wallMs = performance.now() - startedAt;
  const result: RunResult = existsSync(request.resultPath)
    ? JSON.parse(readFileSync(request.resultPath, 'utf8'))
    : ({ ok: false, error: { message: 'The runner wrote no result.' } } as RunResult);
  if (!options.keepOutputs) await rm(join(fixtureRoot, '.stacktape', invocationId), { recursive: true, force: true });
  const failed = child.exitCode !== 0 || !result.ok;
  return {
    state,
    sample,
    exitCode: child.exitCode,
    wallMs,
    loadAverage,
    source: options.source.check(),
    result,
    ...(failed ? { stderrTail: `${child.stdout.toString()}${child.stderr.toString()}`.slice(-4000) } : {})
  };
};

const timingSeries = (samples: Sample[]) => {
  const ok = samples
    .filter(({ exitCode, result }) => exitCode === 0 && result.ok)
    .map(({ result, wallMs }) => ({ result, wallMs }));
  const series = (pick: (entry: { result: RunResult; wallMs: number }) => number | null | undefined) =>
    summarize(ok.map(pick).filter((value): value is number => typeof value === 'number'));
  return {
    wallMs: series(({ wallMs }) => wallMs),
    readyMs: series(({ result }) => result.readyMs),
    packagingMs: series(({ result }) => result.packagingMs),
    // The split bundler's install phase: here the vendored-dependency check, never npm or pnpm.
    dependencyCheckMs: series(({ result }) => result.split?.bundle.installMs),
    setupMs: series(({ result }) => result.split?.bundle.setupMs),
    dependencyCheckAndSetupMs: series(({ result }) =>
      result.split ? result.split.bundle.installMs + result.split.bundle.setupMs : null
    ),
    bunBuildMs: series(({ result }) => result.split?.bundle.bunBuildMs),
    postprocessMs: series(({ result }) => result.split?.bundle.postprocessMs),
    layerAssignmentMs: series(({ result }) => result.split?.layerAssignmentMs),
    layerArtifactsMs: series(({ result }) => result.split?.layerArtifactsMs),
    finalizeMs: series(({ result }) => result.split?.finalizeMs),
    hashTotalMs: series(({ result }) => result.split?.hashMs.total),
    zipTotalMs: series(({ result }) => result.split?.zipMs.total ?? result.perFunction?.zipMs.total),
    perFunctionMs: series(({ result }) => result.perFunction?.ms),
    layerZipMs: series(({ result }) => result.layerZipMs),
    containerMs: series(({ result }) => result.container?.ms)
  };
};

/**
 * Whether every sample produced the same digests; for cold samples that includes different directories. `false` once two
 * successful samples differ; `null` when a failed sample leaves the answer unknown.
 */
const getArtifactConsistency = (samples: Sample[], successful: Sample[]): boolean | null => {
  if (new Set(successful.map(({ result }) => artifactIdentity(result))).size > 1) return false;
  return successful.length > 0 && successful.length === samples.length ? true : null;
};

export const summarizeState = ({
  state,
  samples,
  reference,
  editDescription
}: {
  state: State;
  samples: Sample[];
  reference: RunResult | null;
  editDescription?: string | undefined;
}) => {
  const successful = samples.filter(({ exitCode, result }) => exitCode === 0 && result.ok);
  const first = successful[0]?.result;
  return {
    state,
    ...STATE_DESCRIPTIONS[state],
    ...(editDescription ? { edit: editDescription } : {}),
    ok: successful.length === samples.length,
    source: combineSourceChecks(samples.map(({ source }) => source)),
    timings: timingSeries(samples),
    identicalArtifactsAcrossSamples: getArtifactConsistency(samples, successful),
    artifacts: first ? summarizeArtifacts(first.functions, first.layers) : null,
    comparedToColdBuild: first && reference ? compareArtifacts(reference, first) : null,
    container: first?.container ? { digest: first.container.digest, imageBytes: first.container.imageBytes } : null,
    samples
  };
};

const measureLambdaShape = async (options: Options, functions: number, states: State[]) => {
  const shapeRoot = join(options.outDirectory, 'workspace', `lambda-${functions}`);
  const fixtureAt = (name: string) => join(shapeRoot, name, 'project');

  // Discarded: loads Bun's transpiler cache and the toolchain once before any measured sample.
  const warmUpRoot = fixtureAt('warm-up');
  const warmUp = await runSample({
    options,
    fixtureRoot: warmUpRoot,
    manifest: await writePackagingFixture({ root: warmUpRoot, functions }),
    state: 'warm-up',
    sample: 1
  });
  await rm(join(shapeRoot, 'warm-up'), { recursive: true, force: true });

  const baseRoot = fixtureAt('cold-1');
  const coldSamples: Sample[] = [];
  let manifest: FixtureManifest | undefined;
  let identity: FixtureIdentity | undefined;
  for (let sample = 1; sample <= options.samples; sample++) {
    const root = fixtureAt(`cold-${sample}`);
    manifest = await writePackagingFixture({ root, functions });
    if (sample === 1) identity = await getFixtureIdentity(root);
    coldSamples.push(await runSample({ options, fixtureRoot: root, manifest, state: 'cold', sample }));
    if (sample > 1) await rm(join(shapeRoot, `cold-${sample}`), { recursive: true, force: true });
  }
  const reference = coldSamples.find(({ exitCode, result }) => exitCode === 0 && result.ok)?.result ?? null;
  const results = [summarizeState({ state: 'cold', samples: coldSamples, reference })];

  for (const state of states.filter((candidate) => candidate !== 'cold')) {
    const samples: Sample[] = [];
    let editDescription: string | undefined;
    for (let sample = 1; sample <= options.samples; sample++) {
      const edit =
        state === 'unchanged' ? null : await applyFixtureEdit({ root: baseRoot, edit: state as FixtureEdit });
      editDescription = edit?.description;
      try {
        samples.push(await runSample({ options, fixtureRoot: baseRoot, manifest: manifest!, state, sample }));
      } finally {
        await edit?.revert();
      }
    }
    results.push(summarizeState({ state, samples, reference, editDescription }));
  }
  const restored = await getFixtureIdentity(baseRoot);
  if (restored.contentSha256 !== identity!.contentSha256) {
    throw new Error(`Reverting the edits did not restore the ${functions}-function fixture.`);
  }
  return {
    functions,
    fixture: identity!,
    warmUp: { exitCode: warmUp.exitCode, wallMs: warmUp.wallMs, source: warmUp.source },
    states: results
  };
};

const docker = (args: string[]) =>
  Bun.spawnSync(['docker', ...args], { stdout: 'pipe', stderr: 'pipe', timeout: 60_000 });

/** Opt-in: builds images with the local daemon, whose build cache is shared and never pruned by this harness. */
const measureContainerShape = async (options: Options, states: State[]) => {
  const version = docker(['version', '--format', '{{.Server.Version}}']);
  if (version.exitCode !== 0) {
    throw new Error(`--docker needs a running Docker daemon: ${version.stderr.toString().trim()}`);
  }
  const root = join(options.outDirectory, 'workspace', 'container', 'project');
  const manifest = await writePackagingFixture({ root, functions: 1 });
  const identity = await getFixtureIdentity(root);
  const tagPrefix = `stacktape-packaging-perf-${randomUUID().slice(0, 8)}`;
  const createdTags: string[] = [];
  const containerStates = states.filter((state): state is 'cold' | 'unchanged' | 'shared' =>
    ['cold', 'unchanged', 'shared'].includes(state)
  );
  const results = [];
  let coldDigest: string | undefined;
  try {
    for (const state of containerStates) {
      const samples: Sample[] = [];
      let editDescription: string | undefined;
      for (let sample = 1; sample <= options.samples; sample++) {
        const edit = state === 'shared' ? await applyFixtureEdit({ root, edit: 'shared' }) : null;
        editDescription = edit?.description;
        const imageTag = `${tagPrefix}-${state}-${sample}`;
        createdTags.push(imageTag);
        try {
          samples.push(
            await runSample({ options, fixtureRoot: root, manifest, state, sample, mode: 'container', imageTag })
          );
        } finally {
          await edit?.revert();
          docker(['image', 'rm', '--force', imageTag]);
        }
      }
      // An image has no function artifacts to compare; its buildpack digest is what decides a rebuild.
      const summary = summarizeState({ state, samples, reference: null, editDescription });
      coldDigest ??= summary.container?.digest;
      results.push({
        ...summary,
        digestChangedFromColdBuild:
          state === 'cold' || !summary.container ? null : summary.container.digest !== coldDigest
      });
    }
  } finally {
    for (const tag of createdTags) docker(['image', 'rm', '--force', tag]);
  }
  const remaining = docker(['image', 'ls', '--quiet', '--filter', `reference=${tagPrefix}-*`])
    .stdout.toString()
    .trim();
  return {
    dockerServer: version.stdout.toString().trim(),
    fixture: identity,
    note: 'Image builds use the shared daemon build cache, which this harness never prunes; the first sample may include base-image pulls from public.ecr.aws and Alpine package downloads.',
    imageTagPrefix: tagPrefix,
    imagesRemaining: remaining ? remaining.split('\n').length : 0,
    states: results
  };
};

const formatMs = (distribution: Distribution | null) =>
  distribution
    ? `${Math.round(distribution.median)} (${Math.round(distribution.min)}–${Math.round(distribution.max)})`
    : '—';
const formatBytes = (bytes: number | null) =>
  bytes === null ? '—' : `${bytes} (${(bytes / 1024 / 1024).toFixed(2)} MiB)`;
const formatChanges = (changes: ArtifactChanges | null) =>
  changes
    ? `${changes.changedFunctions.length} fn, ${changes.changedLayers.length + changes.addedLayers.length + changes.removedLayers.length} layer`
    : '—';
const formatYesNo = (value: boolean | null) => (value === null ? 'unknown' : value ? 'yes' : 'no');
const SOURCE_CHECK_LABELS: Record<SourceCheck, string> = { unchanged: 'yes', changed: 'NO', unavailable: 'unknown' };

const SOURCE_CHECK_SENTENCES: Record<SourceCheck, string> = {
  unchanged: 'The source was identical after every sample.',
  changed: '**The source changed during the run, so these results are not attributable to one source tree.**',
  unavailable: '**The source could not be read before or after a sample, so these results are not attributable.**'
};

const renderReport = (report: Awaited<ReturnType<typeof createReport>>) => {
  const lines = [
    `# ${REPORT_SCOPE.label}`,
    '',
    REPORT_SCOPE.measures,
    '',
    `**Not measured:** ${REPORT_SCOPE.excludes} ${REPORT_SCOPE.dependencies}`,
    '',
    `${REPORT_SCOPE.layerZip} ${REPORT_SCOPE.cache}`,
    '',
    `Source: ${describeSourceIdentity(report.source.before)}. ${SOURCE_CHECK_SENTENCES[report.source.check]}`,
    '',
    `Bun ${report.environment.bun}; ${report.environment.cpuModel} × ${report.environment.logicalCpus}; ${report.environment.platform} ${report.environment.osRelease}. Fixture generator ${FIXTURE_GENERATOR_VERSION}; ${report.settings.samples} samples per state after one discarded warm-up; highest 1-minute load average during samples: ${report.maxLoadAverage}.`,
    '',
    `Archives: format ${report.archives.format}, written with useNativeZip at level 1 by ${
      Object.entries(report.archives.backends)
        .map(([backend, count]) => `${backend} × ${count}`)
        .join(', ') || 'nothing'
    } in the measured samples, as each archive reported it; nothing asks for the native tool before packaging. Native attempts replaced by the fallback: ${report.archives.nativeFailures.count}${report.archives.nativeFailures.first ? ` (first: ${report.archives.nativeFailures.first})` : ''}.`,
    '',
    'Times are milliseconds: median (min–max). “Changed vs cold build” counts artifacts whose digest differs from the first cold build.'
  ];
  for (const shape of report.lambdaShapes) {
    const split = shape.states.some((state) => state.timings.bunBuildMs);
    lines.push(
      '',
      `## ${shape.functions} function${shape.functions === 1 ? '' : 's'}`,
      '',
      `Fixture SHA-256 ${shape.fixture.contentSha256} (${shape.fixture.files} files, ${shape.fixture.bytes} bytes). ${split ? 'The functions share one split build.' : 'A single function uses the per-function buildpack; the split bundler does not run.'}`,
      '',
      '| State | OK | Source unchanged | Same digests in every sample | Changed vs cold build |',
      '| --- | :---: | :---: | :---: | --- |',
      ...shape.states.map(
        (state) =>
          `| ${state.state} | ${state.ok ? 'yes' : 'NO'} | ${SOURCE_CHECK_LABELS[state.source]} | ${formatYesNo(state.identicalArtifactsAcrossSamples)} | ${formatChanges(state.comparedToColdBuild)} |`
      ),
      '',
      split
        ? '| State | Process wall | Runner load | Packaging | Dependency check + setup | Bun.build | Post-process | Layer artifacts | Hash, size, ZIP | ZIP calls (sum) | Layer ZIP |'
        : '| State | Process wall | Runner load | Packaging | Per-function build | ZIP calls (sum) |',
      split
        ? '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
        : '| --- | ---: | ---: | ---: | ---: | ---: |',
      ...shape.states.map((state) => {
        const { timings } = state;
        const common = `| ${state.state} | ${formatMs(timings.wallMs)} | ${formatMs(timings.readyMs)} | ${formatMs(timings.packagingMs)}`;
        return split
          ? `${common} | ${formatMs(timings.dependencyCheckAndSetupMs)} | ${formatMs(timings.bunBuildMs)} | ${formatMs(timings.postprocessMs)} | ${formatMs(timings.layerArtifactsMs)} | ${formatMs(timings.finalizeMs)} | ${formatMs(timings.zipTotalMs)} | ${formatMs(timings.layerZipMs)} |`
          : `${common} | ${formatMs(timings.perFunctionMs)} | ${formatMs(timings.zipTotalMs)} |`;
      })
    );
    const artifacts = shape.states[0]?.artifacts;
    if (artifacts) {
      lines.push(
        '',
        `Cold build output: ${artifacts.functions} function ZIP${artifacts.functions === 1 ? '' : 's'} totalling ${formatBytes(artifacts.functionZipBytes)}, unzipped ${formatBytes(artifacts.functionUnzippedBytes)}, median ZIP ${artifacts.medianFunctionZipBytes} bytes. Layers: ${artifacts.layers}, unzipped ${formatBytes(artifacts.layerUnzippedBytes)}, zipped ${formatBytes(artifacts.layerZipBytes)}. Median function plus its layers, unzipped: ${formatBytes(artifacts.medianCombinedUnzippedBytes)}. File modes stored in the ZIPs: ${Object.entries(
          artifacts.zipModes
        )
          .map(([mode, count]) => `${mode} × ${count}`)
          .join(', ')}.`
      );
    }
  }
  if (report.container) {
    lines.push(
      '',
      '## Container shape (opt-in, Docker)',
      '',
      `${report.container.note} Docker ${report.container.dockerServer}; images left behind: ${report.container.imagesRemaining}.`,
      '',
      '| State | OK | Source unchanged | Image build (per sample) | Image bytes | Digest changed |',
      '| --- | :---: | :---: | --- | ---: | :---: |',
      ...report.container.states.map(
        (state) =>
          `| ${state.state} | ${state.ok ? 'yes' : 'NO'} | ${SOURCE_CHECK_LABELS[state.source]} | ${state.samples.map(({ result }) => (result.container ? Math.round(result.container.ms) : '—')).join(', ')} | ${state.container?.imageBytes ?? '—'} | ${state.digestChangedFromColdBuild === null ? '—' : state.digestChangedFromColdBuild ? 'yes' : 'no'} |`
      )
    );
  }
  return `${lines.join('\n')}\n`;
};

const createReport = async ({
  options,
  functionCounts,
  states,
  includeDocker
}: {
  options: Options;
  functionCounts: number[];
  states: State[];
  includeDocker: boolean;
}) => {
  const lambdaShapes = [];
  for (const functions of functionCounts) lambdaShapes.push(await measureLambdaShape(options, functions, states));
  const container = includeDocker ? await measureContainerShape(options, states) : null;
  const allSamples = [
    ...lambdaShapes.flatMap((shape) => shape.states.flatMap((state) => state.samples)),
    ...(container?.states.flatMap((state) => state.samples) ?? [])
  ];
  const { before, after } = options.source;
  return {
    kind: 'stacktape-offline-packaging-harness',
    schemaVersion: 3,
    ...REPORT_SCOPE,
    createdAt: new Date().toISOString(),
    source: {
      before,
      after,
      check: combineSourceChecks([
        compareSourceIdentities(before, after),
        ...lambdaShapes.map((shape) => shape.warmUp.source),
        ...allSamples.map(({ source }) => source)
      ]),
      comparedAfter: 'every sample, including the discarded warm-ups'
    },
    environment: getHostEnvironment(),
    archives: summarizeArchives(allSamples),
    maxLoadAverage: Math.max(0, ...allSamples.map(({ loadAverage }) => loadAverage)),
    settings: {
      samples: options.samples,
      functionCounts,
      states,
      docker: includeDocker,
      fixtureGeneratorVersion: FIXTURE_GENERATOR_VERSION
    },
    lambdaShapes,
    container
  };
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), {
    string: ['functions', 'states', 'out'],
    number: ['samples'],
    boolean: ['docker', 'keep-workspace', 'keep-outputs']
  });
  const functionCounts = args.functions
    ? String(args.functions)
        .split(',')
        .map((value) => Number(value.trim()))
    : DEFAULT_FUNCTION_COUNTS;
  if (functionCounts.some((count) => !Number.isInteger(count) || count < 1)) {
    throw new Error(`--functions takes positive integers, for example 1,5,10; received ${args.functions}.`);
  }
  const states = (args.states ? String(args.states).split(',') : [...STATES]).map((value) => value.trim()) as State[];
  const unknownStates = states.filter((state) => !STATES.includes(state));
  if (unknownStates.length > 0 || !states.includes('cold')) {
    throw new Error(`--states takes ${STATES.join(', ')} and must include cold, the reference build.`);
  }
  const samples = args.samples ?? 5;
  if (!Number.isInteger(samples) || samples < 1) throw new Error('--samples takes a positive integer.');
  const outDirectory = resolve(
    args.out ?? join(REPO_ROOT, '.stacktape', 'packaging-perf', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  // Refused before anything is written or removed, so an existing directory is never touched.
  await claimOutputDirectory(outDirectory);
  const options: Options = {
    outDirectory,
    samples,
    keepOutputs: Boolean(args['keep-outputs']),
    source: createSourceTracker({ repoRoot: REPO_ROOT, scopes: SOURCE_SCOPES, excludePaths: [outDirectory] })
  };
  try {
    const report = await createReport({ options, functionCounts, states, includeDocker: Boolean(args.docker) });
    const markdown = renderReport(report);
    await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(outDirectory, 'report.md'), markdown);
    console.info(markdown);
    console.info(`Report: ${join(outDirectory, 'report.md')}`);
    const failed = [
      ...report.lambdaShapes.flatMap((shape) => shape.states),
      ...(report.container?.states ?? [])
    ].filter((state) => !state.ok);
    if (failed.length > 0) {
      console.error(`${failed.length} state(s) had failed samples; see report.json for each runner's error.`);
      process.exitCode = 1;
    }
    if (report.source.check !== 'unchanged') {
      console.error(`Source check: ${report.source.check}. The results are not attributable to one source tree.`);
      process.exitCode = 1;
    }
  } finally {
    if (!args['keep-workspace']) await rm(join(outDirectory, 'workspace'), { recursive: true, force: true });
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
