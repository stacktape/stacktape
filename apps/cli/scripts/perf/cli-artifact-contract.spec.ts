import type { ArtifactManifest, PayloadEntry } from './artifact-inspection';
import type { SampleRecord } from './cli-report';
import type { TimingAnalysis } from './cli-timing-analysis';
import { describe, expect, test } from 'bun:test';
import { canonicalPayloadDigest, INVOCATION_PLACEHOLDER } from './artifact-inspection';
import { checkArtifactContract, compareRepeats, evaluateArtifacts, expectedPath } from './cli-artifact-contract';

const BUILD = `${INVOCATION_PLACEHOLDER}/build`;
const HELPER_DIRECTORY = `${INVOCATION_PLACEHOLDER}/helper-lambdas`;
/** The install's helper-Lambda files as `install.json` records them. */
const HELPERS = [
  { file: 'stacktapeServiceLambda-426e5d54.zip', sha256: 'installed-service' },
  { file: 'uptimeProber-05e33c39.zip', sha256: 'installed-prober' }
];

const file = (path: string, sha256 = `sha-of-${path}`): PayloadEntry => ({
  path,
  kind: 'file',
  mode: 0o644,
  bytes: 10,
  sha256
});
const directory = (path: string): PayloadEntry => ({ path, kind: 'directory', mode: 0o755, bytes: null, sha256: null });

type ArchiveFixture = {
  path: string;
  canonicalSha256: string;
  sha256: string;
  timestampNormalizedSha256: string | null;
  entryOrderSha256: string | null;
  entrywiseNormalizedSha256: string | null;
};

/** The helper-Lambda snapshot every command leaves, by default byte for byte the installed files. */
const helperSnapshots = (sha256 = (installed: string) => installed) => ({
  files: HELPERS.map((helper) => file(`${HELPER_DIRECTORY}/${helper.file}`, sha256(helper.sha256))),
  archives: HELPERS.map((helper) => ({
    path: `${HELPER_DIRECTORY}/${helper.file}`,
    canonicalSha256: `canonical-${helper.sha256}`,
    sha256: sha256(helper.sha256),
    timestampNormalizedSha256: `normalized-${helper.sha256}`,
    entryOrderSha256: `order-${helper.sha256}`,
    entrywiseNormalizedSha256: `entrywise-${helper.sha256}`
  }))
});

/** A manifest of the given files and archives, with the directories they need, as `inspectArtifacts` lists a tree. */
const manifest = (files: PayloadEntry[], archives: ArchiveFixture[] = []): ArtifactManifest => {
  const directories = new Set<string>();
  for (const { path } of files) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index++) directories.add(segments.slice(0, index).join('/'));
  }
  return {
    schema: 1,
    state: files.length ? 'present' : 'absent',
    invocationDirectories: files.length ? ['2026-09-24T11-30-00-123_abcdefghijkmnopqrstuvw'] : [],
    entries: [...[...directories].map(directory), ...files],
    archives: archives.map((archive) => ({
      ...archive,
      bytes: 100,
      entries: 2,
      files: 2,
      uncompressedBytes: 200,
      modes: { '644': 2 },
      modificationTimes: { distinct: 1, earliest: null, latest: null },
      entryList: [],
      entryListTruncated: false
    })),
    totals: { files: files.length, directories: directories.size, bytes: 0, archives: archives.length },
    problems: [],
    inspectMs: 1
  };
};

type FunctionOptions = {
  digest?: string;
  /** Stands for the handler's content; the ZIP follows it unless `canonical` says otherwise. */
  content?: string;
  canonical?: string;
  exact?: string;
  normalized?: string | null;
  order?: string;
  entrywise?: string | null;
};

/** A function's ZIP and unzipped folder. By default the ZIP holds the folder's content, as the contract requires. */
const packagedFunction = (job: string, options: FunctionOptions = {}) => {
  const zip = `${BUILD}/lambdas/${job}-${options.digest ?? 'd1'}.zip`;
  const exact = options.exact ?? `exact-${job}`;
  const handler = file(`${BUILD}/lambdas/${job}/index.mjs`, options.content ?? `content-${job}`);
  const folderCanonical = canonicalPayloadDigest([{ ...handler, path: 'index.mjs' }]);
  return {
    files: [file(zip, exact), handler],
    archives: [
      {
        path: zip,
        canonicalSha256: options.canonical ?? folderCanonical,
        sha256: exact,
        timestampNormalizedSha256: options.normalized === undefined ? `normalized-${job}` : options.normalized,
        entryOrderSha256: options.order ?? `order-${job}`,
        entrywiseNormalizedSha256: options.entrywise === undefined ? `entrywise-${job}` : options.entrywise
      }
    ]
  };
};

