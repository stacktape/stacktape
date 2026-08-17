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

import type { DependencyFact, DependencyKind } from '../facts/dependency';
import type { EnvironmentVariableRole, EnvironmentVariableUse, ServiceFactInput } from '../facts/service';
import type { Citation } from '../facts/citation';
import type { SourceRead } from './read-source';
import { AMBIGUOUS_DATABASE_NAMES, ENV_NAME_TO_KIND } from './probes/environment';
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
  fallback?: 'js-or' | 'call-argument';
};

const JS_PATTERNS: readonly ReadPattern[] = [
  { pattern: new RegExp(`process\\.env\\.${NAME}`, 'g'), fallback: 'js-or' },
  { pattern: new RegExp(`process\\.env\\[['"\`]${NAME}['"\`]\\]`, 'g'), fallback: 'js-or' },
  { pattern: new RegExp(`import\\.meta\\.env\\.${NAME}`, 'g'), buildTime: true },
  { pattern: new RegExp(`Bun\\.env\\.${NAME}`, 'g'), fallback: 'js-or' },
  { pattern: new RegExp(`Deno\\.env\\.get\\(\\s*['"\`]${NAME}['"\`]`, 'g'), fallback: 'js-or' }
];

const PATTERNS_BY_EXTENSION: ReadonlyArray<{ extensions: RegExp; patterns: readonly ReadPattern[] }> = [
  { extensions: /\.(?:[cm]?[jt]s|[jt]sx)$/, patterns: JS_PATTERNS },
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
  if (kind === 'call-argument') return /^\s*['"`)\]]*\s*,/.test(rest);
  return false;
};

const collectFromFile = (path: string, contents: string, occurrences: Map<string, Occurrence>): void => {
  const group = PATTERNS_BY_EXTENSION.find((entry) => entry.extensions.test(path));
  if (group === undefined) return;

  const lines = contents.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const { pattern, buildTime, fallback } of group.patterns) {
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
const resolveDependency = (name: string, dependencies: readonly DependencyFact[]): DependencyFact | undefined => {
  const addressed = dependencies.filter((dependency) => dependency.addressedBy.includes(name));
  if (addressed.length === 1) return addressed[0];
  if (addressed.length > 1) return undefined;

  const kind = ENV_NAME_TO_KIND.find((entry) => entry.pattern.test(name))?.kind;
  if (kind !== undefined) {
    const ofKind = dependencies.filter((dependency) => dependency.kind === kind);
    return ofKind.length === 1 ? ofKind[0] : undefined;
  }

  // `DATABASE_URL` names no engine, but when the repository holds exactly one database the other
  // probes already settled which one it means — the same reconciliation the assembler applies to
  // the engine question itself.
  if (AMBIGUOUS_DATABASE_NAMES.test(name)) {
    const databases = dependencies.filter((dependency) => DATABASE_KINDS.has(dependency.kind));
    return databases.length === 1 ? databases[0] : undefined;
  }
  return undefined;
};

const classify = (
  name: string,
  occurrence: Occurrence,
  dependencies: readonly DependencyFact[]
): Pick<EnvironmentVariableUse, 'role' | 'dependencyName'> => {
  if (occurrence.buildTimeRead || BUILD_TIME_PREFIX.test(name)) return { role: 'build-time' };
  const dependency = resolveDependency(name, dependencies);
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

  for (const [path, ownedFiles] of filesByPath) {
    const occurrences = new Map<string, Occurrence>();
    // Sequential on purpose: bounded work, and a deterministic file order keeps citation choice
    // reproducible run to run.
    for (const file of ownedFiles) {
      // oxlint-disable-next-line no-await-in-loop -- bounded by MAX_FILES_SCANNED, order matters.
      const result = await read(file);
      if (result.kind !== 'contents') continue;
      collectFromFile(file, result.contents, occurrences);
    }
    if (occurrences.size === 0) continue;

    const classified: EnvironmentVariableUse[] = [];
    for (const [name, occurrence] of occurrences) {
      const { role, dependencyName } = classify(name, occurrence, dependencies);
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

    for (const service of byPath.get(path) ?? []) {
      const existing = new Set((service.environmentVariables ?? []).map((variable) => variable.name));
      service.environmentVariables = [
        ...(service.environmentVariables ?? []),
        ...uses.filter((use) => !existing.has(use.name))
      ];

      // A service whose own source reads the variable is a proven consumer — sharper than the
      // colocation guess the assembler otherwise falls back to, and append-only so it can only
      // ever add precision.
      for (const use of uses) {
        if (use.dependencyName === undefined) continue;
        const dependency = dependencies.find((entry) => entry.name === use.dependencyName);
        if (dependency !== undefined && !dependency.consumedBy.includes(service.name)) {
          dependency.consumedBy.push(service.name);
        }
      }
    }
  }
};
