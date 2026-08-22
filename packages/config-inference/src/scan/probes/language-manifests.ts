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
import type { ServiceFactInput } from '../../facts/service';
import { languageOf } from '../language';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

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
    packages: ['spring-boot-starter-web', 'spring-boot-starter-webflux'],
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

export const languageManifestProbe: Probe = {
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
                ...(framework === undefined ? {} : { framework: framework.name }),
                exposesHttp: true,
                executionModel: 'long-running' as const,
                ...(streamlitEntrypoint === undefined
                  ? {}
                  : {
                      startCommand: `streamlit run ${streamlitEntrypoint} --server.address 0.0.0.0 --server.port 80`
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
