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
import type { MigrationFact } from '../../facts/project-facts';
import type { EnvironmentVariableUse, ServiceFactInput } from '../../facts/service';
import { languageOf } from '../language';
import { isPlatformEnvironmentVariable } from '../platform-environment';
import { isSecretishDeclaredName, safeDeclaredLiteral } from './declared-environment';
import type { Citation } from '../../facts/citation';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

/** The names compose itself looks for, in the order it looks for them. */
const COMPOSE_FILENAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'] as const;
const COMPOSE_VARIANT = /^(?:compose|docker-compose)\.([^.]+)\.ya?ml$/i;
const PRODUCTION_VARIANT = /^(?:prod|production|release)$/i;
const NON_APPLICATION_VARIANT = /^(?:dev|development|infra|observability|test|testing)$/i;

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
  ports?: unknown;
  expose?: unknown;
  depends_on?: unknown;
  environment?: unknown;
  labels?: unknown;
  volumes?: unknown;
};

type ComposeDocument = {
  path: string;
  raw: string;
  services: Record<string, ComposeService>;
  variant?: string;
};

const DATABASE_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'mongodb', 'sqlite']);
const MESSAGE_QUEUE_KIND_BY_SELECTOR: Readonly<Record<string, DependencyKind>> = {
  postgres: 'postgres',
  postgresql: 'postgres',
  rabbitmq: 'amqp',
  amqp: 'amqp',
  nats: 'nats',
  kafka: 'kafka',
  redis: 'redis'
};

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

type ResolvedBuild = {
  root: string;
  dockerfile?: string;
  target?: string;
  buildArgs?: Array<{ argName: string; value: string }>;
  evidence?: Citation[];
};

