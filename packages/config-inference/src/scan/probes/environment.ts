/**
 * What the environment files declare, and — carefully — what their values imply.
 *
 * This probe is the only place in the pipeline that looks at an environment *value*, and it is
 * worth being explicit about why the exception exists and how it is contained.
 *
 * The why: `DATABASE_URL=postgres://…` settles, definitively and for free, a question that is
 * otherwise the single most consequential ambiguity in the whole analysis. The same string says
 * whether that database is already running on Supabase — which decides whether we create anything
 * at all or leave a live system alone.
 *
 * The containment: the value is read here, reduced immediately to two enum members, and dropped. It
 * is never returned, never cited, never logged. The citations this probe emits quote only the part
 * of the line to the left of the `=`, so a facts document remains safe to show, store and send even
 * though it was derived from a secret.
 */

import type { Citation } from '../../facts/citation';
import {
  defaultDependencyName,
  type DependencyFact,
  type DependencyHosting,
  type DependencyKind
} from '../../facts/dependency';
import type { Uncertainty } from '../../facts/uncertainty';
import { extractEnvironmentVariableNames, isEnvironmentFileName } from '../../policy/file-access';
import type { Probe, ProbeContext, ProbeOutput } from '../probe';

/** Connection-string schemes that name their engine outright. */
const SCHEME_TO_KIND: ReadonlyArray<{ pattern: RegExp; kind: DependencyKind }> = [
  { pattern: /^postgres(ql)?:\/\//i, kind: 'postgres' },
  { pattern: /^mysql:\/\//i, kind: 'mysql' },
  { pattern: /^mongodb(\+srv)?:\/\//i, kind: 'mongodb' },
  { pattern: /^rediss?:\/\//i, kind: 'redis' },
  { pattern: /^sqlserver:\/\/|^mssql:\/\//i, kind: 'mssql' },
  { pattern: /^file:.*\.(db|sqlite3?)|^sqlite:/i, kind: 'sqlite' },
  { pattern: /^amqps?:\/\//i, kind: 'queue' },
  { pattern: /^smtps?:\/\//i, kind: 'email' }
];

/**
 * Registrable domains that identify a managed provider.
 *
 * Matched on a domain-label boundary — the host must *be* the domain or end with `.` plus the
 * domain. A substring test is not good enough here: `supabase.co.evil.test` contains `supabase.co`,
 * and treating it as a live Supabase database would make composition refuse to create the database
 * the user actually needs, on the say-so of whoever wrote that hostname.
 */
const PROVIDER_DOMAINS: ReadonlyArray<{ domains: readonly string[]; hosting: DependencyHosting }> = [
  { domains: ['supabase.co', 'supabase.com', 'supabase.net'], hosting: 'supabase' },
  { domains: ['neon.tech', 'neon.build'], hosting: 'neon' },
  { domains: ['psdb.cloud', 'planetscale.com'], hosting: 'planetscale' },
  { domains: ['railway.app', 'railway.internal', 'rlwy.net'], hosting: 'railway' },
  { domains: ['render.com'], hosting: 'render' },
  { domains: ['herokuapp.com', 'heroku.com'], hosting: 'heroku' },
  { domains: ['upstash.io'], hosting: 'upstash' },
  { domains: ['mongodb.net'], hosting: 'mongodb-atlas' },
  { domains: ['amazonaws.com'], hosting: 'aws' }
];

/** Hosts that mean the data only exists on this developer's machine. */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'host.docker.internal']);

const hostingForHost = (host: string): DependencyHosting | undefined => {
  const lower = host.toLowerCase().replace(/\.$/, '');
  if (LOCAL_HOSTS.has(lower)) {
    return 'local';
  }
  return PROVIDER_DOMAINS.find((entry) =>
    entry.domains.some((domain) => lower === domain || lower.endsWith(`.${domain}`))
  )?.hosting;
};

/** Variable names that promise a backing service even when the value is absent or a placeholder. */
const NAME_TO_KIND: ReadonlyArray<{ pattern: RegExp; kind: DependencyKind }> = [
  // `POSTGRES_*` and `PG_*` name the engine. `DATABASE_URL` deliberately does not appear here: it
  // is the canonical engine-agnostic name, and treating it as Postgres is the exact silent guess
  // this pipeline exists to avoid. It falls through to `AMBIGUOUS_DATABASE_NAMES` and becomes a
  // question — unless some other probe has already settled the engine.
  { pattern: /^(POSTGRES|PG)_?(URL|URI|DSN|HOST|USER|PASSWORD|DB|DATABASE)?$/i, kind: 'postgres' },
  { pattern: /^MYSQL_/i, kind: 'mysql' },
  { pattern: /^MONGO(DB)?_/i, kind: 'mongodb' },
  { pattern: /^REDIS_/i, kind: 'redis' },
  { pattern: /^(S3|BUCKET|AWS_BUCKET)_?/i, kind: 'object-storage' },
  { pattern: /^(SMTP|MAIL(ER)?)_/i, kind: 'email' },
  { pattern: /^(ELASTIC|OPENSEARCH|MEILI|TYPESENSE)_/i, kind: 'search' },
  { pattern: /^KAFKA_/i, kind: 'kafka' },
  { pattern: /^(SQS|QUEUE|RABBITMQ|AMQP)_/i, kind: 'queue' }
];

/** Names generic enough that they promise a database without saying which. */
const AMBIGUOUS_DATABASE_NAMES = /^(DATABASE|DB)_?(URL|URI|DSN|CONNECTION_STRING)$/i;

const hostOf = (value: string): string | undefined => {
  const trimmed = value.trim();
  try {
    // `URL` handles userinfo, ports, IPv6 brackets and percent-encoding correctly, all of which a
    // hand-rolled regex gets wrong on exactly the malformed inputs worth being careful about.
    const host = new URL(trimmed).hostname;
    if (host !== '') {
      return host.replace(/^\[|\]$/g, '');
    }
  } catch {
    // Not a URL the platform recognises; fall through.
  }
  const match = /^[a-z+]+:\/\/(?:[^@/]*@)?\[?([^\]:/?#]+)\]?/i.exec(trimmed);
  return match?.[1];
};

/**
 * Reduce one environment assignment to what may safely leave this function.
 *
 * Takes a whole `NAME=value` line and returns only enum members. The value is a local, and nothing
 * derived from it other than these two fields is retained.
 */
const classifyAssignment = (line: string): { kind?: DependencyKind; hosting?: DependencyHosting } => {
  const separator = line.indexOf('=');
  if (separator <= 0) return {};
  const value = line
    .slice(separator + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
  if (value === '') return {};

  const kind = SCHEME_TO_KIND.find((entry) => entry.pattern.test(value))?.kind;
  const host = hostOf(value);
  const hosting = host === undefined ? undefined : hostingForHost(host);

  return {
    ...(kind === undefined ? {} : { kind }),
    ...(hosting === undefined ? {} : { hosting })
  };
};

/**
 * Cite a variable declaration without quoting its value.
 *
 * The quote stops at the `=`. Everything downstream — the facts document, the wizard, the eval
 * harness, any telemetry — is therefore safe by construction rather than by everyone downstream
 * remembering to redact.
 */
const citeVariableName = (file: string, lines: readonly string[], name: string): Citation | undefined => {
  const index = lines.findIndex((line) => {
    const trimmed = line.trim().replace(/^export\s+/, '');
    return trimmed.startsWith(`${name}=`);
  });
  return index === -1 ? undefined : { file, line: index + 1, quote: `${name}=` };
};

export const environmentProbe: Probe = {
  name: 'environment',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // The same predicate the policy uses. Keeping a second copy here is how the two drift: broaden
    // the policy to cover `.envrc` and this probe silently keeps ignoring it.
    const envFiles = context.files.filter((file) => isEnvironmentFileName(file.slice(file.lastIndexOf('/') + 1)));
    if (envFiles.length === 0) return {};

    const byKind = new Map<DependencyKind, { evidence: Citation[]; hosting?: DependencyHosting; names: string[] }>();
    const uncertainties: Uncertainty[] = [];
    const ambiguous = new Map<string, Citation | undefined>();

    // Read together, then folded in file order: the accumulation below is order-sensitive (the first
    // file to mention a kind owns its citation), so the reads are parallel and the merge is not.
    const contents = await Promise.all(
      envFiles.map(async (file) => ({ file, raw: await context.readPrivileged(file) }))
    );

    for (const { file, raw } of contents) {
      if (raw === null) continue;
      const lines = raw.split(/\r?\n/);
      const names = extractEnvironmentVariableNames(raw);

      for (const name of names) {
        const citation = citeVariableName(file, lines, name);
        const declaration =
          lines.find((line) =>
            line
              .trim()
              .replace(/^export\s+/, '')
              .startsWith(`${name}=`)
          ) ?? '';
        const { kind: valueKind, hosting } = classifyAssignment(declaration);
        const nameKind = NAME_TO_KIND.find((entry) => entry.pattern.test(name))?.kind;

        // A scheme in the value beats a guess from the name: `DATABASE_URL=mysql://…` is a MySQL
        // database no matter what the variable is called.
        const kind = valueKind ?? nameKind;

        if (kind === undefined) {
          if (AMBIGUOUS_DATABASE_NAMES.test(name)) ambiguous.set(name, citation);
          continue;
        }

        const entry = byKind.get(kind) ?? { evidence: [], names: [] };
        if (citation && entry.evidence.length < 4) entry.evidence.push(citation);
        if (hosting !== undefined && entry.hosting === undefined) entry.hosting = hosting;
        if (!entry.names.includes(name)) entry.names.push(name);
        byKind.set(kind, entry);
      }
    }

    const DATABASE_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'mongodb', 'sqlite']);

    for (const [name, citation] of ambiguous) {
      // Only when nothing has settled the *engine*. This used to check whether any dependency at all
      // had been found, so a project with a Redis cache stopped asking which database it had — and
      // the database silently vanished from the result rather than becoming a question.
      if ([...byKind.keys()].some((kind) => DATABASE_KINDS.has(kind))) continue;
      uncertainties.push({
        kind: 'database-engine-ambiguous',
        id: `database-engine:${name}`,
        blocksDeploy: true,
        evidence: citation ? [citation] : [],
        source: 'probe',
        environmentVariableName: name,
        candidates: ['postgres', 'mysql'],
        recommended: 'postgres'
      });
    }

    const dependencies: DependencyFact[] = [...byKind.entries()].map(([kind, entry]) => ({
      name: defaultDependencyName(kind),
      kind,
      extensions: [],
      consumedBy: [],
      addressedBy: entry.names,
      currentlyHostedOn: entry.hosting,
      evidence: entry.evidence,
      source: 'probe'
    }));

    return { dependencies, uncertainties };
  }
};