/** A command's output: the helper snapshot plus `parts`. */
const output = (parts: { files: PayloadEntry[]; archives: ArchiveFixture[] }[], helpers = helperSnapshots()) =>
  manifest(
    [...helpers.files, ...parts.flatMap(({ files }) => files)],
    [...helpers.archives, ...parts.flatMap(({ archives }) => archives)]
  );

const splitOutput = (jobs: string[], options: FunctionOptions = {}) =>
  output([
    ...jobs.map((job) => packagedFunction(job, options)),
    {
      files: [
        file(`${BUILD}/split-bundle/chunk-a1.js`),
        file(`${BUILD}/layers/layer-1/nodejs/package.json`),
        file(`${BUILD}/layers/layer-1/nodejs/chunks/chunk-a1.js`)
      ],
      archives: []
    }
  ]);

const perFunctionOutput = (jobs: string[], options: FunctionOptions = {}) =>
  output(jobs.map((job) => packagedFunction(job, options)));

const analysis = (overrides: Partial<TimingAnalysis>): TimingAnalysis =>
  ({
    packagingPaths: null,
    layeredChunks: null,
    failedAt: null,
    originToBundlingMs: 1700,
    ...overrides
  }) as TimingAnalysis;

const sample = (overrides: Partial<SampleRecord>): SampleRecord =>
  ({
    id: 'package-sample',
    suite: 'package',
    scenario: '2-functions-platform-ready',
    install: 'instrumented-3',
    round: 1,
    warmUp: false,
    exitCode: 0,
    invalidReasons: [],
    analysis: null,
    artifacts: null,
    packageCase: null,
    ...overrides
  }) as SampleRecord;

const JOBS = ['handler01', 'handler02'];
/** A single function is the one package that takes the per-function path in every situation. */
const SINGLE = ['handler01'];
const SPLIT = analysis({
  packagingPaths: { split: 2, perFunction: 0, edge: 0, other: 0 },
  layeredChunks: 1
});
const PER_FUNCTION = analysis({
  packagingPaths: { split: 0, perFunction: 2, edge: 0, other: 0 }
});
const PER_FUNCTION_SINGLE = analysis({
  packagingPaths: { split: 0, perFunction: 1, edge: 0, other: 0 }
});
/** What the guard records for a `docker info`, which the split policy asked before it stopped depending on Docker. */
const SPLIT_PROBE: SampleRecord['dockerOperations'] = [
  {
    decision: 'simulated',
    operation: 'info',
    reason: 'controlled daemon probe: running',
    exitCode: 0,
    privileged: false,
    binfmt: false
  }
];

const check = (overrides: Partial<SampleRecord>, situation: string, functions = JOBS) =>
  checkArtifactContract({ sample: sample(overrides), functions, situation, helperLambdas: HELPERS });

describe('expectedPath', () => {
  test("follows the packaging code: split needs two functions, whatever Docker's state", () => {
    expect(expectedPath({ situation: 'platform-ready', functions: 10 })).toBe('split');
    expect(expectedPath({ situation: 'platform-ready', functions: 1 })).toBe('per-function');
    expect(expectedPath({ situation: 'docker-absent', functions: 10 })).toBe('split');
    expect(expectedPath({ situation: 'docker-absent', functions: 1 })).toBe('per-function');
    expect(expectedPath({ situation: 'buildx-failure', functions: 10 })).toBe('split');
  });
});

