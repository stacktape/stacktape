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
 * Entries built from this repository are services too. Compose states their declared command,
 * container port, build context and which backing services they wait for. Language still comes
 * from the source markers inside that context; a prebuilt third-party image remains outside init.
 */

import { posix } from 'node:path';
import yaml from 'yaml';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { ImportGap, MigrationFact } from '../../facts/project-facts';
import type { EnvironmentVariableUse, ServiceFactInput } from '../../facts/service';
import { languageOf } from '../language';
import { isPlatformEnvironmentVariable } from '../platform-environment';
import { safeDeclaredLiteral } from './declared-environment';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { extractEnvironmentVariableNames } from '../../policy/file-access';
import {
  emptyReview,
  isOmitted,
  omitFor,
  reviewGaps,
  reviewKeys,
  safeDeclaredName,
  type KeyReview,
  type KeyRules
} from './declared-keys';

/** The names compose itself looks for, in the order it looks for them. */
const COMPOSE_FILENAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'] as const;

/**
 * Where a compose file may live and still describe this repository's dependencies.
 *
 * The root is compose's own default. The others are the conventional homes projects move the file
 * to when the root gets crowded — and a file in `infra/` or `docker/` is *more* likely to be the
 * real dependency list, not less. Deeper nesting stays excluded: a compose file inside a
 * sub-package describes that package's test fixtures as often as the deployment, and picking one
 * of several arbitrarily would make the result depend on directory order.
 */
const COMPOSE_DIRECTORIES = ['', 'docker/', '.docker/', 'infra/', 'deploy/', 'dev/'] as const;

/**
 * Image name to the kind of backing service it is.
 *
 * Matched against the image's repository part with the registry and tag removed, so
 * `docker.io/library/postgres:16-alpine` and `postgres` are the same entry. Ordered: the first match
 * wins, so more specific images must come before the bare ones they contain.
 */
