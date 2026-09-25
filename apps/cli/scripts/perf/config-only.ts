/**
 * The configuration-only baseline. The full CLI packages the measurement fixture (`packaging-fixture.ts`) from its YAML
 * `stacktape.yml` while only that file changes. Docker is answered as platform-ready by the simulating guard, so one
 * function takes the per-function path and ten take the split path; no real daemon is involved.
 *
 * Each fixture size runs five states:
 * - `base`: the configuration the fixture is generated with;
 * - `deployment-edit`: every function's `CONFIG_REVISION` environment value changed, which is deployment configuration;
 * - `base-after-deployment-edit`: the bytes the edit replaced, written back;
 * - `packaging-edit`: `languageSpecificConfig.minify: false` added to every function's buildpack, a packaging input;
 * - `base-after-packaging-edit`: the replaced bytes written back again.
 * An edit and its revert run back to back. The three blocks (base, the deployment pair, the packaging pair) rotate per
 * round, and so do the fixture sizes.
 *
 * `package` passes `commandCanUseCache: false`, so every sample rebuilds and rezips everything. Nothing here measures,
 * or says anything about, reuse by a deployment.
 *
 * Outside every timed sample:
 * - Each variant's YAML is the base with one line edit per function (`configVariantText`), and it is checked
 *   (`describeConfigVariant`): it parses, it parses to the base with only the intended values changed, and its lines
 *   differ from the base's only by the edited lines.
 * - Before a sample, the configuration holds that state's bytes and every other file of the project is byte-identical
 *   to the generated fixture, with no `.stacktape` output left; after it, the same holds apart from the new output.
 * - Every function ZIP is extracted with `unzip` into a new directory, and its handler is invoked by Node in a process
 *   of its own (`runExtractedFunctions`). The split path's entries import the shared layer by `/opt/nodejs/chunks/...`,
 *   where Lambda mounts it; a resolve hook maps that prefix to the unzipped layer folder the sample built, since
 *   `package` does not zip layers. The fixture's handlers import `@aws-sdk/client-dynamodb`, which the Lambda runtime
 *   provides and the buildpack leaves out; the hook resolves it, for imports from the payload only, to the SDK the
 *   CLI's own dependencies install. That is Node on this host, not the Lambda runtime.
 *
 * That the CLI reads the edited entry is shown by a control after the last round: every `CONFIG_REVISION` value replaced
 * by a list, which the configuration schema refuses, must fail at `config:validate` without packaging anything.
 */
import type { Recorders } from './ci-install';
import type { ArtifactIdentity, ContractResult, ExpectedPath, InstalledHelperLambda } from './cli-artifact-contract';
import type { SampleRecord } from './cli-report';
import type { PhaseName } from './cli-timing-analysis';
import type { FixtureRequest } from './external-service-fixture';
import type { Distribution } from './measurement-context';
import type { FixtureIdentity } from './packaging-fixture';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { parse } from 'yaml';
import { INVOCATION_DIRECTORY_PATTERN, INVOCATION_PLACEHOLDER } from './artifact-inspection';
import { runBoundedProcess } from './bounded-process';
import { EXPECTED_REQUESTS, sha256Bytes } from './ci-install';
import { checkArtifactContract, expectedPath } from './cli-artifact-contract';
import { PHASE_NAMES } from './cli-timing-analysis';
import { summarize } from './measurement-context';
import { FIXTURE_CONFIG_FILE, getFixtureIdentity } from './packaging-fixture';

export const CONFIG_ONLY_STATES = [
  'base',
  'deployment-edit',
  'base-after-deployment-edit',
  'packaging-edit',
  'base-after-packaging-edit'
] as const;
export type ConfigOnlyState = (typeof CONFIG_ONLY_STATES)[number];

/** An edit and its revert stay together; the blocks rotate per round. */
export const CONFIG_ONLY_BLOCKS: readonly (readonly ConfigOnlyState[])[] = [
  ['base'],
  ['deployment-edit', 'base-after-deployment-edit'],
  ['packaging-edit', 'base-after-packaging-edit']
];

/** The control run once per fixture size after the last round: a `CONFIG_REVISION` value the schema refuses. */
export const CONFIG_CONTROL = 'invalid-deployment-value';
export type ConfigOnlySampleState = ConfigOnlyState | typeof CONFIG_CONTROL;

export const CONFIG_VARIANTS = ['base', 'deployment-edit', 'packaging-edit', CONFIG_CONTROL] as const;
export type ConfigVariant = (typeof CONFIG_VARIANTS)[number];

/** The configuration a state packages: both reverts package the base's bytes. */
export const variantOf = (state: ConfigOnlySampleState): ConfigVariant =>
  state === 'deployment-edit' || state === 'packaging-edit' || state === CONFIG_CONTROL ? state : 'base';

/**
 * The fixture sizes the suite needs: one function, which takes the per-function path, and ten, which take the split
 * path with Docker platform-ready. A run requested without either is refused, and so is saved evidence without either.
 */
export const CONFIG_ONLY_REQUIRED_FUNCTIONS = [1, 10] as const;

const expectedPathOf = (functions: number) => expectedPath({ situation: 'platform-ready', functions });

/** Why a requested set of fixture sizes cannot run the suite; empty when it holds both required sizes. */
export const configOnlyShapeProblems = (functions: number[]) =>
  CONFIG_ONLY_REQUIRED_FUNCTIONS.filter((count) => !functions.includes(count)).map(
    (count) =>
      `the config-only suite needs ${count} function${count === 1 ? '' : 's'} (the ${expectedPathOf(count)} path), which --functions omits`
  );

/** The runtime-provided SDK the fixture's handlers import. */
export const RUNTIME_SDK_SPECIFIER = '@aws-sdk/client-dynamodb';

/** What the extracted handlers run on, wherever that is reported. */
export const RUNTIME_LABEL = 'host Node through a resolve hook, not the official Lambda runtime';

/** The lines of the generated configuration that the edits change or follow; `packaging-fixture.ts` writes them. */
const REVISION_LINE = '          value: fixture-base';
const EDITED_REVISION_LINE = '          value: fixture-edited';
const INVALID_REVISION_LINE = '          value: [fixture-invalid]';
const ENTRYFILE_LINE_PREFIX = '          entryfilePath: ';
const MINIFY_LINES = ['          languageSpecificConfig:', '            minify: false'];

/** The base configuration with each edit applied once per function; anything else refuses to produce a variant. */
export const configVariantText = ({
  base,
  variant,
  functions
}: {
  base: string;
  variant: ConfigVariant;
  functions: number;
}): string => {
  const lines = base.split('\n');
  const requireOnePerFunction = (matches: (line: string) => boolean, what: string) => {
    const found = lines.filter(matches).length;
    if (found !== functions) throw new Error(`The base configuration has ${found} ${what} for ${functions} functions.`);
  };
  const replaceRevision = (replacement: string) => {
    requireOnePerFunction((line) => line === REVISION_LINE, 'CONFIG_REVISION values');
    return lines.map((line) => (line === REVISION_LINE ? replacement : line)).join('\n');
  };
  switch (variant) {
    case 'base':
      return base;
    case 'deployment-edit':
      return replaceRevision(EDITED_REVISION_LINE);
    case CONFIG_CONTROL:
      return replaceRevision(INVALID_REVISION_LINE);
    case 'packaging-edit':
      requireOnePerFunction((line) => line.startsWith(ENTRYFILE_LINE_PREFIX), 'entry files');
      return lines
        .flatMap((line) => (line.startsWith(ENTRYFILE_LINE_PREFIX) ? [line, ...MINIFY_LINES] : [line]))
        .join('\n');
    default:
      throw new Error(`Unknown configuration variant ${variant satisfies never}.`);
  }
};

/** A line of one text that the other lacks, with how many times; indentation is kept. */
export type LineCount = { line: string; count: number };

/** The lines only `text` has and the lines only `base` has, as multisets. */
export const lineDifference = (base: string, text: string) => {
  const balance = new Map<string, number>();
  for (const line of base.split('\n')) balance.set(line, (balance.get(line) ?? 0) + 1);
  for (const line of text.split('\n')) balance.set(line, (balance.get(line) ?? 0) - 1);
  const side = (sign: 1 | -1): LineCount[] =>
    [...balance.entries()]
      .filter(([, count]) => count * sign > 0)
      .map(([line, count]) => ({ line, count: Math.abs(count) }));
  return { added: side(-1), removed: side(1) };
};

