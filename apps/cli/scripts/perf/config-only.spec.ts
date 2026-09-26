import type { ArtifactManifest, PayloadEntry } from './artifact-inspection';
import type { SampleRecord } from './cli-report';
import type { TimingAnalysis } from './cli-timing-analysis';
import type {
  ConfigOnlySampleState,
  ConfigOnlySetup,
  ConfigOnlyShapeSetup,
  ConfigVariant,
  RuntimeCheck
} from './config-only';
import type { FixtureRequest } from './external-service-fixture';
import type { DnsQuery } from './network-sandbox';
import type { FixtureFunction } from './packaging-fixture';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { canonicalPayloadDigest, inspectArtifacts, INVOCATION_PLACEHOLDER } from './artifact-inspection';
import { sha256Bytes } from './ci-install';
import { renderReport } from './cli-report';
import {
  CONFIG_CONTROL,
  CONFIG_ONLY_STATES,
  CONFIG_VARIANTS,
  checkConfigOnlySample,
  configOnlyChecks,
  configOnlyShapeProblems,
  configVariantText,
  describeConfigVariant,
  describeRuntimeSdk,
  evaluateConfigOnly,
  groupingChanges,
  lineDifference,
  readConfigProjectState,
  refusedEnvironmentEntries,
  RUNTIME_HOOKS,
  runExtractedFunctions,
  stateProblems,
  variantOf
} from './config-only';
import { FIXTURE_CONFIG_FILE, getFixtureIdentity, writeFixtureConfig } from './packaging-fixture';

const CLI_ROOT = resolve(import.meta.dir, '../..');
let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-config-only-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const fixtureFunctions = (count: number): FixtureFunction[] =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return { name: `handler${number}`, entryfilePath: `src/handlers/handler-${number}.ts` };
  });

/** The configuration the harness packages, as `packaging-fixture.ts` writes it. */
const generatedConfig = async (count: number) => {
  const directory = join(root, `config-${count}`);
  await mkdir(directory, { recursive: true });
  await writeFixtureConfig({ root: directory, functions: fixtureFunctions(count) });
  return readFile(join(directory, FIXTURE_CONFIG_FILE), 'utf8');
};

type Parsed = { resources: Record<string, { properties: Record<string, any> }> };

describe('the configuration variants', () => {
  test.each([1, 10])('derive from the generated %i-function configuration exactly as intended', async (count) => {
    const base = await generatedConfig(count);
    const names = fixtureFunctions(count).map(({ name }) => name);
    for (const variant of CONFIG_VARIANTS) {
      const text = configVariantText({ base, variant, functions: count });
      expect(describeConfigVariant({ base, text, variant, functionNames: names }).problems).toEqual([]);
    }
    const deployment = parse(configVariantText({ base, variant: 'deployment-edit', functions: count })) as Parsed;
    const packaging = parse(configVariantText({ base, variant: 'packaging-edit', functions: count })) as Parsed;
    const control = parse(configVariantText({ base, variant: CONFIG_CONTROL, functions: count })) as Parsed;
    for (const name of names) {
      expect(deployment.resources[name]!.properties.environment).toEqual([
        { name: 'CONFIG_REVISION', value: 'fixture-edited' }
      ]);
      expect(packaging.resources[name]!.properties.packaging.properties).toEqual({
        entryfilePath: fixtureFunctions(count).find((fn) => fn.name === name)!.entryfilePath,
        languageSpecificConfig: { minify: false }
      });
      expect(packaging.resources[name]!.properties.environment[0].value).toBe('fixture-base');
      expect(control.resources[name]!.properties.environment[0].value).toEqual(['fixture-invalid']);
    }
    expect(
      describeConfigVariant({
        base,
        text: configVariantText({ base, variant: 'packaging-edit', functions: count }),
        variant: 'packaging-edit',
        functionNames: names
      })
    ).toMatchObject({
      added: [
        { line: '          languageSpecificConfig:', count },
        { line: '            minify: false', count }
      ],
      removed: []
    });
  });

  test('refuses a base that lacks one edited line per function', async () => {
    const base = await generatedConfig(2);
    expect(() => configVariantText({ base, variant: 'deployment-edit', functions: 3 })).toThrow(
      'The base configuration has 2 CONFIG_REVISION values for 3 functions.'
    );
    expect(() =>
      configVariantText({ base: base.replace('entryfilePath', 'entry'), variant: 'packaging-edit', functions: 2 })
    ).toThrow('The base configuration has 1 entry files for 2 functions.');
  });

  test('flags a variant that changes more than intended, names other functions, or does not parse', async () => {
    const base = await generatedConfig(2);
    const names = fixtureFunctions(2).map(({ name }) => name);
    const deployment = configVariantText({ base, variant: 'deployment-edit', functions: 2 });
    const check = (text: string, variant: ConfigVariant = 'deployment-edit', functionNames = names) =>
      describeConfigVariant({ base, text, variant, functionNames }).problems;
    expect(check(deployment.replace('memory: 512', 'memory: 1024'))).toEqual([
      'it parses to more, or other, than the intended change of the base',
      'its lines differ from the base by more, or other, than the edited lines'
    ]);
    expect(check(base, 'deployment-edit')).toEqual([
      'it parses to more, or other, than the intended change of the base',
      'its lines differ from the base by more, or other, than the edited lines'
    ]);
    expect(check(deployment, 'deployment-edit', ['handler01'])).toEqual([
      'it names handler01, handler02, not handler01',
      'its lines differ from the base by more, or other, than the edited lines'
    ]);
    expect(check(`${deployment}\n  : [`)[0]).toStartWith('it does not parse:');
  });

  test("reads the refused CONFIG_REVISION entries from the CLI's validation output, colored or wrapped", () => {
    const output = [
      '\u001B[31m[x]\u001B[39m Config at `/tmp/project/stacktape.yml` is invalid.',
      'Resource `handler01` is invalid:',
      '• Line 4, `/`: Expected `string`, received `object` at `.resources.handler01.properties.environment[0].value`',
      '• Line 16, /: Expected string, received object at',
      '.resources.handler02.properties.environment[0].value',
      '.resources.handler02.properties.memory'
    ].join('\n');
    expect(refusedEnvironmentEntries(output)).toEqual(['handler01', 'handler02']);
    expect(refusedEnvironmentEntries('Packaged compute resources')).toEqual([]);
  });

  test('counts lines as multisets, keeping indentation', () => {
    expect(lineDifference('a\n  b\n  b\nc', 'a\n  b\nc\n  d')).toEqual({
      added: [{ line: '  d', count: 1 }],
      removed: [{ line: '  b', count: 1 }]
    });
  });

  test('packages the base bytes in both reverts', () => {
    expect(CONFIG_ONLY_STATES.map(variantOf)).toEqual(['base', 'deployment-edit', 'base', 'packaging-edit', 'base']);
    expect(variantOf(CONFIG_CONTROL)).toBe(CONFIG_CONTROL);
  });
});