const IMAGE_TO_KIND: ReadonlyArray<{
  images: readonly string[];
  kind: DependencyKind;
}> = [
  {
    images: ['postgres', 'postgis/postgis', 'pgvector/pgvector', 'supabase/postgres', 'timescale/timescaledb'],
    kind: 'postgres'
  },
  {
    images: ['mysql', 'mariadb', 'percona', 'bitnami/mysql', 'bitnami/mariadb'],
    kind: 'mysql'
  },
  { images: ['mcr.microsoft.com/mssql/server'], kind: 'mssql' },
  {
    images: ['mongo', 'bitnami/mongodb', 'mongodb/mongodb-community-server'],
    kind: 'mongodb'
  },
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
  { images: ['rabbitmq', 'bitnami/rabbitmq'], kind: 'amqp' },
  {
    images: ['confluentinc/cp-kafka', 'apache/kafka', 'bitnami/kafka', 'redpandadata/redpanda'],
    kind: 'kafka'
  },
  { images: ['nats', 'bitnami/nats'], kind: 'nats' },
  { images: ['minio/minio', 'bitnami/minio'], kind: 'object-storage' },
  {
    images: ['mailhog/mailhog', 'axllent/mailpit', 'maildev/maildev'],
    kind: 'email'
  }
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

type ComposeService = {
  image?: unknown;
  build?: unknown;
  command?: unknown;
  entrypoint?: unknown;
  ports?: unknown;
  expose?: unknown;
  depends_on?: unknown;
  environment?: unknown;
  env_file?: unknown;
  labels?: unknown;
  volumes?: unknown;
  networks?: unknown;
  healthcheck?: unknown;
  profiles?: unknown;
  extends?: unknown;
  [key: string]: unknown;
};

/** What init does with each key of a service built from this repository. */
const APPLICATION_SERVICE: KeyRules = {
  build: 'carried',
  image: 'carried',
  command: 'carried',
  entrypoint: 'carried',
  ports: 'carried',
  expose: 'carried',
  depends_on: 'carried',
  environment: 'carried',
  env_file: 'carried',
  labels: 'carried',
  volumes: 'carried',
  networks: 'carried',
  healthcheck: 'carried',
  profiles: 'carried',
  extends: 'carried',
  // ECS restarts, names and logs tasks itself.
  container_name: 'ignored',
  restart: 'ignored',
  tty: 'ignored',
  stdin_open: 'ignored',
  hostname: 'ignored',
  domainname: 'ignored',
  develop: 'ignored',
  pull_policy: 'ignored',
  annotations: 'ignored',
  attach: 'ignored',
  links: 'ignored',
  working_dir: 'not-carried',
  init: 'not-carried',
  stop_grace_period: 'not-carried',
  logging: 'not-carried',
  deploy: 'not-carried',
  scale: 'not-carried',
  mem_limit: 'not-carried',
  mem_reservation: 'not-carried',
  memswap_limit: 'not-carried',
  cpus: 'not-carried',
  cpu_shares: 'not-carried',
  cpu_count: 'not-carried',
  cpuset: 'not-carried',
  ulimits: 'not-carried',
  sysctls: 'not-carried',
  shm_size: 'not-carried',
  dns: 'not-carried',
  dns_search: 'not-carried',
  dns_opt: 'not-carried',
  extra_hosts: 'not-carried',
  external_links: 'not-carried',
  secrets: 'not-carried',
  configs: 'not-carried',
  tmpfs: 'not-carried',
  stop_signal: 'not-carried',
  platform: 'not-carried',
  post_start: 'not-carried',
  pre_stop: 'not-carried',
  gpus: 'not-carried',
  runtime: 'not-carried',
  // Leaving these out gives the container less than the source grants it, not more.
  cap_add: 'not-carried',
  privileged: 'not-carried',
  devices: 'not-carried',
  group_add: 'not-carried',
  pid: 'not-carried',
  ipc: 'not-carried',
  read_only: 'container-security',
  cap_drop: 'container-security',
  security_opt: 'container-security',
  user: 'container-security',
  userns_mode: 'container-security',
  network_mode: 'network',
  volumes_from: 'storage'
};

const TOP_LEVEL: KeyRules = {
  services: 'carried',
  volumes: 'carried',
  networks: 'carried',
  name: 'ignored',
  version: 'ignored',
  secrets: 'not-carried',
  configs: 'not-carried',
  include: 'not-carried'
};

const NAMED_VOLUME: KeyRules = {
  name: 'ignored',
  labels: 'ignored',
  driver: 'not-carried',
  driver_opts: 'not-carried',
  external: 'not-carried'
};

const NETWORK: KeyRules = {
  internal: 'carried',
  name: 'ignored',
  driver: 'ignored',
  attachable: 'ignored',
  enable_ipv6: 'ignored',
  labels: 'ignored',
  ipam: 'not-carried',
  driver_opts: 'not-carried',
  external: 'not-carried'
};

/** A service's networks by name, with each one's per-service options. */
const networksOf = (service: ComposeService): Array<[string, unknown]> =>
  Array.isArray(service.networks)
    ? service.networks.filter((entry): entry is string => typeof entry === 'string').map((name) => [name, undefined])
    : isRecord(service.networks)
      ? Object.entries(service.networks)
      : [];

/** A string or exec-form list as one command line, quoting words that hold spaces or shell characters. */
const commandLine = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() === '' ? undefined : value.trim();
  if (!Array.isArray(value) || value.length === 0 || !value.every((word) => typeof word === 'string')) return undefined;
  return (value as string[])
    .map((word) => (/^[A-Za-z0-9_@%+=:,./-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`))
    .join(' ');
};

/** `10s`, `1m30s`, `500ms` as whole seconds, rounded up. */
const durationSeconds = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.ceil(value) : undefined;
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d+)?(?:h|m|s|ms|us|ns))+$/.test(value.trim())) return undefined;
  const units: Record<string, number> = { h: 3600, m: 60, s: 1, ms: 0.001, us: 0.000_001, ns: 0.000_000_001 };
  let total = 0;
  for (const [, amount, unit] of value.trim().matchAll(/(\d+(?:\.\d+)?)(h|ms|m|s|us|ns)/g))
    total += Number(amount) * units[unit!]!;
  return Math.ceil(total);
};

type HealthCheck = NonNullable<ServiceFactInput['containerHealthCheck']>;

/** A Compose `healthcheck` in the exec form ECS takes, or `UNREAD` when one is declared that init cannot read. */
const healthCheckOf = (declaration: unknown): HealthCheck | 'none' | 'unread' | undefined => {
  if (declaration === undefined) return undefined;
  if (!isRecord(declaration)) return 'unread';
  if (declaration.disable === true) return 'none';
  const test = declaration.test;
  const command =
    typeof test === 'string'
      ? ['CMD-SHELL', test]
      : Array.isArray(test) && test.every((word) => typeof word === 'string')
        ? (test as string[])
        : undefined;
  if (command === undefined) return 'unread';
  if (command[0] === 'NONE') return 'none';
  if ((command[0] !== 'CMD' && command[0] !== 'CMD-SHELL') || command.length < 2) return 'unread';
  const timing = {
    intervalSeconds: durationSeconds(declaration.interval),
    timeoutSeconds: durationSeconds(declaration.timeout),
    startPeriodSeconds: durationSeconds(declaration.start_period),
    retries:
      typeof declaration.retries === 'number' && Number.isInteger(declaration.retries) ? declaration.retries : undefined
  };
  for (const key of ['interval', 'timeout', 'start_period'] as const) {
    if (declaration[key] !== undefined && durationSeconds(declaration[key]) === undefined) return 'unread';
  }
  return {
    command,
    ...Object.fromEntries(Object.entries(timing).filter(([, value]) => value !== undefined && value > 0))
  };
};

/**
 * Directories a named volume commonly shadows only for local development: installed dependencies, package-manager and
 * build caches, and runtime scratch space. On AWS the image already holds the first, the rest need not outlive the
 * container, and an empty network disk mounted over an image directory would hide what the build installed.
 */
const isDevelopmentVolumeTarget = (mountPath: string): boolean => {
  const segments = mountPath.split('/').filter(Boolean);
  if (segments.includes('node_modules')) return true;
  if (/^\/(?:tmp|var\/tmp|run|var\/run|var\/cache|dev\/shm)(?:\/|$)/.test(mountPath)) return true;
  // Tool caches in a home directory (`/root/.npm`, `/home/app/.cache`). Other home dot-directories, such as
  // `.local/share/app`, are where applications keep their own state, so a volume mounted there is kept.
  if (
    /^\/(?:root|home\/[^/]+)\/\.(?:npm|cache|yarn|pnpm-store|bun|m2|gradle|cargo|rustup|bundle|gem|composer|nuget|pip|ivy2|sbt|deno|go|config\/yarn|local\/share\/pnpm|local\/share\/virtualenvs)(?:\/|$)/.test(
      mountPath
    )
  ) {
    return true;
  }
  return /^(?:\.venv|venv|vendor|__pycache__|\.next|\.nuxt|\.cache|cache|tmp)$/.test(segments.at(-1) ?? '');
};

type PersistentVolume = NonNullable<ServiceFactInput['persistentVolumes']>[number];

/**
 * The named volumes a service mounts (`uploads:/app/uploads:ro`), limited to volumes the file declares, with the
 * read-only option and the subdirectory of the volume (`volume.subpath`) each mount uses.
 */
const persistentVolumesOf = (service: ComposeService, declaredVolumes: ReadonlySet<string>): PersistentVolume[] => {
  const entries = Array.isArray(service.volumes) ? service.volumes : [];
  const mounts = entries.flatMap((entry): PersistentVolume[] => {
    let source: unknown;
    let target: unknown;
    let readOnly = false;
    let subpath: unknown;
    if (typeof entry === 'string') {
      const [entrySource, entryTarget, options = ''] = entry.split(':');
      source = entrySource;
      target = entryTarget;
      readOnly = options.split(',').includes('ro');
    } else if (isRecord(entry) && (entry.type === undefined || entry.type === 'volume')) {
      source = entry.source;
      target = entry.target;
      readOnly = entry.read_only === true || entry.read_only === 'true';
      subpath = isRecord(entry.volume) ? entry.volume.subpath : undefined;
    }
    if (typeof source !== 'string' || typeof target !== 'string' || !declaredVolumes.has(source)) return [];
    const mountPath = posix.normalize(target).replace(/\/$/, '');
    if (!mountPath.startsWith('/') || mountPath === '/' || isDevelopmentVolumeTarget(mountPath)) return [];
    return [
      {
        name: source,
        mountPath,
        ...(readOnly ? { readOnly: true as const } : {}),
        ...(typeof subpath === 'string' && subpath !== '' ? { subpath } : {})
      }
    ];
  });
  return [...new Map(mounts.map((mount) => [mount.mountPath, mount])).values()];
};

const DATABASE_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'mongodb', 'sqlite']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const factName = (value: string): string => {
  const safe = value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(.)/, (character) => character.toLowerCase());
  return safe.length === 0 ? 'service' : safe;
};

const composeDirectory = (file: string): string => {
  const directory = posix.dirname(file);
  return directory === '' ? '.' : directory;
};

const resolveFrom = (directory: string, value: string): string | undefined => {
  const resolved = posix.normalize(directory === '.' ? value : posix.join(directory, value)).replace(/^\.\//, '');
  return resolved === '..' || resolved.startsWith('../') ? undefined : resolved;
};

const buildOf = (
  service: ComposeService,
  file: string,
  files: readonly string[]
): { root: string; dockerfile?: string; target?: string } | undefined => {
  const declaration = service.build;
  const context =
    typeof declaration === 'string' ? declaration : isRecord(declaration) ? declaration.context : undefined;
  if (typeof context !== 'string' || context === '') return undefined;
  const root = resolveFrom(composeDirectory(file), context);
  if (root === undefined) return undefined;
  const declaredDockerfile =
    isRecord(declaration) && typeof declaration.dockerfile === 'string' ? declaration.dockerfile : 'Dockerfile';
  const dockerfile = resolveFrom(root, declaredDockerfile);
  const target = isRecord(declaration) && typeof declaration.target === 'string' ? declaration.target : undefined;
  return {
    root: root === '' ? '.' : root,
    ...(dockerfile !== undefined && files.includes(dockerfile) ? { dockerfile } : {}),
    ...(target === undefined ? {} : { target })
  };
};

/**
 * A Dockerfile that installs and directly runs one registry tool without ever copying repository
 * context describes a local utility image, not this repository's application. The predicate is
 * intentionally narrow: any COPY/ADD, scoped/ambiguous package, compound command or parse miss
 * returns false so a real application is never hidden on a guess.
 */
export const isThirdPartyUtilityDockerfile = (contents: string): boolean => {
  const instructions = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  if (instructions.some((line) => /^(?:COPY|ADD)\b/i.test(line))) return false;

  const installed = new Set<string>();
  for (const line of instructions) {
    const match =
      /^RUN\s+.*?\b(?:npm\s+(?:i|install)\s+(?:-g|--global)|pnpm\s+add\s+(?:-g|--global)|yarn\s+global\s+add|pip3?\s+install)\s+([a-z0-9][a-z0-9._-]*)(?:@[^\s]+)?\s*$/i.exec(
        line
      );
    if (match !== null) installed.add(match[1]!.toLowerCase());
  }
  if (installed.size === 0) return false;

  const launch = instructions.findLast((line) => /^(?:CMD|ENTRYPOINT)\b/i.test(line));
  if (launch === undefined) return false;
  const declaration = launch.replace(/^(?:CMD|ENTRYPOINT)\s+/i, '').trim();
  let executable: string | undefined;
  if (declaration.startsWith('[')) {
    try {
      const argv = JSON.parse(declaration) as unknown;
      if (!Array.isArray(argv) || argv.length !== 1 || typeof argv[0] !== 'string') return false;
      executable = argv[0];
    } catch {
      return false;
    }
  } else if (/^[A-Za-z0-9._-]+$/.test(declaration)) {
    executable = declaration;
  }
  return executable !== undefined && installed.has(executable.toLowerCase());
};

const containerPortOf = (service: ComposeService): number | undefined => {
  const declarations = [
    ...(Array.isArray(service.ports) ? service.ports : []),
    ...(Array.isArray(service.expose) ? service.expose : [])
  ];
  for (const declaration of declarations) {
    const raw =
      typeof declaration === 'number'
        ? String(declaration)
        : typeof declaration === 'string'
          ? declaration.split('/')[0]!
          : isRecord(declaration) && (typeof declaration.target === 'number' || typeof declaration.target === 'string')
            ? String(declaration.target)
            : undefined;
    const segment = raw?.split(':').at(-1);
    const port = Number.parseInt(segment ?? '', 10);
    if (Number.isInteger(port) && port > 0 && port <= 65_535) return port;
  }
  return undefined;
};

const labelEntries = (service: ComposeService): Array<[string, unknown]> => {
  if (Array.isArray(service.labels)) {
    return service.labels.flatMap((entry) => {
      if (typeof entry !== 'string') return [];
      const separator = entry.indexOf('=');
      return separator === -1
        ? [[entry, true] as [string, unknown]]
        : [[entry.slice(0, separator), entry.slice(separator + 1)] as [string, unknown]];
    });
  }
  return isRecord(service.labels) ? Object.entries(service.labels) : [];
};

/** A reverse proxy label is the public-listener declaration when Compose does not publish a port. */
const proxyPortOf = (service: ComposeService): number | undefined => {
  for (const [name, value] of labelEntries(service)) {
    if (!/^traefik\.http\.services\..+\.loadbalancer\.server\.port$/i.test(name)) continue;
    const port = Number.parseInt(String(value), 10);
    if (Number.isInteger(port) && port > 0 && port <= 65_535) return port;
  }
  return undefined;
};

const dependsOn = (service: ComposeService): string[] =>
  Array.isArray(service.depends_on)
    ? service.depends_on.filter((entry): entry is string => typeof entry === 'string')
    : isRecord(service.depends_on)
      ? Object.keys(service.depends_on)
      : [];

const completedDependencies = (service: ComposeService): string[] =>
  !isRecord(service.depends_on)
    ? []
    : Object.entries(service.depends_on).flatMap(([name, declaration]) =>
        isRecord(declaration) && declaration.condition === 'service_completed_successfully' ? [name] : []
      );

const BACKGROUND_PROCESS_NAME = /(?:^|[-_.])(?:worker|scheduler|cron|consumer|queue|jobs?)(?:$|[-_.])/i;

const MIGRATION_COMMAND =
  /(?:^|\s)(?:alembic\s+upgrade|(?:npm|pnpm|yarn|bun)\s+(?:--filter\s+\S+\s+)?(?:run\s+)?(?:\S*migrat\S*|\S*db:\S*)|npx\s+[^\s]*(?:migrat|prisma)|python3?\s+manage\.py\s+migrate|rails\s+db:|rake\s+db:|prisma\s+migrate|typeorm\s+[^\s]*migration|knex\s+migrate|sequelize(?:-cli)?\s+db:migrate|flyway|liquibase|dbmate)(?:\s|$)/i;

/**
 * The program a service runs, as Compose starts it: an `entrypoint` replaces the image's own and drops its `CMD`, and
 * `command` supplies the arguments. Both may be a string or an exec-form list.
 */
const commandOf = (service: ComposeService): string | undefined => {
  const entrypoint = commandLine(service.entrypoint);
  const command = commandLine(service.command);
  return entrypoint === undefined ? command : command === undefined ? entrypoint : `${entrypoint} ${command}`;
};

/** The fallback part of `${NAME:-value}` is what this Compose deployment actually uses by default. */
const composeDefault = (value: string): string => value.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*(?::-|-)([^}]*)\}/g, '$1');

const variableNamesDependency = (name: string, kind: DependencyKind): boolean => {
  const upper = name.toUpperCase();
  switch (kind) {
    case 'postgres':
      return /(?:POSTGRES|POSTGRESQL|PG|DATABASE|DATASOURCE)/.test(upper);
    case 'mysql':
      return /(?:MYSQL|MARIADB|DATABASE|DATASOURCE)/.test(upper);
    case 'mssql':
      return /(?:MSSQL|SQLSERVER|DATABASE|DATASOURCE)/.test(upper);
    case 'mongodb':
      return /(?:MONGO|DATABASE)/.test(upper);
    case 'redis':
      return /(?:REDIS|CACHE)/.test(upper);
    case 'object-storage':
      return /(?:S3|BUCKET|OBJECT_STORAGE|MINIO)/.test(upper);
    case 'amqp':
      return /(?:AMQP|RABBIT)/.test(upper);
    case 'kafka':
      return /(?:KAFKA|BROKER)/.test(upper);
    case 'nats':
      return /(?:NATS|BROKER)/.test(upper);
    case 'search':
      return /(?:ELASTIC|OPENSEARCH|MEILI|TYPESENSE|SEARCH)/.test(upper);
    case 'email':
      return /(?:SMTP|MAIL)/.test(upper);
    default:
      return false;
  }
};

const dockerfileDefaultCommand = (raw: string): string | undefined => {
  const json = /^\s*CMD\s+(\[[^\r\n]+\])\s*$/im.exec(raw)?.[1];
  if (json !== undefined) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) return parsed.join(' ');
    } catch {
      // A malformed Dockerfile command contributes no lifecycle fact.
    }
  }
  return /^\s*CMD\s+([^\r\n]+)$/im.exec(raw)?.[1]?.trim();
};

const environmentEntries = (service: ComposeService): Array<{ name: string; value?: unknown }> => {
  if (Array.isArray(service.environment)) {
    return service.environment.flatMap((entry) => {
      if (typeof entry !== 'string') return [];
      const separator = entry.indexOf('=');
      return separator === -1
        ? [{ name: entry }]
        : [
            {
              name: entry.slice(0, separator),
              value: entry.slice(separator + 1)
            }
          ];
    });
  }
  return isRecord(service.environment)
    ? Object.entries(service.environment).map(([name, value]) => ({
        name,
        value
      }))
    : [];
};

const isDevelopmentProcess = (service: ComposeService, build: { target?: string }): boolean => {
  if (/^(?:dev|development)$/i.test(build.target ?? '')) return true;
  if (typeof service.image === 'string' && /(?:^|:)development(?:$|[-.])/i.test(service.image)) return true;
  if (/\b(?:vite|next|nuxt|astro|ng|gatsby)\s+(?:dev|develop)\b/i.test(commandOf(service) ?? '')) return true;
  const buildArguments = isRecord(service.build)
    ? isRecord(service.build.args)
      ? Object.entries(service.build.args).map(([name, value]) => ({
          name,
          value
        }))
      : Array.isArray(service.build.args)
        ? service.build.args.flatMap((entry) => {
            if (typeof entry !== 'string') return [];
            const separator = entry.indexOf('=');
            return [
              {
                name: separator === -1 ? entry : entry.slice(0, separator),
                value: separator === -1 ? undefined : entry.slice(separator + 1)
              }
            ];
          })
        : []
    : [];
  return [...environmentEntries(service), ...buildArguments].some(
    ({ name, value }) =>
      /^(?:NODE_ENV|RAILS_ENV|RACK_ENV|APP_ENV)$/i.test(name) &&
      typeof value === 'string' &&
      /^development$/i.test(value.trim())
  );
};

/** Commands that start a development server: auto-reload, a framework's dev server, a watcher. */
const DEVELOPMENT_COMMAND =
  /\bmanage\.py\s+runserver\b|\bflask\s+run\b|\bnodemon\b|\bts-node-dev\b|\btsx\s+watch\b|\s--reload\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?dev\b|\bair\b(?:\s|$)/;

/** A bind mount of the project's own directory (`.:/code`): the container runs the host's files, as on a laptop. */
const mountsSource = (service: ComposeService): boolean =>
  (Array.isArray(service.volumes) ? service.volumes : []).some((entry) => {
    const source =
      typeof entry === 'string'
        ? entry.split(':')[0]
        : isRecord(entry) && entry.type === 'bind'
          ? entry.source
          : undefined;
    return typeof source === 'string' && /^\.\/?$|^\.\/(?:src|app)\/?$/.test(source);
  });

const NETWORK_ATTACHMENT: KeyRules = {
  priority: 'ignored',
  gw_priority: 'ignored',
  mac_address: 'ignored',
  aliases: 'not-carried',
  ipv4_address: 'not-carried',
  ipv6_address: 'not-carried',
  link_local_ips: 'not-carried',
  driver_opts: 'not-carried'
};

const internalOnly = (service: ComposeService, networks: Readonly<Record<string, unknown>>): boolean => {
  // A service that names no network joins the project's `default` network, which the file can declare internal.
  const named = networksOf(service).map(([name]) => name);
  const joined = named.length === 0 && service.network_mode === undefined ? ['default'] : named;
  return (
    service.ports === undefined &&
    joined.length > 0 &&
    joined.every((name) => {
      const network = networks[name];
      return isRecord(network) && network.internal === true;
    })
  );
};

const SECRETISH_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|_KEY$/;

/**
 * The variables a service's `env_file` entries declare, by name only. Their values stay in the file: each becomes a
 * setting to supply, never a value copied into the configuration.
 */
const environmentFileVariables = async (
  context: ProbeContext,
  composePath: string,
  service: ComposeService,
  review: KeyReview
): Promise<EnvironmentVariableUse[]> => {
  if (service.env_file === undefined) return [];
  const entries = Array.isArray(service.env_file) ? service.env_file : [service.env_file];
  const variables: EnvironmentVariableUse[] = [];
  for (const entry of entries) {
    const file =
      typeof entry === 'string' ? entry : isRecord(entry) && typeof entry.path === 'string' ? entry.path : undefined;
    const optional = isRecord(entry) && entry.required === false;
    const resolved = file === undefined ? undefined : resolveFrom(composeDirectory(composePath), file);
    // oxlint-disable-next-line no-await-in-loop -- a service names one or two environment files.
    const read = resolved === undefined || !context.files.includes(resolved) ? undefined : await context.read(resolved);
    const names =
      read?.kind === 'names-only'
        ? read.environmentVariableNames
        : read?.kind === 'contents'
          ? extractEnvironmentVariableNames(read.contents)
          : undefined;
    if (names === undefined) {
      if (!optional) review.notCarried.push('env_file');
      continue;
    }
    for (const name of names) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || isPlatformEnvironmentVariable(name)) continue;
      variables.push({
        name,
        role: SECRETISH_NAME.test(name) ? 'third-party-secret' : 'runtime-config',
        hasDeclaredValue: true,
        required: true,
        // A names-only read has no lines to cite, and a guessed line would point at the wrong place.
        evidence: []
      });
    }
  }
  return variables;
};

const environmentAsMap = (value: unknown): Record<string, unknown> | undefined => {
  if (isRecord(value)) return value;
  if (!Array.isArray(value)) return undefined;
  return Object.fromEntries(
    value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) =>
        entry.includes('=') ? [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)] : [entry, null]
      )
  );
};

/** Values Compose replaces as a whole when a service extends another: a command is one program, not a list to join. */
const REPLACED_ON_EXTEND = new Set(['command', 'entrypoint']);
/** Mappings Compose merges key by key, which a file may also write as `NAME=value` lists. */
const MERGED_AS_MAPPINGS = new Set(['environment', 'labels', 'extra_hosts', 'sysctls']);

/** A volume or port entry's identity for de-duplication: Compose keeps one mount per container path. */
const sequenceIdentity = (key: string, entry: unknown): string => {
  if (key === 'volumes') {
    const target = typeof entry === 'string' ? entry.split(':')[1] : isRecord(entry) ? entry.target : undefined;
    if (typeof target === 'string') return `target:${target}`;
  }
  return JSON.stringify(entry);
};

/**
 * Compose's merge of a base service into the one that extends it: a command or entrypoint is replaced, mappings
 * (environment, labels, healthcheck, build) merge key by key with the extending service winning, and other lists
 * append without duplicates.
 */
const mergeExtended = (base: ComposeService, service: ComposeService): ComposeService => {
  const merged: ComposeService = { ...base };
  delete merged.extends;
  for (const [key, value] of Object.entries(service)) {
    if (key === 'extends') continue;
    const inherited = base[key];
    if (inherited === undefined || REPLACED_ON_EXTEND.has(key)) {
      merged[key] = value;
    } else if (MERGED_AS_MAPPINGS.has(key)) {
      merged[key] = { ...environmentAsMap(inherited), ...environmentAsMap(value) };
    } else if (Array.isArray(inherited) && Array.isArray(value)) {
      const entries = new Map(inherited.map((entry) => [sequenceIdentity(key, entry), entry] as const));
      for (const entry of value) entries.set(sequenceIdentity(key, entry), entry);
      merged[key] = [...entries.values()];
    } else if (isRecord(inherited) && isRecord(value)) {
      merged[key] = { ...inherited, ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
};

/** Every service with its `extends` applied, and the services whose base init could not read. */
const resolveExtends = async (
  context: ProbeContext,
  composePath: string,
  services: Record<string, ComposeService>
): Promise<{ services: Record<string, ComposeService>; unresolved: Set<string> }> => {
  const documents = new Map<string, Record<string, ComposeService> | undefined>([[composePath, services]]);
  const load = async (file: string): Promise<Record<string, ComposeService> | undefined> => {
    if (documents.has(file)) return documents.get(file);
    const raw = context.files.includes(file) ? await readText(context, file) : undefined;
    let loaded: Record<string, ComposeService> | undefined;
    try {
      const document =
        raw === undefined ? undefined : (yaml.parse(raw, { merge: true }) as { services?: unknown } | null);
      loaded = isRecord(document?.services) ? (document.services as Record<string, ComposeService>) : undefined;
    } catch {
      loaded = undefined;
    }
    documents.set(file, loaded);
    return loaded;
  };
  const resolve = async (file: string, service: ComposeService, depth: number): Promise<ComposeService | undefined> => {
    if (service.extends === undefined) return service;
    if (depth > 3) return undefined;
    const declaration = service.extends;
    const baseName =
      typeof declaration === 'string' ? declaration : isRecord(declaration) ? declaration.service : undefined;
    const baseFile =
      isRecord(declaration) && typeof declaration.file === 'string'
        ? resolveFrom(composeDirectory(file), declaration.file)
        : file;
    if (typeof baseName !== 'string' || baseFile === undefined) return undefined;
    const base = (await load(baseFile))?.[baseName];
    if (!isRecord(base)) return undefined;
    // Relative paths in a base from another directory stay relative to that file.
    if (
      composeDirectory(baseFile) !== composeDirectory(file) &&
      (base.build !== undefined || base.env_file !== undefined)
    ) {
      return undefined;
    }
    const resolvedBase = await resolve(baseFile, base, depth + 1);
    return resolvedBase === undefined ? undefined : mergeExtended(resolvedBase, service);
  };
  const resolved: Record<string, ComposeService> = {};
  const unresolved = new Set<string>();
  for (const [name, service] of Object.entries(services)) {
    if (!isRecord(service)) continue;
    // oxlint-disable-next-line no-await-in-loop -- bounded by the number of services.
    const result = await resolve(composePath, service, 0);
    if (result === undefined) unresolved.add(name);
    resolved[name] = result ?? service;
  }
  return { services: resolved, unresolved };
};

export const dockerComposeProbe: Probe = {
  name: 'docker-compose',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // Root and the conventional infra directories, in a fixed priority order. See
    // COMPOSE_DIRECTORIES for why deeper nesting deliberately stays out.
    const path = COMPOSE_DIRECTORIES.flatMap((directory) =>
      COMPOSE_FILENAMES.map((name) => `${directory}${name}`)
    ).find((candidate) => context.files.includes(candidate));
    if (path === undefined) return {};

    const raw = await readText(context, path);
    if (raw === undefined) return {};

    let parsed: unknown;
    try {
      // Compose resolves `<<: *base` merge keys; without them the merged settings would look like a key named `<<`.
      parsed = yaml.parse(raw, { merge: true });
    } catch {
      // A compose file we cannot parse is one the user is probably already fighting with. Say
      // nothing rather than half-read it.
      return {};
    }

    const fileServices = (parsed as { services?: Record<string, ComposeService> } | null)?.services;
    if (fileServices === null || typeof fileServices !== 'object') return {};
    const topLevelVolumes = (parsed as { volumes?: unknown }).volumes;
    const declaredVolumes = new Set(isRecord(topLevelVolumes) ? Object.keys(topLevelVolumes) : []);
    const topLevelNetworks = isRecord((parsed as { networks?: unknown }).networks)
      ? (parsed as { networks: Record<string, unknown> }).networks
      : {};

    const importGaps: ImportGap[] = [];
    importGaps.push(...reviewGaps(path, 'top-level', reviewKeys(parsed, TOP_LEVEL)));
    for (const [volumeName, volume] of isRecord(topLevelVolumes) ? Object.entries(topLevelVolumes) : []) {
      importGaps.push(...reviewGaps(path, `volumes.${volumeName}`, reviewKeys(volume, NAMED_VOLUME)));
    }
    for (const [networkName, network] of Object.entries(topLevelNetworks)) {
      importGaps.push(...reviewGaps(path, `networks.${networkName}`, reviewKeys(network, NETWORK)));
    }

    // `extends` brings in another service's settings; without them the service would run without required config.
    const { services: extendedServices, unresolved: unresolvedExtends } = await resolveExtends(
      context,
      path,
      fileServices
    );
    // A service with `profiles` starts only when one of them is selected, which a plain `docker compose up` does not.
    const declaredServices: Record<string, ComposeService> = {};
    const omittedRoots = new Set<string>();
    for (const [composeName, service] of Object.entries(extendedServices)) {
      if (!isRecord(service)) continue;
      if (Array.isArray(service.profiles) && service.profiles.length > 0) {
        importGaps.push(...reviewGaps(path, `services.${composeName}`, omitFor(emptyReview(), 'profiles', 'profile')));
        const root = buildOf(service, path, context.files)?.root;
        if (root !== undefined) omittedRoots.add(root);
        continue;
      }
      declaredServices[composeName] = service;
    }
    const keptRoots = new Set<string>();

    const dependencyDeclarations = Object.entries(declaredServices).flatMap(([composeName, service]) => {
      const image = service?.image;
      if (typeof image !== 'string' || image === '') return [];
      const kind = kindForImage(image);
      return kind === undefined ? [] : [{ composeName, service, image, kind }];
    });
    const kindCounts = new Map<DependencyKind, number>();
    for (const declaration of dependencyDeclarations) {
      kindCounts.set(declaration.kind, (kindCounts.get(declaration.kind) ?? 0) + 1);
    }
    const dependencyNames = new Map<string, string>();
    const dependencies: DependencyFact[] = [];

    for (const { composeName, image, kind } of dependencyDeclarations) {
      const name = (kindCounts.get(kind) ?? 0) === 1 ? defaultDependencyName(kind) : factName(composeName);
      dependencyNames.set(composeName, name);

      // The image line itself, cited by construction: it is the whole of the evidence, and it reads
      // well in the wizard next to "your code needs a Postgres database".
      const citation = citeFirstMatchOnly(path, raw, new RegExp(`image:\\s*["']?${escapeForPattern(image)}`));
      const version = versionFromTag(image);

      dependencies.push({
        name,
        kind,
        extensions: [],
        // `depends_on` would name the consumers, but the compose service names are not the service
        // names the rest of the pipeline uses. Attribution happens once, in `assemble`.
        consumedBy: [],
        addressedBy: [],
        ...(version === undefined ? {} : { engineVersion: version }),
        // MariaDB speaks MySQL's protocol but is its own engine and release line.
        ...(kind === 'mysql' && repositoryOf(image).includes('mariadb') ? { mysqlEngine: 'mariadb' as const } : {}),
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    const builtDeclarations = Object.entries(declaredServices).flatMap(([composeName, service]) => {
      if (dependencyNames.has(composeName)) return [];
      const build = buildOf(service, path, context.files);
      return build === undefined ? [] : [{ composeName, service, build }];
    });
    const utilityBuilds = new Set<string>();
    for (const declaration of builtDeclarations) {
      if (declaration.build.dockerfile === undefined) continue;
      // oxlint-disable-next-line no-await-in-loop -- one small Dockerfile per local Compose build.
      const dockerfile = await readText(context, declaration.build.dockerfile);
      if (dockerfile !== undefined && isThirdPartyUtilityDockerfile(dockerfile)) {
        utilityBuilds.add(declaration.composeName);
      }
    }
    const appDeclarations = builtDeclarations.filter((entry) => !utilityBuilds.has(entry.composeName));
    const rootCounts = new Map<string, number>();
    for (const { build } of appDeclarations) rootCounts.set(build.root, (rootCounts.get(build.root) ?? 0) + 1);
    const appNames = new Map(appDeclarations.map(({ composeName }) => [composeName, factName(composeName)]));
    const serviceFacts: ServiceFactInput[] = [];
    const developmentProcesses = new Set<string>();
    const oneShotConsumers = new Map<string, string[]>();
    for (const [consumerName, service] of Object.entries(declaredServices)) {
      for (const dependencyName of completedDependencies(service)) {
        const consumers = oneShotConsumers.get(dependencyName) ?? [];
        consumers.push(consumerName);
        oneShotConsumers.set(dependencyName, consumers);
      }
    }
    const migrations: MigrationFact[] = [];
    const lifecycleDockerfiles = new Set<string>();

    const longRunningDockerfiles = new Set(
      appDeclarations.flatMap(({ composeName, build }) =>
        oneShotConsumers.has(composeName) || build.dockerfile === undefined ? [] : [build.dockerfile]
      )
    );
    for (const { composeName, build } of appDeclarations) {
      if (
        oneShotConsumers.has(composeName) &&
        build.dockerfile !== undefined &&
        !longRunningDockerfiles.has(build.dockerfile)
      ) {
        lifecycleDockerfiles.add(build.dockerfile);
      }
    }

    for (const declaration of appDeclarations) {
      const consumers = oneShotConsumers.get(declaration.composeName);
      let declaredCommand = commandOf(declaration.service);
      let commandFile = path;
      let commandRaw = raw;
      if (declaredCommand === undefined && declaration.build.dockerfile !== undefined) {
        // oxlint-disable-next-line no-await-in-loop -- one lifecycle Dockerfile per finite Compose service.
        const dockerfile = await readText(context, declaration.build.dockerfile);
        if (dockerfile !== undefined) {
          declaredCommand = dockerfileDefaultCommand(dockerfile);
          commandFile = declaration.build.dockerfile;
          commandRaw = dockerfile;
        }
      }
      if (consumers === undefined || declaredCommand === undefined) continue;

      const commands: Array<{ command: string; file: string; raw: string }> = [];
      if (MIGRATION_COMMAND.test(declaredCommand)) {
        commands.push({
          command: declaredCommand,
          file: commandFile,
          raw: commandRaw
        });
      } else {
        const script = /^(?:bash|sh)\s+([A-Za-z0-9_./-]+)$/.exec(declaredCommand)?.[1];
        if (script !== undefined) {
          const direct = resolveFrom(declaration.build.root, script);
          const candidates = context.files.filter(
            (candidate) => candidate === direct || candidate === script || candidate.endsWith(`/${script}`)
          );
          if (candidates.length === 1) {
            // oxlint-disable-next-line no-await-in-loop -- one declared lifecycle script per one-shot service.
            const scriptRaw = await readText(context, candidates[0]!);
            if (scriptRaw !== undefined) {
              for (const line of scriptRaw.split(/\r?\n/).map((entry) => entry.trim())) {
                if (line !== '' && !line.startsWith('#') && MIGRATION_COMMAND.test(line)) {
                  commands.push({
                    command: line,
                    file: candidates[0]!,
                    raw: scriptRaw
                  });
                }
              }
            }
          }
        }
      }

      // A lifecycle service executes once even when several long-running processes wait for it.
      // Attaching the same command to every consumer would run one schema migration N times after
      // every deploy. The first declared consumer supplies the environment and dependency wiring.
      for (const consumer of consumers.slice(0, 1)) {
        const serviceName = appNames.get(consumer);
        if (serviceName === undefined) continue;
        for (const command of commands) {
          const citation = citeFirstMatchOnly(command.file, command.raw, new RegExp(escapeForPattern(command.command)));
          migrations.push({
            serviceName,
            tool: command.command.split(/\s+/)[0] ?? 'migration',
            command: command.command,
            runsAt: 'ci',
            evidence: citation === undefined ? [] : [citation]
          });
        }
      }
    }

    for (const { composeName, service, build } of appDeclarations) {
      // Compose uses these as finite lifecycle hooks. A long-running worker would restart the
      // migration forever and charge the user for a service that is meant to exit once.
      if (oneShotConsumers.has(composeName)) continue;
      const review = reviewKeys(service, APPLICATION_SERVICE);
      for (const [networkName, options] of networksOf(service)) {
        reviewKeys(options, NETWORK_ATTACHMENT, { prefix: `networks.${networkName}.`, review });
      }
      const healthCheck = healthCheckOf(service.healthcheck);
      if (healthCheck === 'unread') review.notCarried.push('healthcheck');
      if (unresolvedExtends.has(composeName)) review.notCarried.push('extends');
      // oxlint-disable-next-line no-await-in-loop -- one or two small files per service.
      const environmentFiles = await environmentFileVariables(context, path, service, review);
      importGaps.push(...reviewGaps(path, `services.${composeName}`, review));
      if (isOmitted(review)) {
        omittedRoots.add(build.root);
        continue;
      }
      keptRoots.add(build.root);
      const name = appNames.get(composeName)!;
      if (isDevelopmentProcess(service, build)) {
        developmentProcesses.add(`${build.root}::compose:${composeName}`);
      }
      const port = containerPortOf(service) ?? proxyPortOf(service);
      // Workers often publish an Actuator/metrics port solely for orchestrator health checks. A
      // Compose process name is a stronger statement of its role than the presence of that admin
      // port; exposing it publicly as a web service would be both inaccurate and unsafe.
      const exposesHttp = port !== undefined && !BACKGROUND_PROCESS_NAME.test(composeName);
      const consumedDependencies = new Set(
        dependsOn(service)
          .map((entry) => dependencyNames.get(entry))
          .filter((entry): entry is string => entry !== undefined)
      );
      const variables: EnvironmentVariableUse[] = [];
      for (const entry of environmentEntries(service)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.name) || isPlatformEnvironmentVariable(entry.name)) continue;
        const value = typeof entry.value === 'string' ? composeDefault(entry.value) : '';
        const referencedDependency = [...dependencyNames.entries()].find(([hostname]) =>
          new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeForPattern(hostname)}(?:[^A-Za-z0-9_-]|$)`).test(value)
        );
        const referencedService = [...appNames.entries()].find(
          ([hostname]) =>
            hostname !== composeName &&
            new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeForPattern(hostname)}(?:[^A-Za-z0-9_-]|$)`).test(value)
        );
        const namedDependency = [...consumedDependencies]
          .map((dependencyName) => dependencies.find((dependency) => dependency.name === dependencyName))
          .find(
            (dependency): dependency is DependencyFact =>
              dependency !== undefined && variableNamesDependency(entry.name, dependency.kind)
          );
        const citation = citeFirstMatchOnly(
          path,
          raw,
          new RegExp(`^\\s*(?:-\\s*)?${escapeForPattern(entry.name)}(?:\\s*:|=)`)
        );
        const evidence = citation === undefined ? [] : [{ ...citation, quote: `${entry.name}:` }];
        if (referencedDependency !== undefined || namedDependency !== undefined) {
          const dependencyName = referencedDependency?.[1] ?? namedDependency!.name;
          consumedDependencies.add(dependencyName);
          variables.push({
            name: entry.name,
            role: 'infra-dependency',
            dependencyName,
            required: true,
            evidence
          });
        } else if (referencedService !== undefined) {
          variables.push({
            name: entry.name,
            role: 'cross-service-reference',
            targetServiceName: referencedService[1],
            required: true,
            evidence
          });
        } else {
          const safeLiteralValue = safeDeclaredLiteral(entry.name, entry.value);
          variables.push({
            name: entry.name,
            role: /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|_KEY$/.test(entry.name)
              ? 'third-party-secret'
              : 'runtime-config',
            hasDeclaredValue: entry.value !== undefined,
            ...(safeLiteralValue === undefined ? {} : { safeLiteralValue }),
            required: true,
            evidence
          });
        }
      }

      for (const variable of environmentFiles) {
        if (!variables.some((entry) => entry.name === variable.name)) variables.push(variable);
      }

      for (const dependencyName of consumedDependencies) {
        const dependency = dependencies.find((entry) => entry.name === dependencyName);
        if (dependency === undefined) continue;
        if (!dependency.consumedBy.includes(name)) dependency.consumedBy.push(name);
        for (const variable of variables.filter((entry) => entry.dependencyName === dependencyName)) {
          if (!dependency.addressedBy.includes(variable.name)) dependency.addressedBy.push(variable.name);
        }
      }

      const persistentVolumes = persistentVolumesOf(service, declaredVolumes);
      // A command that runs a development server, or source the file mounts from the host, describes a laptop setup;
      // the image's own command is what deploys. Otherwise the declared command replaces it, as Compose does.
      const declaredCommand = commandOf(service);
      const developmentCommand =
        declaredCommand !== undefined && (DEVELOPMENT_COMMAND.test(declaredCommand) || mountsSource(service));
      const command = developmentCommand ? undefined : declaredCommand;
      // `node worker.js` names the file that runs; packaging bundles that file rather than one found by convention.
      const commandFile = command === undefined ? undefined : /^(?:node|bun)\s+(\S+\.[cm]?[jt]s)$/.exec(command)?.[1];
      const commandEntry =
        commandFile === undefined ? undefined : resolveFrom(build.root === '.' ? '.' : build.root, commandFile);
      const citation = citeFirstMatchOnly(path, raw, new RegExp(`^\\s*${escapeForPattern(composeName)}:`));
      serviceFacts.push({
        name,
        path: build.root,
        ...((rootCounts.get(build.root) ?? 0) > 1 ||
        BACKGROUND_PROCESS_NAME.test(composeName) ||
        build.target !== undefined
          ? { processType: `compose:${composeName}` }
          : {}),
        language: languageOf(context.files, build.root) ?? (build.dockerfile === undefined ? 'unknown' : 'container'),
        exposesHttp,
        ...(!exposesHttp || port === undefined ? {} : { port }),
        // Joined only to `internal` networks and publishing no port: nothing outside the stack can reach it.
        ...(exposesHttp && internalOnly(service, topLevelNetworks) ? { internalOnly: true } : {}),
        executionModel: 'long-running',
        ...(command === undefined
          ? developmentCommand && typeof service.command === 'string'
            ? { startCommand: service.command }
            : {}
          : {
              startCommand: command,
              commandOverridesImage: true as const,
              ...(commandEntry === undefined ? {} : { containerEntrypoint: commandEntry })
            }),
        ...(healthCheck === undefined || typeof healthCheck === 'string' ? {} : { containerHealthCheck: healthCheck }),
        ...(build.dockerfile === undefined ? {} : { dockerfile: build.dockerfile }),
        ...(persistentVolumes.length === 0 ? {} : { persistentVolumes }),
        environmentVariables: variables,
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    // Services this repository does not build and that are no backing service init replaces: a proxy, an admin UI.
    const notImported = Object.keys(declaredServices).filter(
      (composeName) =>
        !dependencyNames.has(composeName) &&
        !builtDeclarations.some(
          (declaration) => declaration.composeName === composeName && !utilityBuilds.has(composeName)
        )
    );
    if (notImported.length > 0) {
      importGaps.push({
        file: path,
        object: 'services',
        keys: notImported.map((composeName) => safeDeclaredName(composeName)).slice(0, 20),
        effect: 'not-imported'
      });
    }

    return {
      ...(importGaps.length === 0 ? {} : { importGaps }),
      ...([...omittedRoots].some((root) => !keptRoots.has(root))
        ? { omittedServiceRoots: [...omittedRoots].filter((root) => !keptRoots.has(root)) }
        : {}),
      ...(dependencies.length === 0 ? {} : { dependencies }),
      ...(serviceFacts.length === 0 ? {} : { services: serviceFacts }),
      ...(migrations.length === 0 ? {} : { migrations }),
      ...(lifecycleDockerfiles.size === 0 ? {} : { lifecycleDockerfiles: [...lifecycleDockerfiles] }),
      ...(developmentProcesses.size === 0 ? {} : { developmentProcesses: [...developmentProcesses] }),
      ...(!appDeclarations.some(({ build }) => build.target !== undefined && build.dockerfile !== undefined)
        ? {}
        : {
            descriptorTargetDockerfiles: [
              ...new Set(
                appDeclarations.flatMap(({ build }) =>
                  build.target !== undefined && build.dockerfile !== undefined ? [build.dockerfile] : []
                )
              )
            ]
          }),
      ...(appDeclarations.length > 0 &&
      new Set(dependencies.filter((entry) => DATABASE_KINDS.has(entry.kind)).map((entry) => entry.kind)).size === 1
        ? {
            preferredDependencyKinds: [dependencies.find((entry) => DATABASE_KINDS.has(entry.kind))!.kind]
          }
        : {})
    };
  }
};

const escapeForPattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