describe('checkArtifactContract', () => {
  test('accepts a split package: the helper snapshot, a ZIP and folder per function, the split bundle and a layer', () => {
    const result = check({ analysis: SPLIT, artifacts: splitOutput(JOBS) }, 'platform-ready');
    expect(result.problems).toEqual([]);
    expect(result.counts).toMatchObject({
      functionZips: 2,
      functionDirectories: 2,
      zipsMatchingFolder: 2,
      helperLambdas: 2,
      splitBundle: 1,
      sharedLayers: 1,
      layerZips: 0,
      otherFiles: 0
    });
    expect(result.identities.map(({ key }) => key)).toEqual([
      'function ZIP handler01',
      'function folder handler01',
      'function ZIP handler02',
      'function folder handler02',
      'helper Lambda stacktapeServiceLambda',
      'helper Lambda uptimeProber',
      'split bundle',
      'shared layer-1',
      'output listing'
    ]);
    expect(result.identities[0]).toMatchObject({ nameDigest: 'd1', timestampNormalizedSha256: 'normalized-handler01' });
    // The ZIP's canonical content is its folder's.
    expect(result.identities[0]!.canonicalSha256).toBe(result.identities[1]!.canonicalSha256);
  });

  test('accepts a Docker-absent split package', () => {
    expect(check({ analysis: SPLIT, artifacts: splitOutput(JOBS) }, 'docker-absent').problems).toEqual([]);
  });

  test('accepts a per-function package and refuses split output on that path', () => {
    const single = (artifacts: ArtifactManifest) =>
      check({ analysis: PER_FUNCTION_SINGLE, artifacts }, 'docker-absent', SINGLE).problems;
    expect(single(perFunctionOutput(SINGLE))).toEqual([]);
    expect(single(splitOutput(SINGLE))).toEqual([
      'a split bundle on the per-function path',
      'shared layers on the per-function path'
    ]);
  });

  test.each([
    [
      'a missing function ZIP',
      output([{ files: [file(`${BUILD}/lambdas/handler01/index.mjs`)], archives: [] }, packagedFunction('handler02')]),
      'handler01: 0 function ZIPs instead of 1'
    ],
    [
      'a zipped layer',
      output([
        ...JOBS.map((job) => packagedFunction(job)),
        { files: [file(`${BUILD}/layers/layer-1.zip`)], archives: [] }
      ]),
      'ZIP(s) under layers/'
    ],
    [
      'a ZIP of an unknown function',
      output([
        ...JOBS.map((job) => packagedFunction(job)),
        { files: [file(`${BUILD}/lambdas/other-d1.zip`)], archives: [] }
      ]),
      'ZIPs outside the contract'
    ],
    [
      'a helper-Lambda snapshot that differs from the installed file',
      output(
        JOBS.map((job) => packagedFunction(job)),
        helperSnapshots((installed) => (installed === 'installed-prober' ? 'changed' : installed))
      ),
      'the helper-Lambda snapshot uptimeProber-05e33c39.zip differs from the installed file'
    ],
    [
      'a missing helper-Lambda snapshot',
      output(
        JOBS.map((job) => packagedFunction(job)),
        { files: [], archives: [] }
      ),
      'the helper-Lambda snapshot stacktapeServiceLambda-426e5d54.zip is missing'
    ]
  ] as const)('refuses %s', (_label, artifacts, problem) => {
    expect(check({ analysis: PER_FUNCTION, artifacts }, 'docker-absent').problems.join('\n')).toContain(problem);
  });

  test("refuses a ZIP whose canonical content is not its folder's, even when every repeat agrees", () => {
    const repeatableButWrong = () =>
      check(
        { analysis: SPLIT, artifacts: splitOutput(JOBS, { canonical: 'the same wrong payload' }) },
        'docker-absent'
      );
    const results = [repeatableButWrong(), repeatableButWrong()];
    for (const result of results) {
      expect(result.problems).toEqual([
        "handler01: the ZIP's canonical content differs from its unzipped folder",
        "handler02: the ZIP's canonical content differs from its unzipped folder"
      ]);
      expect(result.counts.zipsMatchingFolder).toBe(0);
    }
    // Repetition alone would have passed it.
    expect(compareRepeats(results).canonicalRepeated).toBe(true);
  });

  test.each(['platform-ready', 'docker-absent'])('refuses a %s package that fell back to per-function', (situation) => {
    expect(check({ analysis: PER_FUNCTION, artifacts: perFunctionOutput(JOBS) }, situation).problems).toContain(
      'packaged per-function 2, expected split 2'
    );
  });

  test('accepts a buildx-failure package on the split path without any Docker request', () => {
    const result = check({ analysis: SPLIT, artifacts: splitOutput(JOBS) }, 'buildx-failure');
    expect(result.problems).toEqual([]);
    expect(result.expected).toBe('split');
  });

  test.each<[string, Partial<SampleRecord>, string]>([
    ['a failure', { exitCode: 1 }, 'exit code 1'],
    [
      'a buildx request',
      {
        dockerOperations: [
          { ...SPLIT_PROBE![0]!, operation: 'buildx inspect', reason: 'controlled buildx failure', exitCode: 1 }
        ]
      },
      'asked Docker for simulated buildx inspect, expected nothing'
    ],
    ['a docker info', { dockerOperations: SPLIT_PROBE }, 'asked Docker for simulated info, expected nothing']
  ])('refuses a buildx-failure sample with %s', (_label, overrides, problem) => {
    const result = check({ analysis: SPLIT, artifacts: splitOutput(JOBS), ...overrides }, 'buildx-failure');
    expect(result.problems.join('\n')).toContain(problem);
  });

  test('carries inspection problems and a missing manifest into the contract', () => {
    const withProblem = { ...perFunctionOutput(JOBS), problems: ['unexpected symbolic link: x'] };
    expect(check({ analysis: PER_FUNCTION, artifacts: withProblem }, 'docker-absent').problems).toContain(
      'inspection: unexpected symbolic link: x'
    );
    expect(check({ artifacts: null }, 'docker-absent').problems).toEqual(['the sample has no artifact manifest']);
  });
});