const expectedLineChanges = (variant: ConfigVariant, functions: number) => {
  const each = (lines: string[]) => lines.map((line) => ({ line, count: functions }));
  switch (variant) {
    case 'base':
      return { added: [], removed: [] };
    case 'deployment-edit':
      return { added: each([EDITED_REVISION_LINE]), removed: each([REVISION_LINE]) };
    case CONFIG_CONTROL:
      return { added: each([INVALID_REVISION_LINE]), removed: each([REVISION_LINE]) };
    case 'packaging-edit':
      return { added: each(MINIFY_LINES), removed: [] };
    default:
      throw new Error(`Unknown configuration variant ${variant satisfies never}.`);
  }
};

type ParsedFunction = {
  type?: unknown;
  properties?: {
    packaging?: { type?: unknown; properties?: Record<string, unknown> };
    environment?: unknown;
  };
};
type ParsedConfig = { resources?: Record<string, ParsedFunction> };

/** The parsed base with only what the variant is meant to change, changed. */
const intendedParse = (base: ParsedConfig, variant: ConfigVariant): ParsedConfig => {
  const copy = structuredClone(base);
  for (const resource of Object.values(copy.resources ?? {})) {
    if (variant === 'deployment-edit')
      resource.properties!.environment = [{ name: 'CONFIG_REVISION', value: 'fixture-edited' }];
    if (variant === CONFIG_CONTROL) {
      resource.properties!.environment = [{ name: 'CONFIG_REVISION', value: ['fixture-invalid'] }];
    }
    if (variant === 'packaging-edit')
      resource.properties!.packaging!.properties!.languageSpecificConfig = { minify: false };
  }
  return copy;
};

const parseYaml = (text: string) =>
  parse(text, { strict: true, uniqueKeys: true, prettyErrors: false }) as ParsedConfig;

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

export type ConfigVariantRecord = {
  variant: ConfigVariant;
  sha256: string;
  bytes: number;
  added: LineCount[];
  removed: LineCount[];
  /** The resource names the variant parses to, in order. */
  resources: string[];
  /** Every way the variant is not the intended change of the base; empty when it is. */
  problems: string[];
};

/** Checks a variant's text against the base it was made from. */
export const describeConfigVariant = ({
  base,
  text,
  variant,
  functionNames
}: {
  base: string;
  text: string;
  variant: ConfigVariant;
  functionNames: string[];
}): ConfigVariantRecord => {
  const problems: string[] = [];
  let parsedBase: ParsedConfig | null = null;
  let parsed: ParsedConfig | null = null;
  try {
    parsedBase = parseYaml(base);
  } catch (error) {
    problems.push(`the base does not parse: ${describeError(error)}`);
  }
  try {
    parsed = parseYaml(text);
  } catch (error) {
    problems.push(`it does not parse: ${describeError(error)}`);
  }
  const resources = Object.keys(parsed?.resources ?? {});
  if (JSON.stringify(resources) !== JSON.stringify(functionNames)) {
    problems.push(`it names ${resources.join(', ') || 'no resource'}, not ${functionNames.join(', ')}`);
  }
  for (const [name, resource] of Object.entries(parsed?.resources ?? {})) {
    if (resource.type !== 'function' || resource.properties?.packaging?.type !== 'stacktape-lambda-buildpack') {
      problems.push(`${name} is not a function packaged by stacktape-lambda-buildpack`);
    }
  }
  if (parsedBase && parsed) {
    let intended: ParsedConfig | null = null;
    try {
      intended = intendedParse(parsedBase, variant);
    } catch (error) {
      problems.push(`the base is not the generated fixture configuration: ${describeError(error)}`);
    }
    if (intended && JSON.stringify(parsed) !== JSON.stringify(intended)) {
      problems.push('it parses to more, or other, than the intended change of the base');
    }
  }
  const difference = lineDifference(base, text);
  if (JSON.stringify(difference) !== JSON.stringify(expectedLineChanges(variant, functionNames.length))) {
    problems.push('its lines differ from the base by more, or other, than the edited lines');
  }
  return {
    variant,
    sha256: sha256Bytes(text),
    bytes: Buffer.byteLength(text),
    ...difference,
    resources,
    problems
  };
};

export type ConfigProjectState = {
  configSha256: string | null;
  /** Every file of the project apart from the configuration and Stacktape's `.stacktape` output. */
  source: FixtureIdentity;
  outputDirectory: boolean;
};

export const readConfigProjectState = async (project: string): Promise<ConfigProjectState> => ({
  configSha256: await readFile(join(project, FIXTURE_CONFIG_FILE)).then(sha256Bytes, () => null),
  source: await getFixtureIdentity(project, { exclude: [FIXTURE_CONFIG_FILE] }),
  outputDirectory: existsSync(join(project, '.stacktape'))
});

/** Why a project is not in the state a sample needs or should have left; empty when it is. */
export const stateProblems = ({
  state,
  configSha256,
  source,
  output
}: {
  state: ConfigProjectState;
  configSha256: string;
  source: FixtureIdentity;
  /** Whether a `.stacktape` output must be there; undefined when either is fine. */
  output?: boolean;
}) => [
  ...(state.configSha256 === configSha256
    ? []
    : [`the configuration is ${state.configSha256?.slice(0, 12) ?? 'missing'}, not ${configSha256.slice(0, 12)}`]),
  ...(state.source.contentSha256 === source.contentSha256
    ? []
    : ['the files other than the configuration differ from the generated fixture']),
  ...(output === undefined || state.outputDirectory === output
    ? []
    : [output ? 'no .stacktape output' : 'a .stacktape output was left from before'])
];

const describeRequest = ({ kind, target, status, allowed }: FixtureRequest) =>
  `${kind} ${target} ${status} ${allowed ? 'allowed' : 'refused'}`;

const distinctSorted = <T>(values: T[]) => [...new Set(values)].toSorted();

/** The event every extracted handler is invoked with. */
export const RUNTIME_EVENT = { body: JSON.stringify({ mode: 'order', amount: 3, items: [{ amount: 2 }, 'order'] }) };

const LAYER_PREFIX = '/opt/nodejs/chunks/';

/**
 * The resolve hook the invocation runs with (Node's synchronous `registerHooks`); written next to the extracted
 * functions. It maps the layer mount to the sample's unzipped layers, and the runtime-provided SDK, when the payload
 * imports it, to the CLI's own dependency. It records what it mapped, and every other bare specifier from the payload,
 * which nothing can satisfy.
 */
export const RUNTIME_HOOKS = `// Written by the Stacktape config-only measurement (config-only.ts).
import { existsSync } from 'node:fs';
import { builtinModules, registerHooks } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const LAYER_PREFIX = '${LAYER_PREFIX}';
const layers = JSON.parse(process.env.STP_CHECK_LAYERS ?? '[]');
const roots = JSON.parse(process.env.STP_CHECK_ROOTS ?? '[]');
const sdkParent = process.env.STP_CHECK_SDK_PARENT;
const seen = { layerChunks: new Set(), sdk: new Set(), unresolved: new Set() };
globalThis.stpCheckImports = seen;
const fromPayload = (parentURL) => typeof parentURL === 'string' && roots.some((root) => parentURL.startsWith(root));
const isBare = (specifier) => !/^(\\.|\\/|[a-z][a-z0-9+.-]*:)/i.test(specifier);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(LAYER_PREFIX)) {
      const name = specifier.slice(LAYER_PREFIX.length);
      const found = layers.map((layer) => join(layer, 'nodejs', 'chunks', name)).filter((path) => existsSync(path));
      if (found.length !== 1) throw new Error(specifier + ' is in ' + found.length + ' of ' + layers.length + ' layers');
      seen.layerChunks.add(name);
      return { url: pathToFileURL(found[0]).href, shortCircuit: true };
    }
    if (fromPayload(context.parentURL) && isBare(specifier) && !builtinModules.includes(specifier)) {
      if (specifier.startsWith('@aws-sdk/')) {
        seen.sdk.add(specifier);
        return nextResolve(specifier, { ...context, parentURL: sdkParent });
      }
      seen.unresolved.add(specifier);
    }
    return nextResolve(specifier, context);
  }
});
`;

