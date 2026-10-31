/**
 * What the dependency list says, in whatever language wrote it.
 *
 * Until this existed, only `package.json` was read, so a Django, Rails, Spring or Laravel project
 * produced an empty configuration and `init` reported that there was nothing to deploy. This is the
 * same idea as the JavaScript manifest probe, applied to the other eight ecosystems.
 *
 * Two decisions keep it small.
 *
 * **One table, not nine.** A package that means "this application talks to Postgres" is called
 * roughly the same thing everywhere: `pg` in Ruby and JavaScript, `psycopg2` in Python, `postgrex`
 * in Elixir, `Npgsql` in .NET. Names barely collide across ecosystems, so every manifest reduces to
 * a list of package names and one shared table answers what they imply. Nine tables would drift.
 *
 * **Extraction, not parsing.** Each format gets the smallest thing that reliably yields package
 * names — a regex over `gem "..."` lines, the keys of a JSON object, `artifactId` elements. A real
 * TOML/XML/Ruby parser for each would be far more code for an answer that is already unambiguous,
 * and the failure mode of a missed line is a dependency the agent can still find.
 *
 * A package that does not name its engine says nothing. SQLAlchemy, Doctrine, GORM and Ecto all
 * talk to several databases, so they are absent from the table on purpose: a guess there produces a
 * database the application cannot connect to, which is the exact failure this pipeline exists to
 * avoid.
 */

