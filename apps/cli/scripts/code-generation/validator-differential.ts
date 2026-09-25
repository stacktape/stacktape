/**
 * Differential check of two generations of the generated config schema (`@generated/schemas/validate-config-zod.ts`):
 * the frozen oracle preserved before a generator change, and the current output or a candidate. Both run the same
 * corpus (`validator-differential-corpus.ts`) as independent modules against one Zod installation.
 *
 * For every case it compares:
 * - acceptance (`safeParse(...).success`);
 * - for an accepted case, the parsed data compared recursively with sorted keys, so defaults, number and boolean
 *   preprocessing, stripped keys, passed-through keys and explicit `undefined` values all count; a difference only in
 *   key order is reported as its own kind;
 * - for a rejected case, the issues in order: code, path, message and every other field, each union branch's issues in
 *   branch order, without the rejected input;
 * - `validateConfigObject`, the walker behind docs and example validation, run with each schema: its verdict, directive
 *   filtering and walked leaf paths and messages.
 * Each schema parses every case twice, and a parse must leave its input unchanged.
 *
 * A clean run shows equivalence on this corpus only. It does not compare descriptions and other metadata, the JSON
 * schemas and types generated alongside, or the CLI as built: the compiled CLI's wrapper (`zod-validator.ts`), bundling,
 * bytecode and the lazy import still need a process test. That wrapper formats issues from code, path, message, union
 * branch errors, values, expected, received, keys and note, all of which are compared here.
 *
 * Usage, from apps/cli:
 *   bun scripts/code-generation/validator-differential.ts --baseline <validator-baseline dir> --out <new report.json>
 *     [--current <generated schema>] [--cases <new cases.jsonl>] [--corpus <saved corpus> | --save-corpus <new file>]
 *     [--seed <n>] [--mutations <n>]
 * Exit code 0: equivalent on the corpus; 1: differences, described in the report; 2: refused before comparing.
 */
import type { Corpus, CorpusCase } from './validator-differential-corpus';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { JSON_SCHEMAS_FOLDER_PATH } from 'src/config/project-paths';
import { z } from 'zod';
import { buildCorpus, decodeCorpus, encodeCorpus } from './validator-differential-corpus';

const GENERATED_SCHEMA_FILE = 'validate-config-zod.ts';
/** The oracle's entry in the baseline manifest. */
const MANIFEST_ENTRY = 'apps/cli/@generated/schemas/validate-config-zod.ts';
export const DEFAULT_SEED = 20260924;
export const DEFAULT_MUTATIONS = 600;
const MAX_DETAILED_DIFFERENCES = 25;

type Path = (string | number)[];
type Schema = { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: { issues: any[] } } };
type WalkerError = { path: string; message: string };
export type Walker = (config: unknown, schema: any) => { valid: boolean; errors: WalkerError[] };

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const short = (fingerprintText: string) => sha256(fingerprintText).slice(0, 16);
const truncate = (text: string, length: number) => (text.length > length ? `${text.slice(0, length)}…` : text);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const prototypeTag = (value: object) => {
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === Array.prototype) return '';
  return prototype === null ? '<null>' : `<${prototype.constructor?.name ?? 'unknown'}>`;
};

/**
 * A deterministic serialization that keeps apart every value JSON would merge: `undefined` and absent keys, NaN,
 * infinities, -0, array holes, bigints and non-plain prototypes. Keys are sorted unless `ordered`.
 */