/** Imports one extracted `index.js`, calls `handler` and prints what it answered, as JSON, with what the hook saw. */
export const INVOKE = [
  "const { createHash } = await import('node:crypto');",
  "const { pathToFileURL } = await import('node:url');",
  'const seen = globalThis.stpCheckImports;',
  'const answer = { statusCode: null, revisionHeader: null, handler: null, revision: null, responseSha256: null, error: null };',
  'try {',
  '  const module = await import(pathToFileURL(process.env.STP_CHECK_ENTRY).href);',
  '  const response = await module.handler(JSON.parse(process.env.STP_CHECK_EVENT), {});',
  '  const payload = JSON.parse(response.body);',
  '  answer.statusCode = response.statusCode ?? null;',
  "  answer.revisionHeader = response.headers?.['x-fixture-revision'] ?? null;",
  '  answer.handler = payload?.body?.handler ?? null;',
  '  answer.revision = payload?.body?.revision ?? null;',
  "  answer.responseSha256 = createHash('sha256').update(JSON.stringify(response)).digest('hex');",
  '} catch (error) {',
  '  answer.error = String(error?.message ?? error).slice(0, 300);',
  '}',
  'process.stdout.write(JSON.stringify({ answer, layerChunks: [...seen.layerChunks].sort(), sdk: [...seen.sdk].sort(), unresolved: [...seen.unresolved].sort() }));'
].join('\n');

/** The SDK the Lambda runtime would provide, taken from the CLI's own dependencies: its version and where it resolves. */
export const describeRuntimeSdk = async (cliRoot: string) => {
  const specifier = RUNTIME_SDK_SPECIFIER;
  const packageJson = join(cliRoot, 'node_modules', specifier, 'package.json');
  const version = await readFile(packageJson, 'utf8')
    .then((content) => (JSON.parse(content) as { version?: string }).version ?? null)
    .catch(() => null);
  return {
    specifier,
    version,
    path: await realpath(join(cliRoot, 'node_modules', specifier)).catch(() => null),
    parentUrl: pathToFileURL(join(cliRoot, 'package.json')).href
  };
};

export type FunctionAnswer = {
  statusCode: number | null;
  revisionHeader: string | null;
  handler: string | null;
  revision: string | null;
  /** SHA-256 of the whole response as JSON, to compare answers across states. */
  responseSha256: string | null;
  error: string | null;
};

export type FunctionRun = {
  function: string;
  zip: string | null;
  unzip: { exitCode: number | null; wallMs: number } | null;
  invoke: {
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    wallMs: number;
    stderrTail: string;
  } | null;
  answer: FunctionAnswer | null;
  /** Layer chunks the hook mapped, the SDK modules it resolved and the bare imports nothing could satisfy. */
  layerChunks: string[];
  sdk: string[];
  unresolved: string[];
  /** What the fixture and the DNS recorder saw while it ran; null without recorders. */
  requests: string[] | null;
  dnsNames: string[] | null;
};

export type RuntimeCheck = {
  /** Requests and lookups recorded after the CLI exited and before the first extraction; null without recorders. */
  leftover: { requests: string[]; dnsNames: string[] } | null;
  /** The unzipped layer folders mapped at `/opt/nodejs/chunks`, by name. */
  layers: string[];
  functions: FunctionRun[];
  problems: string[];
  ms: number;
};

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Extracts every function ZIP a sample left with `unzip`, then invokes each extracted handler in its own Node
 * process with the layer and SDK hook, and removes the extraction. The ZIPs and layers are the sample's, unmodified.
 */
export const runExtractedFunctions = async ({
  project,
  functions,
  extractRoot,
  hooksPath,
  sdkParentUrl,
  node,
  env,
  recorders,
  unzip = '/usr/bin/unzip'
}: {
  project: string;
  functions: string[];
  extractRoot: string;
  hooksPath: string;
  sdkParentUrl: string;
  node: string;
  env: Record<string, string>;
  /** The sandbox's fixture and DNS recorder: the invocations must use neither. */
  recorders?: Recorders | undefined;
  unzip?: string;
}): Promise<RuntimeCheck> => {
  const started = performance.now();
  const problems: string[] = [];
  const take = () =>
    recorders
      ? {
          requests: recorders.takeRequests().map(describeRequest),
          dnsNames: [...new Set(recorders.takeQueries().map(({ name }) => name))]
        }
      : null;
  const leftover = take();
  if (leftover && leftover.requests.length + leftover.dnsNames.length > 0) {
    problems.push(
      `after the CLI exited: ${[...leftover.requests, ...leftover.dnsNames.map((name) => `DNS ${name}`)].join(', ')}`
    );
  }
  const output = join(project, '.stacktape');
  const invocations = (await readdir(output).catch(() => [] as string[])).filter((name) =>
    INVOCATION_DIRECTORY_PATTERN.test(name)
  );
  if (invocations.length !== 1) {
    return {
      leftover,
      layers: [],
      functions: [],
      problems: [...problems, `${invocations.length} invocation directories`],
      ms: 0
    };
  }
  const build = join(output, invocations[0]!, 'build');
  const zips = await readdir(join(build, 'lambdas')).catch(() => [] as string[]);
  const layers = (await readdir(join(build, 'layers')).catch(() => [] as string[]))
    .filter((name) => /^layer-\d+$/.test(name))
    .toSorted();
  const layerPaths = layers.map((name) => join(build, 'layers', name));
  const roots = [extractRoot, ...layerPaths].map((path) => pathToFileURL(`${path}/`).href);
  const runs: FunctionRun[] = [];
  try {
    for (const name of functions) {
      const run: FunctionRun = {
        function: name,
        zip: null,
        unzip: null,
        invoke: null,
        answer: null,
        layerChunks: [],
        sdk: [],
        unresolved: [],
        requests: null,
        dnsNames: null
      };
      runs.push(run);
      const matching = zips.filter((file) => file.startsWith(`${name}-`) && file.endsWith('.zip'));
      if (matching.length !== 1) {
        problems.push(`${name}: ${matching.length} function ZIPs`);
        continue;
      }
      run.zip = matching[0]!;
      const directory = join(extractRoot, name);
      await mkdir(directory, { recursive: true });
      const extracted = await runBoundedProcess({
        cmd: [unzip, '-q', join(build, 'lambdas', run.zip), '-d', directory],
        cwd: directory,
        env,
        timeoutMs: 60_000
      });
      run.unzip = { exitCode: extracted.exitCode, wallMs: round(extracted.wallMs) };
      if (extracted.exitCode !== 0 || extracted.timedOut) {
        problems.push(`${name}: unzip exited with ${extracted.exitCode ?? extracted.signal}`);
        continue;
      }
      const entry = join(directory, 'index.js');
      if (!existsSync(entry)) {
        problems.push(`${name}: the extracted ZIP has no index.js`);
        continue;
      }
      take();
      const invoked = await runBoundedProcess({
        cmd: [node, '--import', pathToFileURL(hooksPath).href, '--input-type=module', '--eval', INVOKE],
        cwd: directory,
        env: {
          ...env,
          STP_CHECK_ENTRY: entry,
          STP_CHECK_EVENT: JSON.stringify(RUNTIME_EVENT),
          STP_CHECK_LAYERS: JSON.stringify(layerPaths),
          STP_CHECK_ROOTS: JSON.stringify(roots),
          STP_CHECK_SDK_PARENT: sdkParentUrl
        },
        timeoutMs: 60_000
      });
      const seen = take();
      run.requests = seen?.requests ?? null;
      run.dnsNames = seen?.dnsNames ?? null;
      run.invoke = {
        exitCode: invoked.exitCode,
        signal: invoked.signal,
        timedOut: invoked.timedOut,
        wallMs: round(invoked.wallMs),
        stderrTail: invoked.stderr.slice(-2000)
      };
      try {
        const printed = JSON.parse(invoked.stdout) as Pick<
          FunctionRun,
          'answer' | 'layerChunks' | 'sdk' | 'unresolved'
        >;
        Object.assign(run, {
          answer: printed.answer,
          layerChunks: printed.layerChunks,
          sdk: printed.sdk,
          unresolved: printed.unresolved
        });
      } catch {
        problems.push(`${name}: the invocation printed no answer (exit ${invoked.exitCode ?? invoked.signal})`);
        continue;
      }
      problems.push(...answerProblems(name, run));
    }
  } finally {
    await rm(extractRoot, { recursive: true, force: true });
  }
  return { leftover, layers, functions: runs, problems, ms: round(performance.now() - started) };
};