describe('the project state', () => {
  test('identifies the files apart from the configuration, and says what a sample needs', async () => {
    const project = join(root, 'project');
    await mkdir(join(project, 'src'), { recursive: true });
    await writeFile(join(project, 'src/handler.ts'), 'export const handler = 1;\n');
    await writeFile(join(project, FIXTURE_CONFIG_FILE), 'resources: {}\n');
    const source = await getFixtureIdentity(project, { exclude: [FIXTURE_CONFIG_FILE] });
    const configSha256 = sha256Bytes('resources: {}\n');

    const state = await readConfigProjectState(project);
    expect(state).toEqual({ configSha256, source, outputDirectory: false });
    expect(stateProblems({ state, configSha256, source, output: false })).toEqual([]);

    await writeFile(join(project, FIXTURE_CONFIG_FILE), 'resources: { a: 1 }\n');
    await mkdir(join(project, '.stacktape'));
    const edited = await readConfigProjectState(project);
    expect(edited.source).toEqual(source);
    expect(stateProblems({ state: edited, configSha256, source, output: false })).toEqual([
      `the configuration is ${edited.configSha256!.slice(0, 12)}, not ${configSha256.slice(0, 12)}`,
      'a .stacktape output was left from before'
    ]);

    await writeFile(join(project, 'src/handler.ts'), 'export const handler = 2;\n');
    expect(
      stateProblems({ state: await readConfigProjectState(project), configSha256: edited.configSha256!, source })
    ).toEqual(['the files other than the configuration differ from the generated fixture']);
    expect(
      stateProblems({
        state: { ...edited, outputDirectory: false },
        configSha256: edited.configSha256!,
        source,
        output: true
      })
    ).toEqual(['no .stacktape output']);
  });
});

