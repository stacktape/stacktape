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
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

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
): { root: string; dockerfile?: string } | undefined => {
  const declaration = service.build;
  const context =
    typeof declaration === 'string' ? declaration : isRecord(declaration) ? declaration.context : undefined;
  if (typeof context !== 'string' || context === '') return undefined;
  const root = resolveFrom(composeDirectory(file), context);
  if (root === undefined) return undefined;
  const declaredDockerfile =
    isRecord(declaration) && typeof declaration.dockerfile === 'string' ? declaration.dockerfile : 'Dockerfile';
  const dockerfile = resolveFrom(root, declaredDockerfile);
  return {
    root: root === '' ? '.' : root,
    ...(dockerfile !== undefined && files.includes(dockerfile) ? { dockerfile } : {})
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

const MIGRATION_COMMAND =
  /(?:^|\s)(?:alembic\s+upgrade|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?[^\s]*(?:migrat|db:)|npx\s+[^\s]*(?:migrat|prisma)|python3?\s+manage\.py\s+migrate|rails\s+db:|rake\s+db:|prisma\s+migrate|typeorm\s+[^\s]*migration|knex\s+migrate|sequelize(?:-cli)?\s+db:migrate|flyway|liquibase|dbmate)(?:\s|$)/i;

const commandOf = (service: ComposeService): string | undefined =>
  typeof service.command === 'string' && service.command.trim() !== '' ? service.command.trim() : undefined;

const environmentEntries = (service: ComposeService): Array<{ name: string; value?: unknown }> => {
  if (Array.isArray(service.environment)) {
    return service.environment.flatMap((entry) => {
      if (typeof entry !== 'string') return [];
      const separator = entry.indexOf('=');
      return separator === -1
        ? [{ name: entry }]
        : [{ name: entry.slice(0, separator), value: entry.slice(separator + 1) }];
    });
  }
  return isRecord(service.environment)
    ? Object.entries(service.environment).map(([name, value]) => ({ name, value }))
    : [];
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
      parsed = yaml.parse(raw);
    } catch {
      // A compose file we cannot parse is one the user is probably already fighting with. Say
      // nothing rather than half-read it.
      return {};
    }

    const declaredServices = (parsed as { services?: Record<string, ComposeService> } | null)?.services;
    if (declaredServices === null || typeof declaredServices !== 'object') return {};

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
    const oneShotConsumers = new Map<string, string[]>();
    for (const [consumerName, service] of Object.entries(declaredServices)) {
      for (const dependencyName of completedDependencies(service)) {
        const consumers = oneShotConsumers.get(dependencyName) ?? [];
        consumers.push(consumerName);
        oneShotConsumers.set(dependencyName, consumers);
      }
    }
    const migrations: MigrationFact[] = [];

    for (const declaration of appDeclarations) {
      const consumers = oneShotConsumers.get(declaration.composeName);
      const declaredCommand = commandOf(declaration.service);
      if (consumers === undefined || declaredCommand === undefined) continue;

      const commands: Array<{ command: string; file: string; raw: string }> = [];
      if (MIGRATION_COMMAND.test(declaredCommand)) {
        commands.push({ command: declaredCommand, file: path, raw });
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
                  commands.push({ command: line, file: candidates[0]!, raw: scriptRaw });
                }
              }
            }
          }
        }
      }

      for (const consumer of consumers) {
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
      const port = containerPortOf(service);
      const consumedDependencies = new Set(
        dependsOn(service)
          .map((entry) => dependencyNames.get(entry))
          .filter((entry): entry is string => entry !== undefined)
      );
      const variables: EnvironmentVariableUse[] = [];
      for (const entry of environmentEntries(service)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.name) || isPlatformEnvironmentVariable(entry.name)) continue;
        const value = typeof entry.value === 'string' ? entry.value : '';
        const referencedDependency = [...dependencyNames.entries()].find(([hostname]) =>
          new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeForPattern(hostname)}(?:[^A-Za-z0-9_-]|$)`).test(value)
        );
        const referencedService = [...appNames.entries()].find(
          ([hostname]) =>
            hostname !== composeName &&
            new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeForPattern(hostname)}(?:[^A-Za-z0-9_-]|$)`).test(value)
        );
        const citation = citeFirstMatchOnly(
          path,
          raw,
          new RegExp(`^\\s*(?:-\\s*)?${escapeForPattern(entry.name)}(?:\\s*:|=)`)
        );
        const evidence = citation === undefined ? [] : [{ ...citation, quote: `${entry.name}:` }];
        if (referencedDependency !== undefined) {
          const dependencyName = referencedDependency[1];
          consumedDependencies.add(dependencyName);
          variables.push({ name: entry.name, role: 'infra-dependency', dependencyName, required: true, evidence });
        } else if (referencedService !== undefined) {
          variables.push({
            name: entry.name,
            role: 'cross-service-reference',
            targetServiceName: referencedService[1],
            required: true,
            evidence
          });
        } else {
          variables.push({
            name: entry.name,
            role: /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|_KEY$/.test(entry.name)
              ? 'third-party-secret'
              : 'runtime-config',
            hasDeclaredValue: entry.value !== undefined,
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
        ...((rootCounts.get(build.root) ?? 0) > 1 ? { processType: `compose:${composeName}` } : {}),
        language: languageOf(context.files, build.root) ?? (build.dockerfile === undefined ? 'unknown' : 'container'),
        exposesHttp: port !== undefined,
        ...(port === undefined ? {} : { port }),
        executionModel: 'long-running',
        ...(typeof service.command === 'string' && service.command !== '' ? { startCommand: service.command } : {}),
        ...(build.dockerfile === undefined ? {} : { dockerfile: build.dockerfile }),
        environmentVariables: variables,
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    return {
      ...(dependencies.length === 0 ? {} : { dependencies }),
      ...(serviceFacts.length === 0 ? {} : { services: serviceFacts }),
      ...(migrations.length === 0 ? {} : { migrations }),
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