/** What the fixture's handler must answer: 200, its own name and the fixture's revision, from nothing unresolved. */
const answerProblems = (name: string, run: FunctionRun) => {
  const answer = run.answer;
  if (!answer) return [`${name}: no answer`];
  if (answer.error) return [`${name}: ${answer.error}`];
  return [
    ...(answer.statusCode === 200 ? [] : [`${name}: status ${answer.statusCode}`]),
    ...(answer.handler === name ? [] : [`${name}: answered as ${answer.handler}`]),
    ...(answer.revision === 'fixture-base' && answer.revisionHeader === 'fixture-base'
      ? []
      : [`${name}: revision ${answer.revision}, header ${answer.revisionHeader}`]),
    ...(run.unresolved.length > 0 ? [`${name}: unresolved imports ${run.unresolved.join(', ')}`] : []),
    ...(run.requests?.length ? [`${name}: requests ${run.requests.join(', ')}`] : []),
    ...(run.dnsNames?.length ? [`${name}: DNS lookups ${run.dnsNames.join(', ')}`] : []),
    ...(run.invoke?.exitCode === 0 ? [] : [`${name}: the invocation exited with ${run.invoke?.exitCode}`])
  ];
};

/**
 * The functions whose `environment[0].value` the CLI's validation output names, from its stdout and stderr: the proof
 * that it read the entry the edits change. Only function names reach the record, never the output itself.
 */
export const refusedEnvironmentEntries = (output: string) =>
  distinctSorted(
    [
      ...stripVTControlCharacters(output).matchAll(/\.resources\.([A-Za-z0-9]+)\.properties\.environment\[0\]\.value/g)
    ].map((match) => match[1]!)
  );

/** What a config-only sample recorded outside its timing. */
export type ConfigOnlySampleEvidence = {
  functions: number;
  state: ConfigOnlySampleState;
  variant: ConfigVariant;
  /** The SHA-256 the configuration had to hold during the sample. */
  configSha256: string;
  /** `kept` the previous state's bytes, `edited` them, or `reverted` to the bytes an edit replaced. */
  preparation: { action: 'kept' | 'edited' | 'reverted'; ms: number };
  before: ConfigProjectState;
  after: ConfigProjectState;
  /** The extracted functions' answers; null for the control, which must not package. */
  runtime: RuntimeCheck | null;
  /**
   * For the control only: the functions whose `CONFIG_REVISION` value the CLI's output names as refused
   * (`refusedEnvironmentEntries`); null otherwise.
   */
  refusedEntries?: string[] | null;
};

export type ConfigOnlyShapeSetup = {
  functions: number;
  functionNames: string[];
  expected: ExpectedPath;
  /** Every file of the fixture apart from the configuration, as generated. */
  source: FixtureIdentity;
  variants: Record<ConfigVariant, ConfigVariantRecord>;
};

export type ConfigOnlySetup = {
  /** Where the payload's runtime-provided SDK imports resolve: the CLI's own dependency. */
  sdk: Awaited<ReturnType<typeof describeRuntimeSdk>>;
  hooksSha256: string;
  event: typeof RUNTIME_EVENT;
  shapes: ConfigOnlyShapeSetup[];
};

/**
 * How a sample grouped its functions, apart from content: the packaging path, the functions, the shared layers with
 * their chunk counts, the layered chunks, and which functions' handlers imported each mapped layer chunk. Chunk file
 * names come from their content, so a chunk is identified by its layer and the functions that share it, never by its
 * name: `minify: false` may change every layer byte and still keep the grouping.
 */
export type Grouping = {
  path: string;
  functions: string[];
  layers: { layer: string; chunks: number }[];
  layeredChunks: number | null;
  /** One entry per mapped layer chunk, sorted: its layer and the functions whose handlers imported it. */
  sharing: string[];
};

const LAYER_CHUNK_PATTERN = new RegExp(
  `^${INVOCATION_PLACEHOLDER}/build/layers/(layer-\\d+)/nodejs/chunks/([^/]+\\.js)$`
);

/** The JavaScript chunk files of each shared layer a sample left, by layer, from its artifact manifest. */
const layerChunkFiles = (sample: SampleRecord) => {
  const layers = new Map<string, Set<string>>();
  for (const { kind, path } of sample.artifacts?.entries ?? []) {
    const match = kind === 'file' ? LAYER_CHUNK_PATTERN.exec(path) : null;
    if (match) layers.set(match[1]!, (layers.get(match[1]!) ?? new Set<string>()).add(match[2]!));
  }
  return layers;
};

const groupingOf = ({
  sample,
  contract,
  runtime
}: {
  sample: SampleRecord;
  contract: ContractResult;
  runtime: RuntimeCheck | null;
}): Grouping => {
  const files = layerChunkFiles(sample);
  const layers = distinctSorted([
    ...contract.identities.filter(({ role }) => role === 'shared-layer').map(({ key }) => key.replace(/^shared /, '')),
    ...files.keys()
  ]);
  const sharedBy = new Map<string, Set<string>>();
  for (const run of runtime?.functions ?? []) {
    for (const chunk of run.layerChunks)
      sharedBy.set(chunk, (sharedBy.get(chunk) ?? new Set<string>()).add(run.function));
  }
  return {
    path: contract.observedPath,
    functions: distinctSorted(
      contract.identities
        .filter(({ role }) => role === 'function-zip')
        .map(({ key }) => key.replace(/^function ZIP /, ''))
    ),
    layers: layers.map((layer) => ({ layer, chunks: files.get(layer)?.size ?? 0 })),
    layeredChunks: sample.analysis?.layeredChunks ?? null,
    sharing: [...sharedBy.entries()]
      .map(([chunk, functions]) => {
        const holders = layers.filter((layer) => files.get(layer)?.has(chunk));
        return `${holders.join('+') || 'no layer'}: ${[...functions].toSorted().join(', ')}`;
      })
      .toSorted()
  };
};

/**
 * Whether the extracted handlers resolved through the path the check intends: every function's
 * `@aws-sdk/client-dynamodb` import mapped to the CLI's SDK and nothing else from `@aws-sdk`; on the split path, at
 * least one `/opt/nodejs/chunks` import per function mapped to a chunk of the sample's own layers, which must be exactly
 * the layers the hook was given; no layer chunk mapped on any other path. Empty when it held.
 */
const resolverProblems = ({
  sample,
  runtime,
  expected,
  layers
}: {
  sample: SampleRecord;
  runtime: RuntimeCheck | null;
  expected: ExpectedPath;
  /** The sample's shared layers, from its artifacts. */
  layers: string[];
}) => {
  if (!runtime) return ['the extracted functions were not run'];
  const files = layerChunkFiles(sample);
  const problems: string[] = [];
  if (JSON.stringify(runtime.layers) !== JSON.stringify(layers)) {
    problems.push(
      `the hook was given layers ${runtime.layers.join(', ') || 'none'}, but the sample built ${layers.join(', ') || 'none'}`
    );
  }
  if (runtime.functions.length === 0) problems.push('no function was invoked');
  for (const run of runtime.functions) {
    if (JSON.stringify(run.sdk) !== JSON.stringify([RUNTIME_SDK_SPECIFIER])) {
      problems.push(
        `${run.function}: the SDK imports mapped were ${run.sdk.join(', ') || 'none'}, not ${RUNTIME_SDK_SPECIFIER}`
      );
    }
    const outside = run.layerChunks.filter((chunk) => ![...files.values()].some((names) => names.has(chunk)));
    if (outside.length > 0)
      problems.push(`${run.function}: mapped ${outside.join(', ')}, in none of the sample's layers`);
    if (expected === 'split' && run.layerChunks.length === 0) {
      problems.push(`${run.function}: no /opt/nodejs/chunks import was mapped to the sample's layer`);
    }
    if (expected !== 'split' && run.layerChunks.length > 0) {
      problems.push(`${run.function}: layer chunks were mapped on the ${expected} path`);
    }
  }
  return problems;
};