// Extraction uses `unzip` and these fixtures zip with `python3`, as the config-only suite does in the Linux harness sandbox.
describe.skipIf(process.platform !== 'linux')('runExtractedFunctions', () => {
  const INVOCATION = '2026-09-24T12-00-00-000_abcdefghijkmnopqrstuvw';
  const node = Bun.which('node')!;
  const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: tmpdir(), LANG: 'C.UTF-8' };

  const zip = (source: string, target: string) => {
    const zipped = Bun.spawnSync({
      cmd: [
        'python3',
        '-c',
        [
          'import os, sys, zipfile',
          'with zipfile.ZipFile(sys.argv[1], "w") as z:',
          '  for base, _, files in os.walk(sys.argv[2]):',
          '    for name in files:',
          '      path = os.path.join(base, name)',
          '      z.write(path, os.path.relpath(path, sys.argv[2]))'
        ].join('\n'),
        target,
        source
      ]
    });
    expect(zipped.exitCode).toBe(0);
  };

  /** A project whose `.stacktape` holds what `package` would leave: function ZIPs and, optionally, a layer folder. */
  const writeProject = async (
    name: string,
    functions: Record<string, string>,
    layer: Record<string, string> | null = null
  ) => {
    const project = join(root, name);
    const build = join(project, '.stacktape', INVOCATION, 'build');
    await mkdir(join(build, 'lambdas'), { recursive: true });
    for (const [functionName, code] of Object.entries(functions)) {
      const source = join(root, `${name}-${functionName}-source`);
      await mkdir(source, { recursive: true });
      await writeFile(join(source, 'index.js'), code);
      await writeFile(join(source, 'package.json'), '{"type":"module"}\n');
      zip(source, join(build, 'lambdas', `${functionName}-0123abcd.zip`));
    }
    for (const [path, content] of Object.entries(layer ?? {})) {
      await mkdir(dirname(join(build, 'layers', 'layer-1', path)), { recursive: true });
      await writeFile(join(build, 'layers', 'layer-1', path), content);
    }
    return project;
  };

  const handlerAnswering = (name: string, imports = '', prefix = '') =>
    `${imports}
export const handler = async (event) => {
  const input = JSON.parse(event.body ?? '{}');
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'x-fixture-revision': 'fixture-base' },
    body: JSON.stringify({ body: { handler: '${name}', revision: 'fixture-base', mode: ${prefix}input.mode }, operations: [] })
  };
};
`;

  const run = async (
    project: string,
    functions: string[],
    hooksName: string,
    recorders?: Parameters<typeof runExtractedFunctions>[0]['recorders']
  ) => {
    const hooksPath = join(root, `${hooksName}.mjs`);
    await writeFile(hooksPath, RUNTIME_HOOKS);
    const sdk = await describeRuntimeSdk(CLI_ROOT);
    return runExtractedFunctions({
      project,
      functions,
      extractRoot: join(root, `${hooksName}-extracted`),
      hooksPath,
      sdkParentUrl: sdk.parentUrl,
      node,
      env,
      recorders
    });
  };

  /** Recorders that hand out what is queued, in order, one batch per call, as the sandbox's would. */
  const queuedRecorders = (requests: FixtureRequest[][], queries: DnsQuery[][]) => ({
    takeRequests: () => requests.shift() ?? [],
    takeQueries: () => queries.shift() ?? []
  });

  test('finds the runtime SDK among the CLI dependencies', async () => {
    const sdk = await describeRuntimeSdk(CLI_ROOT);
    expect(sdk.version).toMatch(/^3\./);
    expect(sdk.parentUrl).toBe(pathToFileURL(join(CLI_ROOT, 'package.json')).href);
  });

  test('extracts each ZIP and invokes its handler, with the runtime SDK resolved for the payload', async () => {
    const project = await writeProject('per-function', {
      handler01: handlerAnswering(
        'handler01',
        "import { DynamoDBClient } from '@aws-sdk/client-dynamodb';\nconst client = new DynamoDBClient({});",
        "typeof client.config.region === 'function' && "
      )
    });
    const check = await run(project, ['handler01'], 'per-function-hooks');
    expect(check.problems).toEqual([]);
    expect(check.layers).toEqual([]);
    expect(check.functions).toHaveLength(1);
    expect(check.functions[0]).toMatchObject({
      function: 'handler01',
      zip: 'handler01-0123abcd.zip',
      unzip: { exitCode: 0 },
      invoke: { exitCode: 0, timedOut: false },
      answer: { statusCode: 200, handler: 'handler01', revision: 'fixture-base', revisionHeader: 'fixture-base' },
      layerChunks: [],
      sdk: ['@aws-sdk/client-dynamodb'],
      unresolved: [],
      requests: null,
      dnsNames: null
    });
    expect(check.functions[0]!.answer!.responseSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(check.leftover).toBeNull();
  });

  test('reports what the recorders saw after the CLI exited and during an invocation', async () => {
    const project = await writeProject('recorded', { handler01: handlerAnswering('handler01') });
    const tunnel: FixtureRequest = {
      kind: 'tunnel',
      target: 'installs.stacktape.com:443',
      status: 403,
      allowed: false,
      bytesIn: 0,
      bytesOut: 0,
      startMs: 1,
      endMs: 2
    };
    const lookup: DnsQuery = { name: 'registry.npmjs.org', type: 1, atMs: 1 };
    const quiet = await run(project, ['handler01'], 'quiet-hooks', queuedRecorders([[], [], []], [[], [], []]));
    expect(quiet.problems).toEqual([]);
    expect(quiet.leftover).toEqual({ requests: [], dnsNames: [] });
    expect(quiet.functions[0]).toMatchObject({ requests: [], dnsNames: [] });

    const noisy = await run(
      project,
      ['handler01'],
      'noisy-hooks',
      queuedRecorders([[tunnel], [], []], [[], [], [lookup]])
    );
    expect(noisy.problems).toEqual([
      'after the CLI exited: tunnel installs.stacktape.com:443 403 refused',
      'handler01: DNS lookups registry.npmjs.org'
    ]);
  });

  test('resolves /opt/nodejs/chunks to the unzipped layer, as Lambda mounts it, and removes the extraction', async () => {
    const project = await writeProject(
      'split',
      {
        handler01: handlerAnswering(
          'handler01',
          "import { prefix } from '/opt/nodejs/chunks/chunk-a.js';",
          'prefix + '
        ),
        handler02: handlerAnswering('handler02', "import { prefix } from '/opt/nodejs/chunks/chunk-a.js';", 'prefix + ')
      },
      {
        'nodejs/package.json': '{"type":"module"}\n',
        'nodejs/chunks/chunk-a.js':
          "import { part } from '/opt/nodejs/chunks/chunk-b.js';\nexport const prefix = part;\n",
        'nodejs/chunks/chunk-b.js': "export const part = 'layer:';\n"
      }
    );
    const check = await run(project, ['handler01', 'handler02'], 'split-hooks');
    expect(check.problems).toEqual([]);
    expect(check.layers).toEqual(['layer-1']);
    expect(check.functions.map(({ layerChunks }) => layerChunks)).toEqual([
      ['chunk-a.js', 'chunk-b.js'],
      ['chunk-a.js', 'chunk-b.js']
    ]);
    const answers = check.functions.map(({ answer }) => answer!.responseSha256);
    expect(new Set(answers).size).toBe(2);
    expect(await readFile(join(root, 'split-hooks-extracted', 'handler01', 'index.js')).catch(() => null)).toBeNull();
  });

  test('feeds what the real hook recorded into the resolution check, which refuses a handler that bypassed it', async () => {
    const layer = {
      'nodejs/package.json': '{"type":"module"}\n',
      'nodejs/chunks/chunk-a.js': "export const prefix = 'layer:';\n"
    };
    const project = await writeProject(
      'resolution',
      {
        handler01: handlerAnswering(
          'handler01',
          "import { DynamoDBClient } from '@aws-sdk/client-dynamodb';\nimport { prefix } from '/opt/nodejs/chunks/chunk-a.js';\nconst client = new DynamoDBClient({});",
          "typeof client.config.region === 'function' && prefix + "
        ),
        handler02: handlerAnswering('handler02')
      },
      layer
    );
    const runtime = await run(project, ['handler01', 'handler02'], 'resolution-hooks');
    expect(runtime.problems).toEqual([]);
    const artifacts = await inspectArtifacts({ root: join(project, '.stacktape') });
    const result = checkConfigOnlySample({
      sample: {
        id: 'config-only-2-functions-base-instrumented-3-01',
        suite: 'config-only',
        scenario: '2-functions-base',
        round: 1,
        warmUp: false,
        exitCode: 0,
        analysis: { packagingPaths: { split: 2, perFunction: 0 }, layeredChunks: 1 },
        dockerOperations: [],
        fixtureRequests: [],
        dnsQueries: [],
        artifacts,
        configOnly: {
          functions: 2,
          state: 'base',
          variant: 'base',
          configSha256: 'config',
          preparation: { action: 'kept', ms: 1 },
          before: {
            configSha256: 'config',
            source: { contentSha256: 'source', files: 1, bytes: 1 },
            outputDirectory: false
          },
          after: {
            configSha256: 'config',
            source: { contentSha256: 'source', files: 1, bytes: 1 },
            outputDirectory: true
          },
          runtime,
          refusedEntries: null
        }
      } as unknown as SampleRecord,
      shape: {
        functions: 2,
        functionNames: ['handler01', 'handler02'],
        expected: 'split',
        source: { contentSha256: 'source', files: 1, bytes: 1 },
        variants: {} as never
      },
      helperLambdas: []
    });
    expect(runtime.functions.map(({ function: name, sdk, layerChunks }) => ({ name, sdk, layerChunks }))).toEqual([
      { name: 'handler01', sdk: ['@aws-sdk/client-dynamodb'], layerChunks: ['chunk-a.js'] },
      { name: 'handler02', sdk: [], layerChunks: [] }
    ]);
    expect(result.grouping).toMatchObject({
      layers: [{ layer: 'layer-1', chunks: 1 }],
      sharing: ['layer-1: handler01']
    });
    expect(result.resolverProblems).toEqual([
      'handler02: the SDK imports mapped were none, not @aws-sdk/client-dynamodb',
      "handler02: no /opt/nodejs/chunks import was mapped to the sample's layer"
    ]);
  });

  test('reports a missing ZIP, an import nothing satisfies and a wrong answer', async () => {
    const project = await writeProject('broken', {
      handler01: handlerAnswering('handler01', "import 'perf-fixture-logger';"),
      handler02: handlerAnswering('handler03')
    });
    const check = await run(project, ['handler01', 'handler02', 'handler04'], 'broken-hooks');
    expect(check.problems[0]).toStartWith('handler01: ');
    expect(check.functions[0]!.unresolved).toEqual(['perf-fixture-logger']);
    expect(check.problems.slice(1)).toEqual(['handler02: answered as handler03', 'handler04: 0 function ZIPs']);
  });
});