const buildOf = (service: ComposeService, file: string, files: readonly string[]): ResolvedBuild | undefined => {
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

type SourceBuild = {
  root: string;
  dockerfile: string;
  /** Source-build selection is an ARG value, not a Docker stage target. */
  target?: undefined;
  buildArgs: Array<{ argName: string; value: string }>;
  evidence: Citation[];
};

const composeCandidates = (files: readonly string[]): string[] =>
  files
    .filter((path) => {
      const directory = posix.dirname(path);
      const prefix = directory === '.' ? '' : `${directory}/`;
      if (!COMPOSE_DIRECTORIES.includes(prefix as (typeof COMPOSE_DIRECTORIES)[number])) return false;
      const name = posix.basename(path);
      return COMPOSE_FILENAMES.includes(name as (typeof COMPOSE_FILENAMES)[number]) || COMPOSE_VARIANT.test(name);
    })
    .toSorted((left, right) => left.localeCompare(right));

const parseComposeDocument = async (context: ProbeContext, path: string): Promise<ComposeDocument | undefined> => {
  const raw = await readText(context, path);
  if (raw === undefined) return undefined;
  try {
    const parsed = yaml.parse(raw) as { services?: unknown } | null;
    if (!isRecord(parsed?.services)) return undefined;
    const variant = COMPOSE_VARIANT.exec(posix.basename(path))?.[1];
    return {
      path,
      raw,
      services: parsed.services as Record<string, ComposeService>,
      ...(variant === undefined ? {} : { variant })
    };
  } catch {
    return undefined;
  }
};

const targetValueFor = (composeName: string, image: string): string | undefined => {
  const imageName = repositoryOf(image).split('/').at(-1);
  if (imageName === undefined || factName(imageName) !== factName(composeName)) return undefined;
  const segments = composeName.split(/[-_.]/).filter(Boolean);
  return segments.length < 2 ? undefined : segments.at(-1)?.toLowerCase();
};

/**
 * Link a first-party release image back to a parameterised repository Dockerfile.
 *
 * The image and Compose service must share an exact normalized name, and the Dockerfile must both
 * declare and interpolate an ARG whose accepted literal includes the image suffix. This avoids
 * treating arbitrary prebuilt images as source builds while covering release workflows that keep
 * build commands in CI rather than duplicating them in Compose.
 */
const sourceBuildOf = async (
  composeName: string,
  service: ComposeService,
  context: ProbeContext,
  dockerfilePaths: readonly string[],
  dockerfileCache: Map<string, string | undefined>
): Promise<SourceBuild | undefined> => {
  if (typeof service.image !== 'string') return undefined;
  const target = targetValueFor(composeName, service.image);
  if (target === undefined) return undefined;

  for (const dockerfile of dockerfilePaths) {
    let raw = dockerfileCache.get(dockerfile);
    if (!dockerfileCache.has(dockerfile)) {
      // oxlint-disable-next-line no-await-in-loop -- bounded release Dockerfile candidates are cached.
      raw = await readText(context, dockerfile, { fullFile: true });
      dockerfileCache.set(dockerfile, raw);
    }
    if (raw === undefined || !new RegExp(`["']${escapeForPattern(target)}["']`, 'i').test(raw)) continue;
    const argNames = [...raw.matchAll(/^\s*ARG\s+([A-Za-z_][A-Za-z0-9_]*)(?:=.*)?$/gim)].map((match) => match[1]!);
    const argName = argNames.find((name) =>
      new RegExp(`^.*\\$\\{?${escapeForPattern(name)}\\}?.*["']${escapeForPattern(target)}["'].*$`, 'im').test(raw!)
    );
    if (argName === undefined) continue;

    const copiedRootEntry = [...raw.matchAll(/^\s*(?:COPY|ADD)\s+(?:--[^\s]+\s+)*\/?([^\s/]+)(?:\/|\s)/gim)]
      .map((match) => match[1]!)
      .find((entry) => context.files.some((path) => path.startsWith(`${entry}/`)));
    const directory = posix.dirname(dockerfile);
    const argCitation = citeFirstMatchOnly(
      dockerfile,
      raw,
      new RegExp(`^\\s*ARG\\s+${escapeForPattern(argName)}(?:=.*)?$`, 'im'),
      'dockerfileBuildArgs'
    );
    return {
      root: copiedRootEntry === undefined ? (directory === '.' ? '.' : directory) : '.',
      dockerfile,
      buildArgs: [{ argName, value: target }],
      evidence: argCitation === undefined ? [] : [argCitation]
    };
  }
  return undefined;
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
  /(?:^|[\s:=])(?:alembic\s+upgrade|(?:npm|pnpm|yarn|bun)\s+(?:--filter\s+\S+\s+)?(?:run\s+)?(?:\S*migrat\S*|\S*db:\S*)|npx\s+[^\s]*(?:migrat|prisma)|(?:python3?\s+)?(?:\.\/)?manage\.py\s+migrate|rails\s+db:|rake\s+db:|prisma\s+migrate|typeorm\s+[^\s]*migration|knex\s+migrate|sequelize(?:-cli)?\s+db:migrate|flyway|liquibase|dbmate)(?:\s|$)/i;

const commandOf = (service: ComposeService): string | undefined =>
  typeof service.command === 'string' && service.command.trim() !== '' ? service.command.trim() : undefined;

/** The fallback part of `${NAME:-value}` is what this Compose deployment actually uses by default. */
const composeDefault = (value: string): string => value.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*(?::-|-)([^}]*)\}/g, '$1');

const CONNECTION_SETTING_NAME = /(?:URL|URI|HOST|PORT|ENDPOINT|ADDRESS|CONNECTION|CONNSTR|DSN)/;