export type ConfigOnlySampleResult = {
  id: string;
  functions: number;
  /** The path this fixture size must take, from its function count, never from the setup. */
  expected: ExpectedPath;
  state: ConfigOnlySampleState;
  round: number;
  warmUp: boolean;
  exitCode: number | null;
  wallMs: number;
  observedPath: string;
  failedAt: string | null;
  functionZips: number;
  sharedLayers: number;
  buildEntries: number;
  layeredChunks: number | null;
  identities: Pick<ArtifactIdentity, 'key' | 'role' | 'canonicalSha256' | 'nameDigest' | 'sha256'>[];
  /** Per function: the SHA-256 of what its extracted handler answered. */
  answers: { function: string; responseSha256: string | null }[];
  unexpectedRequests: string[];
  dnsNames: string[];
  preparationMs: number | null;
  runtimeMs: number | null;
  /** For the control: the functions whose refused `CONFIG_REVISION` value the CLI named. */
  refusedEntries: string[] | null;
  /** How it grouped its functions; null for the control, or without artifacts. */
  grouping: Grouping | null;
  /** Where the extracted handlers' resolution departed from the intended path (`resolverProblems`); empty otherwise. */
  resolverProblems: string[];
  /** Every other requirement the sample did not meet; empty when it met them all. */
  problems: string[];
};

/** Holds one config-only sample to its state, the artifact contract, isolation and the extracted handlers' answers. */
export const checkConfigOnlySample = ({
  sample,
  shape,
  helperLambdas
}: {
  sample: SampleRecord;
  shape: ConfigOnlyShapeSetup | null;
  helperLambdas: InstalledHelperLambda[];
}): ConfigOnlySampleResult => {
  const evidence = sample.configOnly ?? null;
  const problems: string[] = [];
  const state = evidence?.state ?? (sample.scenario.replace(/^\d+-functions-/, '') as ConfigOnlySampleState);
  const functions = evidence?.functions ?? Number(sample.scenario.split('-')[0]);
  const expected = expectedPathOf(functions);
  const contract =
    sample.artifacts && shape
      ? checkArtifactContract({ sample, functions: shape.functionNames, situation: 'platform-ready', helperLambdas })
      : null;
  // Every sample runs with the fixture and the DNS recorder, so a missing record is a problem, not an empty one.
  const requestsRecorded = Array.isArray(sample.fixtureRequests);
  const lookupsRecorded = Array.isArray(sample.dnsQueries);
  const unexpectedRequests = (requestsRecorded ? sample.fixtureRequests : [])
    .map(describeRequest)
    .filter((request) => !EXPECTED_REQUESTS.has(request));
  const dnsNames = [...new Set((lookupsRecorded ? sample.dnsQueries! : []).map(({ name }) => name))];

  if (!shape) problems.push('no setup for this fixture size');
  if (!evidence) problems.push('no config-only evidence was recorded');
  if (evidence && shape) {
    const variant = shape.variants[evidence.variant];
    if (!variant) problems.push(`the setup has no ${evidence.variant} variant`);
    else if (evidence.configSha256 !== variant.sha256) {
      problems.push(`the recorded configuration is not the ${evidence.variant} variant`);
    }
    const expected = { configSha256: evidence.configSha256, source: shape.source };
    // Saved evidence is read back as JSON, so a missing state is a problem to report, not a crash.
    problems.push(
      ...(evidence.before
        ? stateProblems({ state: evidence.before, ...expected, output: false }).map((problem) => `before: ${problem}`)
        : ['before: no project state was recorded']),
      ...(evidence.after
        ? stateProblems({ state: evidence.after, ...expected }).map((problem) => `after: ${problem}`)
        : ['after: no project state was recorded'])
    );
  }
  if (state === CONFIG_CONTROL) {
    if (sample.exitCode === 0) problems.push('the refused value was accepted: exit code 0');
    if (sample.analysis?.failedAt !== 'config:validate') {
      problems.push(`failed at ${sample.analysis?.failedAt ?? 'nothing'}, not config:validate`);
    }
    if (contract && contract.counts.functionZips + contract.counts.otherZips > 0) {
      problems.push('a packaging ZIP after the configuration was refused');
    }
    if (contract && contract.counts.buildEntries > 0) {
      problems.push(`${contract.counts.buildEntries} entries under build/ after the configuration was refused`);
    }
    if (shape && JSON.stringify(evidence?.refusedEntries ?? null) !== JSON.stringify(shape.functionNames.toSorted())) {
      problems.push(
        `the output names ${evidence?.refusedEntries?.join(', ') || 'no'} refused CONFIG_REVISION entries, not every function's`
      );
    }
  } else {
    if (!contract) problems.push('no artifact manifest');
    else problems.push(...contract.problems.map((problem) => `artifact contract: ${problem}`));
    if (!evidence?.runtime) problems.push('the extracted functions were not run');
    else {
      problems.push(...evidence.runtime.problems.map((problem) => `extracted: ${problem}`));
      const ran = evidence.runtime.functions.map((run) => run.function);
      if (shape && JSON.stringify(ran) !== JSON.stringify(shape.functionNames)) {
        problems.push(`extracted: ran ${ran.join(', ') || 'nothing'}, not every function`);
      }
    }
  }
  if (!requestsRecorded) problems.push('no record of the fixture requests');
  if (!lookupsRecorded) problems.push('no record of the DNS lookups');
  if (dnsNames.length > 0) problems.push(`DNS lookups: ${dnsNames.join(', ')}`);
  if (unexpectedRequests.length > 0) problems.push(`requests beyond the CLI's own: ${unexpectedRequests.join(', ')}`);
  const grouping =
    state !== CONFIG_CONTROL && contract ? groupingOf({ sample, contract, runtime: evidence?.runtime ?? null }) : null;

  return {
    id: sample.id,
    functions,
    expected,
    state,
    round: sample.round,
    warmUp: sample.warmUp,
    exitCode: sample.exitCode,
    wallMs: sample.wallMs,
    observedPath: contract?.observedPath ?? 'unknown',
    failedAt: sample.analysis?.failedAt ?? null,
    functionZips: contract?.counts.functionZips ?? 0,
    sharedLayers: contract?.counts.sharedLayers ?? 0,
    buildEntries: contract?.counts.buildEntries ?? 0,
    layeredChunks: sample.analysis?.layeredChunks ?? null,
    identities: (contract?.identities ?? []).map(({ key, role, canonicalSha256, nameDigest, sha256 }) => ({
      key,
      role,
      canonicalSha256,
      nameDigest,
      sha256
    })),
    answers: (evidence?.runtime?.functions ?? []).map((run) => ({
      function: run.function,
      responseSha256: run.answer?.responseSha256 ?? null
    })),
    unexpectedRequests,
    dnsNames,
    preparationMs: evidence?.preparation?.ms ?? null,
    runtimeMs: evidence?.runtime?.ms ?? null,
    refusedEntries: evidence?.refusedEntries ?? null,
    grouping,
    resolverProblems:
      state === CONFIG_CONTROL
        ? []
        : resolverProblems({
            sample,
            runtime: evidence?.runtime ?? null,
            expected,
            layers: grouping?.layers.map(({ layer }) => layer) ?? []
          }),
    problems
  };
};

/** One artifact over a state's samples: its distinct canonical digests, ZIP name digests and exact SHA-256s. */
export type StateIdentity = {
  key: string;
  role: ArtifactIdentity['role'];
  canonicalSha256: string[];
  nameDigests: string[];
  exactSha256: string[];
  /** Samples of the state that had this artifact. */
  present: number;
};

export type ConfigOnlyStateResult = {
  state: ConfigOnlyState;
  samples: number;
  retained: number;
  withProblems: number;
  observedPaths: string[];
  sharedLayers: number[];
  layeredChunks: (number | null)[];
  identity: StateIdentity[];
};

export type Comparison = { passed: boolean; problems: string[] };

export type PairedStateTiming = {
  state: Exclude<ConfigOnlyState, 'base'>;
  /** Retained rounds with both this state and the base: the state's value minus the base's, in the same round. */
  pairs: number;
  wallMs: Distribution | null;
  /** `runCommand`, start to end: the package work without the process's startup and teardown. */
  commandMs: Distribution | null;
  /** The startup imports, which read no configuration: a control for run-to-run variation. */
  moduleLoadMs: Distribution | null;
  phases: { phase: PhaseName; pairs: number; unionMs: Distribution | null }[];
};

