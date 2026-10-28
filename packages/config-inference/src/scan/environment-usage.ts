/**
 * What the source code actually reads from its environment.
 *
 * The `.env` probe knows which names exist; this pass knows which service *uses* them, which is the
 * half that decides whether the deployed application works. A `STRIPE_SECRET_KEY` nobody sets is
 * invisible at deploy time and fatal at runtime, and it is the single most common way a green
 * deploy ships a broken app. Reading the code is the only deterministic way to know.
 *
 * This is an assembler enrichment, not a probe, for two reasons. It needs the *merged* services —
 * a probe emitting a service fragment for a path nothing else claimed would invent a phantom
 * service. And it needs the final dependency list, because linking `REDIS_URL` to the `cache`
 * dependency is only safe once every probe has spoken.
 *
 * Two containment rules, both load-bearing:
 *
 * - Citations quote the matched *expression* (`process.env.STRIPE_SECRET_KEY`), never the whole
 *   line. A line like `process.env.KEY || 'sk_live_…'` holds a hardcoded fallback secret, and a
 *   facts document must stay safe to show and store by construction.
 * - The `infra-dependency` role is claimed only when it can name its dependency unambiguously.
 *   The schema enforces this; everything unresolvable degrades to `runtime-config`, which the
 *   composer deliberately does not serialize — an honest omission rather than a guessed value.
 */

import { resourceKindNamedBy, type DependencyFact, type DependencyKind } from '../facts/dependency';
import {
  invokingDependencyName,
  type FunctionTrigger,
  type EnvironmentVariableRole,
  type EnvironmentVariableUse,
  type ServiceFactInput
} from '../facts/service';
import type { Citation } from '../facts/citation';
import { posix } from 'node:path';
import type { SourceRead } from './read-source';
import { agreedItemKey, emptyItemKeyObservations, observeItemKeys } from './dynamodb-keys';
import { AMBIGUOUS_DATABASE_NAMES, ENV_NAME_TO_KIND } from './probes/environment';
import { publishedDetailTypes } from './probes/lambda-source';
import { isPlatformEnvironmentVariable } from './platform-environment';

/** Whole-repo and per-service ceilings, so one pathological repository cannot stall the scan. */
const MAX_FILES_SCANNED = 800;
const MAX_FILES_PER_SERVICE = 300;
const MAX_VARIABLES_PER_SERVICE = 32;
const MAX_EVIDENCE_PER_VARIABLE = 2;

/** A name has to look like configuration. Two characters catches `DB`; one catches noise. */
const NAME = '([A-Z][A-Z0-9_]{2,})';

type ReadPattern = {
  pattern: RegExp;
  /** Vite/Astro-style reads are build-time by construction, whatever the name looks like. */
  buildTime?: boolean;
  /** How a fallback value appears immediately after this read, when the language has one. */
  fallback?: 'js-or' | 'ruby-or' | 'ruby-fetch' | 'call-argument';
};

const JS_PATTERNS: readonly ReadPattern[] = [
  { pattern: new RegExp(`process\\.env\\.${NAME}`, 'g'), fallback: 'js-or' },
  { pattern: new RegExp(`process\\.env\\[['"\`]${NAME}['"\`]\\]`, 'g'), fallback: 'js-or' },
  { pattern: new RegExp(`import\\.meta\\.env\\.${NAME}`, 'g'), buildTime: true },
  { pattern: new RegExp(`Bun\\.env\\.${NAME}`, 'g'), fallback: 'js-or' },
  { pattern: new RegExp(`Deno\\.env\\.get\\(\\s*['"\`]${NAME}['"\`]`, 'g'), fallback: 'js-or' }
];

