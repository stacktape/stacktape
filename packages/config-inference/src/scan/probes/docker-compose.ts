/**
 * What `docker-compose.yml` declares.
 *
 * This is the highest-signal file most repositories have, and for one reason: it is the dependency
 * list, already written down by the person who knows. A `postgres:16` image is not an inference from
 * a package name — it is a statement that this application needs Postgres 16.
 *
 * That makes it the cheapest way to remove the pipeline's most consequential question. `DATABASE_URL`
 * on its own does not say whether the database is Postgres or MySQL, and guessing wrong produces
 * infrastructure the application cannot talk to. A compose file settles it, for free, before any
 * agent runs.
 *
 * Two things it deliberately does not do:
 *
 * **It does not say where production data lives.** A compose file describes a laptop. A Postgres
 * container here is a development database, and inferring `currentlyHostedOn` from it would let a
 * local container overrule the `.env` file that names the real, live Supabase database. The
 * environment probe owns that question.
 *
 * **It does not emit services.** A compose entry that builds from source really is a deployable
 * service, but compose does not say what language it is written in, and a service fact must. The
 * manifests and Dockerfiles answer that better; this probe stays in its lane.
 */

import yaml from 'yaml';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

/** The names compose itself looks for, in the order it looks for them. */
const COMPOSE_FILENAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'] as const;

/**
 * Image name to the kind of backing service it is.
 *
 * Matched against the image's repository part with the registry and tag removed, so
 * `docker.io/library/postgres:16-alpine` and `postgres` are the same entry. Ordered: the first match
 * wins, so more specific images must come before the bare ones they contain.
 */
const IMAGE_TO_KIND: ReadonlyArray<{ images: readonly string[]; kind: DependencyKind }> = [
  {
    images: ['postgres', 'postgis/postgis', 'pgvector/pgvector', 'supabase/postgres', 'timescale/timescaledb'],
    kind: 'postgres'
  },
  { images: ['mysql', 'mariadb', 'percona', 'bitnami/mysql', 'bitnami/mariadb'], kind: 'mysql' },
  { images: ['mcr.microsoft.com/mssql/server'], kind: 'mssql' },
  { images: ['mongo', 'bitnami/mongodb', 'mongodb/mongodb-community-server'], kind: 'mongodb' },
  {
    images: ['redis', 'valkey/valkey', 'redis/redis-stack', 'redis/redis-stack-server', 'bitnami/redis'],
    kind: 'redis'
  },
  {
    images: [
      'elasticsearch',
      'docker.elastic.co/elasticsearch/elasticsearch',
      'opensearchproject/opensearch',
      'getmeili/meilisearch',
      'typesense/typesense'
    ],
    kind: 'search'
  },
  { images: ['rabbitmq', 'bitnami/rabbitmq'], kind: 'queue' },
  {
    images: ['confluentinc/cp-kafka', 'apache/kafka', 'bitnami/kafka', 'redpandadata/redpanda'],
    kind: 'kafka'
  },
  { images: ['minio/minio', 'bitnami/minio'], kind: 'object-storage' },
  { images: ['mailhog/mailhog', 'axllent/mailpit', 'maildev/maildev'], kind: 'email' }
];

/**
 * Strip a registry host and a tag or digest, leaving the repository name.
 *
 * `ghcr.io/acme/redis:7` is `acme/redis`, not `redis` — an organisation's own fork of an image is
 * not the upstream one, and treating it as such is how a probe invents a dependency. Only the
 * well-known public registries are removed.
 */
const repositoryOf = (image: string): string => {
  const withoutDigest = image.split('@')[0] ?? '';
  const parts = withoutDigest.split('/');
  // A tag lives on the last segment only; a colon earlier in the string is a registry port.
  const last = parts.pop() ?? '';
  const name = [...parts, last.split(':')[0] ?? ''].join('/');
  return name
    .replace(/^docker\.io\//, '')
    .replace(/^library\//, '')
    .replace(/^index\.docker\.io\//, '')
    .toLowerCase();
};

/**
 * The engine version an image tag states, when it states one usefully.
 *
 * `postgres:16.2-alpine` is Postgres 16. A tag of `latest`, a bare digest, or something like
 * `16-bookworm-with-our-patches` yields nothing rather than a guess — a wrong version is a database
 * that provisions and then rejects the application's first query.
 */
const versionFromTag = (image: string): string | undefined => {
  const last = (image.split('@')[0] ?? '').split('/').pop() ?? '';
  const tag = last.includes(':') ? last.slice(last.indexOf(':') + 1) : '';
  const match = /^(\d+(?:\.\d+)?)(?:[-.].*)?$/.exec(tag);
  return match?.[1];
};

const kindForImage = (image: string): DependencyKind | undefined => {
  const repository = repositoryOf(image);
  return IMAGE_TO_KIND.find((entry) => entry.images.some((candidate) => candidate === repository))?.kind;
};

type ComposeService = { image?: unknown };

export const dockerComposeProbe: Probe = {
  name: 'docker-compose',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // Root-level only. A compose file inside a sub-project describes that sub-project's own test
    // fixtures as often as it describes the deployment, and picking one arbitrarily out of several
    // would make the result depend on directory order.
    const path = COMPOSE_FILENAMES.find((name) => context.files.includes(name));
    if (path === undefined) return {};

    const raw = await readText(context, path);
    if (raw === undefined) return {};

    let parsed: unknown;
    try {
      parsed = yaml.parse(raw);
    } catch {
      // A compose file we cannot parse is one the user is probably already fighting with. Say
      // nothing rather than half-read it.
      return {};
    }

    const services = (parsed as { services?: Record<string, ComposeService> } | null)?.services;
    if (services === null || typeof services !== 'object') return {};

    const byKind = new Map<DependencyKind, DependencyFact>();

    for (const service of Object.values(services)) {
      const image = service?.image;
      if (typeof image !== 'string' || image === '') continue;

      const kind = kindForImage(image);
      if (kind === undefined) continue;
      // First entry of a kind wins. Two Postgres containers are a primary and a replica, or an app
      // database and a test one — either way they are one dependency, not two.
      if (byKind.has(kind)) continue;

      // The image line itself, cited by construction: it is the whole of the evidence, and it reads
      // well in the wizard next to "your code needs a Postgres database".
      const citation = citeFirstMatch(path, raw, new RegExp(`image:\\s*["']?${escapeForPattern(image)}`));
      const version = versionFromTag(image);

      byKind.set(kind, {
        name: defaultDependencyName(kind),
        kind,
        extensions: [],
        // `depends_on` would name the consumers, but the compose service names are not the service
        // names the rest of the pipeline uses. Attribution happens once, in `assemble`.
        consumedBy: [],
        addressedBy: [],
        ...(version === undefined ? {} : { engineVersion: version }),
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    return { dependencies: [...byKind.values()] };
  }
};

const escapeForPattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