export type ConfigOnlyShapeResult = {
  functions: number;
  /** The path this fixture size must take, from its function count. */
  expected: ExpectedPath;
  states: ConfigOnlyStateResult[];
  /** Each state repeated its canonical digests and ZIP name digests over all its samples. */
  statesRepeated: Comparison;
  /** Every sample of every state grouped its functions as the base did (`Grouping`); layer content may differ. */
  groupingUnchanged: Comparison & { grouping: Grouping | null };
  deploymentPreserved: Comparison;
  revertsRestored: Comparison;
  packagingChanged: Comparison & {
    functions: { function: string; canonicalChanged: boolean | null; nameDigestChanged: boolean | null }[];
    splitBundleChanged: boolean | null;
    /** Whether any shared layer's content changed, which `minify: false` may do without changing the grouping. */
    layerContentChanged: boolean | null;
    sharedLayers: { base: string; edit: string };
  };
  /** Every function's extracted handler gave one answer over every state. */
  answersIdentical: Comparison;
  control: ConfigOnlySampleResult | null;
  paired: PairedStateTiming[];
};

export type ConfigOnlyResult = {
  setup: ConfigOnlySetup | null;
  setupProblems: string[];
  /** Retained rounds every state had to have. */
  retainedWanted: number;
  /**
   * Where the evidence lacks a required fixture size, a state's warm-up or a retained round, or a fixture size's single
   * control; empty when every population is complete.
   */
  populationProblems: string[];
  samples: ConfigOnlySampleResult[];
  shapes: ConfigOnlyShapeResult[];
  retainedPerState: { functions: number; state: ConfigOnlyState; retained: number }[];
};

const identityOf = (results: ConfigOnlySampleResult[]): StateIdentity[] => {
  const keys = distinctSorted(results.flatMap(({ identities }) => identities.map(({ key }) => key)));
  return keys.map((key) => {
    const found = results.flatMap(({ identities }) => identities.filter((identity) => identity.key === key));
    return {
      key,
      role: found[0]!.role,
      canonicalSha256: distinctSorted(found.map(({ canonicalSha256 }) => canonicalSha256)),
      nameDigests: distinctSorted(found.flatMap(({ nameDigest }) => (nameDigest ? [nameDigest] : []))),
      exactSha256: distinctSorted(found.flatMap(({ sha256 }) => (sha256 ? [sha256] : []))),
      present: found.length
    };
  });
};

/** Every artifact of `to` against `from`: present in both, and one equal canonical and name digest in each. */
const sameIdentities = (from: ConfigOnlyStateResult, to: ConfigOnlyStateResult) => {
  if (from.samples === 0 || to.samples === 0) return [`${from.samples === 0 ? from.state : to.state}: no samples`];
  const problems: string[] = [];
  const keys = distinctSorted([...from.identity, ...to.identity].map(({ key }) => key));
  for (const key of keys) {
    const left = from.identity.find((identity) => identity.key === key);
    const right = to.identity.find((identity) => identity.key === key);
    if (!left || !right) {
      problems.push(`${key}: only in ${left ? from.state : to.state}`);
      continue;
    }
    if (left.canonicalSha256.length !== 1 || right.canonicalSha256.length !== 1) {
      problems.push(`${key}: not one canonical digest per state`);
    } else if (left.canonicalSha256[0] !== right.canonicalSha256[0]) {
      problems.push(
        `${key}: canonical digest ${left.canonicalSha256[0]!.slice(0, 12)} became ${right.canonicalSha256[0]!.slice(0, 12)}`
      );
    }
    if (JSON.stringify(left.nameDigests) !== JSON.stringify(right.nameDigests)) {
      problems.push(`${key}: name digest ${left.nameDigests.join(',')} became ${right.nameDigests.join(',')}`);
    }
  }
  return problems;
};

/** The entries of `from` missing from `to`, counted as multisets. */
const missingFrom = (from: string[], to: string[]) => {
  const left = [...to];
  return from.filter((entry) => {
    const index = left.indexOf(entry);
    if (index === -1) return true;
    left.splice(index, 1);
    return false;
  });
};

/** What differs between two groupings, part by part; empty when they are the same. */
export const groupingChanges = (base: Grouping, other: Grouping) => {
  const layers = (grouping: Grouping) =>
    grouping.layers.map(({ layer, chunks }) => `${layer} with ${chunks} chunks`).join(', ') || 'none';
  const lost = missingFrom(base.sharing, other.sharing);
  const gained = missingFrom(other.sharing, base.sharing);
  return [
    ...(base.path === other.path ? [] : [`path ${base.path} became ${other.path}`]),
    ...(JSON.stringify(base.functions) === JSON.stringify(other.functions)
      ? []
      : [`functions ${base.functions.join(', ')} became ${other.functions.join(', ') || 'none'}`]),
    ...(layers(base) === layers(other) ? [] : [`shared layers ${layers(base)} became ${layers(other)}`]),
    ...(base.layeredChunks === other.layeredChunks
      ? []
      : [`layered chunks ${base.layeredChunks} became ${other.layeredChunks}`]),
    ...(lost.length + gained.length === 0
      ? []
      : [
          `chunk sharing changed: ${[...lost.map((entry) => `lost [${entry}]`), ...gained.map((entry) => `gained [${entry}]`)].join(', ')}`
        ])
  ];
};

const single = (identity: StateIdentity | undefined, pick: 'canonicalSha256' | 'nameDigests') =>
  identity && identity[pick].length === 1 ? identity[pick][0]! : null;

/** The paired differences of one analysis figure, over the pairs where both samples have it. */
const difference = (
  pairs: { edited: SampleRecord | undefined; base: SampleRecord | undefined }[],
  field: 'commandMs' | 'moduleLoadMs'
) =>
  summarize(
    pairs.flatMap(({ edited, base }) => {
      const [left, right] = [edited?.analysis?.[field], base?.analysis?.[field]];
      return typeof left === 'number' && typeof right === 'number' ? [round(left - right)] : [];
    })
  );

const pairedTiming = (results: ConfigOnlySampleResult[], samples: SampleRecord[]): PairedStateTiming[] => {
  const byId = new Map(samples.map((sample) => [sample.id, sample]));
  const retained = results.filter(({ warmUp }) => !warmUp);
  const baseOf = (roundNumber: number) =>
    retained.find(({ state, round: sampleRound }) => state === 'base' && sampleRound === roundNumber);
  return CONFIG_ONLY_STATES.filter((state): state is Exclude<ConfigOnlyState, 'base'> => state !== 'base').map(
    (state) => {
      const pairs = retained
        .filter((result) => result.state === state)
        .flatMap((result) => {
          const base = baseOf(result.round);
          return base ? [{ edited: byId.get(result.id), base: byId.get(base.id), result, baseResult: base }] : [];
        });
      return {
        state,
        pairs: pairs.length,
        wallMs: summarize(pairs.map(({ result, baseResult }) => round(result.wallMs - baseResult.wallMs))),
        commandMs: difference(pairs, 'commandMs'),
        moduleLoadMs: difference(pairs, 'moduleLoadMs'),
        phases: PHASE_NAMES.map((phase) => {
          const differences = pairs.flatMap(({ edited, base }) => {
            const left = edited?.analysis?.phases[phase];
            const right = base?.analysis?.phases[phase];
            return left?.visited && right?.visited ? [round(left.unionMs - right.unionMs)] : [];
          });
          return { phase, pairs: differences.length, unionMs: summarize(differences) };
        })
      };
    }
  );
};

const byNumber = (left: number, right: number) => left - right;