const PATTERNS_BY_EXTENSION: ReadonlyArray<{ extensions: RegExp; patterns: readonly ReadPattern[] }> = [
  // Single-file components read their environment in their script block.
  { extensions: /\.(?:[cm]?[jt]s|[jt]sx|svelte|vue|astro)$/, patterns: JS_PATTERNS },
  {
    extensions: /\.py$/,
    patterns: [
      { pattern: new RegExp(`os\\.environ\\[\\s*['"]${NAME}['"]\\s*\\]`, 'g') },
      { pattern: new RegExp(`os\\.environ\\.get\\(\\s*['"]${NAME}['"]`, 'g'), fallback: 'call-argument' },
      { pattern: new RegExp(`os\\.getenv\\(\\s*['"]${NAME}['"]`, 'g'), fallback: 'call-argument' }
    ]
  },
  {
    extensions: /\.rb$/,
    patterns: [
      { pattern: new RegExp(`ENV\\[\\s*['"]${NAME}['"]\\s*\\]`, 'g'), fallback: 'ruby-or' },
      { pattern: new RegExp(`ENV\\.fetch\\(\\s*['"]${NAME}['"]`, 'g'), fallback: 'ruby-fetch' }
    ]
  },
  {
    // Rails configuration commonly embeds Ruby in database.yml/cable.yml rather than a .rb file.
    extensions: /\.ya?ml$/,
    patterns: [
      { pattern: new RegExp(`ENV\\[\\s*['"]${NAME}['"]\\s*\\]`, 'g') },
      { pattern: new RegExp(`ENV\\.fetch\\(\\s*['"]${NAME}['"]`, 'g'), fallback: 'call-argument' }
    ]
  },
  { extensions: /\.go$/, patterns: [{ pattern: new RegExp(`os\\.(?:Getenv|LookupEnv)\\(\\s*"${NAME}"`, 'g') }] },
  {
    extensions: /\.php$/,
    patterns: [
      { pattern: new RegExp(`(?:\\$_ENV|\\$_SERVER)\\[\\s*['"]${NAME}['"]\\s*\\]`, 'g') },
      { pattern: new RegExp(`\\b(?:getenv|env)\\(\\s*['"]${NAME}['"]`, 'g'), fallback: 'call-argument' }
    ]
  },
  { extensions: /\.(?:java|kt)$/, patterns: [{ pattern: new RegExp(`System\\.getenv\\(\\s*"${NAME}"`, 'g') }] },
  {
    extensions: /\.cs$/,
    patterns: [{ pattern: new RegExp(`Environment\\.GetEnvironmentVariable\\(\\s*"${NAME}"`, 'g') }]
  },
  {
    extensions: /\.exs?$/,
    patterns: [
      { pattern: new RegExp(`System\\.(?:get_env|fetch_env!?)\\(\\s*"${NAME}"`, 'g'), fallback: 'call-argument' }
    ]
  }
];

const BUILD_TIME_PREFIX = /^(?:NEXT_PUBLIC_|VITE_|REACT_APP_|GATSBY_|NUXT_PUBLIC_|PUBLIC_|EXPO_PUBLIC_|VUE_APP_)/;

const SECRET_NAME =
  /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CLIENT_ID|CLIENT_SECRET|AUTH|CREDENTIAL|SIGNING|DSN|LICENSE_KEY|_KEY$/;

/** Directories whose env reads describe tooling or test rigs, not the deployed process. */
const EXCLUDED_PATH = new RegExp(
  '(^|/)(' +
    [
      'test',
      'tests',
      '__tests__',
      '__mocks__',
      'spec',
      'specs',
      'e2e',
      'cypress',
      'fixtures',
      'examples?',
      'docs?',
      'scripts',
      '\\.storybook',
      'dist',
      'build',
      'out',
      '\\.next',
      '\\.nuxt',
      '\\.output',
      'coverage',
      'vendor',
      'target',
      '__pycache__',
      'migrations?'
    ].join('|') +
    ')(/|$)',
  'i'
);

const EXCLUDED_FILE = /\.(?:test|spec|stories)\.[^.]+$|\.d\.ts$/i;

const JS_SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"`]([^'"`]+)['"`]/gm;
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

