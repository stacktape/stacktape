/**
 * Synthetic repositories exercising each importer through the complete init pipeline.
 *
 * Probe specs protect parsing details. These protect the user outcome: after every other probe has
 * merged, verification has run, defaults have been applied, and the real composer has produced a
 * config, the imported service still exists once, its trigger still points at a resource that
 * exists, and an old deployment is never mistaken for permission to delete or replace it.
 */

import { describe, expect, it } from 'bun:test';
import { runEvalCase, type EvalCase } from './harness';

const CASES: EvalCase[] = [
  ...(['alias-only', 'target-only', 'identical'] as const).map(
    (policy): EvalCase => ({
      name: `Fly Dockerfile pointer chain with ${policy} ignore policy`,
      files: {
        'package.json': JSON.stringify({ name: 'shop', dependencies: { fastify: '^5.0.0' } }),
        Dockerfile: 'docker/Dockerfile.alias\n',
        'docker/Dockerfile.alias': 'production.dockerfile\n',
        'docker/production.dockerfile': 'FROM node:24\nCOPY . /app\nEXPOSE 4000\nSTOPSIGNAL SIGINT\n',
        'private-marker.txt': 'synthetic private content',
        ...(policy === 'target-only' ? {} : { 'Dockerfile.dockerignore': 'private-marker.txt\n' }),
        ...(policy === 'alias-only' ? {} : { 'docker/production.dockerfile.dockerignore': 'private-marker.txt\n' }),
        'fly.toml': 'app = "shop-api"\n[build]\ndockerfile = "Dockerfile"\n[http_service]\ninternal_port = 4000\n'
      },
      expect: {
        resources: { shop: 'web-service' },
        resourceCount: 1,
        deployable: policy === 'identical',
        ...(policy === 'identical'
          ? { forbiddenGapPatterns: ['cannot prove.*files excluded'] }
          : { requiredGapPatterns: ['cannot prove.*files excluded', 'private files', 'configuration is blocked'] }),
        resourcePackaging: [
          {
            resource: 'shop',
            type: 'custom-dockerfile',
            buildContextPath: '.',
            dockerfilePath: policy === 'identical' ? 'docker/production.dockerfile' : 'Dockerfile'
          }
        ],
        maxQuestions: 0
      }
    })
  ),
  {
    name: 'Fly multi-process app',
    files: {
      'package.json': JSON.stringify({ name: 'shop', dependencies: { fastify: '^5.0.0' } }),
      'fly.toml': [
        'app = "shop-api"',
        '[processes]',
        'web = "node dist/server.js"',
        'jobs = "node dist/jobs.js"',
        '[http_service]',
        'internal_port = 4000',
        'processes = ["web"]',
        ''
      ].join('\n')
    },
    expect: {
      resources: { shopApi: 'web-service', shopApiJobs: 'worker-service' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Fly multi-process app using a chained production Dockerfile alias',
    files: {
      'package.json': JSON.stringify({ name: 'shop', dependencies: { fastify: '^5.0.0' } }),
      Dockerfile: 'docker/Dockerfile.alias\n',
      'docker/Dockerfile.alias': 'production.dockerfile\n',
      'docker/production.dockerfile': 'FROM node:24\nEXPOSE 4000\nSTOPSIGNAL SIGINT\n',
      'fly.toml': [
        'app = "shop-api"',
        '[build]',
        'dockerfile = "Dockerfile"',
        '[processes]',
        'web = "node dist/server.js"',
        'jobs = "node dist/jobs.js"',
        '[http_service]',
        'internal_port = 4000',
        'processes = ["web"]',
        ''
      ].join('\n')
    },
    expect: {
      resources: { shopApi: 'web-service', shopApiJobs: 'worker-service' },
      resourceCount: 2,
      resourcePackaging: [
        {
          resource: 'shopApi',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          dockerfilePath: 'docker/production.dockerfile',
          command: ['/bin/sh', '-c', 'node dist/server.js']
        },
        {
          resource: 'shopApiJobs',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          dockerfilePath: 'docker/production.dockerfile',
          command: ['/bin/sh', '-c', 'node dist/jobs.js']
        }
      ],
      serviceProperties: [{ resource: 'shopApi', containerPort: 4000 }],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Docker Compose app plus worker and database',
    files: {
      'package.json': JSON.stringify({ name: 'orders', dependencies: { express: '^5.0.0', pg: '^8.0.0' } }),
      Dockerfile: 'FROM node:24\nRUN apt-get update && apt-get install -y imagemagick\n',
      'compose.yaml': [
        'services:',
        '  web:',
        '    build: .',
        '    command: node dist/server.js',
        '    ports: ["4000:4000"]',
        '    environment:',
        '      DATABASE_URL: postgres://db:5432/orders',
        '  worker:',
        '    build: .',
        '    command: node dist/worker.js',
        '    depends_on: [db]',
        '  db:',
        '    image: postgres:16',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { web: 'web-service', worker: 'worker-service', mainDatabase: 'relational-database' },
      serviceEnvironment: [
        { resource: 'web', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  ...[
    {
      name: 'relative container filename remapped from another source',
      dockerfile: 'FROM node:24\nWORKDIR /\nCOPY root-server.js /apps/nested/nested-server.js\nEXPOSE 3000\n',
      scripts: {}
    },
    {
      name: 'repository install hook can replace the copied source',
      dockerfile: 'FROM node:24\nWORKDIR /app\nCOPY . .\nRUN npm install\nEXPOSE 3000\n',
      scripts: { postinstall: 'node rewrite.js' }
    }
  ].map(
    ({ name, dockerfile, scripts }): EvalCase => ({
      name: `Compose preserves an independent same-name child: ${name}`,
      files: {
        'package.json': JSON.stringify({
          name: 'api',
          scripts: { start: 'node root-server.js', ...scripts },
          dependencies: { express: '5' }
        }),
        'root-server.js': 'require("express")().listen(3000);\n',
        'rewrite.js': 'require("node:fs").copyFileSync("root-server.js", "apps/nested/nested-server.js");\n',
        'apps/nested/package.json': JSON.stringify({ name: 'api', dependencies: { fastify: '5' } }),
        'apps/nested/nested-server.js': 'require("fastify")().listen({ port: 4000 });\n',
        Dockerfile: dockerfile,
        'compose.yaml':
          'services:\n  api:\n    build: .\n    command: [node, apps/nested/nested-server.js]\n    ports: ["3000:3000"]\n'
      },
      expect: {
        serviceCount: 2,
        resourceCount: 2,
        serviceDockerfiles: { '.': 'Dockerfile', 'apps/nested': null },
        resources: { api: 'web-service', api2: 'web-service' },
        resourcePackaging: [{ resource: 'api2', type: 'stacktape-image-buildpack' }]
      }
    })
  ),
  {
    name: 'Bun workspace API and BullMQ worker share Redis and Postgres with one Drizzle migration',
    directoryName: 'jobdesk',
    files: {
      'package.json': JSON.stringify({
        name: 'jobdesk',
        private: true,
        workspaces: ['apps/*', 'packages/*'],
        scripts: {
          'start:api': 'bun apps/api/src/index.ts',
          'start:worker': 'bun apps/worker/src/index.ts',
          'db:migrate': 'bun packages/core/src/db/migrate.ts'
        },
        devDependencies: { 'drizzle-kit': '^0.31' }
      }),
      'apps/api/package.json': JSON.stringify({
        name: '@jobdesk/api',
        dependencies: { '@jobdesk/core': 'workspace:*', hono: '^4' }
      }),
      'apps/api/src/index.ts': 'import { Hono } from "hono"; Bun.serve({ port: 3000, fetch: new Hono().fetch });\n',
      'apps/worker/package.json': JSON.stringify({
        name: '@jobdesk/worker',
        dependencies: { '@jobdesk/core': 'workspace:*' }
      }),
      'apps/worker/src/index.ts': 'import { Worker } from "bullmq"; new Worker("jobs", async () => undefined);\n',
      'packages/core/package.json': JSON.stringify({
        name: '@jobdesk/core',
        exports: './src/index.ts',
        dependencies: { 'drizzle-orm': '^0.44', postgres: '^3', bullmq: '^5', ioredis: '^5' }
      }),
      'packages/core/src/index.ts': 'export const name = "jobdesk";\n',
      'packages/core/src/db/migrate.ts':
        'import { migrate } from "drizzle-orm/postgres-js/migrator"; await migrate(db, { migrationsFolder: "drizzle" });\n',
      'drizzle/0000_initial.sql': 'CREATE TABLE jobs (id text PRIMARY KEY);\n',
      Dockerfile: [
        'FROM oven/bun:1 AS deps',
        'WORKDIR /app',
        'COPY package.json ./',
        'COPY apps ./apps',
        'COPY packages ./packages',
        'RUN bun install --frozen-lockfile',
        'FROM oven/bun:1 AS runner',
        'WORKDIR /app',
        'COPY --from=deps /app /app',
        'COPY drizzle ./drizzle',
        'EXPOSE 3000',
        'CMD ["bun", "apps/api/src/index.ts"]',
        ''
      ].join('\n'),
      '.dockerignore': 'node_modules\ndist\n.env\n**/*.test.ts\n',
      'compose.yaml': [
        'services:',
        '  postgres:',
        '    image: postgres:16-alpine',
        '  redis:',
        '    image: redis:7-alpine',
        '  migrate:',
        '    build: .',
        '    command: ["bun", "packages/core/src/db/migrate.ts"]',
        '    environment:',
        '      DATABASE_URL: postgres://postgres:5432/jobdesk',
        ...['api', 'worker'].flatMap((name) => [
          `  ${name}:`,
          '    build: .',
          `    command: ["bun", "apps/${name}/src/index.ts"]`,
          ...(name === 'api' ? ['    ports: ["3000:3000"]'] : []),
          '    environment:',
          '      DATABASE_URL: postgres://postgres:5432/jobdesk',
          '      REDIS_URL: redis://redis:6379',
          '    depends_on:',
          '      postgres:',
          '        condition: service_started',
          '      redis:',
          '        condition: service_started',
          '      migrate:',
          '        condition: service_completed_successfully'
        ]),
        ''
      ].join('\n')
    },
    expect: {
      serviceCount: 2,
      resourceCount: 5,
      resources: {
        api: 'web-service',
        worker: 'worker-service',
        mainDatabase: 'relational-database',
        cache: 'redis-cluster',
        databaseBastion: 'bastion'
      },
      dependencyKinds: ['postgres', 'redis'],
      absentDependencyKinds: ['queue'],
      scriptNames: ['migrateDatabase'],
      serviceEnvironment: ['api', 'worker'].flatMap((resource) => [
        { resource, name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { resource, name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" }
      ]),
      resourcePackaging: ['api', 'worker'].map((resource) => ({
        resource,
        type: 'custom-dockerfile',
        buildContextPath: '.',
        dockerfilePath: 'Dockerfile',
        command: ['bun', `apps/${resource}/src/index.ts`]
      })),
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Compose literal migration arguments survive verification and composition',
    files: {
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node server.js' },
        dependencies: { express: '5', pg: '8' }
      }),
      'server.js': 'require("express")().listen(3000);\n',
      'migrate.js': 'console.log(JSON.stringify(process.argv.slice(2)));\n',
      Dockerfile: 'FROM node:24\nWORKDIR /app\nCOPY . .\nEXPOSE 3000\n',
      'compose.yaml': [
        'services:',
        '  migrate:',
        '    build: .',
        '    entrypoint: ["bun"]',
        '    command: ["migrate.js", "--directory", "db migrations", "", "$STP_LITERAL_ARG", "; printf changed"]',
        '  api:',
        '    build: .',
        '    command: ["node", "server.js"]',
        '    ports: ["3000:3000"]',
        '    environment:',
        '      DATABASE_URL: postgres://db:5432/app',
        '    depends_on:',
        '      migrate:',
        '        condition: service_completed_successfully',
        '  db:',
        '    image: postgres:16',
        ''
      ].join('\n')
    },
    expect: {
      serviceCount: 1,
      resourceCount: 3,
      resources: { api: 'web-service', mainDatabase: 'relational-database', databaseBastion: 'bastion' },
      scriptCommands: {
        migrateDatabase: "bun migrate.js --directory 'db migrations' '' '$STP_LITERAL_ARG' '; printf changed'"
      },
      deployable: true,
      raisesQuestionKinds: ['dockerfile-ownership'],
      maxQuestions: 1
    }
  },
  {
    name: 'Laravel Compose web, Horizon, scheduler, MySQL, and Redis',
    directoryName: 'pixelfed',
    files: {
      'composer.json': JSON.stringify({
        name: 'acme/pixelfed',
        require: { 'laravel/framework': '^12', 'ext-pdo_mysql': '*', predis: '^3' }
      }),
      Dockerfile: 'FROM serversideup/php:8.5-frankenphp\nEXPOSE 8080\n',
      'public/index.php': '<?php require __DIR__ . "/../vendor/autoload.php";\n',
      'config/app.php': "<?php return ['key' => env('APP_KEY')];\n",
      'config/database.php': [
        '<?php return [',
        "  'default' => env('DB_CONNECTION', 'mysql'),",
        "  'host' => env('DB_HOST', '127.0.0.1'),",
        "  'port' => env('DB_PORT', '3306'),",
        "  'database' => env('DB_DATABASE', 'app'),",
        "  'username' => env('DB_USERNAME', 'app'),",
        "  'password' => env('DB_PASSWORD', ''),",
        "  'ssl_ca' => env('MYSQL_ATTR_SSL_CA'),",
        "  'redis_host' => env('REDIS_HOST', '127.0.0.1'),",
        "  'redis_password' => env('REDIS_PASSWORD'),",
        "  'redis_port' => env('REDIS_PORT', '6379'),",
        '];',
        ''
      ].join('\n'),
      'config/filesystems.php': [
        '<?php return [',
        "  'default' => env('FILESYSTEM_DISK', 'local'),",
        "  'bucket' => env('AWS_BUCKET'),",
        '];',
        ''
      ].join('\n'),
      'config/cache.php': "<?php return ['default' => env('CACHE_DRIVER', 'file')];\n",
      'config/queue.php': "<?php return ['default' => env('QUEUE_DRIVER', 'sync')];\n",
      '.env.example': [
        'APP_KEY=',
        'DB_CONNECTION=mysql',
        'DB_HOST=127.0.0.1',
        'DB_PORT=3306',
        'DB_DATABASE=pixelfed',
        'DB_USERNAME=pixelfed',
        'DB_PASSWORD=',
        'REDIS_HOST=127.0.0.1',
        'REDIS_PASSWORD=null',
        'REDIS_PORT=6379',
        'FILESYSTEM_DISK=local',
        ''
      ].join('\n'),
      '.env.docker.example': ['CACHE_DRIVER=redis', 'QUEUE_DRIVER=redis', 'ADMIN_PIN=1234', 'OTP_CODE=000000', ''].join(
        '\n'
      ),
      '.env.testing': 'DB_CONNECTION=sqlite\nDB_DATABASE=tests/database.sqlite\n',
      'docker-compose.yml': [
        'services:',
        '  pixelfed:',
        '    build: .',
        '    ports: ["8080:8080"]',
        '    depends_on: [db, redis]',
        '    environment:',
        '      PHP_OPCACHE_ENABLE: "1"',
        '      AUTORUN_ENABLED: "true"',
        '      AUTORUN_LARAVEL_MIGRATION: "true"',
        '      AUTORUN_LARAVEL_MIGRATION_ISOLATION: "true"',
        '      AUTORUN_LARAVEL_STORAGE_LINK: "true"',
        '      AUTORUN_LARAVEL_EVENT_CACHE: "true"',
        '      AUTORUN_LARAVEL_CONFIG_CACHE: "true"',
        '  horizon:',
        '    build: .',
        '    entrypoint: ["php", "artisan"]',
        '    command: ["horizon"]',
        '    depends_on: [db, redis]',
        '    environment:',
        '      AUTORUN_LARAVEL_MIGRATION: "false"',
        '      AUTORUN_LARAVEL_STORAGE_LINK: "true"',
        '  scheduler:',
        '    build: .',
        '    command: ["php", "artisan", "schedule:work"]',
        '    depends_on: [db, redis]',
        '    environment:',
        '      AUTORUN_LARAVEL_MIGRATION: "false"',
        '  db:',
        '    image: mysql:9',
        '  redis:',
        '    image: redis:7',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['mysql', 'redis'],
      absentDependencyKinds: ['object-storage'],
      resources: {
        mainDatabase: 'relational-database',
        cache: 'redis-cluster',
        pixelfed: 'web-service',
        horizon: 'worker-service',
        scheduler: 'worker-service'
      },
      resourcePackaging: [
        { resource: 'pixelfed', type: 'custom-dockerfile', dockerfilePath: 'Dockerfile' },
        {
          resource: 'horizon',
          type: 'custom-dockerfile',
          dockerfilePath: 'Dockerfile',
          command: ['/bin/sh', '-c', 'php artisan horizon']
        },
        {
          resource: 'scheduler',
          type: 'custom-dockerfile',
          dockerfilePath: 'Dockerfile',
          command: ['php', 'artisan', 'schedule:work']
        }
      ],
      serviceProperties: [
        { resource: 'pixelfed', containerPort: 8080, minInstances: 1, maxInstances: 1 },
        { resource: 'horizon', minInstances: 1, maxInstances: 3 },
        { resource: 'scheduler', minInstances: 1, maxInstances: 3 }
      ],
      serviceEnvironment: [
        { resource: 'pixelfed', name: 'APP_KEY', value: "$Secret('eval-pixelfed.generatedAppKey')" },
        { resource: 'horizon', name: 'APP_KEY', value: "$Secret('eval-pixelfed.generatedAppKey')" },
        { resource: 'pixelfed', name: 'DB_HOST', value: "$ResourceParam('mainDatabase', 'host')" },
        { resource: 'pixelfed', name: 'DB_PORT', value: "$ResourceParam('mainDatabase', 'port')" },
        { resource: 'pixelfed', name: 'DB_DATABASE', value: "$ResourceParam('mainDatabase', 'dbName')" },
        { resource: 'pixelfed', name: 'DB_USERNAME', value: 'stacktape' },
        { resource: 'pixelfed', name: 'DB_PASSWORD', value: "$Secret('eval-mainDatabase.password')" },
        { resource: 'pixelfed', name: 'REDIS_HOST', value: "$ResourceParam('cache', 'host')" },
        { resource: 'pixelfed', name: 'REDIS_PASSWORD', value: "$Secret('eval-cache.password')" },
        { resource: 'pixelfed', name: 'REDIS_PORT', value: "$ResourceParam('cache', 'port')" },
        { resource: 'pixelfed', name: 'PHP_OPCACHE_ENABLE', value: '1' },
        { resource: 'pixelfed', name: 'AUTORUN_LARAVEL_EVENT_CACHE', value: 'true' },
        { resource: 'horizon', name: 'AUTORUN_LARAVEL_MIGRATION', value: 'false' },
        { resource: 'pixelfed', name: 'CACHE_DRIVER', value: 'redis' },
        { resource: 'pixelfed', name: 'QUEUE_DRIVER', value: 'redis' },
        { resource: 'horizon', name: 'CACHE_DRIVER', value: 'redis' },
        { resource: 'horizon', name: 'QUEUE_DRIVER', value: 'redis' },
        { resource: 'scheduler', name: 'CACHE_DRIVER', value: 'redis' },
        { resource: 'scheduler', name: 'QUEUE_DRIVER', value: 'redis' }
      ],
      absentServiceEnvironment: [
        { resource: 'pixelfed', name: 'DB_CONNECTION' },
        { resource: 'pixelfed', name: 'AWS_BUCKET' },
        { resource: 'pixelfed', name: 'MYSQL_ATTR_SSL_CA' },
        { resource: 'pixelfed', name: 'ADMIN_PIN' },
        { resource: 'pixelfed', name: 'OTP_CODE' },
        { resource: 'horizon', name: 'ADMIN_PIN' },
        { resource: 'horizon', name: 'OTP_CODE' }
      ],
      requiredGapPatterns: ['database migrations during service startup', 'media.*ephemeral|ephemeral.*media'],
      forbiddenGapPatterns: ['does not read a configurable address'],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Release Compose overrides infra-only Compose with parameterized server binaries',
    files: {
      'go.mod': 'module example.com/platform\n\ngo 1.26\n',
      '.github/workflows/release.yml':
        'steps:\n  - run: docker build -f ./build/package/servers.dockerfile . --build-arg SERVER_TARGET=api\n',
      'docker-compose.yml': [
        'services:',
        '  postgres:',
        '    image: postgres:15.6',
        '  rabbitmq:',
        '    image: rabbitmq:3-management',
        '  nats:',
        '    image: nats:2',
        ''
      ].join('\n'),
      'docker-compose.release.yml': [
        'services:',
        '  platform-migrate:',
        '    image: ghcr.io/acme/platform-migrate:${LATEST_TAG}',
        '    environment:',
        '      DATABASE_URL: postgresql://postgres:5432/app',
        '  platform-admin:',
        '    image: ghcr.io/acme/platform-admin:${LATEST_TAG}',
        '    environment:',
        '      DATABASE_URL: postgresql://postgres:5432/app',
        '      SERVER_MSGQUEUE_KIND: postgres',
        '    volumes: ["./generated:/platform/generated"]',
        '  platform-engine:',
        '    image: ghcr.io/acme/platform-engine:${LATEST_TAG}',
        '    command: /platform/platform-engine --config /platform/generated',
        '    ports: ["7077:7077"]',
        '    environment:',
        '      DATABASE_URL: postgresql://postgres:5432/app',
        '      SERVER_GRPC_PORT: "7077"',
        '      SERVER_MSGQUEUE_KIND: postgres',
        '    volumes: ["./generated:/platform/generated"]',
        '  platform-api:',
        '    image: ghcr.io/acme/platform-api:${LATEST_TAG}',
        '    command: /platform/platform-api --config /platform/generated',
        '    ports: ["8080:8080"]',
        '    environment:',
        '      DATABASE_URL: postgresql://postgres:5432/app',
        '      SERVER_PORT: "8080"',
        '      SERVER_MSGQUEUE_KIND: postgres',
        '      INTERNAL_GRPC_ADDRESS: platform-engine:7077',
        '    volumes: ["./generated:/platform/generated"]',
        ''
      ].join('\n'),
      'build/package/servers.dockerfile': [
        'FROM golang:1.26 AS unused-diagnostic',
        'ARG SERVER_TARGET',
        'COPY /apps ./apps',
        'RUN go build -o /diagnostic ./apps/platform-${SERVER_TARGET}',
        'FROM golang:1.26 AS build',
        'ARG VERSION=v1.0.0',
        'ARG SERVER_TARGET',
        'RUN if [ "$SERVER_TARGET" != "api" ] && [ "$SERVER_TARGET" != "engine" ] && [ "$SERVER_TARGET" != "admin" ] && [ "$SERVER_TARGET" != "migrate" ]; then exit 1; fi',
        'COPY /cmd ./cmd',
        'RUN go build -ldflags="-X main.Version=${VERSION}" -o /bin/platform-${SERVER_TARGET} ./cmd/platform-${SERVER_TARGET}',
        'FROM alpine',
        'ARG SERVER_TARGET=engine',
        'COPY --from=build /bin/platform-${SERVER_TARGET} /platform/',
        'VOLUME /platform/generated',
        'CMD ["/bin/sh", "-c", "/platform/platform-${SERVER_TARGET}"]',
        ''
      ].join('\n'),
      'cmd/platform-api/main.go': 'package main\nfunc main() {}\n',
      'cmd/platform-engine/main.go':
        'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":7077", nil) }\n',
      'apps/platform-engine/main.go':
        'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":9091", nil) }\n',
      'cmd/platform-admin/main.go':
        'package main\nvar root = &cobra.Command{}\nfunc main() { keys := GenerateLocalKeys(); os.WriteFile("generated/master.key", keys, 0600); root.Execute() }\n',
      'cmd/platform-migrate/main.go':
        'package main\n// migrations run through goose\nfunc main() { migrate.RunMigrations() }\n',
      'frontend/dashboard/package.json': JSON.stringify({
        name: 'dashboard',
        private: true,
        scripts: { build: 'vite build' },
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^8.0.0' }
      }),
      'frontend/dashboard/src/main.tsx': 'export const Dashboard = () => <main />;\n',
      'frontend/dashboard/index.html': '<main id="root"></main>\n',
      'frontend/dashboard/vite.config.ts': 'import { defineConfig } from "vite";\nexport default defineConfig({});\n',
      'docs/example/package.json': JSON.stringify({
        name: 'docs-example',
        scripts: { start: 'node index.js' },
        dependencies: { '@aws-sdk/client-s3': '^3.0.0' }
      }),
      'sdks/typescript/package.json': JSON.stringify({
        name: 'typescript-sdk',
        scripts: { start: 'node index.js' },
        dependencies: { '@aws-sdk/client-s3': '^3.0.0' }
      }),
      'hack/dev/package.json': JSON.stringify({
        name: 'dev-helper',
        scripts: { start: 'node index.js' },
        dependencies: { amqplib: '^0.10.0' }
      })
    },
    expect: {
      dependencyKinds: ['postgres'],
      absentDependencyKinds: ['amqp', 'nats', 'object-storage'],
      resources: {
        mainDatabase: 'relational-database',
        databaseBastion: 'bastion',
        dashboard: 'hosting-bucket',
        platformMigrate: 'batch-job',
        platformAdmin: 'batch-job',
        platformEngine: 'worker-service',
        platformApi: 'web-service',
        appsPlatformEngine: 'web-service'
      },
      resourceCount: 8,
      serviceCount: 6,
      scriptNames: ['migrateDatabase'],
      serviceEnvironment: [
        { resource: 'platformApi', name: 'SERVER_MSGQUEUE_KIND', value: 'postgres' },
        { resource: 'platformAdmin', name: 'SERVER_MSGQUEUE_KIND', value: 'postgres' }
      ],
      serviceProperties: [{ resource: 'platformApi', containerPort: 8080 }],
      resourcePackaging: [
        {
          resource: 'platformMigrate',
          type: 'custom-dockerfile',
          dockerfilePath: 'build/package/servers.dockerfile',
          buildArgs: [{ argName: 'SERVER_TARGET', value: 'migrate' }]
        },
        {
          resource: 'platformAdmin',
          type: 'custom-dockerfile',
          dockerfilePath: 'build/package/servers.dockerfile',
          buildArgs: [{ argName: 'SERVER_TARGET', value: 'admin' }]
        },
        {
          resource: 'platformEngine',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          command: ['/platform/platform-engine', '--config', '/platform/generated'],
          dockerfilePath: 'build/package/servers.dockerfile',
          buildArgs: [{ argName: 'SERVER_TARGET', value: 'engine' }]
        },
        {
          resource: 'platformApi',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          command: ['/platform/platform-api', '--config', '/platform/generated'],
          dockerfilePath: 'build/package/servers.dockerfile',
          buildArgs: [{ argName: 'SERVER_TARGET', value: 'api' }]
        }
      ],
      requiredGapPatterns: ['public gRPC/HTTP2 ingress.*7077', 'persistent bootstrap.*keysets'],
      forbiddenGapPatterns: ['RabbitMQ-compatible', 'NATS-compatible'],
      deployable: false,
      maxQuestions: 0
    }
  },
  ...['array', 'string'].map(
    (form): EvalCase => ({
      name: `Published release ${form} command wins over twelve development builds`,
      files: {
        'go.mod': 'module example.com/list-manager\nrequire github.com/labstack/echo/v4 v4.12.0\n',
        'cmd/main.go':
          'package main\nimport "github.com/labstack/echo/v4"\nfunc main() { server := echo.New(); server.Start(":9000") }\n',
        'docker-compose.yml': [
          'services:',
          '  app:',
          '    image: example/list-manager:1.0.0',
          form === 'array'
            ? '    command: ["sh", "-c", "./list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager"]'
            : '    command: sh -c "./list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager"',
          '    ports: ["9000:9000"]',
          ''
        ].join('\n'),
        'dev/app.Dockerfile': 'FROM golang:1.26\nWORKDIR /app\nCOPY . .\n',
        'dev/docker-compose.yml': [
          'services:',
          ...Array.from({ length: 12 }, (_, index) =>
            [
              `  development${index}:`,
              '    build: { context: .., dockerfile: dev/app.Dockerfile }',
              '    command: make run-backend-docker',
              '    ports: ["9000:9000"]'
            ].join('\n')
          ),
          '  db:',
          '    image: postgres:13',
          ''
        ].join('\n')
      },
      expect: {
        resources: { listManager: 'web-service' },
        serviceCount: 1,
        resourceCount: 1,
        absentDependencyKinds: ['postgres'],
        resourcePackaging: [
          {
            resource: 'listManager',
            type: 'prebuilt-image',
            command: [
              'sh',
              '-c',
              './list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager'
            ]
          }
        ],
        requiredGapPatterns: ['fresh database.*does not include changes'],
        deployable: true,
        maxQuestions: 0
      }
    })
  ),
  {
    name: 'Root production Dockerfile with persistent state beside nested browser-test fixtures',
    directoryName: 'vaultwarden',
    files: {
      'Cargo.toml': [
        '[package]',
        'name = "vaultwarden"',
        'version = "1.0.0"',
        '[features]',
        'postgresql = ["diesel/postgres"]',
        '[dependencies]',
        'diesel = "2"',
        'rocket = "0.5"',
        'lettre = "0.11"',
        ''
      ].join('\n'),
      Dockerfile: 'docker/Dockerfile.debian\n',
      'docker/Dockerfile.debian': [
        'FROM debian:13',
        'ARG DB=sqlite,mysql,postgresql',
        'ENV ROCKET_PORT=80',
        'WORKDIR /',
        'VOLUME /data',
        'EXPOSE 80',
        'ENTRYPOINT ["/start.sh"]',
        ''
      ].join('\n'),
      'src/config.rs': [
        'macro_rules! make_config {',
        '  ($name:ident) => { stringify!([<$name:upper>]) };',
        '}',
        'make_config! {',
        '  /// Data folder |> Main data folder',
        '  data_folder: String, false, def, "data".to_owned();',
        '  /// Database URL',
        '  database_url: String, false, auto, |c| format!("sqlite://{}/db.sqlite3", c.data_folder);',
        '  /// Domain URL |> This needs to be set to the URL used to access the server, including http[s]://',
        '  domain: String, true, def, "http://localhost".to_owned();',
        '  /// Enable DB WAL',
        '  enable_db_wal: bool, false, def, true;',
        '}',
        ''
      ].join('\n'),
      'playwright/package.json': JSON.stringify({
        name: 'scenarios',
        dependencies: { mysql2: '3', pg: '8' }
      }),
      'playwright/test.env': 'POSTGRES_USER=test\nMYSQL_USER=test\nSMTP_HOST=127.0.0.1\n',
      'playwright/docker-compose.yml': [
        'services:',
        '  postgres:',
        '    image: postgres:18',
        '  mysql:',
        '    image: mysql:9',
        ''
      ].join('\n'),
      'playwright/compose/keycloak/Dockerfile': 'FROM quay.io/keycloak/keycloak:26\n'
    },
    expect: {
      dependencyKinds: ['email'],
      absentDependencyKinds: ['postgres', 'mysql'],
      assumesKinds: ['sqlite-persistence'],
      maxQuestions: 1,
      resources: {
        mainDatabase: 'relational-database',
        databaseBastion: 'bastion',
        vaultwarden: 'web-service',
        vaultwardenData: 'efs-filesystem'
      },
      resourceCount: 4,
      resourcePackaging: [
        {
          resource: 'vaultwarden',
          type: 'custom-dockerfile',
          command: null,
          buildContextPath: '.',
          dockerfilePath: 'docker/Dockerfile.debian'
        }
      ],
      serviceProperties: [{ resource: 'vaultwarden', containerPort: 80, minInstances: 1, maxInstances: 1 }],
      serviceEnvironment: [
        { resource: 'vaultwarden', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { resource: 'vaultwarden', name: 'DOMAIN', value: "$ResourceParam('vaultwarden', 'url')" }
      ],
      serviceVolumeMounts: [
        { resource: 'vaultwarden', type: 'efs', efsFilesystemName: 'vaultwardenData', mountPath: '/data' }
      ],
      requiredGapPatterns: ['SMTP.*host.*port.*username.*password'],
      forbiddenGapPatterns: ['lost when the runtime restarts'],
      deployable: true
    }
  },
  {
    name: 'Ordinary Compose admin web service sharing uploads with its API',
    files: {
      Dockerfile: 'FROM node:24 AS admin\nCOPY . /app\nFROM node:24 AS api\nCOPY . /app\n',
      'compose.yaml': [
        'services:',
        '  admin:',
        '    build:',
        '      context: .',
        '      target: admin',
        '    command: node admin.js',
        '    ports: ["8080:8080"]',
        '    volumes: ["uploads:/app/uploads"]',
        '  api:',
        '    build:',
        '      context: .',
        '      target: api',
        '    command: node api.js',
        '    ports: ["3000:3000"]',
        '    volumes: ["uploads:/app/uploads"]',
        'volumes:',
        '  uploads:',
        ''
      ].join('\n'),
      'admin.js': 'require("http").createServer(() => {}).listen(8080);\n',
      'apps/admin/maintenance.py': [
        'import click',
        'from pathlib import Path',
        '',
        '@click.command()',
        'def rotate_keys():',
        '    key = GenerateLocalKeys()',
        '    Path("generated/master.key").write_text(key)',
        ''
      ].join('\n'),
      'api.js': 'require("http").createServer(() => {}).listen(3000);\n'
    },
    expect: {
      resources: { admin: 'web-service', api: 'web-service' },
      resourceCount: 2,
      forbiddenGapPatterns: ['persistent bootstrap', 'keysets'],
      deployable: true,
      maxQuestions: 2
    }
  },
  {
    name: 'Django Compose image with custom port, split Postgres settings, and bundled lifecycle',
    directoryName: 'healthchecks',
    files: {
      'pyproject.toml': '[project]\nname = "healthchecks"\ndependencies = ["django", "psycopg[c]"]\n',
      'requirements.txt': 'django\npsycopg[c]\n',
      '.env.example': [
        'DB=postgres',
        'DB_HOST=localhost',
        'DB_PORT=5432',
        'DB_NAME=postgres',
        'DB_USER=postgres',
        'DB_PASSWORD=',
        'DEBUG=False',
        'SECRET_KEY=---',
        'SITE_ROOT=http://localhost:8000',
        'EMAIL_HOST=',
        'S3_BUCKET=',
        'S3_SECRET_KEY=',
        'GITHUB_CLIENT_ID=',
        'GITHUB_CLIENT_SECRET=',
        'METRICS_KEY=',
        ''
      ].join('\n'),
      'hc/settings.py': [
        'import os',
        'def envsecret(name, default=None): return os.getenv(name, default)',
        'DB = os.getenv("DB", "sqlite")',
        'DB_HOST = os.getenv("DB_HOST", "localhost")',
        'DB_PORT = os.getenv("DB_PORT", "5432")',
        'DB_NAME = os.getenv("DB_NAME", "postgres")',
        'DB_USER = os.getenv("DB_USER", "postgres")',
        'DB_PASSWORD = envsecret("DB_PASSWORD", "")',
        'DEBUG = os.getenv("DEBUG", "True")',
        'SECRET_KEY = envsecret("SECRET_KEY", "---")',
        'SITE_ROOT = os.getenv("SITE_ROOT", "http://localhost:8000")',
        'EMAIL_HOST = os.getenv("EMAIL_HOST", "")',
        'S3_BUCKET = os.getenv("S3_BUCKET", "")',
        'S3_SECRET_KEY = envsecret("S3_SECRET_KEY")',
        'GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")',
        'GITHUB_CLIENT_SECRET = envsecret("GITHUB_CLIENT_SECRET")',
        'METRICS_KEY = os.getenv("METRICS_KEY")',
        ''
      ].join('\n'),
      'docker/Dockerfile': [
        'FROM python:3.14-slim',
        'COPY . /opt/healthchecks',
        'WORKDIR /opt/healthchecks',
        'CMD ["uwsgi", "/opt/healthchecks/docker/uwsgi.ini"]',
        ''
      ].join('\n'),
      'docker/uwsgi.ini': [
        '[uwsgi]',
        'http-socket = :8000',
        'hook-pre-app = exec:./manage.py migrate',
        'attach-daemon = ./manage.py sendalerts',
        'attach-daemon = ./manage.py sendreports --loop',
        ''
      ].join('\n'),
      'docker/docker-compose.yml': [
        'services:',
        '  web:',
        '    build:',
        '      context: ..',
        '      dockerfile: docker/Dockerfile',
        '    ports: ["8000:8000"]',
        '    depends_on: [db]',
        '  db:',
        '    image: postgres:17',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres', 'email'],
      absentDependencyKinds: ['object-storage'],
      resources: { healthchecks: 'web-service', mainDatabase: 'relational-database' },
      serviceProperties: [{ resource: 'healthchecks', containerPort: 8000, minInstances: 1, maxInstances: 1 }],
      resourcePackaging: [{ resource: 'healthchecks', type: 'custom-dockerfile', dockerfilePath: 'docker/Dockerfile' }],
      serviceEnvironment: [
        { resource: 'healthchecks', name: 'DB', value: 'postgres' },
        { resource: 'healthchecks', name: 'DB_HOST', value: "$ResourceParam('mainDatabase', 'host')" },
        { resource: 'healthchecks', name: 'DB_PORT', value: "$ResourceParam('mainDatabase', 'port')" },
        { resource: 'healthchecks', name: 'DB_NAME', value: "$ResourceParam('mainDatabase', 'dbName')" },
        { resource: 'healthchecks', name: 'DB_USER', value: 'stacktape' },
        { resource: 'healthchecks', name: 'DB_PASSWORD', value: "$Secret('eval-mainDatabase.password')" },
        { resource: 'healthchecks', name: 'DEBUG', value: 'False' },
        { resource: 'healthchecks', name: 'SECRET_KEY', value: "$Secret('eval-healthchecks.generatedSecretKey')" },
        { resource: 'healthchecks', name: 'SITE_ROOT', value: "$ResourceParam('healthchecks', 'url')" }
      ],
      absentServiceEnvironment: [
        { resource: 'healthchecks', name: 'S3_SECRET_KEY' },
        { resource: 'healthchecks', name: 'GITHUB_CLIENT_ID' },
        { resource: 'healthchecks', name: 'GITHUB_CLIENT_SECRET' },
        { resource: 'healthchecks', name: 'METRICS_KEY' },
        { resource: 'healthchecks', name: 'EMAIL_HOST' }
      ],
      requiredGapPatterns: ['SMTP.*host.*port.*username.*password', 'keeps it at one instance'],
      forbiddenGapPatterns: ['does not read a configurable address', 'EMAIL_HOST points at'],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Procfile web and worker sharing one application Dockerfile',
    files: {
      'package.json': JSON.stringify({
        name: 'support',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^5.0.0' }
      }),
      Procfile: ['web: node server.js', 'worker: node worker.js'].join('\n'),
      Dockerfile: [
        'FROM node:24-alpine',
        'RUN apk add --no-cache imagemagick',
        'COPY . /app',
        'WORKDIR /app',
        'CMD ["node", "server.js"]'
      ].join('\n'),
      'server.js': 'require("express")().listen(process.env.PORT || 3000);',
      'worker.js': 'setInterval(() => undefined, 1000);'
    },
    expect: {
      resources: { support: 'web-service', worker: 'worker-service' },
      resourcePackaging: [
        { resource: 'support', type: 'custom-dockerfile', command: ['/bin/sh', '-c', 'node server.js'] },
        { resource: 'worker', type: 'custom-dockerfile', command: ['/bin/sh', '-c', 'node worker.js'] }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Compose root context with nested ASP.NET API and worker Dockerfiles',
    files: {
      'Directory.Build.props': '<Project></Project>\n',
      'src/Orders.Api/Orders.Api.csproj': [
        '<Project Sdk="Microsoft.NET.Sdk.Web">',
        '  <ItemGroup><ProjectReference Include="..\\Orders.Core\\Orders.Core.csproj" /></ItemGroup>',
        '</Project>',
        ''
      ].join('\n'),
      'src/Orders.Worker/Orders.Worker.csproj': [
        '<Project Sdk="Microsoft.NET.Sdk.Worker">',
        '  <ItemGroup><ProjectReference Include="..\\Orders.Core\\Orders.Core.csproj" /></ItemGroup>',
        '</Project>',
        ''
      ].join('\n'),
      'src/Orders.Core/Orders.Core.csproj': '<Project Sdk="Microsoft.NET.Sdk"></Project>\n',
      'src/Orders.Core/StorageCredentials.cs':
        'var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);\n',
      'src/Orders.Core/StorageEndpoint.cs': 'var config = new AmazonS3Config { ServiceURL = options.ServiceUrl };\n',
      'src/Orders.Api/Dockerfile': [
        'FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build',
        'WORKDIR /src',
        'COPY ["Directory.Build.props", "./"]',
        'COPY ["src/Orders.Api/Orders.Api.csproj", "src/Orders.Api/"]',
        'RUN dotnet publish "src/Orders.Api/Orders.Api.csproj" -o /app/publish',
        ''
      ].join('\n'),
      'src/Orders.Worker/Dockerfile': [
        'FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build',
        'WORKDIR /src',
        'COPY ["Directory.Build.props", "./"]',
        'COPY ["src/Orders.Worker/Orders.Worker.csproj", "src/Orders.Worker/"]',
        'RUN dotnet publish "src/Orders.Worker/Orders.Worker.csproj" -o /app/publish',
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  api:',
        '    build:',
        '      context: .',
        '      dockerfile: src/Orders.Api/Dockerfile',
        '    ports: ["8080:8080"]',
        '    depends_on: [minio]',
        '    environment:',
        '      ASPNETCORE_ENVIRONMENT: Production',
        '      Api__DefaultPort: 8080',
        '      Storage__BucketName: ${STORAGE_BUCKET_NAME:-orders}',
        '      Storage__BucketArn: arn:aws:s3:::local-orders',
        '      Storage__Region: us-east-1',
        '      Storage__ServiceUrl: http://minio:9000',
        '      Storage__ForcePathStyle: true',
        '      Storage__AccessKey: local-development-key',
        '      Storage__SecretKey: local-development-secret',
        '  worker:',
        '    build:',
        '      context: .',
        '      dockerfile: src/Orders.Worker/Dockerfile',
        '    depends_on: [minio]',
        '    environment:',
        '      DOTNET_ENVIRONMENT: Production',
        '      Storage__BucketName: ${STORAGE_BUCKET_NAME:-orders}',
        '      Storage__ServiceUrl: http://minio:9000',
        '      Storage__AccessKey: local-development-key',
        '      Storage__SecretKey: local-development-secret',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    },
    expect: {
      serviceCount: 2,
      dependencyKinds: ['object-storage'],
      resources: { OrdersApi: 'web-service', OrdersWorker: 'worker-service', storageBucket: 'bucket' },
      resourceCount: 3,
      resourcePackaging: [
        {
          resource: 'OrdersApi',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          dockerfilePath: 'src/Orders.Api/Dockerfile'
        },
        {
          resource: 'OrdersWorker',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          dockerfilePath: 'src/Orders.Worker/Dockerfile'
        }
      ],
      serviceEnvironment: [
        { resource: 'OrdersApi', name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' },
        { resource: 'OrdersApi', name: 'Api__DefaultPort', value: '8080' },
        {
          resource: 'OrdersApi',
          name: 'Storage__BucketName',
          value: "$ResourceParam('storageBucket', 'name')"
        },
        {
          resource: 'OrdersApi',
          name: 'Storage__BucketArn',
          value: "$ResourceParam('storageBucket', 'arn')"
        },
        { resource: 'OrdersApi', name: 'Storage__ForcePathStyle', value: 'true' },
        { resource: 'OrdersWorker', name: 'DOTNET_ENVIRONMENT', value: 'Production' },
        {
          resource: 'OrdersWorker',
          name: 'Storage__BucketName',
          value: "$ResourceParam('storageBucket', 'name')"
        }
      ],
      absentServiceEnvironment: [
        { resource: 'OrdersApi', name: 'Storage__Region' },
        { resource: 'OrdersApi', name: 'Storage__ServiceUrl' },
        { resource: 'OrdersApi', name: 'Storage__AccessKey' },
        { resource: 'OrdersApi', name: 'Storage__SecretKey' },
        { resource: 'OrdersWorker', name: 'Storage__ServiceUrl' },
        { resource: 'OrdersWorker', name: 'Storage__AccessKey' },
        { resource: 'OrdersWorker', name: 'Storage__SecretKey' }
      ],
      requiredGapPatterns: ['AWS default credential chain and regional endpoint'],
      deployable: false,
      maxQuestions: 0
    }
  },
  {
    name: 'Render web app plus key-value service',
    files: {
      'package.json': JSON.stringify({
        name: 'status-page',
        scripts: { start: 'node build' },
        dependencies: { express: '^5.0.0', ioredis: '^5.0.0' }
      }),
      'render.yaml': [
        'services:',
        '  - type: web',
        '    name: status-page',
        '    env: node',
        '    startCommand: node build',
        '    envVars:',
        '      - key: REDIS_URL',
        '        fromService:',
        '          name: status-cache',
        '          type: keyvalue',
        '          property: connectionString',
        '  - type: keyvalue',
        '    name: status-cache',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['redis'],
      resources: { statusPage: 'web-service', cache: 'redis-cluster' },
      serviceEnvironment: [
        { resource: 'statusPage', name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Next.js build with a separated Prisma deploy step',
    files: {
      'package.json': JSON.stringify(
        {
          name: 'storefront',
          scripts: {
            build: 'prisma generate && prisma db push && next build',
            'build-ci': 'next build',
            start: 'next start'
          },
          dependencies: { next: '^15.0.0', '@prisma/client': '^6.0.0', prisma: '^6.0.0' }
        },
        null,
        2
      ),
      'package-lock.json': '{}',
      'prisma/schema.prisma': ['datasource db {', '  provider = "postgresql"', '  url = env("DATABASE_URL")', '}'].join(
        '\n'
      )
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { storefront: 'nextjs-web', mainDatabase: 'relational-database' },
      scriptNames: ['migrateDatabase'],
      serviceEnvironment: [
        { resource: 'storefront', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Go server with a bundled Vite administration UI',
    files: {
      'go.mod': 'module example.com/notification-server\n',
      'cmd/main.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'var frontendDir = "frontend/dist"',
        'func main() { server := echo.New(); server.Start(":9000") }',
        ''
      ].join('\n'),
      Makefile: [
        'EDITOR_DIR = frontend/editor',
        'EDITOR_DIST = $(EDITOR_DIR)/dist',
        'EDITOR_FINAL = frontend/public/editor',
        'editor:',
        '\tcp -r $(EDITOR_DIST)/* $(EDITOR_FINAL)',
        ''
      ].join('\n'),
      'frontend/package.json': JSON.stringify({
        name: 'notification-server',
        scripts: { build: 'vite build' },
        dependencies: { vue: '^3.0.0' },
        devDependencies: { vite: '^8.0.0' }
      }),
      'frontend/index.html': '<div id="app"></div>',
      'frontend/editor/package.json': JSON.stringify({
        name: '@notification/editor',
        scripts: { build: 'vite build' },
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^8.0.0' }
      }),
      'frontend/editor/index.html': '<div id="editor"></div>'
    },
    expect: {
      resources: { notificationServer: 'web-service' },
      serviceCount: 1,
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Serverless Framework local queue event',
    files: {
      'serverless.yml': [
        'service: jobs',
        'functions:',
        '  worker:',
        '    handler: src/worker.handler',
        '    events:',
        '      - sqs:',
        '          arn: !GetAtt JobsQueue.Arn',
        'resources:',
        '  Resources:',
        '    JobsQueue:',
        '      Type: AWS::SQS::Queue',
        ''
      ].join('\n'),
      'src/worker.ts': 'export const handler = async () => undefined;'
    },
    expect: {
      dependencyKinds: ['queue'],
      resources: { worker: 'function', jobQueue: 'sqs-queue' },
      deployable: true
    }
  },
  {
    name: 'nested AWS SAM queue event',
    files: {
      'apps/jobs/template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Globals:',
        '  Function:',
        '    Runtime: python3.13',
        '    CodeUri: src/',
        'Resources:',
        '  JobsQueue:',
        '    Type: AWS::SQS::Queue',
        '  WorkerFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Handler: worker.handler',
        '      Events:',
        '        Jobs:',
        '          Type: SQS',
        '          Properties:',
        '            Queue: !GetAtt JobsQueue.Arn',
        ''
      ].join('\n'),
      'apps/jobs/src/worker.py': 'def handler(event, context):\n    return None\n'
    },
    expect: {
      dependencyKinds: ['queue'],
      resources: { worker: 'function', jobsQueue: 'sqs-queue' },
      deployable: true
    }
  },
  {
    name: 'SST Ion route and queue subscriber',
    files: {
      'sst.config.ts': [
        'export default $config({',
        '  app() { return { name: "shop", home: "aws" }; },',
        '  async run() {',
        '    const api = new sst.aws.ApiGatewayV2("Api");',
        '    api.route("POST /orders", "src/orders.create");',
        '    const queue = new sst.aws.Queue("Jobs");',
        '    queue.subscribe("src/worker.handler");',
        '  }',
        '});',
        ''
      ].join('\n'),
      'src/orders.ts': 'export const create = async () => ({ statusCode: 201 });',
      'src/worker.ts': 'export const handler = async () => undefined;'
    },
    expect: {
      dependencyKinds: ['queue'],
      resources: { apiOrders: 'function', jobsSubscriber: 'function', jobQueue: 'sqs-queue' },
      deployable: true
    }
  },
  {
    name: 'CDK HTTP API with table wiring',
    files: {
      'cdk.json': '{}',
      'lib/stack.ts': [
        "import * as cdk from 'aws-cdk-lib';",
        "import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';",
        "import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';",
        "import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';",
        "import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';",
        "import * as path from 'node:path';",
        'const table = new dynamodb.Table(this, "Orders");',
        'const handler = new lambdaNodejs.NodejsFunction(this, "Handler", {',
        '  entry: path.join(__dirname, "../src/handler.ts"),',
        '  environment: { TABLE_NAME: table.tableName }',
        '});',
        'const integration = new HttpLambdaIntegration("Integration", handler);',
        'const api = new HttpApi(this, "Api");',
        'api.addRoutes({ path: "/orders", methods: [HttpMethod.GET], integration });',
        ''
      ].join('\n'),
      'src/handler.ts': 'export const handler = async () => ({ statusCode: 200 });'
    },
    expect: {
      dependencyKinds: ['dynamodb'],
      resources: { handler: 'function', mainTable: 'dynamo-db-table' },
      serviceEnvironment: [{ resource: 'handler', name: 'TABLE_NAME', value: "$ResourceParam('mainTable', 'name')" }],
      deployable: true
    }
  },
  {
    name: 'Cloudflare Durable Object worker remains explicitly unsupported',
    files: {
      'package.json': JSON.stringify({
        name: 'durable-chat',
        dependencies: { react: '^19.0.0', partyserver: '^0.0.75' },
        devDependencies: { wrangler: '^4.0.0' },
        scripts: { dev: 'wrangler dev', deploy: 'wrangler deploy' }
      }),
      'wrangler.json': JSON.stringify({
        main: 'src/server/index.ts',
        assets: { directory: './public' },
        durable_objects: { bindings: [{ name: 'CHAT', class_name: 'Chat' }] }
      }),
      'src/server/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    },
    expect: {
      resources: {},
      resourceCount: 0,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['Durable Objects', 'generated no AWS resources']
    }
  },
  {
    name: 'Cloudflare React Router worker does not leave an orphan database or server',
    files: {
      'package.json': JSON.stringify({
        name: 'books',
        dependencies: { react: '^19.0.0', 'react-router': '^7.0.0' },
        devDependencies: { '@react-router/dev': '^7.0.0', postgres: '^3.4.0', wrangler: '^4.0.0' },
        scripts: { build: 'react-router build', start: 'wrangler dev' }
      }),
      'wrangler.jsonc': `{
        "main": "api/index.js",
        "services": [{ "binding": "BOOKS", "service": "books", "entrypoint": "BooksService" }]
      }`,
      'api/index.js': 'export default { fetch() { return new Response("ok"); } };'
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: {},
      resourceCount: 0,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['service bindings', 'generated no AWS resources']
    }
  },
  {
    name: 'Cloudflare Workflow frontend is not emitted without its backend',
    files: {
      'package.json': JSON.stringify({
        name: 'workflow-ui',
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^7.0.0', wrangler: '^4.0.0' },
        scripts: { build: 'vite build', dev: 'vite' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.jsonc': `{
        "main": "worker/index.ts",
        "workflows": [{ "binding": "FLOW", "name": "flow", "class_name": "Flow" }],
        "durable_objects": { "bindings": [{ "name": "STATUS", "class_name": "Status" }] }
      }`,
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    },
    expect: {
      resources: {},
      resourceCount: 0,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['Workflows', 'Durable Objects', 'generated no AWS resources']
    }
  },
  {
    name: 'Cloudflare frontend does not hide a retained sibling API database',
    files: {
      'package.json': JSON.stringify({
        name: 'dashboard',
        private: true,
        workspaces: ['apps/*'],
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^7.0.0', wrangler: '^4.0.0' },
        scripts: { build: 'vite build' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.json': JSON.stringify({ main: 'worker/index.ts', workflows: [{ binding: 'FLOW' }] }),
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };',
      '.env.example': 'DATABASE_URL=postgres://localhost/app\n',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '^5.0.0' },
        scripts: { start: 'node index.js' }
      }),
      'apps/api/index.js':
        'const express = require("express"); console.log(process.env.DATABASE_URL); express().listen(3000);'
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { api: 'web-service', mainDatabase: 'relational-database' },
      serviceEnvironment: [
        { resource: 'api', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['only for the platform-neutral parts']
    }
  },
  {
    name: 'Terraform literal variables plus a declared database',
    files: {
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node src/server.js' },
        dependencies: { express: '^5.0.0', pg: '^8.0.0' }
      }),
      'src/server.js': 'const url = process.env.DATABASE_URL;\n',
      'infra/variables.tf': 'variable "engine" {\n  default = "postgres"\n}\n',
      'infra/main.tf': [
        'provider "aws" {}',
        'resource "aws_db_instance" "main" {',
        '  engine = var.engine',
        '  instance_class = "db.t4g.small"',
        '}',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { api: 'web-service', mainDatabase: 'relational-database' },
      serviceEnvironment: [
        { resource: 'api', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: true
    }
  },
  {
    name: 'TanStack Start SSR web app',
    files: {
      'package.json': JSON.stringify({
        name: 'tanstack-start-app',
        type: 'module',
        scripts: { build: 'vite build', start: 'node .output/server/index.mjs' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          '@tanstack/react-router': '^1.170.32',
          react: '^19.0.0',
          'react-dom': '^19.0.0'
        },
        devDependencies: {
          '@vitejs/plugin-react': '^6.0.1',
          nitro: '^3.0.260311-beta',
          vite: '^8.0.14'
        }
      }),
      'vite.config.ts': [
        "import { defineConfig } from 'vite';",
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        "import viteReact from '@vitejs/plugin-react';",
        "import { nitro } from 'nitro/vite';",
        '',
        'export default defineConfig({',
        '  plugins: [tanstackStart(), viteReact(), nitro()]',
        '});'
      ].join('\n'),
      'src/routes/__root.tsx': [
        "import { Outlet, createRootRoute } from '@tanstack/react-router';",
        '',
        'export const Route = createRootRoute({',
        '  component: () => <Outlet />',
        '});'
      ].join('\n'),
      'src/routes/index.tsx': [
        "import { createFileRoute } from '@tanstack/react-router';",
        '',
        'export const Route = createFileRoute("/")({',
        '  component: () => <h1>Hello TanStack Start</h1>',
        '});'
      ].join('\n'),
      'src/router.tsx': [
        "import { createRouter } from '@tanstack/react-router';",
        "import { routeTree } from './routeTree.gen';",
        '',
        'export function getRouter() {',
        '  return createRouter({ routeTree });',
        '}'
      ].join('\n'),
      'src/routeTree.gen.ts': 'export const routeTree = {};\n'
    },
    expect: {
      resources: { tanstackStartApp: 'tanstack-web' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'TanStack Start Rsbuild SSR web app',
    files: {
      'package.json': JSON.stringify({
        name: 'tanstack-rsbuild-app',
        type: 'module',
        scripts: { build: 'rsbuild build', start: 'node ./dist/server/index.js' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          '@tanstack/react-router': '^1.170.32',
          react: '^19.0.0',
          'react-dom': '^19.0.0'
        },
        devDependencies: { '@rsbuild/core': '^1.5.0' }
      }),
      'rsbuild.config.ts': [
        "import * as startPlugin from '@tanstack/react-start/plugin/rsbuild';",
        'export default { plugins: [startPlugin.tanstackStart()] };'
      ].join('\n'),
      'src/routes/index.tsx': 'export const Route = {};'
    },
    expect: {
      resources: { tanstackRsbuildApp: 'tanstack-web' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'NuxtHub SQLite and authentication stay review-only without provider bindings',
    files: {
      'package.json': JSON.stringify({
        private: true,
        scripts: { build: 'nuxi build', preview: 'npx nuxthub preview' },
        dependencies: {
          nuxt: '^4.3.0',
          '@nuxthub/core': '^0.10.0',
          'nuxt-auth-utils': '^0.5.0',
          'drizzle-orm': '^0.45.0'
        }
      }),
      'nuxt.config.ts': [
        'export default defineNuxtConfig({',
        "  modules: ['@nuxthub/core', 'nuxt-auth-utils'],",
        "  hub: { db: 'sqlite' }",
        '})',
        ''
      ].join('\n'),
      '.env.example': [
        'NUXT_OAUTH_GITHUB_CLIENT_ID=',
        'NUXT_OAUTH_GITHUB_CLIENT_SECRET=',
        'NUXT_SESSION_PASSWORD=',
        ''
      ].join('\n'),
      'server/api/todos.get.ts': "import { db } from 'hub:db'\nexport default defineEventHandler(() => db.select())\n",
      'server/api/auth/github.get.ts': [
        'export default defineOAuthGitHubEventHandler({',
        '  async onSuccess(event, { user }) {',
        '    await setUserSession(event, { user })',
        '  }',
        '})',
        ''
      ].join('\n'),
      'server/db/migrations/sqlite/0001_todos.sql': 'CREATE TABLE todos (id integer primary key);\n'
    },
    expect: {
      serviceCount: 1,
      resources: { app: 'nuxt-web' },
      absentDependencyKinds: ['sqlite', 'postgres'],
      serviceEnvironment: [
        {
          resource: 'app',
          name: 'NUXT_SESSION_PASSWORD',
          value: "$Secret('eval-app.generatedNuxtSessionPassword')"
        },
        {
          resource: 'app',
          name: 'NUXT_OAUTH_GITHUB_CLIENT_ID',
          value: "$Secret('nuxt_oauth_github_client_id')"
        },
        {
          resource: 'app',
          name: 'NUXT_OAUTH_GITHUB_CLIENT_SECRET',
          value: "$Secret('nuxt_oauth_github_client_secret')"
        }
      ],
      requiredGapPatterns: [
        'local SQLite file.*not durable storage',
        'NuxtHub can apply migrations during the production build.*verify which database',
        'explicit migration command',
        'Stacktape will not move existing data'
      ],
      deployable: false,
      maxQuestions: 0
    }
  },
  {
    name: 'NuxtHub database configuration blocks even when source has only type imports, comments and tests',
    files: {
      'package.json': JSON.stringify({
        name: 'nuxt-control',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/health.ts':
        "import type { db } from 'hub:db'; /* import('hub:db'); */ export default defineEventHandler(() => 'ok')",
      'server/api/health.test.ts': "import { db } from 'hub:db'; db.select()"
    },
    expect: {
      serviceCount: 1,
      resources: { nuxtControl: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['configuration declares a NuxtHub database.*not ready to deploy'],
      forbiddenGapPatterns: ['includes NuxtHub database migrations', 'uses NuxtHub storage']
    }
  },
  {
    name: 'NuxtHub database configuration alone requires production storage review without queries or migrations',
    files: {
      'package.json': JSON.stringify({
        name: 'declared-db',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'app/app.vue': '<template><p>Hello</p></template>'
    },
    expect: {
      serviceCount: 1,
      resources: { declaredDb: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: [
        'configuration declares a NuxtHub database.*not ready to deploy',
        'local SQLite file.*not durable storage'
      ],
      forbiddenGapPatterns: ['includes NuxtHub database migrations', 'uses NuxtHub storage']
    }
  },
  {
    name: 'NuxtHub static template imports are runtime database usage',
    files: {
      'package.json': JSON.stringify({
        name: 'lazy-db',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/items.ts': 'export default defineEventHandler(async () => (await import(`hub:db`)).db.select())'
    },
    expect: {
      serviceCount: 1,
      resources: { lazyDb: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: ['hosted SQLite provider.*Turso/libSQL']
    }
  },
  {
    name: 'NuxtHub blob auto-import gives object-storage advice without database advice',
    files: {
      'package.json': JSON.stringify({
        name: 'uploads',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { blob: true } })",
      'server/api/files.ts': 'export default defineEventHandler(() => blob.list())'
    },
    expect: {
      serviceCount: 1,
      resources: { uploads: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['uploaded files.*object-storage provider.*S3'],
      forbiddenGapPatterns: ['database', 'SQLite', 'Turso', 'libSQL']
    }
  },
  {
    name: 'NuxtHub KV and Nitro cache APIs retain their separate runtime requirements',
    files: {
      'package.json': JSON.stringify({
        name: 'cached-store',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { kv: true, cache: true } })",
      'server/api/items.ts': "export default defineCachedEventHandler(() => kv.getItem('items'))"
    },
    expect: {
      serviceCount: 1,
      resources: { cachedStore: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['key-value data.*hosted Redis', 'Nitro cache storage provider.*temporary cache'],
      forbiddenGapPatterns: ['database', 'Turso', 'hub:cache']
    }
  },
  {
    name: 'NuxtHub object database config preserves custom migration paths',
    files: {
      'package.json': JSON.stringify({
        name: 'custom-migrations',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: { dialect: 'sqlite', migrationsDirs: ['database/changes'] } } })",
      'server/api/items.ts': 'export default defineEventHandler(() => db.select().from(schema.items))',
      'database/changes/0001_items.sql': 'CREATE TABLE items (id integer primary key);'
    },
    expect: {
      serviceCount: 1,
      resources: { customMigrations: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: [
        'local SQLite file.*not durable',
        'database/changes/0001_items.sql.*production build.*verify which database'
      ]
    }
  },
  {
    name: 'NuxtHub computed migration directories keep the import review-only',
    files: {
      'package.json': JSON.stringify({
        name: 'dynamic-migrations',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: { dialect: 'sqlite', migrationsDirs: getMigrationPaths() } } })",
      'server/api/health.ts': "export default defineEventHandler(() => 'ok')"
    },
    expect: {
      serviceCount: 1,
      resources: { dynamicMigrations: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: [
        'migration directories are computed.*not safe project-relative paths',
        'does not prove the app is ready'
      ]
    }
  },
  {
    name: 'NuxtHub truncated source analysis cannot approve an unchecked runtime binding',
    files: {
      'package.json': JSON.stringify({
        name: 'large-nuxt',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      ...Object.fromEntries(
        Array.from({ length: 400 }, (_, index) => [
          `server/api/a${String(index).padStart(4, '0')}.ts`,
          'export default () => 1'
        ])
      ),
      'server/api/zzzz-items.ts': 'export default defineEventHandler(() => db.select())'
    },
    expect: {
      serviceCount: 1,
      resources: { largeNuxt: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['exceeds the bounded source scan', 'does not prove the app is ready']
    }
  },
  {
    name: 'Plain Nuxt 4 app remains a simple deployable control',
    files: {
      'package.json': JSON.stringify({
        name: 'nuxt-app',
        private: true,
        scripts: { build: 'nuxt build', preview: 'nuxt preview' },
        dependencies: { nuxt: '^4.5.0' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ compatibilityDate: '2025-07-15' })\n",
      'app/app.vue': '<template><p>Hello</p></template>\n'
    },
    expect: {
      serviceCount: 1,
      resources: { nuxtApp: 'nuxt-web' },
      resourceCount: 1,
      deployable: true,
      maxQuestions: 0,
      forbiddenGapPatterns: ['NuxtHub', 'SQLite', 'migration']
    }
  },
  {
    name: 'NuxtHub build-time migrations block without a runtime database import',
    files: {
      'package.json': JSON.stringify({
        name: 'migration-only',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/health.ts': "export default defineEventHandler(() => 'ok')",
      'server/db/migrations/sqlite/0001_setup.sql': 'CREATE TABLE items (id integer primary key);'
    },
    expect: {
      serviceCount: 1,
      resources: { migrationOnly: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: ['server/db/migrations/sqlite/0001_setup.sql.*production build.*verify which database']
    }
  },
  {
    name: 'NuxtHub migration-directory hooks cannot silently hide committed migrations',
    files: {
      'package.json': JSON.stringify({
        name: 'hook-migrations',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' }, hooks: { 'hub:db:migrations:dirs': dirs => dirs.push('database/changes') } })",
      'server/api/health.ts': "export default defineEventHandler(() => 'ok')",
      'database/changes/0001_setup.sql': 'CREATE TABLE items (id integer primary key);'
    },
    expect: {
      serviceCount: 1,
      resources: { hookMigrations: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: ['migration directories.*changed by a hook']
    }
  },
  {
    name: 'NuxtHub namespace auto-imports retain the production storage requirement',
    files: {
      'package.json': JSON.stringify({
        name: 'namespaced-db',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/items.ts':
        "import * as framework from '#imports'; export default defineEventHandler(() => framework.db.select())"
    },
    expect: {
      serviceCount: 1,
      resources: { namespacedDb: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: ['local SQLite file.*not durable storage']
    }
  },
  {
    name: 'NuxtHub wrapped dynamic imports remain detected without adjacent comment evidence',
    files: {
      'package.json': JSON.stringify({
        name: 'wrapped-db',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/items.ts':
        "export default defineEventHandler(async () => (await import(('hub:db' /* SENTINEL_SOURCE_CREDENTIAL */))).db.select())"
    },
    expect: {
      serviceCount: 1,
      resources: { wrappedDb: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: ['local SQLite file.*not durable storage'],
      forbiddenGapPatterns: ['SENTINEL_']
    }
  },
  {
    name: 'NuxtHub auto-loaded module migration hooks cannot bypass lifecycle review',
    files: {
      'package.json': JSON.stringify({
        name: 'module-migrations',
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.6' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'modules/auth/index.ts':
        "import { createResolver, defineNuxtModule } from '@nuxt/kit'; export default defineNuxtModule({ setup(options, nuxt) { const { resolve } = createResolver(import.meta.url); nuxt.hook('hub:db:migrations:dirs', dirs => dirs.push(resolve('./auth-migrations'))) } })",
      'modules/auth/auth-migrations/0001_users.sql': 'CREATE TABLE users (id integer primary key);',
      'server/api/health.ts': "export default defineEventHandler(() => 'ok')"
    },
    expect: {
      serviceCount: 1,
      resources: { moduleMigrations: 'nuxt-web' },
      resourceCount: 1,
      deployable: false,
      maxQuestions: 0,
      absentDependencyKinds: ['sqlite', 'postgres'],
      requiredGapPatterns: ['migration directories.*changed by a hook']
    }
  }
];

describe('importer synthetic end-to-end corpus', () => {
  for (const evalCase of CASES) {
    it(evalCase.name, async () => {
      const score = await runEvalCase(evalCase);
      if (!score.passed) {
        throw new Error(score.failures.map((failure) => `[${failure.stage}] ${failure.detail}`).join('\n'));
      }
      expect(score.passed).toBe(true);
    });
  }
});