const variableNamesDependency = (name: string, kind: DependencyKind): boolean => {
  const upper = name.toUpperCase();
  const connectionSetting = CONNECTION_SETTING_NAME.test(upper);
  switch (kind) {
    case 'postgres':
      return /(?:POSTGRES|POSTGRESQL|PG|DATABASE|DATASOURCE)/.test(upper) && connectionSetting;
    case 'mysql':
      return /(?:MYSQL|MARIADB|DATABASE|DATASOURCE)/.test(upper) && connectionSetting;
    case 'mssql':
      return /(?:MSSQL|SQLSERVER|DATABASE|DATASOURCE)/.test(upper) && connectionSetting;
    case 'mongodb':
      return /(?:MONGO|DATABASE)/.test(upper) && connectionSetting;
    case 'redis':
      return /(?:REDIS|CACHE)/.test(upper);
    case 'object-storage':
      return /(?:S3|BUCKET|OBJECT_STORAGE|MINIO)/.test(upper);
    case 'amqp':
      return /(?:AMQP|RABBIT)/.test(upper);
    case 'kafka':
      // Kafka appears in many settings that do not address the broker at all: topic names,
      // consumer groups, retry policy, and serializers. Treat only connection-shaped names as
      // topology. Otherwise a declared `APP_KAFKA_TOPICS_ORDERS=orders` becomes a fake broker
      // secret and the application's own operational default is lost.
      return (
        /(?:KAFKA|BROKER)/.test(upper) &&
        /(?:BOOTSTRAP|BROKERS?|URL|URI|HOST|ENDPOINT|ADDRESS|SERVERS?)/.test(upper) &&
        !/(?:TOPICS?|CONSUMER_GROUP|GROUP_ID)/.test(upper)
      );
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

const BUNDLED_BACKGROUND_PROCESS = /^\s*(?:attach-daemon\s*=|\[program:[^\]]+\]|program\s*:)/im;

/**
 * Inspect files the selected container command names directly.
 *
 * Process managers often hide important lifecycle work one level behind the Dockerfile command:
 * uWSGI, Supervisor and similar tools can start migrations and background loops in every replica.
 * Following only literal repository-file references keeps this bounded and evidence-driven; no
 * repository program is executed and a dynamic config path contributes no claim.
 */
const bundledLifecycleOf = async ({
  context,
  service,
  build
}: {
  context: ProbeContext;
  service: ComposeService;
  build: { root: string; dockerfile?: string };
}): Promise<{
  lifecycle?: NonNullable<ServiceFactInput['bundledLifecycle']>;
  evidence: Citation[];
}> => {
  const commands = [commandOf(service)];
  if (build.dockerfile !== undefined) {
    const dockerfile = await readText(context, build.dockerfile);
    commands.push(dockerfile === undefined ? undefined : dockerfileDefaultCommand(dockerfile));
  }
  const commandText = commands
    .filter((command): command is string => command !== undefined)
    .join('\n')
    .replaceAll('\\', '/');
  if (commandText === '') return { evidence: [] };

  const referencedFiles = context.files
    .filter((file) => {
      const relativeToBuildRoot =
        build.root === '.' ? file : file.startsWith(`${build.root}/`) ? file.slice(build.root.length + 1) : undefined;
      return (
        commandText.includes(file) ||
        commandText.includes(`/${file}`) ||
        (relativeToBuildRoot !== undefined && commandText.includes(relativeToBuildRoot))
      );
    })
    .slice(0, 8);
  if (referencedFiles.length === 0) return { evidence: [] };

  let databaseMigrations = false;
  let backgroundProcesses = false;
  const evidence: Citation[] = [];
  for (const file of referencedFiles) {
    // oxlint-disable-next-line no-await-in-loop -- bounded by eight literal command references.
    const raw = await readText(context, file, { fullFile: true });
    if (raw === undefined) continue;
    if (!databaseMigrations && MIGRATION_COMMAND.test(raw)) {
      databaseMigrations = true;
      const citation = citeFirstMatchOnly(file, raw, MIGRATION_COMMAND, 'bundledLifecycle');
      if (citation !== undefined) evidence.push(citation);
    }
    if (!backgroundProcesses && BUNDLED_BACKGROUND_PROCESS.test(raw)) {
      backgroundProcesses = true;
      const citation = citeFirstMatchOnly(file, raw, BUNDLED_BACKGROUND_PROCESS, 'bundledLifecycle');
      if (citation !== undefined) evidence.push(citation);
    }
  }
  return {
    ...(databaseMigrations || backgroundProcesses ? { lifecycle: { databaseMigrations, backgroundProcesses } } : {}),
    evidence
  };
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

const volumeEntries = (service: ComposeService): Array<{ source?: string; target: string }> =>
  !Array.isArray(service.volumes)
    ? []
    : service.volumes.flatMap((entry) => {
        if (typeof entry === 'string') {
          const segments = entry.split(':');
          const target = segments.length === 1 ? segments[0] : segments[1];
          return target === undefined ? [] : [{ ...(segments[0] === target ? {} : { source: segments[0] }), target }];
        }
        if (!isRecord(entry) || typeof entry.target !== 'string') return [];
        return [
          {
            ...(typeof entry.source === 'string' ? { source: entry.source } : {}),
            target: entry.target
          }
        ];
      });

const FINITE_MIGRATION_PROCESS = /(?:^|[-_.])migrat(?:e|ion|ions)?(?:$|[-_.])/i;
const BOOTSTRAP_PROCESS = /(?:^|[-_.])(?:admin|bootstrap|init|setup)(?:$|[-_.])/i;

const grpcPortOf = (service: ComposeService, publishedPort: number | undefined): number | undefined => {
  if (publishedPort === undefined) return undefined;
  return environmentEntries(service).some(
    ({ name, value }) =>
      /(?:^|_)GRPC_PORT$/i.test(name) &&
      typeof value === 'string' &&
      Number.parseInt(composeDefault(value), 10) === publishedPort
  )
    ? publishedPort
    : undefined;
};

const crossServicePropertyOf = (value: string, hostname: string): EnvironmentVariableUse['targetServiceProperty'] => {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return 'url';
  if (new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeForPattern(hostname)}:\\d+(?:[^0-9]|$)`).test(value)) {
    return 'hostport';
  }
  return 'host';
};

const isDevelopmentProcess = (service: ComposeService, build: { target?: string | undefined }): boolean => {
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

export const dockerComposeProbe: Probe = {
  name: 'docker-compose',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const documents = (
      await Promise.all(composeCandidates(context.files).map((path) => parseComposeDocument(context, path)))
    ).filter((document): document is ComposeDocument => document !== undefined);
    if (documents.length === 0) return {};

    const dockerfilePaths = context.files
      .filter((path) => /(?:^|\/)(?:Dockerfile(?:\.[^/]+)?|[^/]+\.dockerfile)$/i.test(path))
      .filter((path) => !/(?:^|\/)(?:test|tests|fixtures|examples?|hack(?:-dev)?|loadtests?)(?:\/|$)/i.test(path))
      .toSorted((left, right) => {
        const leftProduction = /(?:^|\/)build\/package\//i.test(left) ? 0 : 1;
        const rightProduction = /(?:^|\/)build\/package\//i.test(right) ? 0 : 1;
        return leftProduction - rightProduction || left.localeCompare(right);
      });
    const dockerfileCache = new Map<string, string | undefined>();
    const sourceBuilds = new Map<string, SourceBuild>();
    for (const document of documents) {
      for (const [composeName, service] of Object.entries(document.services)) {
        // oxlint-disable-next-line no-await-in-loop -- bounded Compose/Dockerfile cross-reference with a cache.
        const sourceBuild = await sourceBuildOf(composeName, service, context, dockerfilePaths, dockerfileCache);
        if (sourceBuild !== undefined) sourceBuilds.set(`${document.path}:${composeName}`, sourceBuild);
      }
    }

    const applicationScore = (document: ComposeDocument): number => {
      const applications = Object.entries(document.services).filter(
        ([composeName, service]) =>
          buildOf(service, document.path, context.files) !== undefined ||
          sourceBuilds.has(`${document.path}:${composeName}`)
      ).length;
      if (applications === 0) return Number.NEGATIVE_INFINITY;
      return (
        applications * 10 +
        (PRODUCTION_VARIANT.test(document.variant ?? '') ? 100 : 0) -
        (NON_APPLICATION_VARIANT.test(document.variant ?? '') ? 100 : 0)
      );
    };
    const selected = documents.toSorted((left, right) => applicationScore(right) - applicationScore(left))[0]!;
    const fallback = documents.find((document) => document.variant === undefined) ?? documents[0]!;
    const applicationDocument = Number.isFinite(applicationScore(selected)) ? selected : fallback;
    const layeredRelease =
      applicationDocument !== fallback && PRODUCTION_VARIANT.test(applicationDocument.variant ?? '');
    const dependencyDocuments = layeredRelease ? [fallback, applicationDocument] : [applicationDocument];
    const path = applicationDocument.path;
    const raw = applicationDocument.raw;
    const declaredServices = applicationDocument.services;

    const selectedBackendKinds = new Set<DependencyKind>();
    for (const service of Object.values(declaredServices)) {
      for (const entry of environmentEntries(service)) {
        if (
          !/(?:MSGQUEUE|MESSAGE_QUEUE|BROKER).*(?:KIND|TYPE)|(?:KIND|TYPE).*(?:MSGQUEUE|MESSAGE_QUEUE|BROKER)/i.test(
            entry.name
          )
        ) {
          continue;
        }
        const value = typeof entry.value === 'string' ? composeDefault(entry.value).trim().toLowerCase() : '';
        const selectedKind = MESSAGE_QUEUE_KIND_BY_SELECTOR[value];
        if (selectedKind !== undefined) selectedBackendKinds.add(selectedKind);
      }
    }

    // Release overlays frequently repeat a base dependency to amend it. Later documents override
    // the same Compose service name, exactly as the layered Compose model does, so one database
    // never becomes two facts merely because both files mention it.
    const layeredDependencyServices = new Map<string, { service: ComposeService; document: ComposeDocument }>();
    for (const document of dependencyDocuments) {
      for (const [composeName, service] of Object.entries(document.services)) {
        layeredDependencyServices.set(composeName, { service, document });
      }
    }
    const allDependencyDeclarations = [...layeredDependencyServices.entries()].flatMap(
      ([composeName, { service, document }]) => {
        const image = service?.image;
        if (typeof image !== 'string' || image === '') return [];
        const kind = kindForImage(image);
        return kind === undefined ? [] : [{ composeName, service, image, kind, document }];
      }
    );
    const selectableBackendKinds: ReadonlySet<DependencyKind> = new Set(['amqp', 'nats', 'kafka']);
    const dependencyDeclarations = allDependencyDeclarations.filter(
      ({ kind }) =>
        selectedBackendKinds.size === 0 || !selectableBackendKinds.has(kind) || selectedBackendKinds.has(kind)
    );
    const kindCounts = new Map<DependencyKind, number>();
    for (const declaration of dependencyDeclarations) {
      kindCounts.set(declaration.kind, (kindCounts.get(declaration.kind) ?? 0) + 1);
    }
    const dependencyNames = new Map<string, string>();
    const dependencies: DependencyFact[] = [];

    for (const { composeName, image, kind, document } of dependencyDeclarations) {
      const name = (kindCounts.get(kind) ?? 0) === 1 ? defaultDependencyName(kind) : factName(composeName);
      dependencyNames.set(composeName, name);

      // The image line itself, cited by construction: it is the whole of the evidence, and it reads
      // well in the wizard next to "your code needs a Postgres database".
      const citation = citeFirstMatchOnly(
        document.path,
        document.raw,
        new RegExp(`image:\\s*["']?${escapeForPattern(image)}`)
      );
      const version = versionFromTag(image);

      dependencies.push({
        name,
        kind,
        extensions: [],
        // `depends_on` would name the consumers, but the compose service names are not the service
        // names the rest of the pipeline uses. Attribution happens once, in `assemble`.
        consumedBy: [],
        addressedBy: [],
        ...(layeredRelease ? { hostingEvidence: 'deployment-manifest' as const } : {}),
        ...(version === undefined ? {} : { engineVersion: version }),
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    const builtDeclarations = Object.entries(declaredServices).flatMap(([composeName, service]) => {
      if (dependencyNames.has(composeName)) return [];
      const build =
        buildOf(service, path, context.files) ?? sourceBuilds.get(`${applicationDocument.path}:${composeName}`);
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
    const finiteProcesses = new Set(
      appDeclarations
        .filter(({ composeName }) => FINITE_MIGRATION_PROCESS.test(composeName) || BOOTSTRAP_PROCESS.test(composeName))
        .map(({ composeName }) => composeName)
    );
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
      const name = appNames.get(composeName)!;
      // oxlint-disable-next-line no-await-in-loop -- one bounded literal config traversal per app service.
      const bundledLifecycle = await bundledLifecycleOf({ context, service, build });
      if (isDevelopmentProcess(service, build)) {
        developmentProcesses.add(`${build.root}::compose:${composeName}`);
      }
      const port = containerPortOf(service) ?? proxyPortOf(service);
      const grpcPort = grpcPortOf(service, port);
      // Workers often publish an Actuator/metrics port solely for orchestrator health checks. A
      // Compose process name is a stronger statement of its role than the presence of that admin
      // port; exposing it publicly as a web service would be both inaccurate and unsafe.
      const exposesHttp =
        port !== undefined &&
        grpcPort === undefined &&
        !finiteProcesses.has(composeName) &&
        !BACKGROUND_PROCESS_NAME.test(composeName);
      const consumedDependencies = new Set(
        dependsOn(service)
          .map((entry) => dependencyNames.get(entry))
          .filter((entry): entry is string => entry !== undefined)
      );
      const variables: EnvironmentVariableUse[] = [];
      for (const entry of environmentEntries(service)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.name) || isPlatformEnvironmentVariable(entry.name)) continue;
        const value = typeof entry.value === 'string' ? composeDefault(entry.value) : '';
        const referencedDependency = [...dependencyNames.entries()].find(([hostname]) => {
          if (!CONNECTION_SETTING_NAME.test(entry.name.toUpperCase())) return false;
          return new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeForPattern(hostname)}(?:[^A-Za-z0-9_-]|$)`).test(value);
        });
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
            targetServiceProperty: crossServicePropertyOf(value, referencedService[0]),
            required: true,
            evidence
          });
        } else {
          const safeLiteralValue = safeDeclaredLiteral(entry.name, entry.value);
          variables.push({
            name: entry.name,
            role: isSecretishDeclaredName(entry.name) ? 'third-party-secret' : 'runtime-config',
            hasDeclaredValue: entry.value !== undefined,
            ...(safeLiteralValue === undefined ? {} : { safeLiteralValue }),
            required: true,
            evidence
          });
        }
      }

      for (const dependencyName of consumedDependencies) {
        const dependency = dependencies.find((entry) => entry.name === dependencyName);
        if (dependency === undefined) continue;
        if (!dependency.consumedBy.includes(name)) dependency.consumedBy.push(name);
        for (const variable of variables.filter((entry) => entry.dependencyName === dependencyName)) {
          if (!dependency.addressedBy.includes(variable.name)) dependency.addressedBy.push(variable.name);
        }
      }

      const citation = citeFirstMatchOnly(path, raw, new RegExp(`^\\s*${escapeForPattern(composeName)}:`));
      serviceFacts.push({
        name,
        path: build.root,
        // Keep Compose's explicit build context as an independent fact. The assembler may later
        // merge this descriptor with a language project in a child directory (for example an
        // ASP.NET .csproj under src/Api whose Dockerfile still copies solution-level files). In
        // that case the child directory locates the service, while this root remains the only
        // correct Docker build context.
        buildRoot: build.root,
        ...((rootCounts.get(build.root) ?? 0) > 1 ||
        BACKGROUND_PROCESS_NAME.test(composeName) ||
        build.target !== undefined
          ? { processType: `compose:${composeName}` }
          : {}),
        language: languageOf(context.files, build.root) ?? (build.dockerfile === undefined ? 'unknown' : 'container'),
        exposesHttp,
        ...(port === undefined || (!exposesHttp && grpcPort === undefined) ? {} : { port }),
        executionModel: 'long-running',
        ...(finiteProcesses.has(composeName) ? { executionModel: 'one-shot' as const } : {}),
        ...(typeof service.command === 'string' && service.command !== '' ? { startCommand: service.command } : {}),
        ...(build.dockerfile === undefined ? {} : { dockerfile: build.dockerfile }),
        ...(build.buildArgs === undefined || build.buildArgs.length === 0
          ? {}
          : { dockerfileBuildArgs: build.buildArgs }),
        ...(bundledLifecycle.lifecycle === undefined ? {} : { bundledLifecycle: bundledLifecycle.lifecycle }),
        environmentVariables: variables,
        evidence: [
          ...(citation === undefined ? [] : [citation]),
          ...(build.evidence ?? []),
          ...bundledLifecycle.evidence
        ],
        source: 'probe'
      });
    }

    for (const declaration of appDeclarations) {
      if (!FINITE_MIGRATION_PROCESS.test(declaration.composeName)) continue;
      const commandDirectory = `cmd/${declaration.composeName}`;
      if (!context.files.some((file) => file === `${commandDirectory}/main.go`)) continue;
      const migrationSources = context.files
        .filter((file) => file.startsWith(`${commandDirectory}/`) && file.endsWith('.go'))
        .slice(0, 40);
      let gooseCitation: Citation | undefined;
      for (const source of migrationSources) {
        // oxlint-disable-next-line no-await-in-loop -- bounded source proof for the declared migration binary.
        const sourceRaw = await readText(context, source);
        if (sourceRaw === undefined || !/\bgoose\b/i.test(sourceRaw)) continue;
        gooseCitation = citeFirstMatchOnly(source, sourceRaw, /\bgoose\b/i);
        break;
      }
      if (gooseCitation === undefined) continue;
      const owner = serviceFacts.find((service) => service.executionModel === 'long-running' && service.exposesHttp);
      if (owner === undefined) continue;
      migrations.push({
        serviceName: owner.name,
        tool: 'goose',
        command: `go run ./${commandDirectory}`,
        runsAt: 'ci',
        evidence: [gooseCitation]
      });
    }

    const longRunningNames = new Set(
      appDeclarations
        .filter(({ composeName }) => !finiteProcesses.has(composeName) && !oneShotConsumers.has(composeName))
        .map(({ composeName }) => composeName)
    );
    const deploymentRequirements: NonNullable<ProbeOutput['deploymentRequirements']> = [];
    for (const [composeName, service] of Object.entries(declaredServices)) {
      if (!longRunningNames.has(composeName)) continue;
      const port = containerPortOf(service) ?? proxyPortOf(service);
      const grpcPort = grpcPortOf(service, port);
      if (grpcPort === undefined) continue;
      const citation = citeFirstMatchOnly(path, raw, new RegExp(`(?:^|["'\\s:-])${grpcPort}(?:["'\\s:/]|$)`), 'port');
      deploymentRequirements.push({
        kind: 'public-grpc',
        serviceName: appNames.get(composeName)!,
        port: grpcPort,
        evidence: citation === undefined ? [] : [citation]
      });
    }

    for (const [producerName, producerService] of Object.entries(declaredServices)) {
      if (!finiteProcesses.has(producerName) || !BOOTSTRAP_PROCESS.test(producerName)) continue;
      const producerVolumes = volumeEntries(producerService);
      const consumers = Object.entries(declaredServices).filter(
        ([candidateName, candidate]) =>
          longRunningNames.has(candidateName) &&
          volumeEntries(candidate).some((volume) =>
            producerVolumes.some(
              (producerVolume) =>
                producerVolume.target === volume.target &&
                producerVolume.source !== undefined &&
                volume.source === producerVolume.source
            )
          )
      );
      const paths = [
        ...new Set(
          producerVolumes
            .filter((volume) =>
              consumers.some(([, consumer]) =>
                volumeEntries(consumer).some(
                  (consumerVolume) =>
                    consumerVolume.target === volume.target &&
                    volume.source !== undefined &&
                    consumerVolume.source === volume.source
                )
              )
            )
            .map((volume) => volume.target)
        )
      ];
      if (consumers.length === 0 || paths.length === 0) continue;
      const citation = citeFirstMatchOnly(path, raw, new RegExp(`^\\s*${escapeForPattern(producerName)}:`));
      deploymentRequirements.push({
        kind: 'persistent-bootstrap-artifacts',
        producerServiceName: appNames.get(producerName)!,
        consumerServiceNames: consumers.map(([name]) => appNames.get(name)!),
        paths,
        evidence: citation === undefined ? [] : [citation]
      });
    }

    return {
      ...(dependencies.length === 0 ? {} : { dependencies }),
      ...(serviceFacts.length === 0 ? {} : { services: serviceFacts }),
      ...(migrations.length === 0 ? {} : { migrations }),
      ...(deploymentRequirements.length === 0 ? {} : { deploymentRequirements }),
      ...(appDeclarations.length === 0
        ? {}
        : { declaredApplicationPaths: [...new Set(appDeclarations.map(({ build }) => build.root))] }),
      ...(!layeredRelease
        ? {}
        : { authoritativeDependencyKinds: [...new Set(dependencies.map((dependency) => dependency.kind))] }),
      ...(lifecycleDockerfiles.size === 0 ? {} : { lifecycleDockerfiles: [...lifecycleDockerfiles] }),
      ...(developmentProcesses.size === 0 ? {} : { developmentProcesses: [...developmentProcesses] }),
      ...(!appDeclarations.some(
        ({ build }) =>
          build.dockerfile !== undefined && (build.target !== undefined || (build.buildArgs?.length ?? 0) > 0)
      )
        ? {}
        : {
            descriptorTargetDockerfiles: [
              ...new Set(
                appDeclarations.flatMap(({ build }) =>
                  build.dockerfile !== undefined && (build.target !== undefined || (build.buildArgs?.length ?? 0) > 0)
                    ? [build.dockerfile]
                    : []
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