describe('compareRepeats', () => {
  const split = (artifacts: ArtifactManifest) => check({ analysis: SPLIT, artifacts }, 'platform-ready');

  test('sees timestamp-only variation: exact bytes differ under one canonical and one normalized digest', () => {
    const comparison = compareRepeats([
      split(splitOutput(JOBS, { exact: 'bytes-first-run' })),
      split(splitOutput(JOBS, { exact: 'bytes-second-run' }))
    ]);
    expect(comparison).toMatchObject({
      canonicalRepeated: true,
      exactRepeated: false,
      exactVariationOnlyTimestamps: true,
      modeledEntriesRepeatAfterNormalization: true
    });
    expect(comparison.artifacts.find(({ key }) => key === 'function ZIP handler01')?.sha256).toEqual([
      'bytes-first-run',
      'bytes-second-run'
    ]);
  });

  test('does not call variation timestamp-only when the normalized digests differ or one is missing', () => {
    for (const second of [{ normalized: 'other-bytes' }, { normalized: null }]) {
      const comparison = compareRepeats([
        split(splitOutput(JOBS, { exact: 'bytes-first-run' })),
        split(splitOutput(JOBS, { exact: 'bytes-second-run', ...second }))
      ]);
      expect(comparison.canonicalRepeated).toBe(true);
      expect(comparison.exactVariationOnlyTimestamps).toBe(false);
    }
  });

  test('sees variation in entry order: timestamps zeroed the bytes differ, but every entry is stored the same', () => {
    const comparison = compareRepeats([
      split(splitOutput(JOBS, { exact: 'bytes-first-run', normalized: 'order-a-bytes', order: 'order-a' })),
      split(splitOutput(JOBS, { exact: 'bytes-second-run', normalized: 'order-b-bytes', order: 'order-b' }))
    ]);
    expect(comparison).toMatchObject({
      canonicalRepeated: true,
      exactVariationOnlyTimestamps: false,
      modeledEntriesRepeatAfterNormalization: true
    });
    expect(comparison.artifacts.find(({ key }) => key === 'function ZIP handler01')?.entryOrderSha256).toEqual([
      'order-a',
      'order-b'
    ]);
  });

  test('does not call variation timestamps and order when an entry is stored differently or unread', () => {
    for (const entrywise of ['stored-differently', null]) {
      const comparison = compareRepeats([
        split(splitOutput(JOBS, { exact: 'bytes-first-run', normalized: 'a' })),
        split(splitOutput(JOBS, { exact: 'bytes-second-run', normalized: 'b', entrywise }))
      ]);
      expect(comparison.canonicalRepeated).toBe(true);
      expect(comparison.modeledEntriesRepeatAfterNormalization).toBe(false);
    }
  });

  test('sees changed content, a changed ZIP name digest and a missing artifact as differences', () => {
    expect(
      compareRepeats([split(splitOutput(JOBS)), split(splitOutput(JOBS, { canonical: 'changed' }))]).canonicalRepeated
    ).toBe(false);
    expect(
      compareRepeats([split(splitOutput(JOBS)), split(splitOutput(JOBS, { digest: 'd2' }))]).canonicalRepeated
    ).toBe(false);
    const missing = compareRepeats([split(splitOutput(JOBS)), split(splitOutput(['handler01']))]);
    expect(missing.canonicalRepeated).toBe(false);
    expect(missing.missingIn).toEqual(['function ZIP handler02', 'function folder handler02']);
  });
});

describe('evaluateArtifacts', () => {
  test('groups inspected package samples by scenario and compares retained samples apart from the warm-up', () => {
    const packageCase = { functions: JOBS, situation: 'platform-ready', helperLambdas: HELPERS };
    const results = evaluateArtifacts([
      sample({
        id: 'w',
        round: 0,
        warmUp: true,
        analysis: SPLIT,
        artifacts: splitOutput(JOBS, { content: 'first' }),
        packageCase
      }),
      sample({
        id: 'a',
        round: 1,
        analysis: SPLIT,
        artifacts: splitOutput(JOBS),
        packageCase
      }),
      sample({
        id: 'b',
        round: 2,
        analysis: SPLIT,
        artifacts: splitOutput(JOBS),
        packageCase
      }),
      sample({ id: 'startup', suite: 'startup', artifacts: null })
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ expected: 'split', functions: 2, contractMet: true });
    expect(results[0]!.retained).toMatchObject({ samples: 2, canonicalRepeated: true });
    expect(results[0]!.all).toMatchObject({ samples: 3, canonicalRepeated: false });
  });
});
