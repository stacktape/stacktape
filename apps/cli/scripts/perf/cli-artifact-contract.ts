/**
 * What a `package` of the measurement fixture must leave in the project's `.stacktape`, taken from the packaging code,
 * and the checks of inspected samples (`artifact-inspection.ts`) against it.
 *
 * The contract. Every command that initializes its global state snapshots the install's helper Lambdas into
 * `<invocation>/helper-lambdas/` (`loadHelperLambdaDetails`, the newest ZIP of each name), before any packaging. So
 * every sample, a failed one included, must hold exactly the install's helper-Lambda ZIPs there, byte for byte as
 * `install.json` records them. The packaging outputs are all under `<invocation>/build/`:
 * - `lambdas/<job>-<digest>.zip`, one per packaged function, and the function's unzipped dist folder `lambdas/<job>/`
 *   beside it. The per-function buildpack (`stacktape-es-lambda-buildpack.ts`) and the split path
 *   (`#packageNodeLambdasWithSplitBundling`) both zip the dist folder to `<dist>.zip` and rename that to
 *   `<dist>-<digest>.zip`. A function's job name is its resource name (`getJobName` for `function`): `handler01` to
 *   `handlerNN` in the fixture. The ZIP is its folder, zipped, so their canonical digests must be equal.
 * - On the split path only: `split-bundle/`, the shared `Bun.build` output. When chunks qualified for a layer
 *   (`split:assign-layers` reported layered chunks), also one `layers/layer-<n>/` per shared layer, holding
 *   `nodejs/package.json` and `nodejs/chunks/` (`createLayerArtifacts`).
 * - `package` does not zip layers: a deployment does, when it uploads them (`publishSharedLayer`). So no ZIP may
 *   appear under `layers/`.
 * - No native-dependency layer (`layers/layer-native*`), because the fixture has no native dependency.
 *
 * The path depends on the fixture, not on Docker:
 * - Split when at least two compatible functions exist (`selectSplitBundlingGroup`), whether Docker is ready, absent or
 *   has a broken buildx. The fixture is pure JavaScript, so its split build never needs Docker.
 * - Per-function for a single function.
 *
 * Pure JavaScript needs no Docker at all: any request, even `docker info`, breaks the contract.
 *
 * Repeats are compared only within one scenario. Different paths build different packages, and nothing here claims
 * their payloads are equal.
 */
import type { ArtifactManifest, PayloadEntry } from './artifact-inspection';
import type { SampleRecord } from './cli-report';
import { canonicalPayloadDigest, digestSubtree, INVOCATION_PLACEHOLDER } from './artifact-inspection';

export type PackageSituation = 'platform-ready' | 'docker-absent' | 'buildx-failure';

export type ExpectedPath = 'split' | 'per-function';

export const expectedPath = ({ functions }: { situation: string; functions: number }): ExpectedPath =>
  functions >= 2 ? 'split' : 'per-function';

const BUILD = `${INVOCATION_PLACEHOLDER}/build`;
const LAMBDAS = `${BUILD}/lambdas`;
const SPLIT_BUNDLE = `${BUILD}/split-bundle`;
const LAYERS = `${BUILD}/layers`;
const HELPER_LAMBDAS = `${INVOCATION_PLACEHOLDER}/helper-lambdas`;

/** An installed helper-Lambda artifact: its file name and the SHA-256 `install.json` records for it. */
export type InstalledHelperLambda = { file: string; sha256: string };

/** One artifact a scenario's repeats are compared by. */
export type ArtifactIdentity = {
  key: string;
  role: 'function-zip' | 'function-directory' | 'split-bundle' | 'shared-layer' | 'helper-lambda' | 'output-listing';
  canonicalSha256: string;
  /** The archive file's exact SHA-256; null for a directory. */
  sha256: string | null;
  /** The archive's SHA-256 with its timestamps zeroed; null for a directory. */
  timestampNormalizedSha256: string | null;
  /** The archive's entry order and its entries as stored apart from order and timestamps; null for a directory. */
  entryOrderSha256: string | null;
  entrywiseNormalizedSha256: string | null;
  /** The digest part of a function ZIP's name; null otherwise. */
  nameDigest: string | null;
  bytes: number | null;
  files: number;
};