/** Where a fixture size's evidence lacks its setup, a state's warm-up or retained rounds, or its single control. */
const populationProblemsOf = ({
  functions,
  results,
  setup,
  retainedWanted
}: {
  functions: number;
  results: ConfigOnlySampleResult[];
  setup: ConfigOnlyShapeSetup | null;
  retainedWanted: number;
}) => {
  const size = `${functions} function${functions === 1 ? '' : 's'}`;
  const expected = expectedPathOf(functions);
  const problems = [
    ...(setup ? [] : [`${size}: no setup`]),
    ...(setup && setup.expected !== expected ? [`${size}: the setup expects ${setup.expected}, not ${expected}`] : []),
    ...(setup
      ? CONFIG_VARIANTS.filter((variant) => !setup.variants[variant]).map((variant) => `${size}: no ${variant} variant`)
      : [])
  ];
  const known = new Set<string>([...CONFIG_ONLY_STATES, CONFIG_CONTROL]);
  const unknown = distinctSorted(results.filter(({ state }) => !known.has(state)).map(({ state }) => state));
  if (unknown.length > 0) problems.push(`${size}: samples of unknown states ${unknown.join(', ')}`);
  for (const state of CONFIG_ONLY_STATES) {
    const ofState = results.filter((result) => result.state === state);
    const warmUps = ofState.filter(({ warmUp }) => warmUp);
    if (warmUps.length !== 1 || warmUps[0]!.round !== 0) {
      problems.push(`${size}, ${state}: ${warmUps.length} warm-up samples instead of 1 in round 0`);
    }
    for (let round = 1; round <= retainedWanted; round++) {
      const inRound = ofState.filter((result) => !result.warmUp && result.round === round).length;
      if (inRound !== 1) problems.push(`${size}, ${state}: ${inRound} retained samples in round ${round} instead of 1`);
    }
  }
  const controls = results.filter(({ state }) => state === CONFIG_CONTROL);
  if (controls.length !== 1 || controls[0]!.warmUp) problems.push(`${size}: ${controls.length} controls instead of 1`);
  return problems;
};

/**
 * Every config-only sample checked, then each fixture size's states compared with its base. The required sizes are
 * evaluated whether or not the setup or the samples name them, so evidence without one fails.
 */
export const evaluateConfigOnly = ({
  samples,
  setup,
  helperLambdas,
  retainedWanted
}: {
  samples: SampleRecord[];
  setup: ConfigOnlySetup | null;
  helperLambdas: InstalledHelperLambda[];
  /** Retained rounds every state must have, as the run was configured. */
  retainedWanted: number;
}): ConfigOnlyResult => {
  const own = samples.filter(({ suite }) => suite === 'config-only');
  const shapeOf = (functions: number) => setup?.shapes.find((shape) => shape.functions === functions) ?? null;
  const results = own.map((sample) =>
    checkConfigOnlySample({
      sample,
      shape: shapeOf(sample.configOnly?.functions ?? Number(sample.scenario.split('-')[0])),
      helperLambdas
    })
  );
  const setupProblems = [
    ...(setup ? [] : ['no config-only setup was recorded']),
    ...(setup && !setup.sdk.version ? [`the runtime SDK ${setup.sdk.specifier} is not installed for the CLI`] : []),
    ...(setup?.shapes ?? []).flatMap(({ functions, variants }) =>
      Object.values(variants).flatMap(({ variant, problems }) =>
        problems.map((problem) => `${functions} functions, ${variant}: ${problem}`)
      )
    )
  ];
  const sizes = [
    ...new Set([
      ...CONFIG_ONLY_REQUIRED_FUNCTIONS,
      ...results.map(({ functions }) => functions),
      ...(setup?.shapes ?? []).map(({ functions }) => functions)
    ])
  ].toSorted(byNumber);
  const populationProblems = [
    ...(Number.isInteger(retainedWanted) && retainedWanted >= 1
      ? []
      : [`${retainedWanted} retained rounds were asked for; at least 1 is needed`]),
    ...sizes.flatMap((functions) =>
      populationProblemsOf({
        functions,
        results: results.filter((result) => result.functions === functions),
        setup: shapeOf(functions),
        retainedWanted
      })
    )
  ];
  const shapes = sizes.map((functions): ConfigOnlyShapeResult => {
    const shapeResults = results.filter((result) => result.functions === functions);
    const states = CONFIG_ONLY_STATES.map((state): ConfigOnlyStateResult => {
      const ofState = shapeResults.filter((result) => result.state === state);
      return {
        state,
        samples: ofState.length,
        retained: ofState.filter(({ warmUp }) => !warmUp).length,
        withProblems: ofState.filter(
          ({ problems, resolverProblems: resolver }) => problems.length + resolver.length > 0
        ).length,
        observedPaths: distinctSorted(ofState.map(({ observedPath }) => observedPath)),
        sharedLayers: distinctSorted(ofState.map(({ sharedLayers }) => sharedLayers)),
        layeredChunks: distinctSorted(ofState.map(({ layeredChunks }) => layeredChunks)),
        identity: identityOf(ofState)
      };
    });
    const stateOf = (state: ConfigOnlyState) => states.find((result) => result.state === state)!;
    const base = stateOf('base');
    const edit = stateOf('packaging-edit');
    const expected = expectedPathOf(functions);

    const repeatProblems = states.flatMap(({ state, samples: count, identity }) =>
      count === 0
        ? [`${state}: no samples`]
        : identity.flatMap(({ key, role, canonicalSha256, nameDigests, present }) => [
            ...(present === count ? [] : [`${state}: ${key} in ${present} of ${count} samples`]),
            ...(canonicalSha256.length === 1
              ? []
              : [`${state}: ${key} has ${canonicalSha256.length} canonical digests`]),
            ...(role === 'function-zip' && nameDigests.length !== 1
              ? [`${state}: ${key} has ${nameDigests.length} name digests`]
              : [])
          ])
    );

    // The grouping of every sample of every state against the base's, which must be one grouping on the expected path.
    const stateResults = shapeResults.filter(({ state }) => state !== CONFIG_CONTROL);
    const baseGroupings = distinctSorted(
      stateResults.filter(({ state }) => state === 'base').map(({ grouping }) => JSON.stringify(grouping))
    );
    const baseGrouping =
      baseGroupings.length === 1 && baseGroupings[0] !== 'null' ? (JSON.parse(baseGroupings[0]!) as Grouping) : null;
    const wantedPath = `${expected === 'split' ? 'split' : 'per-function'} ${functions}`;
    const groupingProblems = [
      ...(base.samples === 0 ? ['base: no samples'] : []),
      ...(base.samples > 0 && !baseGrouping ? [`base: ${baseGroupings.length} different groupings`] : []),
      ...(baseGrouping && baseGrouping.path !== wantedPath
        ? [`base: path ${baseGrouping.path}, not ${wantedPath}`]
        : []),
      ...stateResults.flatMap(({ id, state, grouping }) =>
        !grouping
          ? [`${state}: ${id} has no grouping`]
          : baseGrouping
            ? groupingChanges(baseGrouping, grouping).map((change) => `${state}: ${change}`)
            : []
      )
    ];

    const deploymentProblems = sameIdentities(base, stateOf('deployment-edit'));
    const revertProblems = [
      ...sameIdentities(base, stateOf('base-after-deployment-edit')).map(
        (problem) => `after the deployment edit: ${problem}`
      ),
      ...sameIdentities(base, stateOf('base-after-packaging-edit')).map(
        (problem) => `after the packaging edit: ${problem}`
      )
    ];

    const zipKeys = distinctSorted(
      [...base.identity, ...edit.identity].filter(({ role }) => role === 'function-zip').map(({ key }) => key)
    );
    const changedFunctions = zipKeys.map((key) => {
      const before = base.identity.find((identity) => identity.key === key);
      const after = edit.identity.find((identity) => identity.key === key);
      const [canonicalBefore, canonicalAfter] = [single(before, 'canonicalSha256'), single(after, 'canonicalSha256')];
      const [nameBefore, nameAfter] = [single(before, 'nameDigests'), single(after, 'nameDigests')];
      return {
        function: key.replace(/^function ZIP /, ''),
        canonicalChanged: canonicalBefore && canonicalAfter ? canonicalBefore !== canonicalAfter : null,
        nameDigestChanged: nameBefore && nameAfter ? nameBefore !== nameAfter : null
      };
    });
    const packagingProblems = [
      ...(edit.samples === 0 ? ['no packaging-edit samples'] : []),
      ...changedFunctions.flatMap(({ function: name, canonicalChanged }) =>
        canonicalChanged === true
          ? []
          : [canonicalChanged === false ? `${name}: payload unchanged` : `${name}: not comparable`]
      ),
      ...(JSON.stringify(base.observedPaths) === JSON.stringify(edit.observedPaths) && base.observedPaths.length === 1
        ? []
        : [`packaged ${edit.observedPaths.join(', ')} instead of ${base.observedPaths.join(', ')}`]),
      ...(zipKeys.every((key) => base.identity.some((identity) => identity.key === key)) &&
      zipKeys.every((key) => edit.identity.some((identity) => identity.key === key))
        ? []
        : ['the function ZIPs are not the same functions'])
    ];
    const splitBefore = single(
      base.identity.find(({ key }) => key === 'split bundle'),
      'canonicalSha256'
    );
    const splitAfter = single(
      edit.identity.find(({ key }) => key === 'split bundle'),
      'canonicalSha256'
    );
    const layerDigests = (state: ConfigOnlyStateResult) =>
      state.identity
        .filter(({ role }) => role === 'shared-layer')
        .map(({ key, canonicalSha256 }) => ({ key, canonicalSha256 }));
    const layerSummary = (state: ConfigOnlyStateResult) =>
      layerDigests(state)
        .map(({ key, canonicalSha256 }) => `${key} ${canonicalSha256.map((digest) => digest.slice(0, 12)).join('/')}`)
        .join(', ') || 'none';

    const functionNames = distinctSorted(
      stateResults.flatMap(({ answers }) => answers.map((answer) => answer.function))
    );
    const answerDifferences = functionNames.flatMap((name) => {
      const responses = stateResults.flatMap(({ answers }) =>
        answers.filter((answer) => answer.function === name).map(({ responseSha256 }) => responseSha256)
      );
      const distinct = distinctSorted(responses.map((response) => response ?? 'none'));
      return distinct.length === 1 && distinct[0] !== 'none' ? [] : [`${name}: ${distinct.length} distinct answers`];
    });
    const controls = shapeResults.filter(({ state }) => state === CONFIG_CONTROL);

    return {
      functions,
      expected,
      states,
      statesRepeated: { passed: repeatProblems.length === 0, problems: repeatProblems },
      groupingUnchanged: {
        passed: baseGrouping !== null && groupingProblems.length === 0,
        problems: groupingProblems,
        grouping: baseGrouping
      },
      deploymentPreserved: {
        passed: base.samples > 0 && stateOf('deployment-edit').samples > 0 && deploymentProblems.length === 0,
        problems: deploymentProblems
      },
      revertsRestored: { passed: revertProblems.length === 0, problems: revertProblems },
      packagingChanged: {
        passed: zipKeys.length > 0 && packagingProblems.length === 0,
        problems: packagingProblems,
        functions: changedFunctions,
        splitBundleChanged: splitBefore && splitAfter ? splitBefore !== splitAfter : null,
        layerContentChanged:
          layerDigests(base).length === 0 && layerDigests(edit).length === 0
            ? null
            : JSON.stringify(layerDigests(base)) !== JSON.stringify(layerDigests(edit)),
        sharedLayers: { base: layerSummary(base), edit: layerSummary(edit) }
      },
      answersIdentical: {
        passed: functionNames.length > 0 && answerDifferences.length === 0,
        problems: answerDifferences
      },
      control: controls.length === 1 ? controls[0]! : null,
      paired: pairedTiming(shapeResults, own)
    };
  });
  return {
    setup,
    setupProblems,
    retainedWanted,
    populationProblems,
    samples: results,
    shapes,
    retainedPerState: sizes.flatMap((functions) =>
      CONFIG_ONLY_STATES.map((state) => ({
        functions,
        state,
        retained: results.filter((result) => result.functions === functions && result.state === state && !result.warmUp)
          .length
      }))
    )
  };
};