export const fingerprint = (value: unknown, ordered = false): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value);
    case 'string':
      return JSON.stringify(value);
    case 'bigint':
      return `${value}n`;
    case 'symbol':
      return `Symbol(${value.description ?? ''})`;
    case 'function':
      return 'function';
    case 'boolean':
      return String(value);
  }
  const object = value as object;
  if (object instanceof Date) return `Date(${Number.isNaN(object.getTime()) ? 'invalid' : object.toISOString()})`;
  if (Array.isArray(object)) {
    const items = Array.from(object, (item, index) => (index in object ? fingerprint(item, ordered) : 'hole'));
    return `${prototypeTag(object)}[${items.join(',')}]`;
  }
  const keys = ordered ? Object.keys(object) : Object.keys(object).toSorted();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${fingerprint((object as any)[key], ordered)}`);
  return `${prototypeTag(object)}{${entries.join(',')}}`;
};

export const formatPath = (path: Path) =>
  path
    .map((key, index) =>
      typeof key === 'number'
        ? `[${key}]`
        : /^[A-Za-z_$][\w$-]*$/.test(key)
          ? `${index === 0 ? '' : '.'}${key}`
          : `[${JSON.stringify(key)}]`
    )
    .join('') || '<root>';

/** A value as a difference report shows it. Strings from a configuration are shown only by length and hash. */
const describeValue = (value: unknown, showStrings: boolean): string => {
  if (typeof value === 'string') {
    return showStrings
      ? JSON.stringify(truncate(value, 200))
      : `string(${value.length}, sha256 ${short(value).slice(0, 8)})`;
  }
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value !== null && typeof value === 'object') return `object(${Object.keys(value).length} keys)`;
  return fingerprint(value);
};

export type Difference = { path: string; oracle: string; current: string };

/** The first place, in sorted key order, where two values differ; `undefined` when they are equal. */
export const firstDifference = (
  oracle: unknown,
  current: unknown,
  { showStrings = false, path = [] }: { showStrings?: boolean; path?: Path } = {}
): Difference | undefined => {
  const differ = (oracleText: string, currentText: string) => ({
    path: formatPath(path),
    oracle: oracleText,
    current: currentText
  });
  const kind = (value: unknown) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value);
  if (kind(oracle) !== kind(current) || (typeof oracle !== 'object' && !Object.is(oracle, current))) {
    return differ(describeValue(oracle, showStrings), describeValue(current, showStrings));
  }
  if (oracle === null || typeof oracle !== 'object') return undefined;
  if (prototypeTag(oracle) !== prototypeTag(current as object)) {
    return differ(
      `prototype ${prototypeTag(oracle) || 'plain'}`,
      `prototype ${prototypeTag(current as object) || 'plain'}`
    );
  }
  if (Array.isArray(oracle)) {
    const other = current as unknown[];
    for (let index = 0; index < Math.max(oracle.length, other.length); index++) {
      if (index >= oracle.length || index >= other.length) {
        return differ(`array(${oracle.length})`, `array(${other.length})`);
      }
      const found = firstDifference(oracle[index], other[index], { showStrings, path: [...path, index] });
      if (found) return found;
    }
    return undefined;
  }
  const other = current as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(oracle), ...Object.keys(other)])].toSorted();
  for (const key of keys) {
    const inOracle = Object.hasOwn(oracle, key);
    const inCurrent = Object.hasOwn(other, key);
    if (!inOracle || !inCurrent) {
      return {
        path: formatPath([...path, key]),
        oracle: inOracle ? describeValue((oracle as any)[key], showStrings) : 'absent',
        current: inCurrent ? describeValue(other[key], showStrings) : 'absent'
      };
    }
    const found = firstDifference((oracle as any)[key], other[key], { showStrings, path: [...path, key] });
    if (found) return found;
  }
  return undefined;
};

export type NormalizedIssue = Record<string, unknown> & { code: string; path: Path; message: string };

/** An issue without the rejected input: every other field, and each union branch's issues in branch order. */
export const normalizeIssue = (issue: Record<string, any>): NormalizedIssue => {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(issue).toSorted()) {
    if (key === 'input' || key === 'inst') continue;
    const value = issue[key];
    if (key === 'errors' && Array.isArray(value)) {
      normalized.errors = value.map((branch) => (Array.isArray(branch) ? branch.map(normalizeIssue) : branch));
    } else if (key === 'issues' && Array.isArray(value)) {
      normalized.issues = value.map(normalizeIssue);
    } else {
      normalized[key] = value;
    }
  }
  return normalized as NormalizedIssue;
};

type ParseOutcome =
  | { kind: 'accepted'; data: unknown; fingerprint: string; ordered: string }
  | { kind: 'rejected'; issues: NormalizedIssue[]; fingerprint: string; unordered: string }
  | { kind: 'threw'; error: string; fingerprint: string };

type WalkOutcome =
  | { valid: boolean; errors: WalkerError[]; fingerprint: string }
  | { threw: string; fingerprint: string };

const describeError = (error: unknown) =>
  error instanceof Error ? truncate(`${error.name}: ${error.message}`, 300) : truncate(String(error), 300);

const parseOnce = (schema: Schema, config: unknown): { outcome: ParseOutcome; inputChanged: boolean } => {
  const input = structuredClone(config);
  const before = fingerprint(input, true);
  let outcome: ParseOutcome;
  try {
    const result = schema.safeParse(input);
    if (result.success) {
      outcome = {
        kind: 'accepted',
        data: result.data,
        fingerprint: fingerprint(result.data),
        ordered: fingerprint(result.data, true)
      };
    } else {
      const issues = result.error!.issues.map(normalizeIssue);
      outcome = {
        kind: 'rejected',
        issues,
        fingerprint: fingerprint(issues),
        unordered: issues
          .map((issue) => fingerprint(issue))
          .toSorted()
          .join('\n')
      };
    }
  } catch (error) {
    const text = describeError(error);
    outcome = { kind: 'threw', error: text, fingerprint: `threw ${text}` };
  }
  return { outcome, inputChanged: fingerprint(input, true) !== before };
};

const walkOnce = (walk: Walker, schema: Schema, config: unknown): WalkOutcome => {
  try {
    const { valid, errors } = walk(structuredClone(config), schema);
    return { valid, errors, fingerprint: fingerprint({ valid, errors }) };
  } catch (error) {
    const text = describeError(error);
    return { threw: text, fingerprint: `threw ${text}` };
  }
};

export type Evaluation = {
  parse: ParseOutcome;
  repeatable: boolean;
  inputChanged: boolean;
  walker: WalkOutcome | null;
};

/** One schema on one case: parsed twice, then walked when a walker is given. */
export const evaluateCase = (schema: Schema, config: unknown, walk: Walker | null): Evaluation => {
  const first = parseOnce(schema, config);
  const second = parseOnce(schema, config);
  const key = ({ outcome }: typeof first) =>
    `${outcome.fingerprint}\n${outcome.kind === 'accepted' ? outcome.ordered : ''}`;
  return {
    parse: first.outcome,
    repeatable: key(first) === key(second),
    inputChanged: first.inputChanged || second.inputChanged,
    walker: walk ? walkOnce(walk, schema, config) : null
  };
};

export const DIFFERENCE_KINDS = [
  'acceptance',
  'data',
  'key-order',
  'issues',
  'issue-order',
  'threw',
  'walker',
  'unrepeatable',
  'input-changed'
] as const;
export type DifferenceKind = (typeof DIFFERENCE_KINDS)[number];

export type Comparison = { kinds: DifferenceKind[]; difference?: Difference; walkerDifference?: Difference };

export const compareEvaluations = (oracle: Evaluation, current: Evaluation): Comparison => {
  const kinds: DifferenceKind[] = [];
  let difference: Difference | undefined;
  const [before, after] = [oracle.parse, current.parse];
  if (before.kind === 'threw' || after.kind === 'threw') {
    if (before.fingerprint !== after.fingerprint) kinds.push('threw');
  } else if (before.kind !== after.kind) {
    kinds.push('acceptance');
  } else if (before.kind === 'accepted' && after.kind === 'accepted') {
    if (before.fingerprint !== after.fingerprint) {
      kinds.push('data');
      difference = firstDifference(before.data, after.data);
    } else if (before.ordered !== after.ordered) {
      kinds.push('key-order');
    }
  } else if (before.kind === 'rejected' && after.kind === 'rejected' && before.fingerprint !== after.fingerprint) {
    kinds.push(before.unordered === after.unordered ? 'issue-order' : 'issues');
    difference = firstDifference(before.issues, after.issues, { showStrings: true });
  }
  let walkerDifference: Difference | undefined;
  if (oracle.walker && current.walker && oracle.walker.fingerprint !== current.walker.fingerprint) {
    kinds.push('walker');
    const { fingerprint: _oracle, ...oracleWalker } = oracle.walker;
    const { fingerprint: _current, ...currentWalker } = current.walker;
    walkerDifference = firstDifference(oracleWalker, currentWalker, { showStrings: true });
  }
  if (!oracle.repeatable || !current.repeatable) kinds.push('unrepeatable');
  if (oracle.inputChanged || current.inputChanged) kinds.push('input-changed');
  return { kinds, ...(difference && { difference }), ...(walkerDifference && { walkerDifference }) };
};

export type Effects = { defaults: number; stripped: number; numbers: number; booleans: number };

/**
 * What parsing did to an accepted configuration: keys it added (defaults) or stripped, and strings it turned into
 * numbers or booleans. `found` receives the path of each.
 */
export const effectsOf = (
  input: unknown,
  output: unknown,
  found: (effect: keyof Effects, path: Path) => void = () => {},
  path: Path = []
): Effects => {
  const effects: Effects = { defaults: 0, stripped: 0, numbers: 0, booleans: 0 };
  const note = (effect: keyof Effects, at: Path) => {
    effects[effect]++;
    found(effect, at);
  };
  const add = (nested: Effects) => {
    for (const effect of Object.keys(effects) as (keyof Effects)[]) effects[effect] += nested[effect];
  };
  if (isRecord(input) && isRecord(output)) {
    for (const key of Object.keys(output)) {
      if (!Object.hasOwn(input, key) || (input[key] === undefined && output[key] !== undefined)) {
        note('defaults', [...path, key]);
      } else {
        add(effectsOf(input[key], output[key], found, [...path, key]));
      }
    }
    for (const key of Object.keys(input)) if (!Object.hasOwn(output, key)) note('stripped', [...path, key]);
  } else if (Array.isArray(input) && Array.isArray(output)) {
    input.forEach((item, index) => add(effectsOf(item, output[index], found, [...path, index])));
  } else if (typeof input === 'string' && typeof output === 'number') {
    note('numbers', path);
  } else if (typeof input === 'string' && typeof output === 'boolean') {
    note('booleans', path);
  }
  return effects;
};

/**
 * A path in terms of the schema rather than one configuration: resources and scripts by their type, CloudFormation
 * entries and array items without their names or indexes.
 */
const schemaPath = (root: unknown, path: Path) =>
  path
    .map((key, index) => {
      if (typeof key === 'number') return '[]';
      const section = index === 1 ? path[0] : undefined;
      if (section === 'resources' || section === 'scripts') {
        const type = (root as any)?.[section]?.[key]?.type;
        return typeof type === 'string' ? `<${type}>` : '<?>';
      }
      return section === 'cloudformationResources' ? '<entry>' : key;
    })
    .join('.');

const compactParse = (outcome: ParseOutcome) => {
  if (outcome.kind === 'accepted') return { accepted: true, data: short(outcome.fingerprint) };
  if (outcome.kind === 'threw') return { threw: outcome.error };
  return {
    accepted: false,
    issues: short(outcome.fingerprint),
    count: outcome.issues.length,
    first: outcome.issues.slice(0, 3).map((issue) => `${issue.code} at ${formatPath(issue.path)}`)
  };
};

const compactWalker = (outcome: WalkOutcome | null) => {
  if (!outcome) return null;
  if ('threw' in outcome) return { threw: outcome.threw };
  const [first] = outcome.errors;
  return {
    valid: outcome.valid,
    errors: outcome.errors.length,
    ...(first && { first: `${first.path}: ${truncate(first.message, 160)}` })
  };
};

const pathDepth = (path: string) => (path === '<root>' ? 0 : path.split('.').length);

/** The zod package this script resolves, which is the one the CLI installs. */
export const zodPackageDirectory = () => {
  let directory = dirname(Bun.resolveSync('zod', import.meta.dir));
  while (!existsSync(join(directory, 'package.json')) || readPackage(directory).name !== 'zod') {
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Cannot find the zod package directory.');
    directory = parent;
  }
  return realpathSync(directory);
};
const readPackage = (directory: string) => JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));

const describeFile = (path: string) => {
  const bytes = readFileSync(path);
  return { path: realpathSync(path), sha256: sha256(bytes), bytes: bytes.length };
};

/**
 * A generated schema copied into a directory of its own whose `node_modules/zod` links to `zodDirectory`. Where it lies,
 * the frozen oracle resolves no `zod` at all, and outside any workspace Bun may auto-install another version.
 */
export const isolateSchemaModule = async ({
  source,
  directory,
  zodDirectory
}: {
  source: string;
  directory: string;
  zodDirectory: string;
}) => {
  await mkdir(join(directory, 'node_modules'), { recursive: true });
  await symlink(zodDirectory, join(directory, 'node_modules', 'zod'), 'dir');
  const target = join(directory, GENERATED_SCHEMA_FILE);
  await copyFile(source, target);
  return target;
};

export type LoadedSchema = { loadedFrom: string; sha256: string; bytes: number; module: object; schema: any };

export const loadSchemaModule = async (path: string): Promise<LoadedSchema> => {
  const file = describeFile(path);
  const module = await import(pathToFileURL(file.path).href);
  return {
    loadedFrom: file.path,
    sha256: file.sha256,
    bytes: file.bytes,
    module,
    schema: module.stacktapeConfigSchema
  };
};

/** `instanceof` checks Zod traits and accepts a schema of any Zod copy; the constructor is that of one module. */
const builtByThisZod = (schema: any) => schema?._zod?.constr === z.ZodObject;

const versionOf = (schema: any) => {
  const version = schema?._zod?.version;
  return version ? `${version.major}.${version.minor}.${version.patch}` : null;
};

/** Why the two loaded schemas cannot be compared: the same module under two paths, or not the same Zod. */
export const independenceProblems = (oracle: LoadedSchema, current: LoadedSchema, zodVersion: string): string[] => {
  const problems: string[] = [];
  if (oracle.loadedFrom === current.loadedFrom) problems.push(`both schemas were loaded from ${oracle.loadedFrom}`);
  if (oracle.module === current.module) problems.push('both paths resolved to one module instance');
  if (oracle.schema === current.schema) problems.push('both modules export the same schema instance');
  for (const [name, loaded] of [
    ['oracle', oracle],
    ['current', current]
  ] as const) {
    if (!builtByThisZod(loaded.schema)) {
      problems.push(`the ${name} schema was not built by the Zod module this script loads`);
    }
    if (versionOf(loaded.schema) !== zodVersion) {
      problems.push(`the ${name} schema was built by Zod ${versionOf(loaded.schema)}, not ${zodVersion}`);
    }
  }
  return problems;
};

type Options = {
  baseline: string;
  out: string;
  current: string | undefined;
  cases: string | undefined;
  corpus: string | undefined;
  saveCorpus: string | undefined;
  seed: number;
  mutations: number;
};

class Refusal extends Error {}

const requireNewFile = (path: string | undefined, flag: string) => {
  if (path && existsSync(path)) throw new Refusal(`${flag} ${path} exists; outputs are never overwritten.`);
};

const isInside = (child: string, parent: string) => {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !path.startsWith('/'));
};

const parseOptions = () => {
  try {
    return parseArgs({
      options: {
        baseline: { type: 'string' },
        out: { type: 'string' },
        current: { type: 'string' },
        cases: { type: 'string' },
        corpus: { type: 'string' },
        'save-corpus': { type: 'string' },
        seed: { type: 'string' },
        mutations: { type: 'string' }
      }
    }).values;
  } catch (error) {
    throw new Refusal(describeError(error));
  }
};

const readOptions = (): Options => {
  const values = parseOptions();
  if (!values.baseline || !values.out) throw new Refusal('--baseline and --out are required.');
  if (values.corpus && !existsSync(values.corpus)) throw new Refusal(`--corpus ${values.corpus} does not exist.`);
  if (values.corpus && values['save-corpus']) throw new Refusal('--corpus and --save-corpus exclude each other.');
  const integer = (text: string | undefined, fallback: number, flag: string) => {
    if (text === undefined) return fallback;
    if (!/^\d+$/.test(text)) throw new Refusal(`${flag} must be a non-negative integer.`);
    return Number(text);
  };
  const absolute = (path: string | undefined) => (path ? resolve(path) : undefined);
  return {
    baseline: resolve(values.baseline),
    out: resolve(values.out),
    current: absolute(values.current),
    cases: absolute(values.cases),
    corpus: absolute(values.corpus),
    saveCorpus: absolute(values['save-corpus']),
    seed: integer(values.seed, DEFAULT_SEED, '--seed'),
    mutations: integer(values.mutations, DEFAULT_MUTATIONS, '--mutations')
  };
};

/** The frozen oracle, checked against the manifest the baseline was recorded with. */
const readOracle = (baseline: string) => {
  const manifestPath = join(baseline, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Refusal(`No manifest.json in ${baseline}.`);
  const manifestBytes = readFileSync(manifestPath);
  const expected = JSON.parse(manifestBytes.toString()).files?.[MANIFEST_ENTRY];
  if (!expected) throw new Refusal(`The manifest records no ${MANIFEST_ENTRY}.`);
  const frozenPath = join(baseline, MANIFEST_ENTRY);
  if (!existsSync(frozenPath)) throw new Refusal(`The frozen oracle ${frozenPath} is missing.`);
  const frozen = describeFile(frozenPath);
  if (frozen.sha256 !== expected.sha256 || frozen.bytes !== expected.bytes) {
    throw new Refusal(
      `The frozen oracle does not match its manifest: ${frozen.sha256} (${frozen.bytes} bytes), recorded ${expected.sha256} (${expected.bytes} bytes).`
    );
  }
  return { manifest: { path: realpathSync(manifestPath), sha256: sha256(manifestBytes) }, frozen, expected };
};

const log = (message: string) => process.stderr.write(`[validator-differential] ${message}\n`);

const run = async (options: Options) => {
  for (const [path, flag] of [
    [options.out, '--out'],
    [options.cases, '--cases'],
    [options.saveCorpus, '--save-corpus']
  ] as const) {
    requireNewFile(path, flag);
  }
  const startedAt = new Date().toISOString();
  const timing: Record<string, number> = {};
  const time = async <T>(name: string, action: () => Promise<T> | T): Promise<T> => {
    const start = performance.now();
    try {
      return await action();
    } finally {
      timing[name] = Math.round(performance.now() - start);
    }
  };

  const oracleRecord = readOracle(options.baseline);
  const generatedPath = join(JSON_SCHEMAS_FOLDER_PATH, GENERATED_SCHEMA_FILE);
  if (!existsSync(generatedPath)) throw new Refusal(`No generated schema at ${generatedPath}; run from apps/cli.`);
  if (options.current && !existsSync(options.current))
    throw new Refusal(`--current ${options.current} does not exist.`);
  const livePath = realpathSync(generatedPath);
  const currentPath = options.current ? realpathSync(options.current) : livePath;
  if (currentPath === oracleRecord.frozen.path || isInside(currentPath, realpathSync(options.baseline))) {
    throw new Refusal(`--current ${currentPath} is the frozen oracle or inside its baseline.`);
  }
  const zodDirectory = zodPackageDirectory();
  const zodVersion = readPackage(zodDirectory).version as string;

  const workspace = await mkdtemp(join(tmpdir(), 'stacktape-validator-differential-'));
  try {
    const oracleCopy = await isolateSchemaModule({
      source: oracleRecord.frozen.path,
      directory: join(workspace, 'oracle'),
      zodDirectory
    });
    // The live schema loads where it lies, as the one module the walker also imports; any other candidate is isolated.
    const currentIsLive = currentPath === livePath;
    const currentSource = currentIsLive
      ? currentPath
      : await isolateSchemaModule({ source: currentPath, directory: join(workspace, 'current'), zodDirectory });
    const oracle = await time('loadOracleMs', () => loadSchemaModule(oracleCopy));
    const current = await time('loadCurrentMs', () => loadSchemaModule(currentSource));
    const problems = independenceProblems(oracle, current, zodVersion);
    if (oracle.sha256 !== oracleRecord.expected.sha256) problems.push('the oracle copy differs from the frozen oracle');
    const currentFile = describeFile(currentPath);
    if (current.sha256 !== currentFile.sha256) problems.push('the loaded current copy differs from --current');
    const { validateConfigObject } = await time('loadWalkerMs', () => import('./validate-config-string'));
    const live = await import('@generated/schemas/validate-config-zod');
    if (live.stacktapeConfigSchema === oracle.schema) problems.push('the oracle is the schema the walker imports');
    if (problems.length) throw new Refusal(`The schemas are not independent: ${problems.join('; ')}.`);

    const accepts = (config: unknown) => oracle.schema.safeParse(structuredClone(config)).success;
    let corpus: Corpus;
    let corpusSource: Record<string, unknown>;
    if (options.corpus) {
      const text = await readFile(options.corpus, 'utf8');
      corpus = decodeCorpus(text);
      corpusSource = {
        loadedFrom: options.corpus,
        fileSha256: sha256(text),
        reencodesIdentically: encodeCorpus(corpus) === text
      };
    } else {
      const built = await time('buildCorpusMs', () =>
        buildCorpus({ schema: oracle.schema, accepts, seed: options.seed, mutations: options.mutations })
      );
      corpus = built.corpus;
      corpusSource = { builtFromOracle: true, ...built.summary };
    }
    const corpusText = encodeCorpus(corpus);
    if (options.saveCorpus) {
      await mkdir(dirname(options.saveCorpus), { recursive: true });
      await writeFile(options.saveCorpus, corpusText);
    }

    const report = await time('compareMs', () =>
      compareCorpus({
        corpus: corpus.cases,
        oracle: oracle.schema,
        current: current.schema,
        walk: validateConfigObject
      })
    );
    const caseLines = report.lines.join('\n') + '\n';
    if (options.cases) {
      await mkdir(dirname(options.cases), { recursive: true });
      await writeFile(options.cases, caseLines);
    }
    const summary = {
      equivalent: report.differences === 0,
      cases: corpus.cases.length,
      differences: report.differences,
      byKind: report.byKind,
      oracleSha256: oracle.sha256,
      currentSha256: current.sha256,
      corpusSha256: sha256(corpusText),
      casesSha256: sha256(caseLines)
    };
    const output = {
      tool: 'validator-differential',
      startedAt,
      finishedAt: new Date().toISOString(),
      summary,
      oracle: {
        manifest: oracleRecord.manifest,
        frozen: oracleRecord.frozen,
        loadedFrom: oracle.loadedFrom,
        loadedSha256: oracle.sha256,
        bytes: oracle.bytes
      },
      current: {
        source: currentFile,
        loadedFrom: current.loadedFrom,
        loadedSha256: current.sha256,
        isolatedCopy: !currentIsLive,
        isTheWalkerDefault: live.stacktapeConfigSchema === current.schema
      },
      zod: {
        version: zodVersion,
        realpath: zodDirectory,
        oracleSchemaVersion: versionOf(oracle.schema),
        currentSchemaVersion: versionOf(current.schema)
      },
      independence: {
        distinctPaths: oracle.loadedFrom !== current.loadedFrom,
        distinctModules: oracle.module !== current.module,
        distinctSchemas: oracle.schema !== current.schema,
        builtByThisZod: builtByThisZod(oracle.schema) && builtByThisZod(current.schema),
        // Zod keeps process-wide settings, such as a compiling post-processor, here.
        zodGlobalConfig: Object.keys((globalThis as { __zod_globalConfig?: object }).__zod_globalConfig ?? {})
      },
      corpus: {
        seed: corpus.seed,
        mutations: corpus.mutations,
        count: corpus.cases.length,
        sha256: sha256(corpusText),
        bytes: Buffer.byteLength(corpusText),
        ...(options.saveCorpus && { savedTo: options.saveCorpus }),
        ...corpusSource,
        groups: countBy(corpus.cases, ({ group }) => group)
      },
      coverage: report.coverage,
      detailedDifferences: report.detailed,
      differingCases: report.differing,
      walkerBaseline: report.walkerBaseline,
      ...(options.cases && { casesFile: options.cases }),
      timing: { ...timing, maxRssMiB: Math.round(process.resourceUsage().maxRSS / 1024) }
    };
    await mkdir(dirname(options.out), { recursive: true });
    await writeFile(options.out, `${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ ...summary, report: options.out })}\n`);
    return summary.equivalent ? 0 : 1;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
};

const countBy = <T>(items: T[], key: (item: T) => string) => {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
};

/** Every case through both schemas and the walker: compact per-case lines, differences, and what the corpus exercised. */
export const compareCorpus = ({
  corpus,
  oracle,
  current,
  walk
}: {
  corpus: CorpusCase[];
  oracle: Schema;
  current: Schema;
  walk: Walker | null;
}) => {
  const lines: string[] = [];
  const detailed: Record<string, unknown>[] = [];
  const differing: { id: string; kinds: DifferenceKind[] }[] = [];
  const byKind: Partial<Record<DifferenceKind, number>> = {};
  const byGroup: Record<string, { accepted: number; rejected: number; threw: number }> = {};
  const byMutation: Record<string, { accepted: number; rejected: number }> = {};
  const totals: Effects = { defaults: 0, stripped: 0, numbers: 0, booleans: 0 };
  const casesWith: Effects = { defaults: 0, stripped: 0, numbers: 0, booleans: 0 };
  const effectPaths: Record<keyof Effects, Set<string>> = {
    defaults: new Set(),
    stripped: new Set(),
    numbers: new Set(),
    booleans: new Set()
  };
  const issueCodes: Record<string, number> = {};
  const branchIssueCodes: Record<string, number> = {};
  const walkerCounts = { validWhenRejected: 0, invalidWhenAccepted: 0, deeperThanIssues: 0, samePathsAsIssues: 0 };
  const walkerBaseline: Record<string, unknown>[] = [];
  const countBranchCodes = (issues: NormalizedIssue[]) => {
    for (const issue of issues) {
      if (!Array.isArray(issue.errors)) continue;
      for (const branch of issue.errors as NormalizedIssue[][]) {
        for (const inner of branch) branchIssueCodes[inner.code] = (branchIssueCodes[inner.code] ?? 0) + 1;
        countBranchCodes(branch);
      }
    }
  };

  corpus.forEach((corpusCase, index) => {
    if (index > 0 && index % 250 === 0) log(`${index}/${corpus.length} cases`);
    const before = evaluateCase(oracle, corpusCase.config, walk);
    const after = evaluateCase(current, corpusCase.config, walk);
    const comparison = compareEvaluations(before, after);
    const group = (byGroup[corpusCase.group] ??= { accepted: 0, rejected: 0, threw: 0 });
    group[before.parse.kind]++;
    let effects: Effects | undefined;
    if (before.parse.kind === 'accepted') {
      const data = before.parse.data;
      effects = effectsOf(corpusCase.config, data, (effect, path) => effectPaths[effect].add(schemaPath(data, path)));
      for (const key of Object.keys(totals) as (keyof Effects)[]) {
        totals[key] += effects[key];
        if (effects[key] > 0) casesWith[key]++;
      }
    } else if (before.parse.kind === 'rejected') {
      for (const issue of before.parse.issues) issueCodes[issue.code] = (issueCodes[issue.code] ?? 0) + 1;
      countBranchCodes(before.parse.issues);
    }
    if (corpusCase.origin && before.parse.kind !== 'threw') {
      const operation = corpusCase.origin.split(' ')[0]!;
      const counts = (byMutation[operation] ??= { accepted: 0, rejected: 0 });
      counts[before.parse.kind]++;
    }
    const walker = before.walker && !('threw' in before.walker) ? before.walker : null;
    if (walker) {
      const issuePaths = before.parse.kind === 'rejected' ? before.parse.issues.map((issue) => issue.path) : [];
      if (before.parse.kind === 'rejected' && walker.valid) walkerCounts.validWhenRejected++;
      if (before.parse.kind === 'accepted' && !walker.valid) walkerCounts.invalidWhenAccepted++;
      if (before.parse.kind === 'rejected' && !walker.valid) {
        const deepestIssue = Math.max(...issuePaths.map((path) => path.length));
        const deepestWalker = Math.max(...walker.errors.map(({ path }) => pathDepth(path)));
        if (deepestWalker > deepestIssue) walkerCounts.deeperThanIssues++;
        const joined = (paths: string[]) => paths.toSorted().join('\n');
        if (
          joined(walker.errors.map(({ path }) => path)) === joined(issuePaths.map((path) => path.join('.') || '<root>'))
        ) {
          walkerCounts.samePathsAsIssues++;
        }
      }
      if (corpusCase.group === 'targeted') {
        walkerBaseline.push({
          id: corpusCase.id,
          safeParse: before.parse.kind,
          issuePaths: issuePaths.slice(0, 3).map(formatPath),
          walker: {
            valid: walker.valid,
            errors: walker.errors.length,
            first: walker.errors.slice(0, 3).map(({ path, message }) => ({ path, message: truncate(message, 160) }))
          }
        });
      }
    }
    for (const kind of comparison.kinds) byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (comparison.kinds.length) {
      differing.push({ id: corpusCase.id, kinds: comparison.kinds });
      if (detailed.length < MAX_DETAILED_DIFFERENCES) {
        detailed.push({
          id: corpusCase.id,
          group: corpusCase.group,
          ...(corpusCase.origin && { origin: corpusCase.origin }),
          kinds: comparison.kinds,
          oracle: compactParse(before.parse),
          current: compactParse(after.parse),
          ...(comparison.difference && { firstDifference: comparison.difference }),
          ...(comparison.walkerDifference && {
            walker: {
              oracle: compactWalker(before.walker),
              current: compactWalker(after.walker),
              firstDifference: comparison.walkerDifference
            }
          })
        });
      }
    }
    lines.push(
      JSON.stringify({
        id: corpusCase.id,
        oracle: compactParse(before.parse),
        current: compactParse(after.parse),
        oracleWalker: compactWalker(before.walker),
        currentWalker: compactWalker(after.walker),
        ...(effects && { effects }),
        ...(comparison.kinds.length && { differences: comparison.kinds })
      })
    );
  });
  return {
    lines,
    differences: differing.length,
    byKind,
    detailed,
    differing,
    walkerBaseline,
    coverage: {
      byGroup,
      mutations: byMutation,
      effects: {
        totals,
        casesWith,
        distinctSchemaPaths: Object.fromEntries(
          Object.entries(effectPaths).map(([effect, paths]) => [effect, paths.size])
        ),
        schemaPaths: Object.fromEntries(
          Object.entries(effectPaths).map(([effect, paths]) => [effect, [...paths].toSorted()])
        )
      },
      issueCodes,
      branchIssueCodes,
      walker: walkerCounts
    }
  };
};

const main = async () => {
  try {
    process.exitCode = await run(readOptions());
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    log(`refused: ${error.message}`);
    process.exitCode = 2;
  }
};

if (import.meta.main) void main();