export type ContractResult = {
  id: string;
  warmUp: boolean;
  expected: ExpectedPath;
  exitCode: number | null;
  observedPath: string;
  failedAt: string | null;
  state: ArtifactManifest['state'];
  counts: {
    functionZips: number;
    functionDirectories: number;
    /** Function ZIPs whose canonical content equals their unzipped folder's. */
    zipsMatchingFolder: number;
    helperLambdas: number;
    splitBundle: number;
    sharedLayers: number;
    layerZips: number;
    nativeLayers: number;
    otherZips: number;
    /** Every entry at or under `build/`, directories included. */
    buildEntries: number;
    otherFiles: number;
  };
  /** Files outside the roles above, by path, for the report. */
  otherFiles: string[];
  identities: ArtifactIdentity[];
  /** Every way the sample departs from the contract; empty when it met it. */
  problems: string[];
};

const describeObservedPath = (sample: SampleRecord) => {
  const paths = sample.analysis?.packagingPaths;
  if (!paths) return sample.exitCode === 0 ? 'unknown' : 'none';
  if (typeof paths.split === 'number' && paths.split > 0) return `split ${paths.split}`;
  if (typeof paths.perFunction === 'number' && paths.perFunction > 0) return `per-function ${paths.perFunction}`;
  return 'none';
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The whole output as one digest: every entry, with each ZIP standing for its canonical payload instead of its bytes,
 * so archive metadata does not count but every other file, and whatever a failed run leaves, does.
 */
const digestListing = (manifest: ArtifactManifest) => {
  const archives = new Map(manifest.archives.map((archive) => [archive.path, archive.canonicalSha256]));
  return canonicalPayloadDigest([
    { path: `state:${manifest.state}`, kind: 'directory', mode: null, bytes: null, sha256: null },
    ...manifest.entries.map((entry) =>
      archives.has(entry.path) ? { ...entry, bytes: null, sha256: archives.get(entry.path)! } : entry
    )
  ]);
};

const filesUnder = (entries: PayloadEntry[], prefix: string) =>
  entries.filter(({ kind, path }) => kind === 'file' && path.startsWith(`${prefix}/`));

const hasDirectory = (entries: PayloadEntry[], path: string) =>
  entries.some((entry) => entry.kind === 'directory' && entry.path === path);

/** Checks one inspected `package` sample of the fixture against the contract. */
export const checkArtifactContract = ({
  sample,
  functions,
  situation,
  helperLambdas
}: {
  sample: SampleRecord;
  /** The fixture's function names, which are the job names. */
  functions: string[];
  situation: string;
  /** The install's helper-Lambda artifacts, which every sample must have snapshotted unchanged. */
  helperLambdas: InstalledHelperLambda[];
}): ContractResult => {
  const expected = expectedPath({ situation, functions: functions.length });
  const manifest = sample.artifacts;
  const problems: string[] = [];
  const result: ContractResult = {
    id: sample.id,
    warmUp: sample.warmUp,
    expected,
    exitCode: sample.exitCode,
    observedPath: describeObservedPath(sample),
    failedAt: sample.analysis?.failedAt ?? null,
    state: manifest?.state ?? 'absent',
    counts: {
      functionZips: 0,
      functionDirectories: 0,
      zipsMatchingFolder: 0,
      helperLambdas: 0,
      splitBundle: 0,
      sharedLayers: 0,
      layerZips: 0,
      nativeLayers: 0,
      otherZips: 0,
      buildEntries: 0,
      otherFiles: 0
    },
    otherFiles: [],
    identities: [],
    problems
  };
  if (!manifest) {
    problems.push('the sample has no artifact manifest');
    return result;
  }
  if (manifest.problems.length > 0) problems.push(...manifest.problems.map((problem) => `inspection: ${problem}`));
  const { entries } = manifest;
  const files = entries.filter(({ kind }) => kind === 'file');
  const archives = new Map(manifest.archives.map((archive) => [archive.path, archive]));
  const buildEntries = entries.filter(({ path }) => path === BUILD || path.startsWith(`${BUILD}/`));
  result.counts.buildEntries = buildEntries.length;

  // Every file gets exactly one role; what is left over is listed.
  const claimed = new Set<string>();
  const claim = (paths: string[]) => {
    for (const path of paths) claimed.add(path);
  };

  for (const job of functions) {
    const zipPattern = new RegExp(`^${escapeRegExp(`${LAMBDAS}/${job}-`)}([^/]+)\\.zip$`);
    const zips = files.filter(({ path }) => zipPattern.test(path));
    claim(zips.map(({ path }) => path));
    result.counts.functionZips += zips.length;
    for (const zip of zips) {
      const archive = archives.get(zip.path);
      if (!archive) continue;
      result.identities.push({
        key: `function ZIP ${job}`,
        role: 'function-zip',
        canonicalSha256: archive.canonicalSha256,
        sha256: archive.sha256,
        timestampNormalizedSha256: archive.timestampNormalizedSha256,
        entryOrderSha256: archive.entryOrderSha256,
        entrywiseNormalizedSha256: archive.entrywiseNormalizedSha256,
        nameDigest: zipPattern.exec(zip.path)![1]!,
        bytes: archive.bytes,
        files: archive.files
      });
    }
    const directory = `${LAMBDAS}/${job}`;
    const directoryFiles = filesUnder(entries, directory);
    claim(directoryFiles.map(({ path }) => path));
    if (hasDirectory(entries, directory) && directoryFiles.length > 0) {
      result.counts.functionDirectories += 1;
      result.identities.push({
        key: `function folder ${job}`,
        role: 'function-directory',
        canonicalSha256: digestSubtree(entries, directory),
        sha256: null,
        timestampNormalizedSha256: null,
        entryOrderSha256: null,
        entrywiseNormalizedSha256: null,
        nameDigest: null,
        bytes: directoryFiles.reduce((sum, { bytes }) => sum + (bytes ?? 0), 0),
        files: directoryFiles.length
      });
    }
    if (zips.length !== 1) problems.push(`${job}: ${zips.length} function ZIPs instead of 1`);
    if (!hasDirectory(entries, directory) || directoryFiles.length === 0) {
      problems.push(`${job}: no unzipped function folder`);
    } else if (zips.length === 1) {
      // The ZIP is its folder, zipped: the same paths, kinds, modes and contents.
      const archive = archives.get(zips[0]!.path);
      if (archive && archive.canonicalSha256 === digestSubtree(entries, directory)) {
        result.counts.zipsMatchingFolder += 1;
      } else if (archive) {
        problems.push(`${job}: the ZIP's canonical content differs from its unzipped folder`);
      }
    }
  }

  for (const { file: helper, sha256 } of helperLambdas) {
    const path = `${HELPER_LAMBDAS}/${helper}`;
    const snapshot = files.find((entry) => entry.path === path);
    if (!snapshot) {
      problems.push(`the helper-Lambda snapshot ${helper} is missing`);
      continue;
    }
    claim([path]);
    result.counts.helperLambdas += 1;
    if (snapshot.sha256 !== sha256)
      problems.push(`the helper-Lambda snapshot ${helper} differs from the installed file`);
    const archive = archives.get(path);
    if (archive) {
      result.identities.push({
        key: `helper Lambda ${helper.replace(/-[^-]+\.zip$/, '')}`,
        role: 'helper-lambda',
        canonicalSha256: archive.canonicalSha256,
        sha256: archive.sha256,
        timestampNormalizedSha256: archive.timestampNormalizedSha256,
        entryOrderSha256: archive.entryOrderSha256,
        entrywiseNormalizedSha256: archive.entrywiseNormalizedSha256,
        nameDigest: null,
        bytes: archive.bytes,
        files: archive.files
      });
    }
  }

  const splitFiles = filesUnder(entries, SPLIT_BUNDLE);
  claim(splitFiles.map(({ path }) => path));
  if (splitFiles.length > 0) {
    result.counts.splitBundle = 1;
    result.identities.push({
      key: 'split bundle',
      role: 'split-bundle',
      canonicalSha256: digestSubtree(entries, SPLIT_BUNDLE),
      sha256: null,
      timestampNormalizedSha256: null,
      entryOrderSha256: null,
      entrywiseNormalizedSha256: null,
      nameDigest: null,
      bytes: splitFiles.reduce((sum, { bytes }) => sum + (bytes ?? 0), 0),
      files: splitFiles.length
    });
  }

  const layerDirectories = entries
    .filter(
      ({ kind, path }) =>
        kind === 'directory' && path.startsWith(`${LAYERS}/`) && !path.slice(LAYERS.length + 1).includes('/')
    )
    .map(({ path }) => path);
  for (const layer of layerDirectories) {
    const name = layer.slice(LAYERS.length + 1);
    const layerFiles = filesUnder(entries, layer);
    claim(layerFiles.map(({ path }) => path));
    if (name.startsWith('layer-native')) {
      result.counts.nativeLayers += 1;
      continue;
    }
    if (!/^layer-\d+$/.test(name)) continue;
    result.counts.sharedLayers += 1;
    result.identities.push({
      key: `shared ${name}`,
      role: 'shared-layer',
      canonicalSha256: digestSubtree(entries, layer),
      sha256: null,
      timestampNormalizedSha256: null,
      entryOrderSha256: null,
      entrywiseNormalizedSha256: null,
      nameDigest: null,
      bytes: layerFiles.reduce((sum, { bytes }) => sum + (bytes ?? 0), 0),
      files: layerFiles.length
    });
    if (!layerFiles.some(({ path }) => path === `${layer}/nodejs/package.json`)) {
      problems.push(`${name}: no nodejs/package.json`);
    }
    if (!layerFiles.some(({ path }) => path.startsWith(`${layer}/nodejs/chunks/`))) {
      problems.push(`${name}: no chunk under nodejs/chunks`);
    }
  }
  result.counts.layerZips = files.filter(({ path }) => path.startsWith(`${LAYERS}/`) && path.endsWith('.zip')).length;

  const unclaimed = files.filter(({ path }) => !claimed.has(path));
  result.counts.otherZips = unclaimed.filter(({ path }) => path.endsWith('.zip')).length;
  result.counts.otherFiles = unclaimed.length;
  result.otherFiles = unclaimed.map(({ path }) => path);

  if (result.counts.layerZips > 0)
    problems.push(`${result.counts.layerZips} ZIP(s) under layers/, which package never zips`);
  if (result.counts.nativeLayers > 0)
    problems.push('a native-dependency layer, though the fixture has no native dependency');
  if (result.counts.otherZips > 0)
    problems.push(
      `ZIPs outside the contract: ${unclaimed
        .filter(({ path }) => path.endsWith('.zip'))
        .map(({ path }) => path)
        .join(', ')}`
    );
  result.identities.push({
    key: 'output listing',
    role: 'output-listing',
    canonicalSha256: digestListing(manifest),
    sha256: null,
    timestampNormalizedSha256: null,
    entryOrderSha256: null,
    entrywiseNormalizedSha256: null,
    nameDigest: null,
    bytes: null,
    files: files.length
  });

  const dockerOperations = (sample.dockerOperations ?? []).map(({ decision, operation }) => `${decision} ${operation}`);
  if (dockerOperations.length > 0) problems.push(`asked Docker for ${dockerOperations.join(', ')}, expected nothing`);
  if (sample.exitCode !== 0) problems.push(`exit code ${sample.exitCode}`);
  const wantedPath = expected === 'split' ? `split ${functions.length}` : `per-function ${functions.length}`;
  if (result.observedPath !== wantedPath) problems.push(`packaged ${result.observedPath}, expected ${wantedPath}`);
  if (expected === 'split') {
    if (result.counts.splitBundle !== 1) problems.push('no split bundle');
    const layered = sample.analysis?.layeredChunks ?? 0;
    if (layered > 0 && result.counts.sharedLayers === 0) {
      problems.push(`${layered} chunks were assigned to layers, but no shared layer was written`);
    }
    if (layered === 0 && result.counts.sharedLayers > 0) problems.push('shared layers without any layered chunk');
  } else {
    if (result.counts.splitBundle > 0) problems.push('a split bundle on the per-function path');
    if (result.counts.sharedLayers > 0) problems.push('shared layers on the per-function path');
  }
  return result;
};

export type RepeatComparison = {
  samples: number;
  /** Artifacts present in some samples but not all; each is a difference. */
  missingIn: string[];
  artifacts: {
    key: string;
    role: ArtifactIdentity['role'];
    canonicalSha256: string[];
    sha256: string[];
    timestampNormalizedSha256: string[];
    entryOrderSha256: string[];
    entrywiseNormalizedSha256: string[];
    nameDigest: string[];
  }[];
  /** Every artifact has one canonical digest and the same set of artifacts in every sample. */
  canonicalRepeated: boolean;
  /** Every function ZIP also has one exact SHA-256. */
  exactRepeated: boolean;
  /**
   * Every function ZIP whose exact bytes vary has one timestamp-normalized SHA-256 in every sample: the whole files are
   * equal once their timestamp fields are zeroed, so those fields are the only bytes that differ. True when nothing
   * varies.
   */
  exactVariationOnlyTimestamps: boolean;
  /**
   * Every function ZIP whose exact bytes vary has one entrywise-normalized SHA-256 in every sample: its modeled entry
   * records and compressed bytes are equal after timestamp and order normalization. Bytes outside that model (data
   * descriptors, bytes before or between records, end-of-central-directory fields other than the comment) are not
   * compared, so this does not show that timestamps and order are the only bytes that differ. True when nothing varies.
   */
  modeledEntriesRepeatAfterNormalization: boolean;
};

/** Compares the artifacts of repeated samples of one scenario, key by key. */
export const compareRepeats = (results: ContractResult[]): RepeatComparison => {
  const keys = [...new Set(results.flatMap(({ identities }) => identities.map(({ key }) => key)))].toSorted();
  const artifacts = keys.map((key) => {
    const found = results.flatMap(({ identities }) => identities.filter((identity) => identity.key === key));
    const distinct = (pick: (identity: ArtifactIdentity) => string | null) =>
      [...new Set(found.map(pick).filter((value): value is string => value !== null))].toSorted();
    return {
      key,
      role: found[0]!.role,
      canonicalSha256: distinct(({ canonicalSha256 }) => canonicalSha256),
      sha256: distinct(({ sha256 }) => sha256),
      timestampNormalizedSha256: distinct(({ timestampNormalizedSha256 }) => timestampNormalizedSha256),
      entryOrderSha256: distinct(({ entryOrderSha256 }) => entryOrderSha256),
      entrywiseNormalizedSha256: distinct(({ entrywiseNormalizedSha256 }) => entrywiseNormalizedSha256),
      nameDigest: distinct(({ nameDigest }) => nameDigest),
      present: found.length,
      normalizedEverywhere: found.every(({ timestampNormalizedSha256 }) => timestampNormalizedSha256 !== null),
      entrywiseEverywhere: found.every(({ entrywiseNormalizedSha256 }) => entrywiseNormalizedSha256 !== null)
    };
  });
  const missingIn = artifacts.filter(({ present }) => present !== results.length).map(({ key }) => key);
  return {
    samples: results.length,
    missingIn,
    artifacts: artifacts.map(
      ({ present: _present, normalizedEverywhere: _normalized, entrywiseEverywhere: _entrywise, ...artifact }) =>
        artifact
    ),
    canonicalRepeated:
      results.length > 0 &&
      missingIn.length === 0 &&
      artifacts.every(({ canonicalSha256, nameDigest }) => canonicalSha256.length === 1 && nameDigest.length <= 1),
    exactRepeated:
      results.length > 0 &&
      missingIn.length === 0 &&
      artifacts.every(({ role, sha256 }) => role !== 'function-zip' || sha256.length === 1),
    exactVariationOnlyTimestamps: artifacts.every(
      ({ role, sha256, timestampNormalizedSha256, normalizedEverywhere }) =>
        role !== 'function-zip' ||
        sha256.length <= 1 ||
        (normalizedEverywhere && timestampNormalizedSha256.length === 1)
    ),
    modeledEntriesRepeatAfterNormalization: artifacts.every(
      ({ role, sha256, entrywiseNormalizedSha256, entrywiseEverywhere }) =>
        role !== 'function-zip' || sha256.length <= 1 || (entrywiseEverywhere && entrywiseNormalizedSha256.length === 1)
    )
  };
};

export type ArtifactScenarioResult = {
  suite: SampleRecord['suite'];
  scenario: string;
  install: string;
  situation: string;
  functions: number;
  expected: ExpectedPath;
  samples: ContractResult[];
  contractMet: boolean;
  /** Warm-up excluded. */
  retained: RepeatComparison;
  /** Warm-up included. */
  all: RepeatComparison;
};

/** The contract and repeat checks for every inspected `package` scenario, from a run's samples. */
export const evaluateArtifacts = (samples: SampleRecord[]): ArtifactScenarioResult[] => {
  const groups = new Map<string, SampleRecord[]>();
  for (const sample of samples) {
    if (sample.suite !== 'package' || sample.artifacts === undefined || !sample.packageCase) continue;
    const key = JSON.stringify([sample.suite, sample.scenario, sample.install]);
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  return [...groups.values()].map((group) => {
    const { suite, scenario, install, packageCase } = group[0]!;
    const results = group.map((sample) =>
      checkArtifactContract({
        sample,
        functions: packageCase!.functions,
        situation: packageCase!.situation,
        helperLambdas: packageCase!.helperLambdas ?? []
      })
    );
    return {
      suite,
      scenario,
      install,
      situation: packageCase!.situation,
      functions: packageCase!.functions.length,
      expected: expectedPath({ situation: packageCase!.situation, functions: packageCase!.functions.length }),
      samples: results,
      contractMet: results.every(({ problems }) => problems.length === 0),
      retained: compareRepeats(results.filter(({ warmUp }) => !warmUp)),
      all: compareRepeats(results)
    };
  });
};