import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { posix } from 'node:path';
import { languageOf } from '../language';
import { withoutSampleDirectories } from '../service-root';
import { citeFirstMatchOnly, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { maskSource } from '../lexical';

/**
 * Package name to what it proves.
 *
 * Matched case-insensitively against a normalised name, which for a namespaced ecosystem is the
 * last segment: `github.com/lib/pq` is `pq`, `org.postgresql:postgresql` is `postgresql`.
 */
const PACKAGE_SIGNALS: ReadonlyArray<{
  packages: readonly string[];
  kinds: readonly DependencyKind[];
}> = [
  {
    packages: [
      // Python, Ruby, Go, Rust, Elixir, .NET, Java, PHP.
      'psycopg2',
      'psycopg2-binary',
      'psycopg',
      'asyncpg',
      'pg8000',
      'pg',
      'pq',
      'pgx',
      'tokio-postgres',
      'postgrex',
      'npgsql',
      'aspire.npgsql',
      'aspire.npgsql.entityframeworkcore.postgresql',
      'npgsql.entityframeworkcore.postgresql',
      'postgresql',
      'ext-pdo_pgsql',
      'ext-pgsql'
    ],
    kinds: ['postgres']
  },
  {
    packages: [
      'mysqlclient',
      'pymysql',
      'aiomysql',
      'mysql-connector-python',
      'mysql2',
      'mysql',
      'mysql-connector-java',
      'mysql-connector-j',
      'mysqlconnector',
      'mysql_async',
      'myxql',
      'mariadb',
      'ext-pdo_mysql',
      // WordPress requires MySQL or MariaDB; its Composer package is therefore stronger evidence
      // than a generic database abstraction library.
      'wordpress'
    ],
    kinds: ['mysql']
  },
  {
    packages: ['microsoft.data.sqlclient', 'system.data.sqlclient', 'mssql-jdbc', 'pyodbc', 'tiberius'],
    kinds: ['mssql']
  },
  {
    packages: [
      'pymongo',
      'motor',
      'mongoengine',
      'mongoid',
      'mongo',
      'mongo-driver',
      'mongodb',
      'mongodb.driver',
      'mongodb-driver-sync',
      'mongodb_driver'
    ],
    kinds: ['mongodb']
  },
  {
    packages: [
      'redis',
      'aioredis',
      'django-redis',
      // Django Channels' Redis channel layer, which every WebSocket consumer of a multi-instance deployment shares.
      'channels-redis',
      'channels_redis',
      'predis',
      'ext-redis',
      'go-redis',
      'redigo',
      'jedis',
      'lettuce-core',
      'stackexchange.redis',
      'aspire.stackexchange.redis',
      'redix'
    ],
    kinds: ['redis']
  },
  // Redis, and only Redis. Sidekiq and Resque keep their jobs in Redis by definition, and Celery
  // needs a broker of some kind with Redis by far the most common choice. An earlier version also
  // emitted a `queue`, which composes to SQS — a queue the application would never connect to,
  // standing next to the broker it actually needs. A wrong resource is worse than a missing one: it
  // costs money, it looks deliberate, and the application is broken either way.
  { packages: ['celery', 'sidekiq', 'resque'], kinds: ['redis'] },
  {
    packages: [
      'pika',
      'amqp',
      'amqp091-go',
      'bunny',
      'rabbitmq-client',
      'rabbitmq.client',
      'aspire.rabbitmq.client',
      'lapin'
    ],
    kinds: ['amqp']
  },
  {
    packages: [
      'kafka-python',
      'confluent-kafka',
      'confluent.kafka',
      'kafka-go',
      'sarama',
      'kafka-clients',
      'brod',
      'rdkafka'
    ],
    kinds: ['kafka']
  },
  {
    packages: ['nats.go', 'async-nats', 'nats-py', 'nats.net'],
    kinds: ['nats']
  },
  {
    packages: [
      'elasticsearch',
      'opensearch-py',
      'go-elasticsearch',
      'searchkick',
      'meilisearch',
      'typesense',
      'elasticsearch-rest-high-level-client'
    ],
    kinds: ['search']
  },
  {
    packages: ['aws-sdk-s3', 'aws-sdk-go-v2-s3', 'awssdk.s3', 'ex_aws_s3', 'rusoto_s3', 's3'],
    kinds: ['object-storage']
  },
  {
    packages: ['aws-sdk-dynamodb', 'awssdk.dynamodbv2', 'dynamodb', 'ex_aws_dynamo'],
    kinds: ['dynamodb']
  },
  {
    packages: ['boto3-ses', 'aws-sdk-ses', 'sendgrid', 'mailgun', 'resend', 'swiftmailer', 'symfony-mailer'],
    kinds: ['email']
  }
];

/** Packages that prove the application serves HTTP, and what to call its framework. */
const HTTP_FRAMEWORKS: ReadonlyArray<{
  packages: readonly string[];
  name: string;
}> = [
  { packages: ['django'], name: 'django' },
  { packages: ['flask'], name: 'flask' },
  { packages: ['fastapi'], name: 'fastapi' },
  { packages: ['starlette'], name: 'starlette' },
  { packages: ['tornado'], name: 'tornado' },
  { packages: ['sanic'], name: 'sanic' },
  { packages: ['streamlit'], name: 'streamlit' },
  { packages: ['rails', 'railties'], name: 'rails' },
  { packages: ['sinatra'], name: 'sinatra' },
  { packages: ['hanami'], name: 'hanami' },
  { packages: ['gin'], name: 'gin' },
  { packages: ['echo'], name: 'echo' },
  { packages: ['fiber'], name: 'fiber' },
  { packages: ['chi'], name: 'chi' },
  { packages: ['mux'], name: 'gorilla' },
  { packages: ['laravel', 'framework'], name: 'laravel' },
  { packages: ['symfony', 'framework-bundle'], name: 'symfony' },
  { packages: ['slim'], name: 'slim' },
  { packages: ['wordpress'], name: 'wordpress' },
  {
    // Spring Boot 4 renamed the servlet starter to `spring-boot-starter-webmvc`.
    packages: ['spring-boot-starter-web', 'spring-boot-starter-webmvc', 'spring-boot-starter-webflux'],
    name: 'spring-boot'
  },
  {
    packages: [
      'quarkus-resteasy',
      'quarkus-resteasy-reactive',
      'quarkus-rest',
      'quarkus-rest-jackson',
      'quarkus-vertx-http'
    ],
    name: 'quarkus'
  },
  { packages: ['micronaut-http-server-netty'], name: 'micronaut' },
  {
    packages: ['microsoft.aspnetcore.app', 'microsoft.aspnetcore'],
    name: 'aspnet'
  },
  { packages: ['axum'], name: 'axum' },
  { packages: ['actix-web'], name: 'actix' },
  { packages: ['rocket'], name: 'rocket' },
  { packages: ['warp'], name: 'warp' },
  { packages: ['phoenix'], name: 'phoenix' }
];

/** Servers that prove HTTP even when the framework is one we do not recognise. */
const HTTP_SERVERS: ReadonlySet<string> = new Set([
  'gunicorn',
  'uvicorn',
  'hypercorn',
  'waitress',
  'puma',
  'unicorn',
  'thin',
  'plug_cowboy',
  'cowboy'
]);

/** Migration tools, and the command that runs them. */
const MIGRATION_TOOLS: ReadonlyArray<{
  packages: readonly string[];
  tool: string;
  command: string;
}> = [
  { packages: ['alembic'], tool: 'alembic', command: 'alembic upgrade head' },
  { packages: ['django'], tool: 'django', command: 'python manage.py migrate' },
  {
    packages: ['rails', 'railties'],
    tool: 'rails',
    command: 'bin/rails db:migrate'
  },
  { packages: ['flyway-core'], tool: 'flyway', command: 'flyway migrate' },
  {
    packages: ['liquibase-core'],
    tool: 'liquibase',
    command: 'liquibase update'
  },
  { packages: ['ecto_sql'], tool: 'ecto', command: 'mix ecto.migrate' },
  {
    packages: ['golang-migrate', 'migrate'],
    tool: 'golang-migrate',
    command: 'migrate up'
  }
];

/**
 * One manifest format, and the smallest reliable way to get package names out of it.
 *
 * Every extractor returns raw names; normalisation happens once, afterwards.
 */
const MANIFESTS: ReadonlyArray<{
  files: readonly string[];
  extract: (raw: string) => string[];
}> = [
  {
    // `package==1.2`, `package[extra]>=1`, `-e .`, comments. The name is what precedes any of the
    // version or extras punctuation.
    files: ['requirements.txt', 'requirements-prod.txt', 'requirements/base.txt'],
    extract: (raw) =>
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#') && !line.startsWith('-'))
        .map((line) => line.split(/[[<>=!~;\s]/)[0] ?? '')
  },
  {
    // Both the PEP 621 `dependencies = [...]` array and Poetry's `[tool.poetry.dependencies]` table
    // are covered by taking any quoted or bare requirement that looks like a package name.
    files: ['pyproject.toml', 'Pipfile'],
    extract: (raw) => [
      ...[...raw.matchAll(/["']([A-Za-z][\w.-]+)["']\s*(?:[,\]]|=)/g)].map((match) => match[1] ?? ''),
      ...[...raw.matchAll(/^\s*([A-Za-z][\w.-]+)\s*=\s*["{]/gm)].map((match) => match[1] ?? '')
    ]
  },
  {
    files: ['Gemfile'],
    extract: (raw) => [...raw.matchAll(/^\s*gem\s+["']([^"']+)["']/gm)].map((match) => match[1] ?? '')
  },
  {
    // `require (...)` blocks and single-line `require x v1`. Indirect ones are excluded: a
    // transitive dependency is not a statement about what this application talks to.
    files: ['go.mod'],
    extract: (raw) =>
      raw
        .split(/\r?\n/)
        .filter((line) => !line.includes('// indirect'))
        .flatMap((line) => {
          const match = /^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/[\w./-]+)\s+v/.exec(line);
          return match?.[1] === undefined ? [] : [match[1]];
        })
  },
  {
    files: ['composer.json'],
    extract: (raw) => {
      try {
        const parsed = JSON.parse(raw) as {
          require?: Record<string, unknown>;
          'require-dev'?: Record<string, unknown>;
        };
        return [...Object.keys(parsed.require ?? {}), ...Object.keys(parsed['require-dev'] ?? {})];
      } catch {
        return [];
      }
    }
  },
  {
    files: ['pom.xml'],
    extract: (raw) => [...raw.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)].map((match) => match[1] ?? '')
  },
  {
    // `implementation "group:artifact:version"` and the Kotlin DSL equivalent.
    files: ['build.gradle', 'build.gradle.kts'],
    extract: (raw) => [...raw.matchAll(/["']([\w.-]+):([\w.-]+)(?::[^"']*)?["']/g)].map((match) => match[2] ?? '')
  },
  {
    files: ['Cargo.toml'],
    extract: (raw) => [...raw.matchAll(/^\s*([A-Za-z][\w-]+)\s*=\s*[{"]/gm)].map((match) => match[1] ?? '')
  },
  {
    files: ['mix.exs'],
    extract: (raw) => [...raw.matchAll(/\{:([a-z_]+)\s*,/g)].map((match) => match[1] ?? '')
  }
];

/**
 * Where each format states the project's own name.
 *
 * Worth the extra patterns because this becomes the resource name in the generated configuration,
 * and `app` reads like a placeholder next to `orders-api`. The JavaScript probe already takes the
 * name from `package.json`; there is no reason the other eight ecosystems should be worse off.
 */
const PROJECT_NAME_PATTERNS: ReadonlyArray<{
  files: readonly string[];
  pattern: RegExp;
  /** Applied to the raw text before matching, for formats whose first match is the wrong one. */
  prepare?: (raw: string) => string;
}> = [
  {
    files: ['pyproject.toml', 'Cargo.toml'],
    pattern: /^\s*name\s*=\s*["']([^"']+)["']/m
  },
  // Composer names are `vendor/project`; only the second half is the project.
  { files: ['composer.json'], pattern: /"name"\s*:\s*"(?:[^"/]+\/)?([^"]+)"/ },
  { files: ['go.mod'], pattern: /^module\s+\S*?([\w.-]+)\s*$/m },
  { files: ['mix.exs'], pattern: /app:\s*:(\w+)/ },
  {
    files: ['pom.xml'],
    pattern: /<artifactId>([^<]+)<\/artifactId>/,
    // A Spring Boot pom opens with `<parent><artifactId>spring-boot-starter-parent</artifactId>…`,
    // so the first artifactId in the file names Spring, not the project. The project's own name is
    // the first one *outside* the parent block.
    prepare: (raw) => raw.replace(/<parent>[\s\S]*?<\/parent>/, '')
  }
];

/** `*.csproj` is found by suffix rather than by name, so it gets its own extractor. */
const CSPROJ_PACKAGES = (raw: string): string[] =>
  [...raw.matchAll(/<PackageReference\s+Include="([^"]+)"/g)].map((match) => match[1] ?? '');

/**
 * Reduce a package name to what the table is keyed on.
 *
 * Namespaced ecosystems keep only the last segment, because that is the part that is stable and
 * recognisable: `github.com/lib/pq`, `org.postgresql:postgresql` and `aws/aws-sdk-php` all reduce
 * to something the table can hold once.
 */
const normalise = (name: string): string => {
  const segments = name.trim().toLowerCase().split(/[/:]/);
  // Go modules put their major version in the import path: `github.com/go-chi/chi/v5` is chi, not
  // v5. Without this, every Go library on a second major version silently stops matching — which is
  // most of the popular ones.
  while (segments.length > 1 && /^v\d+$/.test(segments.at(-1)!)) segments.pop();
  return segments.at(-1) ?? '';
};

/**
 * The Java release a build pins: a Gradle toolchain (`JavaLanguageVersion.of(17)`), `sourceCompatibility`, or Maven's
 * `java.version` / `maven.compiler.release` property. The build tool refuses any other JDK, so the value is a fact.
 */
const javaVersionOf = (rawByPath: ReadonlyMap<string, string | undefined>): string | undefined => {
  const gradle = rawByPath.get('build.gradle') ?? rawByPath.get('build.gradle.kts');
  const fromGradle =
    gradle?.match(/JavaLanguageVersion\.of\(\s*(\d+)\s*\)/)?.[1] ??
    gradle?.match(/sourceCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?['"]?(?:1\.)?(\d+)['"]?/)?.[1];
  const pom = rawByPath.get('pom.xml');
  const fromMaven =
    pom?.match(/<java\.version>\s*(?:1\.)?(\d+)\s*<\/java\.version>/)?.[1] ??
    pom?.match(/<maven\.compiler\.(?:release|target)>\s*(?:1\.)?(\d+)\s*<\/maven\.compiler\.(?:release|target)>/)?.[1];
  return fromGradle ?? fromMaven;
};

/** Manifests whose migration tools are read in service directories below the root. */
const NESTED_MIGRATION_MANIFESTS = new Set(['requirements.txt', 'pyproject.toml', 'Pipfile', 'Gemfile']);
const NON_SERVICE_PATH = /(?:^|\/)(?:node_modules|vendor|dist|build|\.venv|venv|site-packages|tests?|docs?)\//;
const MAX_NESTED_MANIFESTS = 20;

/**
 * The migration tool a service directory below the root depends on: `api/requirements.txt` listing Alembic. The root
 * manifest is the application's own and is read below; these belong to whichever service the directory holds.
 */
const nestedMigrations = async (context: ProbeContext): Promise<NonNullable<ProbeOutput['pathMigrations']>> => {
  const paths = withoutSampleDirectories(
    context.files.filter(
      (file) =>
        file.includes('/') && NESTED_MIGRATION_MANIFESTS.has(posix.basename(file)) && !NON_SERVICE_PATH.test(file)
    )
  ).slice(0, MAX_NESTED_MANIFESTS);
  const found: NonNullable<ProbeOutput['pathMigrations']> = [];
  for (const path of paths) {
    const directory = posix.dirname(path);
    if (found.some((entry) => entry.path === directory)) continue;
    const manifest = MANIFESTS.find(({ files }) => files.includes(posix.basename(path)));
    // oxlint-disable-next-line no-await-in-loop -- bounded, small files read in a stable order.
    const raw = manifest === undefined ? undefined : await readText(context, path);
    if (manifest === undefined || raw === undefined) continue;
    const names = new Set(manifest.extract(raw).map(normalise));
    const tool = MIGRATION_TOOLS.find((entry) => entry.packages.some((name) => names.has(name)));
    if (tool === undefined) continue;
    const citation = citeFirstMatchOnly(
      path,
      raw,
      new RegExp(
        tool.packages.find((name) => names.has(name))!,
        'i'
      )
    );
    found.push({
      path: directory,
      migration: {
        tool: tool.tool,
        command: tool.command,
        directory,
        runsAt: 'unknown',
        evidence: citation === undefined ? [] : [citation]
      }
    });
  }
  return found;
};

/**
 * The port an ASP.NET application fixes in its `Program.cs`: `app.Run("http://0.0.0.0:4321")`,
 * `UseUrls("http://*:4321")`, `app.Urls.Add(...)` or Kestrel's `ListenAnyIP(4321)`. Such a URL overrides the
 * environment, so the service must route there. Comments and strings are read as C#, so a commented-out call is no
 * listener. A call whose address is not a literal (a variable, an interpolated string) leaves the port as before.
 * Calls that name different ports are reported as unread, by file.
 */
const aspNetListener = async (
  context: ProbeContext,
  directory: string
): Promise<{ port: number; citation: Citation } | { unread: string } | undefined> => {
  const path = directory === '.' ? 'Program.cs' : `${directory}/Program.cs`;
  if (!context.files.includes(path)) return undefined;
  const raw = await readText(context, path);
  if (raw === undefined) return undefined;
  const code = maskSource(raw, 'csharp', { strings: 'blank' });
  const keep = maskSource(raw, 'csharp', { strings: 'keep' });
  const ports = new Map<string, number>();
  for (const call of code.matchAll(/(?:\.Run(?:Async)?|\.UseUrls|\.Urls\.Add)\s*\(([^()]*)\)/g)) {
    const offset = call.index + call[0].indexOf('(') + 1;
    const argumentList = keep.slice(offset, offset + call[1]!.length).trim();
    // `app.Run()` listens where the environment says.
    if (argumentList === '') continue;
    const urls = argumentList.split(',').map((argument) => /^\s*@?"([^"]*)"\s*$/.exec(argument)?.[1]);
    if (urls.some((url) => url === undefined)) return undefined;
    const callPorts = urls
      .flatMap((value) => value!.split(';'))
      .map((url) => /^http:\/\/[^/]*:(\d{2,5})(?:\/|$)/.exec(url.trim())?.[1]);
    if (callPorts.some((port) => port === undefined)) return undefined;
    // One call with several addresses listens on all of them, so its first one receives the traffic.
    if (!ports.has(callPorts[0]!)) ports.set(callPorts[0]!, call.index);
  }
  for (const call of code.matchAll(/\bListenAnyIP\s*\(([^,)]*)/g)) {
    const port = /^\s*(\d{2,5})\s*$/.exec(call[1]!)?.[1];
    if (port === undefined) return undefined;
    if (!ports.has(port)) ports.set(port, call.index);
  }
  if (ports.size === 0) return undefined;
  if (ports.size > 1) return { unread: path };
  const [port, offset] = [...ports][0]!;
  return {
    port: Number(port),
    citation: citeLine(path, raw.split(/\r?\n/), raw.slice(0, offset).split(/\r?\n/).length - 1, 'port')
  };
};

/** The repository root's own manifest: its services, dependencies and migrations. */
/** `project/settings.py`, or a module of a `settings/` package (`settings/production.py`). */
const DJANGO_SETTINGS_FILE = /(?:^|\/)settings(?:\.py|\/[\w-]+\.py)$/;
const CHANNEL_LAYERS = /\bCHANNEL_LAYERS\s*=/;
/** An environment read in Python settings: `os.environ['REDIS_URL']`, `os.getenv("REDIS_URL")`, `env("REDIS_URL")`. */
const PYTHON_ENVIRONMENT_READ =
  /\b(?:os\.environ(?:\.get)?|os\.getenv|getenv|env(?:\.\w+)?|config)\s*[([]\s*['"]([A-Z][A-Z0-9_]*)['"]/g;

/**
 * Where Django Channels' Redis channel layer takes its address: the environment variables `CHANNEL_LAYERS` reads, or the
 * line that fixes it (`"hosts": [("redis", 6379)]`), which a Redis created on AWS does not answer at.
 */
const channelLayerAddress = async (
  context: ProbeContext
): Promise<{ variables: string[] } | { fixed: { file: string; line: number; setting: string } } | undefined> => {
  const settings = context.files.filter((path) => DJANGO_SETTINGS_FILE.test(path)).slice(0, 20);
  for (const path of settings) {
    // oxlint-disable-next-line no-await-in-loop -- a handful of settings files, read in a stable order.
    const raw = await readText(context, path, { fullFile: true });
    if (raw === undefined) continue;
    const code = maskSource(raw, 'python', { strings: 'keep' });
    const start = CHANNEL_LAYERS.exec(code)?.index;
    if (start === undefined || !/channels_redis/.test(code.slice(start, start + 600))) continue;
    const hostsAt = code.indexOf('hosts', start);
    if (hostsAt === -1 || hostsAt > start + 600) return undefined;
    const hosts = code.slice(hostsAt, hostsAt + 300).split(/\]\s*[,}]/)[0]!;
    const variables = [...hosts.matchAll(PYTHON_ENVIRONMENT_READ)].map((match) => match[1]!);
    if (variables.length > 0) return { variables };
    if (!/['"][^'"]+['"]/.test(hosts)) return undefined;
    const line = code.slice(0, hostsAt).split('\n').length;
    return { fixed: { file: path, line, setting: 'CHANNEL_LAYERS' } };
  }
  return undefined;
};

const rootManifestProbe: Probe = {
  name: 'language-manifests',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const dotnetProjectPaths = context.files
      .filter(
        (file) =>
          file.endsWith('.csproj') &&
          !/(?:^|\/)(?:test|tests)(?:\/|$)|(?:^|\/)[^/]*(?:\.Tests?|Tests?)\//i.test(file) &&
          !/(?:^|\/)(?:bin|obj)(?:\/|$)/i.test(file)
      )
      .slice(0, 100);
    const rootLanguage = languageOf(context.files, '.');
    // A JavaScript workspace root can orchestrate nested .NET services (Aspire is a common case).
    // The JavaScript manifest probe still owns the JS apps; this probe must not let the root marker
    // hide every csproj below it.
    const language =
      dotnetProjectPaths.length > 0 && (rootLanguage === undefined || rootLanguage === 'javascript')
        ? 'dotnet'
        : rootLanguage;
    // JavaScript has its own probe, which reads far more than a dependency list.
    if (language === undefined || language === 'javascript') return {};

    const candidates = [
      ...MANIFESTS.flatMap(({ files, extract }) => {
        const path = files.find((name) => context.files.includes(name));
        return path === undefined ? [] : [{ path, extract }];
      }),
      ...dotnetProjectPaths.map((path) => ({ path, extract: CSPROJ_PACKAGES }))
    ];
    if (candidates.length === 0) return {};

    const read = await Promise.all(
      candidates.map(async ({ path }) => ({
        path,
        raw: await readText(context, path)
      }))
    );

    /** Every package name found, with the file that named it, so citations point somewhere real. */
    const foundIn = new Map<string, string>();
    for (const [index, { path, raw }] of read.entries()) {
      if (raw === undefined) continue;
      for (const name of candidates[index]!.extract(raw)) {
        const key = normalise(name);
        if (key !== '' && !foundIn.has(key)) foundIn.set(key, path);
      }
    }
    const rawByPath = new Map(read.map(({ path, raw }) => [path, raw]));
    const cite = (packageName: string) => {
      const path = foundIn.get(packageName);
      const raw = path === undefined ? undefined : rawByPath.get(path);
      if (path === undefined || raw === undefined) return undefined;
      return citeFirstMatchOnly(path, raw, new RegExp(packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    };

    const dotnetServices: ServiceFactInput[] =
      language !== 'dotnet'
        ? []
        : read.flatMap(({ path, raw }) => {
            if (!path.endsWith('.csproj') || raw === undefined) return [];
            const webSdk = /<Project\s+Sdk=["'][^"']*Microsoft\.NET\.Sdk\.Web/i.test(raw);
            const executableAspNet =
              /<OutputType>Exe<\/OutputType>/i.test(raw) &&
              !/<UseMaui>true<\/UseMaui>/i.test(raw) &&
              /<FrameworkReference\s+Include=["']Microsoft\.AspNetCore\.App["']/i.test(raw);
            const web = webSdk || executableAspNet;
            const worker = /<Project\s+Sdk=["'][^"']*Microsoft\.NET\.Sdk\.Worker/i.test(raw);
            if (!web && !worker) return [];
            const fileName = path.slice(path.lastIndexOf('/') + 1);
            const name = fileName.replace(/\.csproj$/i, '');
            const directory = path.slice(0, -(fileName.length + 1)) || '.';
            const citation = citeFirstMatchOnly(
              path,
              raw,
              web ? /Microsoft\.NET\.Sdk\.Web|Microsoft\.AspNetCore\.App/i : /Microsoft\.NET\.Sdk\.Worker/i,
              'framework'
            );
            return [
              {
                name,
                path: directory,
                language: 'dotnet',
                ...(web ? { framework: 'aspnet' } : {}),
                exposesHttp: web,
                executionModel: 'long-running' as const,
                environmentVariables: [],
                evidence: citation === undefined ? [] : [citation],
                source: 'probe' as const
              }
            ];
          });

    for (const service of dotnetServices) {
      if (!service.exposesHttp) continue;
      // oxlint-disable-next-line no-await-in-loop -- one Program.cs per ASP.NET project.
      const listener = await aspNetListener(context, service.path);
      if (listener === undefined) continue;
      if ('port' in listener) {
        service.port = listener.port;
        service.evidence = [...(service.evidence ?? []), listener.citation];
      } else {
        service.listenerNotes = [{ kind: 'unread-port', path: listener.unread }];
      }
    }

    if (foundIn.size === 0 && dotnetServices.length === 0) return {};

    const dependencies = new Map<DependencyKind, DependencyFact>();
    for (const signal of PACKAGE_SIGNALS) {
      const match = signal.packages.find((name) => foundIn.has(name));
      if (match === undefined) continue;
      const citation = cite(match);
      for (const kind of signal.kinds) {
        if (dependencies.has(kind)) continue;
        dependencies.set(kind, {
          name: defaultDependencyName(kind),
          kind,
          extensions: [],
          consumedBy: [],
          addressedBy: [],
          evidence: citation === undefined ? [] : [citation],
          source: 'probe'
        });
      }
    }
    const redis = dependencies.get('redis');
    if (redis !== undefined && (foundIn.has('channels-redis') || foundIn.has('channels_redis'))) {
      const layer = await channelLayerAddress(context);
      if (layer !== undefined && 'fixed' in layer) redis.fixedAddress = layer.fixed;
      if (layer !== undefined && 'variables' in layer) {
        redis.addressedBy = [...new Set([...redis.addressedBy, ...layer.variables])];
      }
    }

    /**
     * What the project calls itself.
     *
     * From the manifest where the format has somewhere to put a name, and from the directory
     * otherwise — a Gemfile has no name field, and a repository called `orders-api` still reads
     * better in a configuration than `app` does.
     */
    const declaredName = PROJECT_NAME_PATTERNS.map(({ files, pattern, prepare }) => {
      const path = files.find((name) => rawByPath.has(name));
      const raw = path === undefined ? undefined : rawByPath.get(path);
      if (raw === undefined) return undefined;
      return pattern.exec(prepare === undefined ? raw : prepare(raw))?.[1] ?? undefined;
    }).find((name) => name !== undefined);
    const projectName = declaredName ?? context.root.split(/[/\\]/).findLast((segment) => segment !== '');
    const javaVersion = language === 'java' ? javaVersionOf(rawByPath) : undefined;

    const framework = HTTP_FRAMEWORKS.find((entry) => entry.packages.some((name) => foundIn.has(name)));
    const server = [...HTTP_SERVERS].find((name) => foundIn.has(name));
    const exposesHttp = framework !== undefined || server !== undefined;
    const migration = MIGRATION_TOOLS.find((entry) => entry.packages.some((name) => foundIn.has(name)));
    const streamlitEntrypoint =
      framework?.name === 'streamlit' ? ['app.py', 'main.py'].find((path) => context.files.includes(path)) : undefined;
    const streamlitRaw = streamlitEntrypoint === undefined ? undefined : await readText(context, streamlitEntrypoint);
    const streamlitCitation =
      streamlitEntrypoint === undefined || streamlitRaw === undefined
        ? undefined
        : citeFirstMatchOnly(streamlitEntrypoint, streamlitRaw, /import\s+streamlit|from\s+streamlit/);

    // A service, but only when something proves this is a running application rather than a library.
    // A dependency list alone does not: plenty of Python packages depend on `redis` and are not
    // deployed. HTTP or a start command is the proof, and the Procfile probe supplies the latter.
    const services =
      dotnetServices.length > 0
        ? dotnetServices
        : exposesHttp
          ? [
              {
                name: projectName ?? 'app',
                path: '.',
                language,
                ...(javaVersion === undefined ? {} : { runtimeVersion: javaVersion }),
                ...(framework === undefined ? {} : { framework: framework.name }),
                exposesHttp: true,
                executionModel: 'long-running' as const,
                ...(streamlitEntrypoint === undefined
                  ? {}
                  : {
                      startCommand: `streamlit run ${streamlitEntrypoint} --server.address 0.0.0.0 --server.port 80`,
                      // The command fixes the port, so the service must route there too.
                      port: 80
                    }),
                evidence: [cite(framework?.packages[0] ?? server ?? ''), streamlitCitation].filter(
                  (citation) => citation !== undefined
                ),
                source: 'probe' as const
              }
            ]
          : [];

    return {
      ...(services.length > 0 ? { services } : {}),
      ...(dependencies.size > 0 ? { dependencies: [...dependencies.values()] } : {}),
      ...(migration === undefined
        ? {}
        : {
            migrations: [
              {
                serviceName: services[0]?.name ?? 'app',
                tool: migration.tool,
                command: migration.command,
                // The tool is declared; when it runs is not. `checkFactsCompleteness` turns this
                // into a decision rather than letting us invent a deploy hook nobody asked for.
                runsAt: 'unknown' as const,
                evidence: [cite(migration.packages[0] ?? '')].filter((citation) => citation !== undefined)
              }
            ]
          })
    };
  }
};

/** The modules a `go.work` file uses: `use ./worker` and `use ( ./api ./worker )`. */
const goWorkModules = (raw: string): string[] => {
  const block = /^\s*use\s*\(([^)]*)\)/m.exec(raw)?.[1];
  const entries =
    block === undefined ? [...raw.matchAll(/^\s*use\s+(\S+)/gm)].map((match) => match[1]!) : block.split(/\s+/);
  return entries
    .map((entry) => posix.normalize(entry.trim().replace(/^["'`]|["'`]$/g, '')).replace(/\/$/, ''))
    .filter((entry) => entry !== '' && !entry.startsWith('..') && !entry.startsWith('/') && !entry.startsWith('//'));
};

/** An HTTP or gRPC listener, or a Lambda handler: another probe owns those programs. */
const GO_LISTENER_OR_HANDLER =
  /\b(?:http\.(?:ListenAndServe(?:TLS)?|Serve(?:TLS)?)|net\.Listen|lambda\.Start(?:WithOptions)?)\s*\(|\.(?:ListenAndServe(?:TLS)?|Serve|Run|RunTLS|Start|Listen)\s*\(/;
/** A program that keeps running: it blocks forever, loops, ticks, or waits for a shutdown signal. */
const GO_KEEPS_RUNNING =
  /\bselect\s*\{\s*\}|\bfor\s*\{|\bsignal\.Notify(?:Context)?\s*\(|\btime\.(?:NewTicker|Tick)\s*\(|<-\s*[\w.]*\.?Done\s*\(\s*\)/;

/**
 * Go programs that run continuously and serve no HTTP: the `main` package of the repository's module, or of a module
 * its `go.work` uses. A module with no `main` package is a library, and a `main` that runs once and exits is a tool;
 * neither is a service. A listener in source, not in a string, makes it a server, which the server-entrypoint probe
 * reads.
 */
const goWorkers = async (context: ProbeContext): Promise<ServiceFactInput[]> => {
  const modules = context.files.includes('go.mod') ? ['.'] : [];
  if (context.files.includes('go.work')) {
    const raw = await readText(context, 'go.work', { fullFile: true });
    for (const module of raw === undefined ? [] : goWorkModules(raw)) {
      if (!modules.includes(module) && context.files.includes(module === '.' ? 'go.mod' : `${module}/go.mod`)) {
        modules.push(module);
      }
    }
  }
  const workers: ServiceFactInput[] = [];
  for (const module of modules.slice(0, 20)) {
    const prefix = module === '.' ? '' : `${module}/`;
    const sources = context.files
      .filter((path) => path.startsWith(prefix) && /^[^/]+\.go$/.test(path.slice(prefix.length)))
      .filter((path) => !path.endsWith('_test.go'))
      .slice(0, 40);
    // oxlint-disable-next-line no-await-in-loop -- one module's top-level package at a time, bounded above.
    const [goMod, ...read] = await Promise.all([
      readText(context, `${prefix}go.mod`, { fullFile: true }).then((raw) => ({ path: `${prefix}go.mod`, raw })),
      ...sources.map(async (path) => ({ path, raw: await readText(context, path, { fullFile: true }) }))
    ]);
    const code = read.flatMap(({ path, raw }) =>
      raw === undefined ? [] : [{ path, raw, masked: maskSource(raw, 'go', { strings: 'blank' }) }]
    );
    const main = code.filter(({ masked }) => /^\s*package\s+main\b/m.test(masked));
    const entry = main.find(({ masked }) => /\bfunc\s+main\s*\(\s*\)/.test(masked));
    if (entry === undefined) continue;
    if (main.some(({ masked }) => GO_LISTENER_OR_HANDLER.test(masked))) continue;
    const running = main.find(({ masked }) => GO_KEEPS_RUNNING.test(masked));
    if (running === undefined) continue;
    const moduleName = goMod?.raw === undefined ? undefined : /^module\s+\S*?([\w.-]+)\s*$/m.exec(goMod.raw)?.[1];
    const name =
      moduleName ??
      (module === '.' ? context.root.split(/[/\\]/).findLast((part) => part !== '') : posix.basename(module));
    const lines = running.masked.split('\n');
    const index = lines.findIndex((line) => GO_KEEPS_RUNNING.test(line));
    workers.push({
      name: name ?? 'worker',
      path: module,
      language: 'go',
      exposesHttp: false,
      executionModel: 'long-running',
      // The buildpack builds the package of this file, as it does for a Go server's.
      containerEntrypoint: entry.path,
      environmentVariables: [],
      evidence: index === -1 ? [] : [citeLine(running.path, running.raw.split('\n'), index, 'executionModel')],
      source: 'probe'
    });
  }
  return workers;
};

export const languageManifestProbe: Probe = {
  name: 'language-manifests',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const root = await rootManifestProbe.run(context);
    const pathMigrations = await nestedMigrations(context);
    const claimed = new Set((root.services ?? []).map((service) => service.path));
    const workers = (await goWorkers(context)).filter((worker) => !claimed.has(worker.path));
    const services = [...(root.services ?? []), ...workers];
    return {
      ...root,
      ...(services.length === 0 ? {} : { services }),
      ...(pathMigrations.length === 0 ? {} : { pathMigrations })
    };
  }
};