/**
 * The outside checks of a config-only run, from its evaluation and the inner report's fixture identities. The harness
 * applies them after a run and `config-only-replay.ts` to a saved run, so both hold evidence to the same rules.
 */
export const configOnlyChecks = ({
  result,
  fixtures
}: {
  result: ConfigOnlyResult;
  fixtures: Record<string, { before: unknown; after: unknown }>;
}) => {
  const failing = (pick: (shape: ConfigOnlyShapeResult) => Comparison) =>
    result.shapes
      .filter((shape) => !pick(shape).passed)
      .map((shape) => ({ functions: shape.functions, problems: pick(shape).problems }));
  const everyShape = (pick: (shape: ConfigOnlyShapeResult) => Comparison) =>
    result.shapes.length > 0 && failing(pick).length === 0;
  const stateSamples = result.samples.filter(({ state }) => state !== CONFIG_CONTROL);
  const withProblems = (pick: (sample: ConfigOnlySampleResult) => string[]) =>
    stateSamples
      .filter((sample) => pick(sample).length > 0)
      .map((sample) => ({ id: sample.id, problems: pick(sample) }));
  const ownFixtures = Object.entries(fixtures).filter(([key]) => key.startsWith('config-only-'));
  const missingFixtures = CONFIG_ONLY_REQUIRED_FUNCTIONS.map((count) => `config-only-functions-${count}`).filter(
    (key) => !(key in fixtures)
  );
  return [
    {
      check: 'the config-only variants parse, name the fixture functions and differ from the base only as intended',
      passed: result.setupProblems.length === 0,
      detail: result.setupProblems
    },
    {
      check:
        'both required fixture sizes (1 function per-function, 10 split) have every state with one warm-up and every retained round, and one control each',
      passed: result.populationProblems.length === 0,
      detail: result.populationProblems
    },
    {
      check:
        'every config-only sample met the artifact contract, kept its source and configuration, stayed isolated, and its extracted handlers answered',
      passed: stateSamples.length > 0 && withProblems(({ problems }) => problems).length === 0,
      detail: withProblems(({ problems }) => problems)
    },
    {
      check: `every extracted handler, run on ${RUNTIME_LABEL}, resolved its ${RUNTIME_SDK_SPECIFIER} import through the hook, and on the split path mapped at least one /opt/nodejs/chunks import to the sample's own layer, with nothing else mapped`,
      passed: stateSamples.length > 0 && withProblems(({ resolverProblems: resolver }) => resolver).length === 0,
      detail: withProblems(({ resolverProblems: resolver }) => resolver)
    },
    {
      check: 'every config-only state repeated its canonical and ZIP name digests over its samples',
      passed: everyShape(({ statesRepeated }) => statesRepeated),
      detail: failing(({ statesRepeated }) => statesRepeated)
    },
    {
      check:
        'every state kept the base grouping: path, functions, shared layers and their chunk counts, layered chunks, and the functions sharing each mapped layer chunk (layer content may change)',
      passed: everyShape(({ groupingUnchanged }) => groupingUnchanged),
      detail: failing(({ groupingUnchanged }) => groupingUnchanged)
    },
    {
      check:
        'the deployment-only edit kept every function ZIP canonical and name digest, every folder, the split bundle, the shared layers and the output listing',
      passed: everyShape(({ deploymentPreserved }) => deploymentPreserved),
      detail: failing(({ deploymentPreserved }) => deploymentPreserved)
    },
    {
      check: 'both reverts restored every base identity',
      passed: everyShape(({ revertsRestored }) => revertsRestored),
      detail: failing(({ revertsRestored }) => revertsRestored)
    },
    {
      check: 'minify: false changed every function payload, on the same packaging path with the same functions',
      passed: everyShape(({ packagingChanged }) => packagingChanged),
      detail: failing(({ packagingChanged }) => packagingChanged)
    },
    {
      check: "every function's extracted handler answered the same in every state",
      passed: everyShape(({ answersIdentical }) => answersIdentical),
      detail: failing(({ answersIdentical }) => answersIdentical)
    },
    {
      check: 'the refused CONFIG_REVISION control failed at config:validate without packaging',
      passed:
        result.shapes.length > 0 &&
        result.shapes.every(({ control }) => control !== null && control.problems.length === 0),
      detail: result.shapes.map(({ functions, control }) => ({ functions, control: control?.problems ?? 'not run' }))
    },
    {
      check: 'every config-only fixture, both required sizes included, ended byte-identical to how it was generated',
      passed:
        missingFixtures.length === 0 &&
        ownFixtures.length > 0 &&
        ownFixtures.every(([, { before, after }]) => JSON.stringify(before) === JSON.stringify(after)),
      detail: { missing: missingFixtures, fixtures: Object.fromEntries(ownFixtures) }
    }
  ];
};