/** A repository file an import specifier names, `external` for a package, or undefined when it cannot be resolved. */
const resolveImport = (
  fromFile: string,
  specifier: string,
  files: ReadonlySet<string>
): string | 'external' | undefined => {
  // Path aliases (`@/lib/db`, `~/db`, `#db`) point into the project, but resolving them needs the tsconfig.
  if (/^(?:@\/|~\/|#)/.test(specifier)) return undefined;
  if (!specifier.startsWith('.')) return 'external';
  const base = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  const withoutJsExtension = base.replace(/\.[cm]?jsx?$/, '');
  const candidates = [
    base,
    ...RESOLVABLE_EXTENSIONS.map((extension) => `${withoutJsExtension}${extension}`),
    ...RESOLVABLE_EXTENSIONS.map((extension) => `${base}/index${extension}`)
  ];
  return candidates.find((candidate) => files.has(candidate));
};

/**
 * The source files a JavaScript function's entry file reaches through relative imports, or undefined when an import
 * into the project cannot be followed.
 *
 * Two functions in one directory usually share a database module but not everything else: the API publishes to the
 * queue, the worker only consumes it. Following the imports gives each function the variables its own code reads, so
 * each gets its own `connectTo`. When an alias or a missing file hides part of the graph, the caller falls back to the
 * whole directory, because a missing connection breaks the function and an extra one only grants access.
 */
const importClosure = async (
  entry: string,
  files: ReadonlySet<string>,
  read: (path: string) => Promise<string | undefined>
): Promise<string[] | undefined> => {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    // oxlint-disable-next-line no-await-in-loop -- breadth-first over a bounded graph, in a reproducible order.
    const contents = await read(file);
    if (contents === undefined) return undefined;
    for (const match of contents.matchAll(IMPORT_SPECIFIER)) {
      const resolved = resolveImport(file, match[1]!, files);
      if (resolved === undefined) return undefined;
      if (resolved === 'external' || seen.has(resolved) || !JS_SOURCE.test(resolved)) continue;
      if (seen.size >= MAX_FILES_PER_SERVICE) return undefined;
      seen.add(resolved);
      queue.push(resolved);
    }
  }
  return [...seen];
};

/** A presigned upload URL, which the client then uses itself. A presigned GET is a download and needs no CORS. */
const PRESIGNED_UPLOAD: ReadonlyArray<{ method: 'PUT' | 'POST'; patterns: readonly RegExp[] }> = [
  { method: 'PUT', patterns: [/\bgetSignedUrl\b/, /\bPutObjectCommand\b/] },
  { method: 'PUT', patterns: [/\bgetSignedUrl(?:Promise)?\(\s*['"]putObject['"]/] },
  { method: 'PUT', patterns: [/\bgenerate_presigned_url\(\s*(?:ClientMethod\s*=\s*)?['"]put_object['"]/] },
  { method: 'POST', patterns: [/\bcreatePresignedPost\b/] },
  { method: 'POST', patterns: [/\bgenerate_presigned_post\(/] }
];

const presignedUploadMethods = (contents: string): Array<'PUT' | 'POST'> =>
  PRESIGNED_UPLOAD.filter(({ patterns }) => patterns.every((pattern) => pattern.test(contents))).map(
    ({ method }) => method
  );

const ROLE_ORDER: Record<EnvironmentVariableRole, number> = {
  'build-time': 0,
  'infra-dependency': 1,
  'third-party-secret': 2,
  'cross-service-reference': 3,
  'runtime-config': 4
};

type Occurrence = {
  citations: Citation[];
  buildTimeRead: boolean;
  /** True while every read seen so far carries its own fallback value. */
  alwaysHasFallback: boolean;
};

const hasFallback = (line: string, matchEnd: number, kind: ReadPattern['fallback']): boolean => {
  const rest = line.slice(matchEnd);
  if (kind === 'js-or') return /^\s*(?:\|\||\?\?)/.test(rest);
  // `ENV['BUNDLE_GEMFILE'] ||= File.expand_path(...)`, `ENV['PORT'] || 3000`.
  if (kind === 'ruby-or') return /^\s*(?:\|\||\bor\b)/.test(rest);
  // `ENV.fetch` raises without a default, which is a second argument or a block. A comma after the closing
  // parenthesis belongs to the enclosing call: `publish(topic_arn: ENV.fetch('TOPIC_ARN'), message: ...)`.
  if (kind === 'ruby-fetch') return /^\s*(?:,|\)\s*(?:\{|do\b))/.test(rest);
  if (kind === 'call-argument') return /^\s*['"`)\]]*\s*,/.test(rest);
  return false;
};

/**
 * SvelteKit's own modules: `import { env } from '$env/dynamic/public'` read as `env.PUBLIC_API_URL`, and
 * `import { PUBLIC_API_URL } from '$env/static/public'`. Only a file importing the module gets these patterns, because
 * `env.NAME` alone is any object's property.
 */
const SVELTEKIT_DYNAMIC_ENV = /import\s*\{[^}]*\benv\b[^}]*\}\s*from\s*['"]\$env\/dynamic\/(?:public|private)['"]/;
const SVELTEKIT_STATIC_ENV = /import\s*\{([^}]*)\}\s*from\s*['"]\$env\/static\/(?:public|private)['"]/g;

const svelteKitPatterns = (contents: string): ReadPattern[] => {
  const patterns: ReadPattern[] = [];
  if (SVELTEKIT_DYNAMIC_ENV.test(contents)) patterns.push({ pattern: new RegExp(`\\benv\\.${NAME}`, 'g') });
  const staticNames = [...contents.matchAll(SVELTEKIT_STATIC_ENV)].flatMap((match) =>
    match[1]!
      .split(',')
      .map((specifier) => specifier.trim().split(/\s+as\s+/)[0]!)
      .filter((name) => /^[A-Z][A-Z0-9_]{2,}$/.test(name))
  );
  // The import statement is the read: the build inlines the value wherever the name is used.
  if (staticNames.length > 0) {
    patterns.push({ pattern: new RegExp(`import\\s*\\{[^}]*\\b(${staticNames.join('|')})\\b`, 'g') });
  }
  return patterns;
};

/**
 * Go functions that read the variable their first parameter names: `func env(name, fallback string) string { if v :=
 * os.Getenv(name); ... }`. Go code reads most of its settings through one, so `env("ORDERS_TABLE", "orders")` is the
 * read. A second parameter is the fallback.
 */
const GO_FUNCTION = /^func\s+([A-Za-z_]\w*)\s*\(\s*([A-Za-z_]\w*)\b([^)]*)\)[^{\n]*\{\n?([\s\S]*?)^\}/gm;

const goHelperPatterns = (contents: readonly string[]): ReadPattern[] =>
  contents.flatMap((source) =>
    [...source.matchAll(GO_FUNCTION)]
      .filter(([, , parameter, , body]) =>
        new RegExp(`\\bos\\.(?:Getenv|LookupEnv)\\(\\s*${parameter}\\s*\\)`).test(body!)
      )
      .map(([, name, , rest]): ReadPattern => {
        const pattern = new RegExp(`(?<![\\w.])${name}\\(\\s*"${NAME}"`, 'g');
        return rest!.includes(',') ? { pattern, fallback: 'call-argument' } : { pattern };
      })
  );

/** Calls that write DynamoDB items, in the JavaScript SDKs, boto3 and Go. */
const DYNAMODB_WRITE =
  /\b(?:Put|Update|Delete|BatchWrite|TransactWrite)(?:Item)?Command\b|\.(?:put|update|delete)(?:Item)?\(\s*\{|\b(?:put_item|update_item|delete_item|batch_write_item|transact_write_items|batch_writer)\s*\(|\.(?:PutItem|UpdateItem|DeleteItem|BatchWriteItem|TransactWriteItems)\(/;

/** Code that downloads an object: what a handler does with the object its bucket notification names. */
const READS_OBJECT =
  /\bGetObjectCommand\b|\.getObject\s*\(|\bget_object\s*\(|\bdownload_file(?:obj)?\s*\(|\.GetObject\s*\(/;

/**
 * Whether the service's own writes could invoke it again through this trigger. A stream handler that only reads its
 * table, or publishes another detail type to its bus, can be given that table or bus; one that writes the table or
 * publishes an event it handles cannot. Queues, topics and buckets are what a handler writes to when it names them.
 */
const feedsBackInto = (trigger: FunctionTrigger, source: string): boolean => {
  if (invokingDependencyName(trigger) === undefined) return false;
  if (trigger.type === 'dynamodb-stream') return DYNAMODB_WRITE.test(source);
  if (trigger.type === 'event-bus') {
    return publishedDetailTypes(source).some((detailType) => trigger.detailTypes.includes(detailType));
  }
  return true;
};

const collectFromFile = (
  path: string,
  contents: string,
  occurrences: Map<string, Occurrence>,
  extraPatterns: readonly ReadPattern[] = []
): void => {
  const group = PATTERNS_BY_EXTENSION.find((entry) => entry.extensions.test(path));
  if (group === undefined) return;
  const patterns =
    group.patterns === JS_PATTERNS
      ? [...JS_PATTERNS, ...svelteKitPatterns(contents)]
      : path.endsWith('.go')
        ? [...group.patterns, ...extraPatterns]
        : group.patterns;

  const lines = contents.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const { pattern, buildTime, fallback } of patterns) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const name = match[1];
        if (name === undefined || isPlatformEnvironmentVariable(name)) continue;

        const entry = occurrences.get(name) ?? { citations: [], buildTimeRead: false, alwaysHasFallback: true };
        if (entry.citations.length < MAX_EVIDENCE_PER_VARIABLE) {
          entry.citations.push({ file: path, line: index + 1, quote: match[0] });
        }
        entry.buildTimeRead = entry.buildTimeRead || buildTime === true;
        entry.alwaysHasFallback =
          entry.alwaysHasFallback && hasFallback(line, (match.index ?? 0) + match[0].length, fallback);
        occurrences.set(name, entry);
      }
    }
  }
};

const DATABASE_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'mongodb', 'sqlite']);

/**
 * Name the dependency a variable belongs to, only when exactly one candidate exists.
 *
 * The unambiguity guard is inherited from the previous generation of this pipeline, where it
 * earned its keep: with two Postgres databases, wiring `DATABASE_URL` to either one is a guess,
 * and a wrong guess is connected-to-the-wrong-database, which is strictly worse than unwired.
 */
const resolveDependency = (
  name: string,
  dependencies: readonly DependencyFact[],
  triggers: ReadonlySet<string>
): DependencyFact | undefined => {
  // A name says which kind, not which instance. A plain repository has one bucket, queue or topic per kind, and it is
  // usually the one that invokes this function: binding the function's own output to it (a thumbnailer writing to
  // `THUMBNAILS_BUCKET`, a worker sending to `RESULTS_QUEUE_URL`) would invoke it again with every write, forever.
  const unlessTrigger = (candidates: readonly DependencyFact[]): DependencyFact | undefined =>
    candidates.length === 1 && !triggers.has(candidates[0]!.name) ? candidates[0] : undefined;

  const addressed = dependencies.filter((dependency) => dependency.addressedBy.includes(name));
  if (addressed.length > 0) return unlessTrigger(addressed);

  const kind = ENV_NAME_TO_KIND.find((entry) => entry.pattern.test(name))?.kind;
  if (kind !== undefined) return unlessTrigger(dependencies.filter((dependency) => dependency.kind === kind));

  // `DATABASE_URL` names no engine, but when the repository holds exactly one database the other
  // probes already settled which one it means — the same reconciliation the assembler applies to
  // the engine question itself.
  if (AMBIGUOUS_DATABASE_NAMES.test(name)) {
    const databases = dependencies.filter((dependency) => DATABASE_KINDS.has(dependency.kind));
    return databases.length === 1 ? databases[0] : undefined;
  }

  // An application names its own bucket or topic (`UPLOAD_BUCKET`, `ORDER_EVENTS_TOPIC_ARN`). The suffix says which
  // kind; with exactly one of that kind it can only be that one. The name alone never creates a dependency.
  const suffixKind = resourceKindNamedBy(name);
  if (suffixKind !== undefined)
    return unlessTrigger(dependencies.filter((dependency) => dependency.kind === suffixKind));
  return undefined;
};

const classify = (
  name: string,
  occurrence: Occurrence,
  dependencies: readonly DependencyFact[],
  /** Dependencies that invoke the services reading the variable. */
  triggers: ReadonlySet<string> = new Set()
): Pick<EnvironmentVariableUse, 'role' | 'dependencyName'> => {
  const dependency = resolveDependency(name, dependencies, triggers);
  if (occurrence.buildTimeRead || BUILD_TIME_PREFIX.test(name)) {
    // The public address of something the project creates, like the URL a browser opens a WebSocket to.
    return dependency?.kind === 'websocket-api'
      ? { role: 'build-time', dependencyName: dependency.name }
      : { role: 'build-time' };
  }
  if (dependency !== undefined) return { role: 'infra-dependency', dependencyName: dependency.name };
  if (SECRET_NAME.test(name)) return { role: 'third-party-secret' };
  return { role: 'runtime-config' };
};

export type EnrichEnvironmentUsageInput = {
  services: ServiceFactInput[];
  dependencies: DependencyFact[];
  files: readonly string[];
  read: (repoRelativePath: string) => Promise<SourceRead>;
};

/**
 * Populate each service's `environmentVariables` from what its own source files read, and turn a
 * resolved link into consumption evidence on the dependency.
 *
 * Mutates the freshly-built service and dependency objects the assembler hands in, the same way
 * its rename forwarding does. Existing entries win: a probe or descriptor that already described a
 * variable knows more than a grep.
 */
export const enrichEnvironmentUsage = async ({
  services,
  dependencies,
  files,
  read
}: EnrichEnvironmentUsageInput): Promise<void> => {
  if (services.length === 0) return;

  // Deepest service path claims the file, so a monorepo's root service does not absorb reads that
  // belong to `apps/api`. Services sharing one directory — a Procfile's web and worker — share one
  // codebase, so they share its scan.
  const byPath = new Map<string, ServiceFactInput[]>();
  for (const service of services) {
    byPath.set(service.path, [...(byPath.get(service.path) ?? []), service]);
  }
  const pathsDeepestFirst = [...byPath.keys()].toSorted((a, b) => b.length - a.length);

  const filesByPath = new Map<string, string[]>();
  let totalAssigned = 0;
  for (const file of files) {
    if (totalAssigned >= MAX_FILES_SCANNED) break;
    if (EXCLUDED_PATH.test(file) || EXCLUDED_FILE.test(file)) continue;
    if (!PATTERNS_BY_EXTENSION.some((entry) => entry.extensions.test(file))) continue;
    const owner = pathsDeepestFirst.find((path) => path === '.' || file === path || file.startsWith(`${path}/`));
    if (owner === undefined) continue;
    const assigned = filesByPath.get(owner) ?? [];
    if (assigned.length >= MAX_FILES_PER_SERVICE) continue;
    assigned.push(file);
    filesByPath.set(owner, assigned);
    totalAssigned += 1;
  }

  const contentsCache = new Map<string, string | undefined>();
  const readContents = async (file: string): Promise<string | undefined> => {
    if (!contentsCache.has(file)) {
      const result = await read(file);
      contentsCache.set(file, result.kind === 'contents' ? result.contents : undefined);
    }
    return contentsCache.get(file);
  };

  // Each scan unit is a set of services that share one set of source files: a directory, or one JavaScript
  // function's import graph.
  const fileSet = new Set(files);
  const units: Array<{ services: ServiceFactInput[]; files: string[] }> = [];
  for (const [path, pathServices] of byPath) {
    const directoryServices: ServiceFactInput[] = [];
    const ownedFiles = filesByPath.get(path);
    const entries = new Set(pathServices.flatMap((service) => service.functionEntrypoint ?? []));
    for (const service of pathServices) {
      const entry = service.functionEntrypoint;
      if (entry === undefined) {
        directoryServices.push(service);
        continue;
      }
      if (!JS_SOURCE.test(entry)) {
        // Python handlers in one directory share its modules but not each other's entry files: `api.py` reading the
        // table does not make `order_stream.py`, invoked by that table, a reader of it.
        if (entries.size > 1 && ownedFiles !== undefined) {
          units.push({
            services: [service],
            files: ownedFiles.filter((file) => file === entry || !entries.has(file))
          });
        } else {
          directoryServices.push(service);
        }
        continue;
      }
      // oxlint-disable-next-line no-await-in-loop -- bounded per service, and the order keeps results reproducible.
      const closure = await importClosure(entry, fileSet, readContents);
      if (closure === undefined) directoryServices.push(service);
      else units.push({ services: [service], files: closure });
    }
    if (directoryServices.length > 0 && ownedFiles !== undefined) {
      units.push({ services: directoryServices, files: ownedFiles });
    }
  }

  const itemKeys = emptyItemKeyObservations();
  const observedFiles = new Set<string>();
  for (const unit of units) {
    const occurrences = new Map<string, Occurrence>();
    const presignMethods = new Set<'PUT' | 'POST'>();
    // Sequential on purpose: bounded work, and a deterministic file order keeps citation choice
    // reproducible run to run.
    const sources: Array<{ file: string; contents: string }> = [];
    for (const file of unit.files) {
      // oxlint-disable-next-line no-await-in-loop -- bounded by MAX_FILES_SCANNED, order matters.
      const contents = await readContents(file);
      if (contents !== undefined) sources.push({ file, contents });
    }
    // A Go package's helpers serve every file in it.
    const goHelpers = goHelperPatterns(
      sources.filter(({ file }) => file.endsWith('.go')).map(({ contents }) => contents)
    );
    for (const { file, contents } of sources) {
      collectFromFile(file, contents, occurrences, goHelpers);
      for (const method of presignedUploadMethods(contents)) presignMethods.add(method);
      // Two functions importing one data module read it once.
      if (!observedFiles.has(file)) observeItemKeys(contents, itemKeys);
      observedFiles.add(file);
    }
    // The same source files, read for the other thing the composer needs from them.
    if (presignMethods.size > 0) {
      for (const service of unit.services) service.presignedUploadMethods = [...presignMethods].toSorted();
    }
    // A bucket notification grants no access to the bucket. A handler that reads the object it was invoked for needs
    // `connectTo` on that bucket, or `GetObject` fails with AccessDenied.
    if (sources.some(({ contents }) => READS_OBJECT.test(contents))) {
      for (const service of unit.services) {
        for (const trigger of service.functionTriggers ?? []) {
          if (trigger.type !== 'object-storage') continue;
          const bucket = dependencies.find((dependency) => dependency.name === trigger.dependencyName);
          if (bucket !== undefined && !bucket.consumedBy.includes(service.name)) bucket.consumedBy.push(service.name);
        }
      }
    }
    if (occurrences.size === 0) continue;

    const unitSource = sources.map(({ contents }) => contents).join('\n');
    for (const service of unit.services) {
      // Only this service's own triggers: a sibling's is not this service's loop.
      const triggers = new Set(
        (service.functionTriggers ?? []).flatMap((trigger) =>
          feedsBackInto(trigger, unitSource) ? [invokingDependencyName(trigger)!] : []
        )
      );
      const classified: EnvironmentVariableUse[] = [];
      for (const [name, occurrence] of occurrences) {
        const { role, dependencyName } = classify(name, occurrence, dependencies, triggers);
        classified.push({
          name,
          role,
          ...(dependencyName === undefined ? {} : { dependencyName }),
          required: !occurrence.alwaysHasFallback,
          evidence: occurrence.citations
        });
      }
      const uses = classified
        .toSorted((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name))
        .slice(0, MAX_VARIABLES_PER_SERVICE);

      const existing = new Set((service.environmentVariables ?? []).map((variable) => variable.name));
      service.environmentVariables = [
        ...(service.environmentVariables ?? []),
        ...uses.filter((use) => !existing.has(use.name))
      ];

      // A service whose own source reads the variable is a proven consumer — sharper than the
      // colocation guess the assembler otherwise falls back to, and append-only so it can only
      // ever add precision.
      for (const use of uses) {
        // A browser connecting to a public address needs no access of its own.
        if (use.dependencyName === undefined || use.role === 'build-time') continue;
        const dependency = dependencies.find((entry) => entry.name === use.dependencyName);
        if (dependency !== undefined && !dependency.consumedBy.includes(service.name)) {
          dependency.consumedBy.push(service.name);
        }
      }
    }
  }

  // With several tables a key could belong to any of them.
  const tables = dependencies.filter((dependency) => dependency.kind === 'dynamodb');
  const itemKey = agreedItemKey(itemKeys);
  if (tables.length === 1 && itemKey !== undefined) tables[0]!.itemKey ??= itemKey;
  if (tables.length === 1 && tables[0]!.itemKey === undefined && itemKeys.itemAttributes.length > 0) {
    tables[0]!.writtenItemAttributes ??= [...itemKeys.itemAttributes];
  }
};

/**
 * The variables one script reads: its entry file and, for JavaScript, what that file imports. Unlike the service scan
 * this reads files under `scripts/`, because the script is the subject here.
 */
export const scriptEnvironmentUsage = async ({
  entry,
  dependencies,
  files,
  read
}: {
  entry: string;
  dependencies: readonly DependencyFact[];
  files: readonly string[];
  read: (repoRelativePath: string) => Promise<SourceRead>;
}): Promise<EnvironmentVariableUse[]> => {
  const readContents = async (file: string): Promise<string | undefined> => {
    const result = await read(file);
    return result.kind === 'contents' ? result.contents : undefined;
  };
  const closure = JS_SOURCE.test(entry)
    ? ((await importClosure(entry, new Set(files), readContents)) ?? [entry])
    : [entry];
  const occurrences = new Map<string, Occurrence>();
  for (const file of closure) {
    // oxlint-disable-next-line no-await-in-loop -- a script's import graph is small, and the order keeps citations stable.
    const contents = await readContents(file);
    if (contents !== undefined) collectFromFile(file, contents, occurrences);
  }
  const uses: EnvironmentVariableUse[] = [];
  for (const [name, occurrence] of occurrences) {
    const { role, dependencyName } = classify(name, occurrence, dependencies);
    uses.push({ name, role, dependencyName, required: !occurrence.alwaysHasFallback, evidence: occurrence.citations });
  }
  return uses;
};