describe('checking and evaluating config-only samples', () => {
  const HELPERS = [{ file: 'stacktapeServiceLambda-426e5d54.zip', sha256: 'installed-service' }];
  const SOURCE = { contentSha256: 'source', files: 10, bytes: 100 };
  const INV = INVOCATION_PLACEHOLDER;
  const names = (count: number) =>
    Array.from({ length: count }, (_, index) => `handler${String(index + 1).padStart(2, '0')}`);
  /** Which functions import each shared chunk on the split path, as Run18's ten-function fixture did. */
  const SHARING: [string, string[]][] = [
    ['all', names(10)],
    ['a', ['handler01', 'handler03', 'handler06']],
    ['b', ['handler02', 'handler07', 'handler09']],
    ['c', ['handler03', 'handler08']],
    ['d', ['handler04', 'handler06', 'handler09']],
    ['e', ['handler05', 'handler10']]
  ];
  /** Chunk file names come from their content, as Bun names them, so they change with `minify: false`. */
  const chunkFile = (tag: string, content: string) => `chunk-${tag}-${content}.js`;
  const file = (path: string, sha256: string): PayloadEntry => ({ path, kind: 'file', mode: 0o644, bytes: 10, sha256 });

  /** What a `package` of `count` functions leaves: ZIPs equal to their folders, and on the split path a bundle and layer. */
  const manifestOf = (count: number, content: string, nameDigest: string): ArtifactManifest => {
    const split = count > 1;
    const helper = `${INV}/helper-lambdas/${HELPERS[0]!.file}`;
    const zipOf = (name: string) => `${INV}/build/lambdas/${name}-${nameDigest}${name.slice(-2)}.zip`;
    const files = [
      ...names(count).flatMap((name) => [
        file(zipOf(name), `zip-${name}-${content}`),
        file(`${INV}/build/lambdas/${name}/index.js`, `${name}-${content}`)
      ]),
      ...(split
        ? [
            file(`${INV}/build/layers/layer-1/nodejs/package.json`, 'module'),
            ...SHARING.flatMap(([tag]) => [
              file(`${INV}/build/layers/layer-1/nodejs/chunks/${chunkFile(tag, content)}`, `${tag}-${content}`),
              file(`${INV}/build/layers/layer-1/nodejs/chunks/${chunkFile(tag, content)}.map`, `${tag}-map`),
              file(`${INV}/build/split-bundle/chunks/${chunkFile(tag, content)}`, `${tag}-${content}`)
            ])
          ]
        : []),
      file(helper, 'installed-service')
    ];
    const directories = new Set<string>();
    for (const { path } of files) {
      const segments = path.split('/');
      for (let index = 1; index < segments.length; index++) directories.add(segments.slice(0, index).join('/'));
    }
    const archive = (path: string, canonicalSha256: string, sha256: string) => ({
      path,
      bytes: 100,
      sha256,
      timestampNormalizedSha256: null,
      entryOrderSha256: null,
      entrywiseNormalizedSha256: null,
      entries: 1,
      files: 1,
      uncompressedBytes: 10,
      canonicalSha256,
      modes: { '644': 1 },
      modificationTimes: { distinct: 1, earliest: null, latest: null },
      entryList: [],
      entryListTruncated: false
    });
    return {
      schema: 1,
      state: 'present',
      invocationDirectories: [],
      entries: [
        ...[...directories].map(
          (path): PayloadEntry => ({ path, kind: 'directory', mode: 0o755, bytes: null, sha256: null })
        ),
        ...files
      ],
      archives: [
        ...names(count).map((name) =>
          archive(
            zipOf(name),
            canonicalPayloadDigest([file('index.js', `${name}-${content}`)]),
            `zip-${name}-${content}`
          )
        ),
        archive(helper, 'helper-canonical', 'installed-service')
      ],
      totals: { files: files.length, directories: directories.size, bytes: 0, archives: count + 1 },
      problems: [],
      inspectMs: 1
    };
  };

  const runtimeOf = (count: number, content: string): RuntimeCheck => ({
    leftover: { requests: [], dnsNames: [] },
    layers: count > 1 ? ['layer-1'] : [],
    functions: names(count).map((name) => ({
      function: name,
      zip: `${name}.zip`,
      unzip: { exitCode: 0, wallMs: 1 },
      invoke: { exitCode: 0, signal: null, timedOut: false, wallMs: 50, stderrTail: '' },
      answer: {
        statusCode: 200,
        revisionHeader: 'fixture-base',
        handler: name,
        revision: 'fixture-base',
        responseSha256: `answer-${name}`,
        error: null
      },
      layerChunks:
        count > 1 ? SHARING.filter(([, users]) => users.includes(name)).map(([tag]) => chunkFile(tag, content)) : [],
      sdk: ['@aws-sdk/client-dynamodb'],
      unresolved: [],
      requests: [],
      dnsNames: []
    })),
    problems: [],
    ms: 60
  });

  const shapeOf = (count: number): ConfigOnlyShapeSetup => ({
    functions: count,
    functionNames: names(count),
    expected: count > 1 ? 'split' : 'per-function',
    source: SOURCE,
    variants: Object.fromEntries(
      CONFIG_VARIANTS.map((variant) => [
        variant,
        {
          variant,
          sha256: `config-${count}-${variant}`,
          bytes: 1,
          added: [],
          removed: [],
          resources: names(count),
          problems: []
        }
      ])
    ) as unknown as ConfigOnlyShapeSetup['variants']
  });

  const analysisOf = (count: number, overrides: Partial<TimingAnalysis> = {}) =>
    ({
      packagingPaths: { split: count > 1 ? count : 0, perFunction: count > 1 ? 0 : count },
      layeredChunks: count > 1 ? SHARING.length : null,
      failedAt: null,
      originToBundlingMs: 1500,
      commandMs: 400,
      moduleLoadMs: 1000,
      phases: {},
      ...overrides
    }) as unknown as TimingAnalysis;

  /** A sample of `count` functions in `state` as the harness records it, meeting every requirement. */
  const sampleOf = (count: number, state: ConfigOnlySampleState, round: number): SampleRecord => {
    const control = state === CONFIG_CONTROL;
    const variant = variantOf(state);
    const content = state === 'packaging-edit' ? 'unminified' : 'minified';
    const projectState = { configSha256: `config-${count}-${variant}`, source: SOURCE, outputDirectory: false };
    return {
      id: `config-only-${count}-functions-${state}-instrumented-3-${String(round).padStart(2, '0')}`,
      suite: 'config-only',
      scenario: `${count}-functions-${state}`,
      install: 'instrumented-3',
      round,
      warmUp: round === 0,
      exitCode: control ? 1 : 0,
      wallMs: 2500,
      invalidReasons: [],
      analysis: control
        ? analysisOf(count, { failedAt: 'config:validate', packagingPaths: null, layeredChunks: null })
        : analysisOf(count),
      dockerOperations: [],
      fixtureRequests: [
        {
          kind: 'aws',
          target: 'sts:GetCallerIdentity',
          status: 200,
          allowed: true,
          bytesIn: 1,
          bytesOut: 1,
          startMs: 1,
          endMs: 2
        }
      ],
      dnsQueries: [],
      artifacts: control
        ? manifestOf(0, content, 'x')
        : manifestOf(count, content, state === 'packaging-edit' ? 'm2' : 'm1'),
      configOnly: {
        functions: count,
        state,
        variant,
        configSha256: `config-${count}-${variant}`,
        preparation: { action: variant === 'base' ? 'kept' : 'edited', ms: 5 },
        before: projectState,
        after: { ...projectState, outputDirectory: true },
        runtime: control ? null : runtimeOf(count, content),
        refusedEntries: control ? names(count) : null
      }
    } as unknown as SampleRecord;
  };

  /** Every state of both required sizes in rounds 0 (warm-up) to `retained`, then one control per size. */
  const completeRun = (retained = 1) =>
    [1, 10].flatMap((count) => [
      ...Array.from({ length: retained + 1 }, (_, round) =>
        CONFIG_ONLY_STATES.map((state) => sampleOf(count, state, round))
      ).flat(),
      { ...sampleOf(count, CONFIG_CONTROL, retained + 1), warmUp: false }
    ]);

  const setupOf = (counts = [1, 10]): ConfigOnlySetup => ({
    sdk: {
      specifier: '@aws-sdk/client-dynamodb',
      version: '3.1121.0',
      path: null,
      parentUrl: 'file:///cli/package.json'
    },
    hooksSha256: 'hooks',
    event: { body: '{}' },
    shapes: counts.map(shapeOf)
  });

  const fixturesOf = (counts = [1, 10]) =>
    Object.fromEntries(counts.map((count) => [`config-only-functions-${count}`, { before: 'same', after: 'same' }]));

  const evaluate = (samples: SampleRecord[], { setup = setupOf(), retainedWanted = 1 } = {}) =>
    evaluateConfigOnly({ samples, setup, helperLambdas: HELPERS, retainedWanted });

  const failedChecks = (samples: SampleRecord[], options: { setup?: ConfigOnlySetup; retainedWanted?: number } = {}) =>
    configOnlyChecks({
      result: evaluate(samples, options),
      fixtures: fixturesOf((options.setup ?? setupOf()).shapes.map(({ functions }) => functions))
    })
      .filter(({ passed }) => !passed)
      .map(({ check }) => check);

  /** A copy of the samples with the one `id` names changed by `change`. */
  const changing = (samples: SampleRecord[], id: string, change: (sample: SampleRecord) => void) => {
    const copy = structuredClone(samples);
    const sample = copy.find((candidate) => candidate.id === id);
    if (!sample) throw new Error(`No sample ${id}.`);
    change(sample);
    return copy;
  };
  const idOf = (count: number, state: ConfigOnlySampleState, round: number) =>
    `config-only-${count}-functions-${state}-instrumented-3-${String(round).padStart(2, '0')}`;
  const runOf = (sample: SampleRecord, name: string) =>
    sample.configOnly!.runtime!.functions.find((run) => run.function === name)!;

  const shapeResult = (samples: SampleRecord[], count: number, options = {}) =>
    evaluate(samples, options).shapes.find((shape) => shape.functions === count)!;

  describe('one sample', () => {
    const check = (record: SampleRecord) =>
      checkConfigOnlySample({ sample: record, shape: shapeOf(1), helperLambdas: HELPERS });

    test('accepts a sample that kept its state, met the contract, answered and resolved as intended', () => {
      for (const state of CONFIG_ONLY_STATES) {
        expect(check(sampleOf(1, state, 1))).toMatchObject({ problems: [], resolverProblems: [] });
        expect(
          checkConfigOnlySample({ sample: sampleOf(10, state, 1), shape: shapeOf(10), helperLambdas: HELPERS })
        ).toMatchObject({ problems: [], resolverProblems: [] });
      }
    });

    test.each([
      [
        'a configuration the CLI changed',
        (sample: SampleRecord) => {
          sample.configOnly!.after.configSha256 = 'other';
        },
        'after: the configuration is other, not config-1-bas'
      ],
      [
        'source files that changed',
        (sample: SampleRecord) => {
          sample.configOnly!.after.source = { ...SOURCE, contentSha256: 'x' };
        },
        'after: the files other than the configuration differ from the generated fixture'
      ],
      [
        'an output left from before',
        (sample: SampleRecord) => {
          sample.configOnly!.before.outputDirectory = true;
        },
        'before: a .stacktape output was left from before'
      ],
      [
        'a handler that did not answer',
        (sample: SampleRecord) => {
          sample.configOnly!.runtime!.problems = ['handler01: status 500'];
        },
        'extracted: handler01: status 500'
      ],
      [
        'no runtime check',
        (sample: SampleRecord) => {
          sample.configOnly!.runtime = null;
        },
        'the extracted functions were not run'
      ],
      [
        'a DNS lookup',
        (sample: SampleRecord) => {
          sample.dnsQueries = [{ name: 'registry.npmjs.org', type: 1, atMs: 1 }];
        },
        'DNS lookups: registry.npmjs.org'
      ],
      [
        'a refused tunnel',
        (sample: SampleRecord) => {
          sample.fixtureRequests = [
            {
              kind: 'tunnel',
              target: 'registry.npmjs.org:443',
              status: 403,
              allowed: false,
              bytesIn: 0,
              bytesOut: 0,
              startMs: 1,
              endMs: 2
            }
          ];
        },
        "requests beyond the CLI's own: tunnel registry.npmjs.org:443 403 refused"
      ],
      [
        'the split path instead of the per-function path',
        (sample: SampleRecord) => {
          sample.analysis = analysisOf(1, { packagingPaths: { split: 1, perFunction: 0 } });
        },
        'artifact contract: packaged split 1, expected per-function 1'
      ],
      [
        'a failed command',
        (sample: SampleRecord) => {
          sample.exitCode = 1;
        },
        'artifact contract: exit code 1'
      ]
    ] as const)('refuses a sample with %s', (_label, change, problem) => {
      const [sample] = changing([sampleOf(1, 'base', 1)], idOf(1, 'base', 1), change);
      expect(check(sample!).problems).toContain(problem);
    });

    test('holds the control to a refusal at config:validate with nothing packaged', () => {
      const control = sampleOf(1, CONFIG_CONTROL, 2);
      const problemsOf = (change: (sample: SampleRecord) => void) =>
        check(changing([control], control.id, change)[0]!).problems;
      expect(check(control)).toMatchObject({ problems: [], resolverProblems: [] });
      expect(problemsOf((sample) => (sample.exitCode = 0))).toEqual(['the refused value was accepted: exit code 0']);
      expect(problemsOf((sample) => (sample.analysis = analysisOf(1, { failedAt: 'split:build' })))).toEqual([
        'failed at split:build, not config:validate'
      ]);
      expect(problemsOf((sample) => (sample.configOnly!.refusedEntries = []))).toEqual([
        "the output names no refused CONFIG_REVISION entries, not every function's"
      ]);
      expect(problemsOf((sample) => (sample.artifacts = manifestOf(1, 'minified', 'm1')))).toEqual([
        'a packaging ZIP after the configuration was refused',
        '5 entries under build/ after the configuration was refused'
      ]);
    });
  });

  describe('a complete run', () => {
    test('meets every check, including the grouping and the resolution, with minify:false changing layer content', () => {
      const samples = completeRun();
      expect(failedChecks(samples)).toEqual([]);
      const result = evaluate(samples);
      expect(result.populationProblems).toEqual([]);
      const [one, ten] = result.shapes;
      expect(one).toMatchObject({ functions: 1, expected: 'per-function' });
      expect(one!.groupingUnchanged).toEqual({
        passed: true,
        problems: [],
        grouping: { path: 'per-function 1', functions: ['handler01'], layers: [], layeredChunks: null, sharing: [] }
      });
      expect(ten).toMatchObject({ functions: 10, expected: 'split' });
      expect(ten!.groupingUnchanged.passed).toBe(true);
      expect(ten!.groupingUnchanged.grouping).toEqual({
        path: 'split 10',
        functions: names(10),
        layers: [{ layer: 'layer-1', chunks: 6 }],
        layeredChunks: 6,
        sharing: [
          'layer-1: handler01, handler02, handler03, handler04, handler05, handler06, handler07, handler08, handler09, handler10',
          'layer-1: handler01, handler03, handler06',
          'layer-1: handler02, handler07, handler09',
          'layer-1: handler03, handler08',
          'layer-1: handler04, handler06, handler09',
          'layer-1: handler05, handler10'
        ]
      });
      // The chunk files were renamed and the layer's content changed under minify:false; the grouping did not.
      expect(ten!.packagingChanged).toMatchObject({
        passed: true,
        layerContentChanged: true,
        splitBundleChanged: true
      });
      expect(one!.packagingChanged.layerContentChanged).toBeNull();
    });
  });

  describe('the report', () => {
    const render = (samples: SampleRecord[]) =>
      renderReport({
        passed: true,
        checks: [],
        clock: {
          elapsedMonotonicMs: 1,
          elapsedRealtimeMs: 1,
          elapsedHostMs: 1,
          monotonicPerHost: 1,
          monotonicPerRealtime: 1
        },
        settings: {},
        installs: [],
        reference: null,
        summaries: [],
        paired: [],
        hostDockerLatency: null,
        host: null,
        toolVersions: null,
        source: { before: null, after: null, check: null },
        load: { before: null, after: null },
        configOnly: evaluate(samples)
      });

    test('states the grouping, the resolution on host Node and a missing population', () => {
      const markdown = render(completeRun());
      expect(markdown).toContain('That is host Node, not the official Lambda runtime.');
      expect(markdown).toContain(
        '- Every state kept the base grouping (split 10, 10 functions, layer-1 with 6 chunks, 6 layered chunks, mapped 3 chunks shared by 3 functions, 2 chunks shared by 2 functions, 1 chunk shared by 10 functions): yes. Shared-layer content changed under `minify: false`: yes, which is not a grouping change.'
      );
      expect(markdown).toContain(
        "- Resolution on host Node through the hook: every sample's handlers resolved the SDK through the hook and each mapped at least one layer chunk of its own sample."
      );
      expect(markdown).toContain(
        '- Every state kept the base grouping (per-function 1, 1 functions, no shared layer, no layered chunks): yes.'
      );
      const missing = render(completeRun().filter(({ id }) => id !== idOf(10, CONFIG_CONTROL, 2)));
      expect(missing).toContain('- population: 10 functions: 0 controls instead of 1');
    });
  });

  describe('fixture sizes and populations', () => {
    test('refuses a requested size set without one function or without ten', () => {
      expect(configOnlyShapeProblems([1, 10])).toEqual([]);
      expect(configOnlyShapeProblems([10, 1, 2])).toEqual([]);
      expect(configOnlyShapeProblems([1, 2])).toEqual([
        'the config-only suite needs 10 functions (the split path), which --functions omits'
      ]);
      expect(configOnlyShapeProblems([10])).toEqual([
        'the config-only suite needs 1 function (the per-function path), which --functions omits'
      ]);
      expect(configOnlyShapeProblems([])).toHaveLength(2);
    });

    test.each([
      [10, [1]],
      [1, [10]]
    ])('fails evidence without the %i-function size, even when the setup lists only the other', (missing, listed) => {
      const samples = completeRun().filter((sample) => sample.configOnly!.functions !== missing);
      const setup = setupOf(listed);
      const result = evaluate(samples, { setup });
      const size = `${missing} function${missing === 1 ? '' : 's'}`;
      expect(result.populationProblems).toEqual(
        expect.arrayContaining([
          `${size}: no setup`,
          `${size}, base: 0 warm-up samples instead of 1 in round 0`,
          `${size}, base-after-packaging-edit: 0 retained samples in round 1 instead of 1`,
          `${size}: 0 controls instead of 1`
        ])
      );
      expect(result.shapes.map(({ functions }) => functions)).toEqual([1, 10]);
      expect(failedChecks(samples, { setup })).toEqual(
        expect.arrayContaining([
          'both required fixture sizes (1 function per-function, 10 split) have every state with one warm-up and every retained round, and one control each',
          'every state kept the base grouping: path, functions, shared layers and their chunk counts, layered chunks, and the functions sharing each mapped layer chunk (layer content may change)',
          'the refused CONFIG_REVISION control failed at config:validate without packaging',
          'every config-only fixture, both required sizes included, ended byte-identical to how it was generated'
        ])
      );
    });

    test.each([
      [
        'a warm-up',
        (samples: SampleRecord[]) => samples.filter(({ id }) => id !== idOf(10, 'deployment-edit', 0)),
        '10 functions, deployment-edit: 0 warm-up samples instead of 1 in round 0'
      ],
      [
        'a retained sample',
        (samples: SampleRecord[]) => samples.filter(({ id }) => id !== idOf(1, 'base-after-packaging-edit', 1)),
        '1 function, base-after-packaging-edit: 0 retained samples in round 1 instead of 1'
      ],
      [
        'a control',
        (samples: SampleRecord[]) => samples.filter(({ id }) => id !== idOf(10, CONFIG_CONTROL, 2)),
        '10 functions: 0 controls instead of 1'
      ],
      [
        'nothing, but with a second control',
        (samples: SampleRecord[]) => [...samples, { ...sampleOf(1, CONFIG_CONTROL, 3), warmUp: false }],
        '1 function: 2 controls instead of 1'
      ]
    ])('fails evidence missing %s', (_label, remove, problem) => {
      const samples = remove(completeRun());
      expect(evaluate(samples).populationProblems).toEqual([problem]);
      expect(failedChecks(samples)).toContain(
        'both required fixture sizes (1 function per-function, 10 split) have every state with one warm-up and every retained round, and one control each'
      );
    });

    test('fails evidence with fewer retained rounds than the run asked for', () => {
      const problems = evaluate(completeRun(1), { retainedWanted: 2 }).populationProblems;
      expect(problems).toHaveLength(10);
      expect(problems).toContain('10 functions, packaging-edit: 0 retained samples in round 2 instead of 1');
      expect(evaluate(completeRun(2), { retainedWanted: 2 }).populationProblems).toEqual([]);
    });
  });

  describe('grouping', () => {
    const GROUPING_CHECK =
      'every state kept the base grouping: path, functions, shared layers and their chunk counts, layered chunks, and the functions sharing each mapped layer chunk (layer content may change)';

    test.each([
      [
        'a changed layered-chunk count',
        idOf(10, 'packaging-edit', 1),
        (sample: SampleRecord) => {
          sample.analysis!.layeredChunks = 5;
        },
        ['packaging-edit: layered chunks 6 became 5']
      ],
      [
        'an extra shared layer',
        idOf(10, 'deployment-edit', 1),
        (sample: SampleRecord) => {
          sample.artifacts!.entries.push(
            { path: `${INV}/build/layers/layer-2`, kind: 'directory', mode: 0o755, bytes: null, sha256: null },
            { path: `${INV}/build/layers/layer-2/nodejs`, kind: 'directory', mode: 0o755, bytes: null, sha256: null },
            file(`${INV}/build/layers/layer-2/nodejs/package.json`, 'module'),
            {
              path: `${INV}/build/layers/layer-2/nodejs/chunks`,
              kind: 'directory',
              mode: 0o755,
              bytes: null,
              sha256: null
            },
            file(`${INV}/build/layers/layer-2/nodejs/chunks/chunk-z.js`, 'z')
          );
        },
        ['deployment-edit: shared layers layer-1 with 6 chunks became layer-1 with 6 chunks, layer-2 with 1 chunks']
      ],
      [
        'a renamed layer key',
        idOf(10, 'base-after-deployment-edit', 0),
        (sample: SampleRecord) => {
          sample.artifacts!.entries = sample.artifacts!.entries.map((entry) => ({
            ...entry,
            path: entry.path.replace('/layers/layer-1', '/layers/layer-3')
          }));
        },
        [
          'base-after-deployment-edit: shared layers layer-1 with 6 chunks became layer-3 with 6 chunks',
          // Every chunk now sits in the renamed layer, so each sharing entry names it.
          'base-after-deployment-edit: chunk sharing changed: lost [layer-1: handler01, handler02, handler03, handler04, handler05, handler06, handler07, handler08, handler09, handler10], lost [layer-1: handler01, handler03, handler06], lost [layer-1: handler02, handler07, handler09], lost [layer-1: handler03, handler08], lost [layer-1: handler04, handler06, handler09], lost [layer-1: handler05, handler10], gained [layer-3: handler01, handler02, handler03, handler04, handler05, handler06, handler07, handler08, handler09, handler10], gained [layer-3: handler01, handler03, handler06], gained [layer-3: handler02, handler07, handler09], gained [layer-3: handler03, handler08], gained [layer-3: handler04, handler06, handler09], gained [layer-3: handler05, handler10]'
        ]
      ],
      [
        'a chunk reassigned to other functions',
        idOf(10, 'base-after-packaging-edit', 1),
        (sample: SampleRecord) => {
          const run = runOf(sample, 'handler02');
          run.layerChunks = run.layerChunks.map((chunk) => chunk.replace('chunk-b-', 'chunk-c-'));
        },
        [
          'base-after-packaging-edit: chunk sharing changed: lost [layer-1: handler02, handler07, handler09], lost [layer-1: handler03, handler08], gained [layer-1: handler02, handler03, handler08], gained [layer-1: handler07, handler09]'
        ]
      ],
      [
        'a function missing',
        idOf(10, 'deployment-edit', 0),
        (sample: SampleRecord) => {
          sample.artifacts!.entries = sample.artifacts!.entries.filter(
            ({ path }) => !path.includes('/lambdas/handler10')
          );
          sample.artifacts!.archives = sample.artifacts!.archives.filter(
            ({ path }) => !path.includes('/lambdas/handler10')
          );
        },
        [`deployment-edit: functions ${names(10).join(', ')} became ${names(9).join(', ')}`]
      ],
      [
        'another packaging path',
        idOf(10, 'packaging-edit', 0),
        (sample: SampleRecord) => {
          sample.analysis!.packagingPaths = { split: 0, perFunction: 10 };
        },
        ['packaging-edit: path split 10 became per-function 10']
      ]
    ])('fails %s', (_label, id, change, problems) => {
      const samples = changing(completeRun(), id, change);
      const ten = shapeResult(samples, 10);
      expect(ten.groupingUnchanged.passed).toBe(false);
      expect(ten.groupingUnchanged.problems).toEqual(problems);
      expect(failedChecks(samples)).toContain(GROUPING_CHECK);
    });

    test('reports changes part by part, and none for groupings that differ only in chunk names', () => {
      const base = shapeResult(completeRun(), 10).groupingUnchanged.grouping!;
      expect(groupingChanges(base, structuredClone(base))).toEqual([]);
      expect(groupingChanges(base, { ...base, sharing: [...base.sharing, base.sharing[1]!] })).toEqual([
        'chunk sharing changed: gained [layer-1: handler01, handler03, handler06]'
      ]);
    });
  });

  describe('resolution through the hook', () => {
    const RESOLVER_CHECK =
      "every extracted handler, run on host Node through a resolve hook, not the official Lambda runtime, resolved its @aws-sdk/client-dynamodb import through the hook, and on the split path mapped at least one /opt/nodejs/chunks import to the sample's own layer, with nothing else mapped";

    test.each([
      [
        'a missing SDK mapping',
        idOf(10, 'base', 1),
        (sample: SampleRecord) => {
          runOf(sample, 'handler03').sdk = [];
        },
        'handler03: the SDK imports mapped were none, not @aws-sdk/client-dynamodb'
      ],
      [
        'an absent layer mapping',
        idOf(10, 'packaging-edit', 1),
        (sample: SampleRecord) => {
          runOf(sample, 'handler05').layerChunks = [];
        },
        "handler05: no /opt/nodejs/chunks import was mapped to the sample's layer"
      ],
      [
        'a bogus extra layer mapping',
        idOf(10, 'deployment-edit', 1),
        (sample: SampleRecord) => {
          runOf(sample, 'handler01').layerChunks.push('chunk-bogus.js');
        },
        "handler01: mapped chunk-bogus.js, in none of the sample's layers"
      ],
      [
        'a layer the sample did not build',
        idOf(10, 'base-after-deployment-edit', 1),
        (sample: SampleRecord) => {
          sample.configOnly!.runtime!.layers = ['layer-1', 'layer-9'];
        },
        'the hook was given layers layer-1, layer-9, but the sample built layer-1'
      ],
      [
        'a layer mapping on the per-function path',
        idOf(1, 'base-after-packaging-edit', 1),
        (sample: SampleRecord) => {
          runOf(sample, 'handler01').layerChunks = ['chunk-all-minified.js'];
        },
        "handler01: mapped chunk-all-minified.js, in none of the sample's layers"
      ],
      [
        'no runtime check',
        idOf(1, 'deployment-edit', 1),
        (sample: SampleRecord) => {
          sample.configOnly!.runtime = null;
        },
        'the extracted functions were not run'
      ]
    ])('fails %s', (_label, id, change, problem) => {
      const samples = changing(completeRun(), id, change);
      const result = evaluate(samples).samples.find((sample) => sample.id === id)!;
      expect(result.resolverProblems).toContain(problem);
      expect(failedChecks(samples)).toContain(RESOLVER_CHECK);
    });

    test('flags a layer chunk mapped on the per-function path even when a layer holds it', () => {
      const samples = changing(completeRun(), idOf(1, 'base', 1), (sample) => {
        sample.artifacts = manifestOf(1, 'minified', 'm1');
        sample.artifacts.entries.push(file(`${INV}/build/layers/layer-1/nodejs/chunks/chunk-all-minified.js`, 'x'));
        runOf(sample, 'handler01').layerChunks = ['chunk-all-minified.js'];
      });
      const result = evaluate(samples).samples.find((sample) => sample.id === idOf(1, 'base', 1))!;
      expect(result.resolverProblems).toContain('handler01: layer chunks were mapped on the per-function path');
    });
  });
});

test('the resolve hook module is plain JavaScript Node can load', async () => {
  const path = join(root, 'hook-syntax.mjs');
  await writeFile(path, RUNTIME_HOOKS);
  const checked = Bun.spawnSync({ cmd: [Bun.which('node')!, '--check', path] });
  expect(checked.exitCode).toBe(0);
});
