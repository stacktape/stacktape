/**
 * The compose file is the dependency list somebody already wrote down.
 *
 * These tests exist mostly to protect two properties that are easy to lose: that a stated engine
 * version reaches the composed database, and that reading a compose file never lets a laptop's
 * container speak for where production data lives.
 */

import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { dockerComposeProbe, isThirdPartyUtilityDockerfile } from './docker-compose';
import { dockerfileProbe } from './dockerfile';
import { environmentProbe } from './environment';
import { languageManifestProbe } from './language-manifests';
import { manifestProbe } from './manifest';
import { procfileProbe } from './procfile';
import { serverEntrypointProbe } from './server-entrypoint';

const PROBES = [manifestProbe, dockerComposeProbe, environmentProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-compose-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

const APP_MANIFEST = JSON.stringify({
  name: 'api',
  scripts: { start: 'node index.js' }
});

const nodeStorageRepo = (source: string): Record<string, string> => ({
  'package.json': JSON.stringify({
    name: 'uploads',
    scripts: { start: 'node server.js' },
    dependencies: { '@aws-sdk/client-s3': '3.895.0', express: '5' }
  }),
  'server.js': source,
  'compose.yaml': [
    'services:',
    '  uploads:',
    '    build: .',
    '    ports: ["3000:3000"]',
    '    depends_on: [minio]',
    '    environment:',
    '      S3_BUCKET: uploads',
    '      S3_ENDPOINT: http://minio:9000',
    '      S3_ACCESS_KEY_ID: local-access',
    '      S3_SECRET_ACCESS_KEY: local-secret',
    '  minio:',
    '    image: minio/minio:latest',
    ''
  ].join('\n')
});

const NODE_S3_IMPORT_FORMS = [
  ['ES named import', 'import { S3Client } from "@aws-sdk/client-s3";', 'S3Client'],
  ['ES aliased import', 'import { S3Client, S3Client as ActualClient } from "@aws-sdk/client-s3";', 'ActualClient'],
  [
    'ES namespace import',
    'import { S3Client } from "@aws-sdk/client-s3";\nimport * as storage from "@aws-sdk/client-s3";',
    'storage.S3Client'
  ],
  ['CommonJS destructured import', 'const { S3Client } = require("@aws-sdk/client-s3");', 'S3Client'],
  [
    'CommonJS destructured alias',
    'const { S3Client } = require("@aws-sdk/client-s3");\nconst { S3Client: ActualClient } = require("@aws-sdk/client-s3");',
    'ActualClient'
  ],
  [
    'CommonJS namespace import',
    'const { S3Client } = require("@aws-sdk/client-s3");\nconst storage = require("@aws-sdk/client-s3");',
    'storage.S3Client'
  ],
  [
    'CommonJS member import',
    'const { S3Client } = require("@aws-sdk/client-s3");\nconst ActualClient = require("@aws-sdk/client-s3").S3Client;',
    'ActualClient'
  ],
  [
    'CommonJS literal member import',
    'const { S3Client } = require("@aws-sdk/client-s3");\nconst ActualClient = require("@aws-sdk/client-s3")["S3Client"];',
    'ActualClient'
  ],
  [
    'simple constructor assignment',
    'const { S3Client } = require("@aws-sdk/client-s3");\nconst ActualClient = S3Client;',
    'ActualClient'
  ],
  [
    'semicolon-free alias chain',
    'const { S3Client } = require("@aws-sdk/client-s3")\nconst FirstClient = S3Client\nconst ActualClient = FirstClient',
    'ActualClient'
  ],
  [
    'later constructor assignment',
    'const { S3Client } = require("@aws-sdk/client-s3");\nlet ActualClient;\nActualClient = S3Client;',
    'ActualClient'
  ],
  [
    'namespace assignment and destructuring',
    [
      'const { S3Client } = require("@aws-sdk/client-s3");',
      'const storage = require("@aws-sdk/client-s3");',
      'const namespaceAlias = storage;',
      'const { S3Client: ActualClient } = namespaceAlias;'
    ].join('\n'),
    'ActualClient'
  ]
];

const cSharpStorageRepo = (source: string): Record<string, string> => ({
  'src/Api/Api.csproj': [
    '<Project Sdk="Microsoft.NET.Sdk.Web">',
    '  <ItemGroup><PackageReference Include="AWSSDK.S3" Version="3.7.0" /></ItemGroup>',
    '</Project>',
    ''
  ].join('\n'),
  'src/Api/StorageClient.cs': source,
  'compose.yaml': [
    'services:',
    '  api:',
    '    build: src/Api',
    '    ports: ["8080:8080"]',
    '    depends_on: [minio]',
    '    environment:',
    '      Storage__BucketName: uploads',
    '      Storage__ServiceUrl: http://minio:9000',
    '      Storage__AccessKey: local-access',
    '      Storage__SecretKey: local-secret',
    '  minio:',
    '    image: minio/minio:latest',
    ''
  ].join('\n')
});

const buildFacts = (
  services: ReadonlyArray<{
    name: string;
    path: string;
    buildRoot?: string | undefined;
    dockerfile?: string | undefined;
    startCommand?: string | undefined;
  }>
) =>
  services.map(({ name, path, buildRoot, dockerfile, startCommand }) => ({
    name,
    path,
    buildRoot,
    dockerfile,
    startCommand
  }));

describe('the compose probe', () => {
  it('recognizes only context-free single-tool Dockerfiles as local utilities', () => {
    expect(
      isThirdPartyUtilityDockerfile(['FROM node:24-alpine', 'RUN npm i -g maildev@2.0.5', 'CMD maildev'].join('\n'))
    ).toBe(true);
    expect(
      isThirdPartyUtilityDockerfile(
        ['FROM node:24-alpine', 'RUN npm i -g maildev@2.0.5', 'COPY config.json /app/', 'CMD maildev'].join('\n')
      )
    ).toBe(false);
    expect(isThirdPartyUtilityDockerfile(['FROM node:24-alpine', 'RUN npm i -g .', 'CMD app'].join('\n'))).toBe(false);
  });

  it('reads the dependency list, with the version the file states', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'docker-compose.yml': [
        'services:',
        '  app:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '  db:',
        '    image: postgres:15.4-alpine',
        '  cache:',
        '    image: redis:7',
        '  search:',
        '    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const byKind = Object.fromEntries(facts.dependencies.map((entry) => [entry.kind, entry]));

    expect(Object.keys(byKind).toSorted()).toEqual(['postgres', 'redis', 'search']);
    // The whole point of reading the file: 15 rather than whatever our default happens to be.
    expect(byKind.postgres?.engineVersion).toBe('15.4');
    expect(byKind.postgres?.evidence[0]?.quote).toContain('postgres:15.4-alpine');
    // `build: .` is the user's own application, not a backing service.
    expect(facts.dependencies.some((entry) => entry.name === 'app')).toBe(false);
  });

  it('recognizes a NATS broker and wires its consumer by protocol, without inventing SQS', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM node:24\n',
      'docker-compose.yml': [
        'services:',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    depends_on: [broker]',
        '    environment:',
        '      NATS_URL: nats://broker:4222',
        '  broker:',
        '    image: nats:2.10-alpine',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe]
    });

    expect(facts.dependencies).toHaveLength(1);
    expect(facts.dependencies[0]).toMatchObject({
      kind: 'nats',
      consumedBy: ['api'],
      addressedBy: ['NATS_URL']
    });
    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({
        name: 'NATS_URL',
        role: 'infra-dependency',
        dependencyName: 'eventBroker'
      })
    );
  });

  it('treats a Traefik backend port label as the service HTTP listener', async () => {
    root = await makeRepo({
      'backend/Dockerfile': 'FROM python:3.13\n',
      'compose.yml': [
        'services:',
        '  backend:',
        '    build:',
        '      context: .',
        '      dockerfile: backend/Dockerfile',
        '    labels:',
        '      - traefik.http.services.backend.loadbalancer.server.port=8000',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe]
    });

    expect(facts.services[0]).toMatchObject({
      name: 'backend',
      exposesHttp: true,
      port: 8000
    });
  });

  it('does not deploy an anchor image explicitly built for development beside Procfile production processes', async () => {
    root = await makeRepo({
      Gemfile: 'gem "rails"\ngem "sidekiq"\n',
      Procfile: 'web: bundle exec rails server\nworker: bundle exec sidekiq\n',
      'docker/Dockerfile': 'FROM ruby:3.4\n',
      'docker-compose.yml': [
        'services:',
        '  base:',
        '    image: application:development',
        '    build:',
        '      context: .',
        '      dockerfile: docker/Dockerfile',
        '      args:',
        '        RAILS_ENV: development',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, procfileProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.some((service) => service.name === 'base')).toBe(false);
    expect(facts.services.filter((service) => service.exposesHttp)).toHaveLength(1);
    expect(facts.services.find((service) => service.name === 'worker')).toMatchObject({ exposesHttp: false });
  });

  it('settles Postgres-or-MySQL, so nothing has to ask', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      // `DATABASE_URL` with no scheme is the case that otherwise becomes the pipeline's one
      // genuinely unanswerable question.
      '.env': 'DATABASE_URL=\n',
      'docker-compose.yml': 'services:\n  db:\n    image: mysql:8\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies.map((entry) => entry.kind)).toEqual(['mysql']);
    expect(facts.uncertainties.filter((entry) => entry.kind === 'database-engine-ambiguous')).toHaveLength(0);
  });

  it('never lets a local container claim to be the live database', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      '.env': 'DATABASE_URL=postgres://<DATABASE_USER>:<DATABASE_PASSWORD>@db.abcdefg.supabase.co:5432/postgres\n',
      'docker-compose.yml': 'services:\n  db:\n    image: postgres:16\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // The compose file describes a laptop. The `.env` file describes production, and only it may
    // decide that there is a live database we must not replace.
    expect(facts.dependencies[0]?.currentlyHostedOn).toBe('supabase');
    expect(facts.dependencies[0]?.engineVersion).toBe('16');
  });

  it('does not invent a dependency from somebody else’s fork of an image', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'docker-compose.yml': 'services:\n  thing:\n    image: ghcr.io/acme/redis:7\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies).toHaveLength(0);
  });

  it('says nothing at all about a compose file it cannot parse', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'docker-compose.yml': 'services:\n  db:\n  image: [unbalanced\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies).toHaveLength(0);
  });

  it('imports built web and worker processes with ports, commands, wiring, and no environment values', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'orders',
        dependencies: { express: '^5.0.0' }
      }),
      Dockerfile: 'FROM node:24\n',
      'docker-compose.yml': [
        'services:',
        '  web:',
        '    build:',
        '      context: .',
        '      dockerfile: Dockerfile',
        '    command: node dist/server.js',
        '    ports:',
        '      - target: 4000',
        '        published: 8080',
        '    depends_on:',
        '      db:',
        '        condition: service_healthy',
        '    environment:',
        '      DATABASE_URL: postgres://db:5432/orders',
        '      NODE_ENV: production',
        '      STRIPE_SECRET_KEY: should-never-appear',
        '  worker:',
        '    build: .',
        '    command: node dist/worker.js',
        '    depends_on: [db]',
        '  db:',
        '    image: postgres:16',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const web = facts.services.find((entry) => entry.name === 'web');
    const worker = facts.services.find((entry) => entry.name === 'worker');

    expect(facts.services).toHaveLength(2);
    expect(web).toMatchObject({
      port: 4000,
      startCommand: 'node dist/server.js',
      dockerfile: 'Dockerfile'
    });
    expect(worker).toMatchObject({
      exposesHttp: false,
      startCommand: 'node dist/worker.js'
    });
    expect(facts.dependencies[0]).toMatchObject({
      kind: 'postgres',
      consumedBy: ['web', 'worker'],
      addressedBy: ['DATABASE_URL']
    });
    expect(web?.environmentVariables.find((entry) => entry.name === 'DATABASE_URL')).toMatchObject({
      role: 'infra-dependency',
      dependencyName: 'mainDatabase'
    });
    expect(web?.environmentVariables.find((entry) => entry.name === 'NODE_ENV')).toBeUndefined();
    expect(JSON.stringify(facts)).not.toContain('should-never-appear');
  });

  it('canonicalizes an explicit Dockerfile for every Compose process without changing its build context', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-compose-dockerfile-equivalence-'));
    const materializedRoot = join(root, 'materialized');
    const linkedRoot = join(root, 'linked');
    const compose = [
      'services:',
      '  web:',
      '    build:',
      '      context: .',
      '      dockerfile: Dockerfile',
      '    command: node server.js',
      '    ports: ["8080:8080"]',
      '  worker:',
      '    build:',
      '      context: .',
      '      dockerfile: Dockerfile',
      '    command: node worker.js',
      ''
    ].join('\n');
    await Promise.all(
      [materializedRoot, linkedRoot].map(async (repositoryRoot) => {
        await mkdir(join(repositoryRoot, 'docker'), { recursive: true });
        await Promise.all([
          writeFile(join(repositoryRoot, 'compose.yml'), compose, 'utf8'),
          writeFile(join(repositoryRoot, 'docker/Dockerfile.production'), 'FROM node:24\nEXPOSE 8080\n', 'utf8')
        ]);
      })
    );
    await writeFile(join(materializedRoot, 'Dockerfile'), 'docker/Dockerfile.production\n', 'utf8');
    await symlink('docker/Dockerfile.production', join(linkedRoot, 'Dockerfile'), 'file');

    const [materialized, linked] = await Promise.all([
      assembleCandidateFacts({ root: materializedRoot, probes: [dockerComposeProbe] }),
      assembleCandidateFacts({ root: linkedRoot, probes: [dockerComposeProbe] })
    ]);
    expect(buildFacts(linked.facts.services)).toEqual(buildFacts(materialized.facts.services));
    expect(buildFacts(linked.facts.services)).toEqual([
      {
        name: 'web',
        path: '.',
        buildRoot: '.',
        dockerfile: 'docker/Dockerfile.production',
        startCommand: 'node server.js'
      },
      {
        name: 'worker',
        path: '.',
        buildRoot: '.',
        dockerfile: 'docker/Dockerfile.production',
        startCommand: 'node worker.js'
      }
    ]);
  });

  it('wires split Compose addresses and retains only allow-listed operational defaults', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM node:24\n',
      'docker-compose.yml': [
        'services:',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    depends_on: [postgres, redis]',
        '    environment:',
        '      POSTGRES_HOST: ${POSTGRES_HOST:-postgres}',
        '      POSTGRES_PORT: ${POSTGRES_PORT:-5432}',
        '      POSTGRES_DB: ${POSTGRES_DB:-orders}',
        '      REDIS_HOST: ${REDIS_HOST:-redis}',
        '      REDIS_PORT: ${REDIS_PORT:-6379}',
        '      LOG_LEVEL: ${LOG_LEVEL:-info}',
        '      ASPNETCORE_ENVIRONMENT: Production',
        '      ASPNETCORE_HTTP_PORTS: 8087',
        '      Api__DefaultPort: 8087',
        '      Worker__PollingIntervalMs: 1000',
        '      Worker__LockDurationSeconds: 60',
        '      Worker__MaxAttempts: 3',
        '      Storage__ForcePathStyle: true',
        '      Storage__AccessKey: public-looking-but-still-secret',
        '      OPAQUE_SETTING: do-not-retain-this-value',
        '  postgres:',
        '    image: postgres:16',
        '  redis:',
        '    image: redis:7',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe]
    });
    const service = facts.services[0]!;
    const byName = Object.fromEntries(service.environmentVariables.map((variable) => [variable.name, variable]));

    expect(byName.POSTGRES_HOST).toMatchObject({
      role: 'infra-dependency',
      dependencyName: 'mainDatabase'
    });
    expect(byName.POSTGRES_PORT).toMatchObject({
      role: 'infra-dependency',
      dependencyName: 'mainDatabase'
    });
    expect(byName.REDIS_HOST).toMatchObject({
      role: 'infra-dependency',
      dependencyName: 'cache'
    });
    expect(byName.LOG_LEVEL).toMatchObject({
      role: 'runtime-config',
      safeLiteralValue: 'info'
    });
    expect(byName.ASPNETCORE_ENVIRONMENT?.safeLiteralValue).toBe('Production');
    expect(byName.ASPNETCORE_HTTP_PORTS?.safeLiteralValue).toBe('8087');
    expect(byName.Api__DefaultPort?.safeLiteralValue).toBe('8087');
    expect(byName.Worker__PollingIntervalMs?.safeLiteralValue).toBe('1000');
    expect(byName.Worker__LockDurationSeconds?.safeLiteralValue).toBe('60');
    expect(byName.Worker__MaxAttempts?.safeLiteralValue).toBe('3');
    expect(byName.Storage__ForcePathStyle?.safeLiteralValue).toBe('true');
    expect(byName.Storage__AccessKey).toMatchObject({ role: 'third-party-secret' });
    expect(byName.Storage__AccessKey?.safeLiteralValue).toBeUndefined();
    expect(byName.OPAQUE_SETTING).toMatchObject({
      role: 'runtime-config',
      hasDeclaredValue: true
    });
    expect(byName.OPAQUE_SETTING?.safeLiteralValue).toBeUndefined();
    expect(JSON.stringify(facts)).not.toContain('do-not-retain-this-value');
    expect(JSON.stringify(facts)).not.toContain('public-looking-but-still-secret');
  });

  it('preserves Laravel process commands, startup flags, secrets, and split dependency wiring', async () => {
    const distractors = Object.fromEntries(
      Array.from({ length: 320 }, (_, index) => [
        `app/Feature${String(index).padStart(3, '0')}.php`,
        '<?php final class Feature {}\n'
      ])
    );
    root = await makeRepo({
      ...distractors,
      'composer.json': JSON.stringify({
        name: 'acme/media',
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
        'DB_DATABASE=app',
        'DB_USERNAME=app',
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
      // Test topology must not override the production MySQL selector above.
      '.env.testing': 'DB_CONNECTION=sqlite\nDB_DATABASE=tests/database.sqlite\n',
      'docker-compose.yml': [
        'services:',
        '  web:',
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
        '      AUTORUN_LARAVEL_CONFIG_CACHE: "true"',
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
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe, environmentProbe, serverEntrypointProbe]
    });
    const web = facts.services.find((service) => service.name === 'web')!;
    const horizon = facts.services.find((service) => service.name === 'horizon')!;
    const scheduler = facts.services.find((service) => service.name === 'scheduler')!;
    const webVariables = new Map(web.environmentVariables.map((variable) => [variable.name, variable]));
    const database = facts.dependencies.find((dependency) => dependency.kind === 'mysql')!;
    const cache = facts.dependencies.find((dependency) => dependency.kind === 'redis')!;

    expect(web.startCommand).toBeUndefined();
    expect(horizon.startCommand).toBe('php artisan horizon');
    expect(scheduler.startCommand).toBe('php artisan schedule:work');
    expect(scheduler.containerCommand).toEqual(['php', 'artisan', 'schedule:work']);
    expect(web.bundledLifecycle).toEqual({ databaseMigrations: true, backgroundProcesses: false });
    expect(horizon.bundledLifecycle).toBeUndefined();
    expect(scheduler.bundledLifecycle).toBeUndefined();

    expect(webVariables.get('APP_KEY')).toMatchObject({ role: 'generated-secret' });
    for (const name of ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD']) {
      expect(webVariables.get(name)).toMatchObject({ role: 'infra-dependency', dependencyName: database.name });
    }
    for (const name of ['REDIS_HOST', 'REDIS_PASSWORD', 'REDIS_PORT']) {
      expect(webVariables.get(name)).toMatchObject({ role: 'infra-dependency', dependencyName: cache.name });
    }
    expect(webVariables.get('DB_CONNECTION')).toMatchObject({ role: 'runtime-config' });
    expect(webVariables.get('MYSQL_ATTR_SSL_CA')).toMatchObject({ role: 'runtime-config' });

    for (const process of [web, horizon, scheduler]) {
      const variables = new Map(process.environmentVariables.map((variable) => [variable.name, variable]));
      expect(variables.get('CACHE_DRIVER')).toMatchObject({ role: 'runtime-config', safeLiteralValue: 'redis' });
      expect(variables.get('QUEUE_DRIVER')).toMatchObject({ role: 'runtime-config', safeLiteralValue: 'redis' });
      expect(variables.has('ADMIN_PIN')).toBe(false);
      expect(variables.has('OTP_CODE')).toBe(false);
    }

    for (const [name, value] of [
      ['PHP_OPCACHE_ENABLE', '1'],
      ['AUTORUN_LARAVEL_MIGRATION', 'true'],
      ['AUTORUN_LARAVEL_EVENT_CACHE', 'true'],
      ['AUTORUN_LARAVEL_CONFIG_CACHE', 'true']
    ] as const) {
      expect(webVariables.get(name)).toMatchObject({ role: 'runtime-config', safeLiteralValue: value });
    }
    expect(facts.dependencies.some((dependency) => dependency.kind === 'object-storage')).toBe(false);
    expect(database.currentlyHostedOn).toBeUndefined();
    expect(database.hostingEvidence).toBeUndefined();
    expect(cache.currentlyHostedOn).toBeUndefined();
    expect(facts.existingDeployments).toEqual([]);
    expect(web.evidence).toContainEqual(expect.objectContaining({ file: 'docker-compose.yml' }));
  });

  it('does not mistake Kafka topic and consumer-group settings for broker addresses', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM eclipse-temurin:21\n',
      'compose.yaml': [
        'services:',
        '  app:',
        '    build: .',
        '    ports: ["8080:8080"]',
        '    depends_on: [kafka]',
        '    environment:',
        '      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092',
        '      APP_KAFKA_CONSUMER_GROUP: ${APP_KAFKA_CONSUMER_GROUP:-orders-service}',
        '      APP_KAFKA_TOPICS_ORDER_EVENTS: ${APP_KAFKA_TOPICS_ORDER_EVENTS:-orders.events}',
        '  kafka:',
        '    image: apache/kafka:3.8.0',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });
    const byName = Object.fromEntries(
      facts.services[0]!.environmentVariables.map((variable) => [variable.name, variable])
    );

    expect(byName.SPRING_KAFKA_BOOTSTRAP_SERVERS).toMatchObject({
      role: 'infra-dependency',
      dependencyName: 'eventStream'
    });
    expect(byName.APP_KAFKA_CONSUMER_GROUP).toMatchObject({
      role: 'runtime-config',
      safeLiteralValue: 'orders-service'
    });
    expect(byName.APP_KAFKA_TOPICS_ORDER_EVENTS).toMatchObject({
      role: 'runtime-config',
      safeLiteralValue: 'orders.events'
    });
  });

  it('keeps two independently named databases instead of collapsing them by engine', async () => {
    root = await makeRepo({
      'docker-compose.yml': [
        'services:',
        '  primary:',
        '    image: postgres:16',
        '  analytics:',
        '    image: postgres:15',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe]
    });

    expect(facts.dependencies.map((entry) => [entry.name, entry.engineVersion])).toEqual([
      ['primary', '16'],
      ['analytics', '15']
    ]);
  });

  it('turns a completed one-shot migration dependency into a migration fact, never a worker', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM python:3.13\n',
      'scripts/prestart.sh': ['#!/usr/bin/env bash', 'python app/check_database.py', 'alembic upgrade head', ''].join(
        '\n'
      ),
      'docker-compose.yml': [
        'services:',
        '  prestart:',
        '    build: .',
        '    command: bash scripts/prestart.sh',
        '  web:',
        '    build: .',
        '    command: python app/main.py',
        '    ports: ["8000:8000"]',
        '    depends_on:',
        '      prestart:',
        '        condition: service_completed_successfully',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe]
    });

    expect(facts.services.map((entry) => entry.name)).toEqual(['web']);
    expect(facts.migrations).toEqual([
      expect.objectContaining({
        serviceName: 'web',
        tool: 'alembic',
        command: 'alembic upgrade head',
        runsAt: 'ci'
      })
    ]);
  });

  for (const command of [
    '    command: ["bun", "packages/core/src/db/migrate.ts"]',
    '    command:\n      - bun\n      - packages/core/src/db/migrate.ts',
    '    entrypoint: ["bun"]\n    command: ["packages/core/src/db/migrate.ts"]'
  ]) {
    it(`cites the owning one-shot service's literal command arguments: ${command}`, async () => {
      const compose = [
        'services:',
        '  unrelated:',
        '    image: alpine',
        '    command: bun packages/core/src/db/migrate.ts',
        '  migrate:',
        '    build: .',
        command,
        '    environment:',
        '      DATABASE_URL: postgres://not-for-evidence',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    environment:',
        '      DATABASE_URL: postgres://db:5432/app',
        '    depends_on:',
        '      migrate:',
        '        condition: service_completed_successfully',
        '  worker:',
        '    build: .',
        '    command: bun apps/worker/src/index.ts',
        '    environment:',
        '      DATABASE_URL: postgres://db:5432/app',
        '    depends_on:',
        '      migrate:',
        '        condition: service_completed_successfully',
        '  db:',
        '    image: postgres:16',
        ''
      ].join('\n');
      root = await makeRepo({ Dockerfile: 'FROM oven/bun:1\n', 'compose.yaml': compose });
      const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });
      expect(facts.migrations).toHaveLength(1);
      const migration = facts.migrations[0]!;
      expect(migration.command).toBe('bun packages/core/src/db/migrate.ts');
      expect(migration.evidence).toHaveLength(2);
      expect(migration.evidence.some((citation) => citation.quote.includes('packages/core/src/db/migrate.ts'))).toBe(
        true
      );
      for (const citation of migration.evidence) {
        expect(citation.file).toBe('compose.yaml');
        expect(citation.line).toBeGreaterThan(6);
        expect(compose.split('\n')[citation.line - 1]).toContain(citation.quote);
        expect(citation.quote).not.toContain('not-for-evidence');
      }
      const { config } = composeConfig({ facts, projectName: 'app' });
      expect(Object.keys(config.scripts ?? {})).toEqual(['migrateDatabase']);
      expect(config.scripts?.migrateDatabase).toMatchObject({
        type: 'local-script-with-bastion-tunneling',
        properties: {
          executeCommand: 'bun packages/core/src/db/migrate.ts',
          connectTo: ['mainDatabase'],
          environment: [{ name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }]
        }
      });
      expect(config.hooks).toEqual({ afterDeploy: [{ scriptName: 'migrateDatabase' }] });
    });
  }

  for (const entryfile of ['migrate.js', 'db migrations/run.js']) {
    for (const style of ['inline', 'multiline', 'split-entrypoint', 'scalar-entrypoint']) {
      it(`preserves literal migration argv through composition and shell execution (${style}, ${entryfile})`, async () => {
        const args = [
          '--directory',
          'db migrations',
          '',
          "apostrophe's",
          'double"quote',
          '$STP_LITERAL_ARG',
          '$(printf changed)',
          '`printf changed`',
          '; printf changed',
          '&& printf changed',
          '| printf changed',
          '*.sql',
          '{one,two}',
          '# comment',
          'C:\\db\\migrations',
          'line\nbreak'
        ];
        const argv = ['bun', entryfile, ...args];
        const declaration =
          style === 'inline'
            ? [`    command: ${JSON.stringify(argv)}`]
            : style === 'multiline'
              ? ['    command:', ...argv.map((argument) => `      - ${JSON.stringify(argument)}`)]
              : [
                  style === 'split-entrypoint' ? '    entrypoint: ["bun"]' : '    entrypoint: bun',
                  `    command: ${JSON.stringify(argv.slice(1))}`
                ];
        const compose = [
          'services:',
          '  migrate:',
          '    build: .',
          ...declaration,
          '  api:',
          '    build: .',
          '    ports: ["3000:3000"]',
          '    depends_on:',
          '      migrate:',
          '        condition: service_completed_successfully',
          ''
        ].join('\n');
        root = await makeRepo({
          Dockerfile: 'FROM oven/bun:1\n',
          'compose.yaml': compose,
          [entryfile]: 'console.log(JSON.stringify(process.argv.slice(2)));\n'
        });
        const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });
        expect(facts.migrations).toHaveLength(1);
        const migration = facts.migrations[0]!;
        expect(migration.evidence.some((citation) => citation.quote.includes(entryfile))).toBe(true);
        for (const citation of migration.evidence)
          expect(compose.split('\n')[citation.line - 1]).toContain(citation.quote);
        const composition = composeConfig({ facts, projectName: 'app' });
        const executeCommand = composition.config.scripts?.migrateDatabase?.properties.executeCommand;
        expect(executeCommand).toBe(migration.command);
        expect(composition.config.hooks).toEqual({ afterDeploy: [{ scriptName: 'migrateDatabase' }] });
        expect(composition.gaps).toEqual([]);
        if (typeof executeCommand !== 'string') throw new Error('Migration command was not composed.');
        expect(executeCommand).toContain("--directory 'db migrations'");
        // Execute only this test-authored argv printer, with no database or external service. Bun's
        // cross-platform shell checks actual argument boundaries and catches accidental expansion.
        const output = await $`${{ raw: executeCommand }}`
          .cwd(root)
          .env({ ...process.env, STP_LITERAL_ARG: 'expanded' })
          .quiet()
          .text();
        expect(JSON.parse(output)).toEqual(args);
      });
    }
  }

  it('reads a one-shot migration command from its dedicated Dockerfile without deploying that image forever', async () => {
    root = await makeRepo({
      'apps/api/Dockerfile': 'FROM node:24\nCMD ["node", "server.js"]\n',
      'apps/worker/Dockerfile': 'FROM node:24\nCMD ["node", "worker.js"]\n',
      'packages/database/Dockerfile': 'FROM node:24\nCMD ["pnpm", "--filter", "@acme/database", "db:push"]\n',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node server.js' }
      }),
      'apps/worker/package.json': JSON.stringify({
        name: 'worker',
        scripts: { start: 'node worker.js' }
      }),
      'packages/database/package.json': JSON.stringify({
        name: '@acme/database',
        scripts: { 'db:push': 'prisma db push' }
      }),
      'docker-compose.yml': [
        'services:',
        '  migrate:',
        '    build:',
        '      context: .',
        '      dockerfile: packages/database/Dockerfile',
        '  api:',
        '    build: apps/api',
        '    ports: ["3000:3000"]',
        '    depends_on:',
        '      migrate:',
        '        condition: service_completed_successfully',
        '  worker:',
        '    build: apps/worker',
        '    depends_on:',
        '      migrate:',
        '        condition: service_completed_successfully',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe, dockerfileProbe]
    });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.find((service) => service.name === 'api')).toMatchObject({
      dockerfile: 'apps/api/Dockerfile'
    });
    expect(facts.migrations).toHaveLength(1);
    expect(facts.migrations).toContainEqual(
      expect.objectContaining({
        serviceName: 'api',
        command: 'pnpm --filter @acme/database db:push',
        runsAt: 'ci'
      })
    );
  });

  it('merges multiple root Compose builds into their nested .NET projects and wires hierarchical bucket names', async () => {
    root = await makeRepo({
      'Directory.Build.props': '<Project></Project>\n',
      'src/Orders.Api/Orders.Api.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>\n',
      'src/Orders.Worker/Orders.Worker.csproj': '<Project Sdk="Microsoft.NET.Sdk.Worker"></Project>\n',
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
        '      Storage__BucketName: ${STORAGE_BUCKET_NAME:-orders}',
        '      Storage__BucketArn: arn:aws:s3:::local-orders',
        '      Storage__Region: us-east-1',
        '      Storage__AccessKey: ${MINIO_ROOT_USER:-minioadmin}',
        '  worker:',
        '    build:',
        '      context: .',
        '      dockerfile: src/Orders.Worker/Dockerfile',
        '    depends_on: [minio]',
        '    environment:',
        '      Storage__BucketName: ${STORAGE_BUCKET_NAME:-orders}',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerfileProbe, languageManifestProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.find((service) => service.name === 'Orders.Api')).toMatchObject({
      name: 'Orders.Api',
      path: 'src/Orders.Api',
      buildRoot: '.',
      dockerfile: 'src/Orders.Api/Dockerfile',
      exposesHttp: true
    });
    expect(facts.services.find((service) => service.name === 'Orders.Worker')).toMatchObject({
      name: 'Orders.Worker',
      path: 'src/Orders.Worker',
      buildRoot: '.',
      dockerfile: 'src/Orders.Worker/Dockerfile',
      exposesHttp: false
    });
    expect(facts.dependencies).toContainEqual(
      expect.objectContaining({
        name: 'storageBucket',
        kind: 'object-storage',
        consumedBy: ['Orders.Api', 'Orders.Worker'],
        addressedBy: expect.arrayContaining([
          'Storage__BucketName',
          'Storage__BucketArn',
          'Storage__Region',
          'Storage__AccessKey'
        ])
      })
    );
    expect(
      facts.services
        .find((service) => service.name === 'Orders.Api')
        ?.environmentVariables.find((variable) => variable.name === 'Storage__AccessKey')
    ).toMatchObject({ role: 'infra-dependency', dependencyName: 'storageBucket' });

    const composed = composeConfig({ facts, projectName: 'orders' });
    expect(composed.config.resources.OrdersApi?.properties).toMatchObject({
      packaging: {
        type: 'custom-dockerfile',
        properties: { buildContextPath: '.', dockerfilePath: 'src/Orders.Api/Dockerfile' }
      },
      environment: expect.arrayContaining([
        { name: 'Storage__BucketName', value: "$ResourceParam('storageBucket', 'name')" },
        { name: 'Storage__BucketArn', value: "$ResourceParam('storageBucket', 'arn')" }
      ])
    });
    expect(composed.config.resources.OrdersApi?.properties.environment).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Storage__Region' }),
        expect.objectContaining({ name: 'Storage__AccessKey' })
      ])
    );
    expect(composed.config.resources.OrdersWorker?.properties.packaging).toEqual({
      type: 'custom-dockerfile',
      properties: { buildContextPath: '.', dockerfilePath: 'src/Orders.Worker/Dockerfile' }
    });
  });

  it('does not merge same-name .NET projects that have different source and Dockerfile ownership', async () => {
    root = await makeRepo({
      'apps/one/Api.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>\n',
      'apps/two/Dockerfile': 'FROM mcr.microsoft.com/dotnet/aspnet:8.0\n',
      'compose.yaml': [
        'services:',
        '  api:',
        '    build:',
        '      context: .',
        '      dockerfile: apps/two/Dockerfile',
        '    ports: ["8080:8080"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(2);
    expect(
      facts.services
        .map(({ name, path, dockerfile }) => ({ name, path, dockerfile }))
        .toSorted((a, b) => a.path.localeCompare(b.path))
    ).toEqual([
      { name: 'api', path: '.', dockerfile: 'apps/two/Dockerfile' },
      { name: 'Api', path: 'apps/one', dockerfile: undefined }
    ]);
  });

  for (const command of [
    ['bun', 'apps/api/src/index.ts'],
    ['bun', 'run', './apps/api/src/index.ts'],
    ['node', 'apps/api/src/index.ts']
  ]) {
    for (const withWorker of [false, true]) {
      it(`matches a root Compose command to its exact child entryfile (${command.join(' ')}, worker=${withWorker})`, async () => {
        root = await makeRepo({
          'package.json': JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'] }),
          'apps/api/package.json': JSON.stringify({ name: '@workspace/http', dependencies: { hono: '4' } }),
          'apps/api/src/index.ts': 'import { Hono } from "hono"; Bun.serve({ port: 3000, fetch: new Hono().fetch });\n',
          'apps/worker/src/index.ts': 'setInterval(() => undefined, 1000);\n',
          Dockerfile: 'FROM oven/bun:1\nWORKDIR /app\nCOPY apps ./apps\nEXPOSE 3000\n',
          'compose.yaml': [
            'services:',
            '  api:',
            '    build: .',
            `    command: ${JSON.stringify(command)}`,
            '    ports: ["3000:3000"]',
            ...(withWorker ? ['  worker:', '    build: .', '    command: ["bun", "apps/worker/src/index.ts"]'] : []),
            ''
          ].join('\n')
        });
        const probes = [manifestProbe, serverEntrypointProbe, dockerfileProbe, dockerComposeProbe];
        const results = await Promise.all(
          [probes, probes.toReversed()].map((order) => assembleCandidateFacts({ root, probes: order }))
        );
        for (const { facts } of results) {
          expect(facts.services).toHaveLength(withWorker ? 2 : 1);
          expect(facts.services.find((service) => service.exposesHttp)).toMatchObject({
            path: 'apps/api',
            dockerfile: 'Dockerfile',
            buildRoot: '.',
            containerEntrypoint: 'apps/api/src/index.ts',
            containerCommand: command
          });
          if (withWorker) expect(facts.services.find((service) => !service.exposesHttp)?.name).toBe('worker');
        }
      });
    }
  }

  for (const fixture of [
    {
      name: 'relative path at filesystem root',
      workdir: '/',
      copy: 'COPY root-server.js /apps/nested/nested-server.js'
    },
    {
      name: 'relative path at another working directory',
      workdir: '/srv',
      copy: 'COPY root-server.js ./apps/nested/nested-server.js'
    },
    { name: 'directory rename', workdir: '/app', copy: 'COPY alternate ./apps/nested' },
    {
      name: 'later file overwrite',
      workdir: '/app',
      copy: 'COPY . .\nCOPY root-server.js ./apps/nested/nested-server.js'
    },
    { name: 'later directory overwrite', workdir: '/app', copy: 'COPY . .\nCOPY alternate ./apps/nested' },
    {
      name: 'unknown overwrite',
      workdir: '/app',
      copy: 'COPY . .\nCOPY --from=other /server.js ./apps/nested/nested-server.js'
    },
    {
      name: 'substituted source',
      workdir: '/app',
      copy: 'COPY . .\nARG SOURCE=root-server.js\nCOPY $SOURCE ./apps/nested/nested-server.js'
    },
    { name: 'glob source', workdir: '/app', copy: 'COPY . .\nCOPY *.js ./apps/nested/' },
    { name: 'ignored entryfile', workdir: '/app', copy: 'COPY . .', ignore: 'apps/nested/nested-server.js\n' },
    {
      name: 'Dockerfile-specific ignore overrides root rules',
      workdir: '/app',
      copy: 'COPY . .',
      specificIgnore: 'apps\n'
    }
  ]) {
    it(`preserves the independent same-name child when Docker COPY cannot identify it: ${fixture.name}`, async () => {
      const command = ['node', 'apps/nested/nested-server.js'];
      root = await makeRepo({
        'package.json': JSON.stringify({
          name: 'api',
          scripts: { start: 'node root-server.js' },
          dependencies: { express: '5' }
        }),
        'root-server.js': 'require("express")().listen(3000);\n',
        'alternate/nested-server.js': 'module.exports = {};\n',
        'apps/nested/package.json': JSON.stringify({ name: 'api', dependencies: { fastify: '5' } }),
        'apps/nested/nested-server.js': 'require("fastify")().listen({ port: 4000 });\n',
        Dockerfile: `FROM node:24\nWORKDIR ${fixture.workdir}\n${fixture.copy}\nEXPOSE 3000\n`,
        '.dockerignore': fixture.ignore ?? '',
        ...(fixture.specificIgnore === undefined ? {} : { 'Dockerfile.dockerignore': fixture.specificIgnore }),
        'compose.yaml': `services:\n  api:\n    build: .\n    command: ${JSON.stringify(command)}\n    ports: ["3000:3000"]\n`
      });
      const probes = [manifestProbe, serverEntrypointProbe, dockerfileProbe, dockerComposeProbe];
      const results = await Promise.all(
        [probes, probes.toReversed()].map((order) => assembleCandidateFacts({ root, probes: order }))
      );
      for (const { facts } of results) {
        expect(facts.services).toHaveLength(2);
        expect(facts.services.find((service) => service.path === 'apps/nested')).toMatchObject({
          dockerfile: undefined,
          containerCommand: undefined,
          framework: 'fastify'
        });
        expect(facts.services.find((service) => service.path === '.')).toMatchObject({
          dockerfile: 'Dockerfile',
          containerCommand: command,
          framework: 'express'
        });
      }
    });
  }

  for (const fixture of [
    {
      name: 'declared alias sidecar excludes the entryfile',
      aliasIgnore: 'apps\n',
      canonicalIgnore: '',
      rootIgnore: '',
      ownsChild: false
    },
    {
      name: 'declared alias falls back to root ignores',
      canonicalIgnore: '',
      rootIgnore: 'apps\n',
      ownsChild: false
    },
    {
      name: 'declared alias sidecar includes the entryfile despite canonical and root ignores',
      aliasIgnore: '',
      canonicalIgnore: 'apps\n',
      rootIgnore: 'apps\n',
      ownsChild: true
    }
  ]) {
    for (const linked of [false, true]) {
      it(`uses declared Dockerfile ignore rules for source ownership (${linked ? 'symlink' : 'materialized'}): ${fixture.name}`, async () => {
        root = await makeRepo({
          'package.json': JSON.stringify({
            name: 'api',
            scripts: { start: 'node root-server.js' },
            dependencies: { express: '5' }
          }),
          'root-server.js': 'require("express")().listen(3000);\n',
          'apps/nested/package.json': JSON.stringify({ name: 'api', dependencies: { fastify: '5' } }),
          'apps/nested/nested-server.js': 'require("fastify")().listen({ port: 4000 });\n',
          'docker/Dockerfile.production': 'FROM node:24\nWORKDIR /app\nCOPY . .\nEXPOSE 3000\n',
          'docker/Dockerfile.production.dockerignore': fixture.canonicalIgnore,
          '.dockerignore': fixture.rootIgnore,
          ...(fixture.aliasIgnore === undefined ? {} : { 'Dockerfile.dockerignore': fixture.aliasIgnore }),
          'compose.yaml':
            'services:\n  api:\n    build: .\n    command: [node, apps/nested/nested-server.js]\n    ports: ["3000:3000"]\n'
        });
        if (linked) await symlink('docker/Dockerfile.production', join(root, 'Dockerfile'), 'file');
        else await writeFile(join(root, 'Dockerfile'), 'docker/Dockerfile.production\n', 'utf8');
        let commandSources: string[] | undefined;
        const observedCompose = {
          ...dockerComposeProbe,
          run: async (context: Parameters<typeof dockerComposeProbe.run>[0]) => {
            const output = await dockerComposeProbe.run(context);
            commandSources = (output.descriptorCommandSources ?? []).map((source) => source.sourceFile);
            return output;
          }
        };
        const { facts } = await assembleCandidateFacts({
          root,
          probes: [manifestProbe, serverEntrypointProbe, dockerfileProbe, observedCompose]
        });
        expect(commandSources).toEqual(fixture.ownsChild ? ['apps/nested/nested-server.js'] : []);
        expect(facts.services).toHaveLength(2);
        expect(facts.services.find((service) => service.path === 'apps/nested')).toMatchObject({
          framework: 'fastify',
          dockerfile: fixture.ownsChild ? 'docker/Dockerfile.production' : undefined
        });
      });
    }
  }

  for (const fixture of [
    { name: 'root postinstall', rootScripts: { postinstall: 'node rewrite.js' } },
    { name: 'workspace prepare', workspaceScripts: { prepare: 'node rewrite.js' } },
    { name: 'workspace preinstall', workspaceScripts: { preinstall: 'node rewrite.js' } },
    { name: 'malformed context manifest', extraManifest: '{"scripts":' },
    { name: 'truncated manifest', partialFile: 'apps/nested/package.json' },
    {
      name: 'truncated context file list omits a workspace hook',
      extraManifest: JSON.stringify({ scripts: { postinstall: 'node ../../rewrite.js' } }),
      omittedFile: 'packages/core/package.json'
    },
    { name: 'unreadable manifest', unreadableFile: 'apps/nested/package.json' },
    { name: 'truncated Dockerfile', partialFile: 'Dockerfile' },
    { name: 'truncated ignore file', partialFile: '.dockerignore' }
  ]) {
    it(`does not use unproved installed source as child ownership: ${fixture.name}`, async () => {
      root = await makeRepo({
        'package.json': JSON.stringify({
          name: 'api',
          workspaces: ['apps/*'],
          scripts: { start: 'node root-server.js', ...fixture.rootScripts },
          dependencies: { express: '5' }
        }),
        'root-server.js': 'require("express")().listen(3000);\n',
        'rewrite.js': 'require("node:fs").copyFileSync("root-server.js", "apps/nested/nested-server.js");\n',
        'apps/nested/package.json': JSON.stringify({
          name: 'api',
          dependencies: { fastify: '5' },
          scripts: fixture.workspaceScripts
        }),
        'apps/nested/nested-server.js': 'require("fastify")().listen({ port: 4000 });\n',
        Dockerfile: 'FROM node:24\nWORKDIR /app\nCOPY . .\nRUN npm install\nEXPOSE 3000\n',
        '.dockerignore': 'node_modules\n',
        ...(fixture.extraManifest === undefined ? {} : { 'packages/core/package.json': fixture.extraManifest }),
        'compose.yaml':
          'services:\n  api:\n    build: .\n    command: [node, apps/nested/nested-server.js]\n    ports: ["3000:3000"]\n'
      });
      const guardedCompose = {
        ...dockerComposeProbe,
        run: (context: Parameters<typeof dockerComposeProbe.run>[0]) =>
          dockerComposeProbe.run({
            ...context,
            ...(fixture.omittedFile === undefined
              ? {}
              : { files: context.files.filter((path) => path !== fixture.omittedFile), filesTruncated: true }),
            read: async (path, options) => {
              if (path === fixture.unreadableFile)
                return { kind: 'unreadable' as const, path, reason: 'Test read failure' };
              const result = await context.read(path, options);
              return path === fixture.partialFile && result.kind === 'contents'
                ? { ...result, truncated: true }
                : result;
            }
          })
      };
      const { facts } = await assembleCandidateFacts({
        root,
        probes: [manifestProbe, serverEntrypointProbe, dockerfileProbe, guardedCompose]
      });
      expect(facts.services).toHaveLength(2);
      expect(facts.services.find((service) => service.path === 'apps/nested')?.dockerfile).toBeUndefined();
      expect(facts.services.find((service) => service.path === '.')?.dockerfile).toBe('Dockerfile');
    });
  }

  for (const command of [
    ['node', '/srv/runtime.js'],
    ['node', 'runtime.js']
  ]) {
    it(`identifies the genuine child through an explicit file rename: ${command.join(' ')}`, async () => {
      root = await makeRepo({
        'package.json': JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'] }),
        'apps/api/package.json': JSON.stringify({ name: '@workspace/http', dependencies: { express: '5' } }),
        'apps/api/server.js': 'require("express")().listen(3000);\n',
        Dockerfile: 'FROM node:24\nWORKDIR /srv\nCOPY apps/api/server.js runtime.js\nEXPOSE 3000\n',
        'compose.yaml': `services:\n  api:\n    build: .\n    command: ${JSON.stringify(command)}\n    ports: ["3000:3000"]\n`
      });
      const { facts } = await assembleCandidateFacts({
        root,
        probes: [manifestProbe, serverEntrypointProbe, dockerfileProbe, dockerComposeProbe]
      });
      expect(facts.services).toHaveLength(1);
      expect(facts.services[0]).toMatchObject({
        path: 'apps/api',
        buildRoot: '.',
        dockerfile: 'Dockerfile',
        containerCommand: command
      });
    });
  }

  for (const command of [
    ['node', 'root-server.js', 'apps/nested/nested-server.js'],
    ['sh', '-c', 'node apps/nested/nested-server.js'],
    ['node', 'apps/nested/not-present.js'],
    ['node', '/apps/nested/nested-server.js']
  ]) {
    it(`does not use a data argument, opaque shell, missing file or absolute container path as child ownership: ${command.join(' ')}`, async () => {
      root = await makeRepo({
        'package.json': JSON.stringify({
          name: 'api',
          scripts: { start: 'node root-server.js' },
          dependencies: { express: '5' }
        }),
        'root-server.js': 'require("express")().listen(3000);\n',
        'apps/nested/package.json': JSON.stringify({ name: 'api', dependencies: { fastify: '5' } }),
        'apps/nested/nested-server.js': 'require("fastify")().listen({ port: 4000 });\n',
        Dockerfile: `FROM node:24\nWORKDIR /app\nCOPY root-server.js ${command[1]?.startsWith('/') ? command[1] : './'}\nEXPOSE 3000\n`,
        'compose.yaml': `services:\n  api:\n    build: .\n    command: ${JSON.stringify(command)}\n    ports: ["3000:3000"]\n`
      });
      const { facts } = await assembleCandidateFacts({
        root,
        probes: [manifestProbe, serverEntrypointProbe, dockerfileProbe, dockerComposeProbe]
      });
      expect(facts.services).toHaveLength(2);
      expect(facts.services.find((service) => service.path === 'apps/nested')?.dockerfile).toBeUndefined();
      expect(facts.services.find((service) => service.path === '.')?.containerCommand).toEqual(command);
    });
  }

  it('does not let a root Dockerfile collapse an unrelated nested application with the same name', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node root-server.js' },
        dependencies: { express: '5' }
      }),
      'root-server.js': 'require("express")().listen(3000);\n',
      Dockerfile: [
        'FROM node:24 AS base',
        'COPY root-server.js worker.js /app/',
        'FROM base AS worker',
        'CMD ["node", "/app/worker.js"]',
        'FROM base AS production',
        'CMD ["node", "/app/root-server.js"]',
        ''
      ].join('\n'),
      'worker.js': 'setInterval(() => undefined, 1000);\n',
      'apps/nested/package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node nested-server.js' },
        dependencies: { fastify: '5' }
      }),
      'apps/nested/nested-server.js': 'require("fastify")().listen({ port: 4000 });\n',
      'compose.yaml': [
        'services:',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '  worker:',
        '    build:',
        '      context: .',
        '      target: worker',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, serverEntrypointProbe, dockerfileProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(3);
    expect(facts.services.find((service) => service.path === 'apps/nested')).toMatchObject({
      name: 'api',
      dockerfile: undefined,
      startCommand: 'npm run start'
    });
    expect(
      facts.services
        .filter((service) => service.path === '.')
        .map((service) => service.name)
        .toSorted()
    ).toEqual(['api', 'worker']);
  });

  it('keeps process-neutral same-name .NET workers in separate application directories', async () => {
    root = await makeRepo({
      'apps/one/Worker.csproj': '<Project Sdk="Microsoft.NET.Sdk.Worker"></Project>\n',
      'apps/two/Worker.csproj': '<Project Sdk="Microsoft.NET.Sdk.Worker"></Project>\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [languageManifestProbe] });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.map((service) => service.path).toSorted()).toEqual(['apps/one', 'apps/two']);
  });

  it('blocks managed S3 replacement when source requires static credentials and a custom endpoint', async () => {
    root = await makeRepo({
      'src/Api/Api.csproj': [
        '<Project Sdk="Microsoft.NET.Sdk.Web">',
        '  <ItemGroup>',
        '    <PackageReference Include="AWSSDK.S3" Version="3.7.0" />',
        '    <ProjectReference Include="..\\Core\\Core.csproj" />',
        '  </ItemGroup>',
        '</Project>',
        ''
      ].join('\n'),
      'src/Core/Core.csproj': '<Project Sdk="Microsoft.NET.Sdk"></Project>\n',
      'src/Api/Dockerfile': 'FROM mcr.microsoft.com/dotnet/aspnet:8.0\n',
      'src/Core/StorageCredentials.cs':
        'var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);\n',
      'src/Core/StorageEndpoint.cs': 'var config = new AmazonS3Config { ServiceURL = options.ServiceUrl };\n',
      'compose.yaml': [
        'services:',
        '  api:',
        '    build:',
        '      context: .',
        '      dockerfile: src/Api/Dockerfile',
        '    ports: ["8080:8080"]',
        '    depends_on: [minio]',
        '    environment:',
        '      Storage__BucketName: local-bucket',
        '      Storage__ServiceUrl: http://minio:9000',
        '      Storage__AccessKey: local-access',
        '      Storage__SecretKey: local-secret',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });
    const api = facts.services.find((service) => service.name === 'Api');
    expect(api?.runtimePortabilityConstraints).toContainEqual(
      expect.objectContaining({ kind: 'object-storage-explicit-credentials-and-endpoint' })
    );

    const composed = composeConfig({ facts, projectName: 'storage-app' });
    expect(composed.deployable).toBe(false);
    expect(composed.gaps).toContainEqual(
      expect.objectContaining({
        subject: 'Api.object-storage-client',
        message: expect.stringContaining('AWS default credential chain')
      })
    );
    for (const name of ['Storage__ServiceUrl', 'Storage__AccessKey', 'Storage__SecretKey']) {
      expect(composed.config.resources.Api?.properties.environment).not.toContainEqual(
        expect.objectContaining({ name })
      );
    }
  });

  it('fails closed when comments and string examples do not prove the client is AWS-portable', async () => {
    root = await makeRepo({
      'src/Api/Api.csproj': [
        '<Project Sdk="Microsoft.NET.Sdk.Web">',
        '  <ItemGroup><PackageReference Include="AWSSDK.S3" Version="3.7.0" /></ItemGroup>',
        '</Project>',
        ''
      ].join('\n'),
      'src/Core/StorageExample.cs': [
        '// new BasicAWSCredentials(options.AccessKey, options.SecretKey);',
        'var documentation = "ServiceURL = options.ServiceUrl";',
        '/* new BasicAWSCredentials(example.AccessKey, example.SecretKey);',
        '   ServiceURL = example.ServiceUrl; */',
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  api:',
        '    build: src/Api',
        '    ports: ["8080:8080"]',
        '    depends_on: [minio]',
        '    environment:',
        '      Storage__BucketName: local-bucket',
        '      Storage__ServiceUrl: http://minio:9000',
        '      Storage__AccessKey: local-access',
        '      Storage__SecretKey: local-secret',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });

    expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
      expect.objectContaining({ kind: 'object-storage-explicit-settings-unverified' })
    );
    const composed = composeConfig({ facts, projectName: 'storage-example' });
    expect(composed.deployable).toBe(false);
    expect(composed.gaps).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('could not prove') })
    );
  });

  it('blocks a Node S3 client that supplies a non-AWS endpoint and static credentials', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'uploads',
        scripts: { start: 'node server.js' },
        dependencies: { '@aws-sdk/client-s3': '3.895.0', express: '5' }
      }),
      'server.js': [
        'const { S3Client } = require("@aws-sdk/client-s3");',
        'const client = new S3Client({',
        '  endpoint: process.env.S3_ENDPOINT,',
        '  credentials: {',
        '    accessKeyId: process.env.S3_ACCESS_KEY_ID,',
        '    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY',
        '  }',
        '});',
        'require("express")().listen(3000);',
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  uploads:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    depends_on: [minio]',
        '    environment:',
        '      S3_BUCKET: uploads',
        '      S3_ENDPOINT: http://minio:9000',
        '      S3_ACCESS_KEY_ID: local-access',
        '      S3_SECRET_ACCESS_KEY: local-secret',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, serverEntrypointProbe, dockerComposeProbe]
    });
    expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
      expect.objectContaining({ kind: 'object-storage-explicit-credentials-and-endpoint' })
    );
    const composed = composeConfig({ facts, projectName: 'node-storage' });
    expect(composed.deployable).toBe(false);
    expect(composed.gaps).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('AWS default credential chain') })
    );
    for (const name of ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
      expect(composed.config.resources.uploads?.properties.environment).not.toContainEqual(
        expect.objectContaining({ name })
      );
    }
  });

  it('does not let an unused default Node S3 client hide a configured primary client', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'uploads',
        scripts: { start: 'node server.js' },
        dependencies: { '@aws-sdk/client-s3': '3.895.0', express: '5' }
      }),
      'server.js': [
        'const { S3Client } = require("@aws-sdk/client-s3");',
        'const endpoint = process.env.S3_ENDPOINT;',
        'const accessKeyId = process.env.S3_ACCESS_KEY_ID;',
        'const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;',
        'const credentials = { accessKeyId, secretAccessKey };',
        'const client = new S3Client({ endpoint, credentials });',
        'const unused = new S3Client();',
        'require("express")().listen(3000);',
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  uploads:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    depends_on: [minio]',
        '    environment:',
        '      S3_BUCKET: uploads',
        '      S3_ENDPOINT: http://minio:9000',
        '      S3_ACCESS_KEY_ID: local-access',
        '      S3_SECRET_ACCESS_KEY: local-secret',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, serverEntrypointProbe, dockerComposeProbe]
    });
    expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
      expect.objectContaining({ kind: 'object-storage-explicit-settings-unverified' })
    );
    const composed = composeConfig({ facts, projectName: 'node-storage-opaque' });
    expect(composed.deployable).toBe(false);
    for (const name of ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
      expect(composed.config.resources.uploads?.properties.environment).not.toContainEqual(
        expect.objectContaining({ name })
      );
    }
  });

  it.each(NODE_S3_IMPORT_FORMS)(
    'tracks a Node S3 %s before accepting an unused default client',
    async (_kind, declaration, constructor) => {
      root = await makeRepo(
        nodeStorageRepo(
          [
            declaration,
            'const endpoint = process.env.S3_ENDPOINT;',
            'const accessKeyId = process.env.S3_ACCESS_KEY_ID;',
            'const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;',
            'const credentials = { accessKeyId, secretAccessKey };',
            `const primary = new ${constructor}({ endpoint, credentials });`,
            'const unused = new S3Client();',
            'require("express")().listen(3000);',
            ''
          ].join('\n')
        )
      );

      const { facts } = await assembleCandidateFacts({
        root,
        probes: [manifestProbe, serverEntrypointProbe, dockerComposeProbe]
      });
      expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
        expect.objectContaining({ kind: 'object-storage-explicit-settings-unverified' })
      );
      expect(composeConfig({ facts, projectName: 'node-storage-alias' }).deployable).toBe(false);
    }
  );

  it.each(NODE_S3_IMPORT_FORMS)(
    'recognizes a Node S3 %s with multiline empty options as using AWS defaults',
    async (_kind, declaration, constructor) => {
      root = await makeRepo(
        nodeStorageRepo(
          [declaration, `const client = new ${constructor}(`, '  {}', ');', 'require("express")().listen(3000);'].join(
            '\n'
          )
        )
      );
      const { facts } = await assembleCandidateFacts({
        root,
        probes: [manifestProbe, serverEntrypointProbe, dockerComposeProbe]
      });
      expect(facts.services[0]?.runtimePortabilityConstraints).toEqual([]);
      expect(composeConfig({ facts, projectName: 'node-storage-portable-alias' }).deployable).toBe(true);
    }
  );

  it('tracks a C# S3 constructor alias before accepting an unused default client', async () => {
    root = await makeRepo(
      cSharpStorageRepo(
        [
          'using StorageClient = Amazon.S3.AmazonS3Client;',
          'var primary = new StorageClient(BuildLocalOptions());',
          'var unused = new AmazonS3Client();',
          ''
        ].join('\n')
      )
    );

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });
    expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
      expect.objectContaining({ kind: 'object-storage-explicit-settings-unverified' })
    );
    expect(composeConfig({ facts, projectName: 'csharp-storage-alias' }).deployable).toBe(false);
  });

  it('recognizes a multiline empty Node S3 constructor as using AWS defaults', async () => {
    root = await makeRepo(
      nodeStorageRepo(
        [
          'const { S3Client } = require("@aws-sdk/client-s3");',
          'const client = new S3Client(',
          ');',
          'require("express")().listen(3000);',
          ''
        ].join('\n')
      )
    );

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, serverEntrypointProbe, dockerComposeProbe]
    });
    expect(facts.services[0]?.runtimePortabilityConstraints).toEqual([]);
    expect(composeConfig({ facts, projectName: 'node-storage-multiline' }).deployable).toBe(true);
  });

  it('recognizes multiline empty C# constructor and DI calls as using AWS defaults', async () => {
    root = await makeRepo(
      cSharpStorageRepo(
        ['var client = new AmazonS3Client(', ');', 'services.AddAWSService<IAmazonS3>(', ');', ''].join('\n')
      )
    );

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });
    expect(facts.services[0]?.runtimePortabilityConstraints).toEqual([]);
    expect(composeConfig({ facts, projectName: 'csharp-storage-multiline' }).deployable).toBe(true);
  });

  it.each(['"local-region"', '@"local-region"', '"""local-region"""'])(
    'does not classify a masked C# literal argument %s as an empty constructor',
    async (argument) => {
      root = await makeRepo(cSharpStorageRepo(`var client = new AmazonS3Client(${argument});\n`));
      const { facts } = await assembleCandidateFacts({
        root,
        probes: [languageManifestProbe, dockerComposeProbe]
      });
      expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
        expect.objectContaining({ kind: 'object-storage-explicit-settings-unverified' })
      );
      expect(composeConfig({ facts, projectName: 'csharp-storage-literal' }).deployable).toBe(false);
    }
  );

  it('requires every S3 client in a polyglot service to be positively portable', async () => {
    root = await makeRepo({
      ...cSharpStorageRepo('var client = new AmazonS3Client();\n'),
      'src/Api/storage.js': [
        'const endpoint = process.env.S3_ENDPOINT;',
        'const credentials = loadCredentials();',
        'const client = new S3Client({ endpoint, credentials });',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });
    expect(facts.services[0]?.runtimePortabilityConstraints).toContainEqual(
      expect.objectContaining({ kind: 'object-storage-explicit-settings-unverified' })
    );
    expect(composeConfig({ facts, projectName: 'polyglot-storage' }).deployable).toBe(false);
  });

  it('does not assign an incidental tools client to a portable application', async () => {
    root = await makeRepo({
      'apps/good/GoodApi.csproj': [
        '<Project Sdk="Microsoft.NET.Sdk.Web">',
        '  <ItemGroup><PackageReference Include="AWSSDK.S3" Version="3.7.0" /></ItemGroup>',
        '</Project>',
        ''
      ].join('\n'),
      'apps/good/StorageClient.cs': 'var client = new AmazonS3Client();\n',
      'tools/legacy/MinioMigration.cs': [
        'var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);',
        'var config = new AmazonS3Config { ServiceURL = options.ServiceUrl };',
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  good-api:',
        '    build: apps/good',
        '    ports: ["8080:8080"]',
        '    depends_on: [minio]',
        '    environment:',
        '      Storage__BucketName: uploads',
        '      Storage__ServiceUrl: http://minio:9000',
        '      Storage__AccessKey: local-access',
        '      Storage__SecretKey: local-secret',
        '  minio:',
        '    image: minio/minio:latest',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({ name: 'GoodApi', path: 'apps/good' });
    expect(facts.services[0]?.runtimePortabilityConstraints).toEqual([]);
    expect(composeConfig({ facts, projectName: 'good-api' }).deployable).toBe(true);
  });

  it('keeps a named worker private when its published port is only for health checks', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM eclipse-temurin:21\nEXPOSE 8080\n',
      'build.gradle': "dependencies { implementation 'org.springframework.boot:spring-boot-starter-web' }\n",
      'docker-compose.yml': [
        'services:',
        '  web:',
        '    build: .',
        '    ports: ["8080:8080"]',
        '  worker:',
        '    build: .',
        '    ports: ["8081:8081"]',
        '    healthcheck:',
        '      test: ["CMD", "curl", "http://localhost:8081/actuator/health"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [dockerComposeProbe]
    });

    expect(facts.services.find((service) => service.name === 'web')).toMatchObject({ exposesHttp: true, port: 8080 });
    expect(facts.services.find((service) => service.name === 'worker')).toMatchObject({ exposesHttp: false });
    expect(facts.services.find((service) => service.name === 'worker')?.port).toBeUndefined();
  });

  it('merges a child build-stage declaration into the application found in that child', async () => {
    root = await makeRepo({
      'flask/Dockerfile': 'FROM python:3.13 AS builder\nCOPY . .\n',
      'flask/requirements.txt': 'flask==3.1.0\n',
      'flask/server.py': 'from flask import Flask\napp = Flask(__name__)\n',
      'compose.yaml': [
        'services:',
        '  backend:',
        '    build:',
        '      context: flask',
        '      target: builder',
        '    environment:',
        '      FLASK_SERVER_PORT: 9091',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [serverEntrypointProbe, languageManifestProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'backend',
      path: 'flask',
      framework: 'flask',
      exposesHttp: true,
      processType: 'compose:backend',
      containerEntrypoint: 'flask/server.py:app',
      dockerfile: 'flask/Dockerfile'
    });
  });

  it('does not deploy an explicitly development-only Compose stage beside the production app', async () => {
    root = await makeRepo({
      'backend/package.json': JSON.stringify({
        name: 'orders-api',
        dependencies: { express: '5' }
      }),
      'backend/server.js': 'import express from "express";\nexpress().listen(3000);\n',
      'backend/Dockerfile': 'FROM node:24 AS development\nCOPY . .\n',
      'compose.yaml': [
        'services:',
        '  backend:',
        '    build:',
        '      context: backend',
        '      target: development',
        '    ports: ["3000:3000"]',
        '    environment:',
        '      NODE_ENV: development',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, serverEntrypointProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'orders-api',
      path: 'backend',
      framework: 'express',
      exposesHttp: true,
      containerEntrypoint: 'backend/server.js'
    });
    expect(facts.services[0]?.processType).toBeUndefined();
  });

  it('merges root multi-stage Compose targets into their matching monorepo applications', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ private: true, workspaces: ['apps/*'] }),
      'pnpm-workspace.yaml': 'packages:\n  - apps/*\n',
      Dockerfile: 'FROM node:24 AS api\nFROM node:24 AS worker\n',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node dist/main.js' },
        dependencies: {
          '@nestjs/core': '11',
          '@nestjs/platform-express': '11'
        }
      }),
      'apps/worker/package.json': JSON.stringify({
        name: 'worker',
        scripts: { start: 'node dist/main.js' },
        dependencies: {
          '@nestjs/core': '11',
          '@nestjs/platform-express': '11'
        }
      }),
      'docker-compose.yml': [
        'services:',
        '  api:',
        '    build:',
        '      context: .',
        '      target: api',
        '    ports: ["3000:3000"]',
        '  worker:',
        '    build:',
        '      context: .',
        '      target: worker',
        '    ports: ["3001:3001"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, languageManifestProbe, dockerComposeProbe, dockerfileProbe]
    });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.find((service) => service.name === 'api')).toMatchObject({
      path: 'apps/api',
      exposesHttp: true,
      processType: 'compose:api'
    });
    expect(facts.services.find((service) => service.name === 'worker')).toMatchObject({
      path: 'apps/worker',
      exposesHttp: false,
      processType: 'compose:worker'
    });
  });

  it('does not deploy a context-free tool image next to the actual application', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '^5.0.0' }
      }),
      Dockerfile: 'FROM node:24\nCOPY . /app\nCMD ["node", "index.js"]\n',
      'tool.Dockerfile': 'FROM node:24\nRUN npm install --global maildev@2\nCMD ["maildev"]\n',
      'docker-compose.yml': [
        'services:',
        '  tool:',
        '    build:',
        '      context: .',
        '      dockerfile: tool.Dockerfile',
        '    ports: ["1080:1080"]',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, dockerComposeProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'api',
      exposesHttp: true,
      dockerfile: 'Dockerfile'
    });
  });

  it('keeps the default Compose database instead of provisioning every optional client mode', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: {
          express: '^5.0.0',
          pg: '^8.0.0',
          mongoose: '^9.0.0',
          '@aws-sdk/client-s3': '^3.0.0'
        }
      }),
      Dockerfile: 'FROM node:24\nCOPY env-example-relational .env\nCOPY . /app\nCMD ["node", "index.js"]\n',
      'env-example-relational':
        'DATABASE_TYPE=postgres\nDATABASE_URL=\nFILE_DRIVER=local\nWORKER_HOST=redis://redis:6379/1\n',
      'env-example-document': 'DATABASE_TYPE=mongodb\nDATABASE_URL=mongodb://mongo:27017/app\nFILE_DRIVER=s3\n',
      'docker-compose.yml': [
        'services:',
        '  postgres:',
        '    image: postgres:17',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        ''
      ].join('\n'),
      'index.js': [
        'const type = process.env.DATABASE_TYPE;',
        'const url = process.env.DATABASE_URL;',
        'const fileDriver = process.env.FILE_DRIVER;',
        "if (type === 'mongodb') console.log('optional document mode');",
        'void url; void fileDriver;',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies.map((entry) => entry.kind)).toEqual(['postgres']);
    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({
        name: 'DATABASE_URL',
        role: 'infra-dependency',
        dependencyName: 'mainDatabase'
      })
    );
  });

  it.each(['independent', 'apps'])(
    'links release source builds without absorbing a same-named %s sibling',
    async (siblingParent) => {
      root = await makeRepo({
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
          '  postgres:',
          '    image: postgres:15.6',
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
          '    ports: ["7077:7077"]',
          '    environment:',
          '      DATABASE_URL: postgresql://postgres:5432/app',
          '      SERVER_GRPC_PORT: "7077"',
          '      SERVER_MSGQUEUE_KIND: postgres',
          '    volumes: ["./generated:/platform/generated"]',
          '  platform-api:',
          '    image: ghcr.io/acme/platform-api:${LATEST_TAG}',
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
          `COPY /${siblingParent} ./${siblingParent}`,
          `RUN go build -o /diagnostic ./${siblingParent}/platform-\${SERVER_TARGET}`,
          'FROM golang:1.26 AS build',
          'ARG VERSION=v1.0.0',
          'ARG SERVER_TARGET',
          'RUN if [ "$SERVER_TARGET" != "api" ] && [ "$SERVER_TARGET" != "engine" ] && [ "$SERVER_TARGET" != "admin" ] && [ "$SERVER_TARGET" != "migrate" ]; then exit 1; fi',
          'COPY /cmd ./cmd',
          'RUN go build -ldflags="-X main.Version=${VERSION}" -o /bin/platform-${SERVER_TARGET} ./cmd/platform-${SERVER_TARGET}',
          'FROM alpine',
          'ARG SERVER_TARGET=engine',
          'COPY --from=build /bin/platform-${SERVER_TARGET} /platform/',
          'CMD ["/bin/sh", "-c", "/platform/platform-${SERVER_TARGET}"]',
          ''
        ].join('\n'),
        'cmd/platform-api/main.go': 'package main\nfunc main() {}\n',
        'cmd/platform-migrate/main.go':
          'package main\n// migrations run through goose\nfunc main() { migrate.RunMigrations() }\n',
        'cmd/platform-admin/main.go':
          'package main\nvar root = &cobra.Command{}\nfunc main() { keys := GenerateLocalKeys(); os.WriteFile("generated/master.key", keys, 0600); root.Execute() }\n',
        'cmd/platform-engine/main.go':
          'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":7077", nil) }\n',
        'cmd/platform-lite/main.go':
          'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":9090", nil) }\n',
        [`${siblingParent}/platform-engine/main.go`]:
          'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":9091", nil) }\n'
      });

      const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe, serverEntrypointProbe] });

      expect(facts.services.map((service) => service.name)).toEqual([
        'platformMigrate',
        'platformAdmin',
        'platformEngine',
        'platformApi',
        `${siblingParent}-platform-engine`
      ]);
      expect(facts.services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'platformApi',
            exposesHttp: true,
            port: 8080,
            dockerfile: 'build/package/servers.dockerfile',
            dockerfileBuildArgs: [{ argName: 'SERVER_TARGET', value: 'api' }]
          }),
          expect.objectContaining({
            name: 'platformEngine',
            exposesHttp: false,
            port: 7077,
            dockerfileBuildArgs: [{ argName: 'SERVER_TARGET', value: 'engine' }]
          }),
          expect.objectContaining({ name: 'platformAdmin', executionModel: 'one-shot' }),
          expect.objectContaining({ name: 'platformMigrate', executionModel: 'one-shot' })
        ])
      );
      expect(facts.services.some((service) => 'dockerfileTarget' in service)).toBe(false);
      expect(facts.services.some((service) => service.path === 'cmd/platform-engine')).toBe(false);
      expect(facts.services.find((service) => service.path === `${siblingParent}/platform-engine`)).toMatchObject({
        name: `${siblingParent}-platform-engine`,
        exposesHttp: true
      });
      expect(facts.services.find((service) => service.name === 'platformApi')?.containerEntrypoint).toBeUndefined();
      expect(facts.dependencies).toEqual([
        expect.objectContaining({ kind: 'postgres', engineVersion: '15.6', hostingEvidence: 'deployment-manifest' })
      ]);
      expect(
        facts.services
          .find((service) => service.name === 'platformApi')
          ?.environmentVariables.find((variable) => variable.name === 'SERVER_MSGQUEUE_KIND')
      ).toMatchObject({ role: 'runtime-config', safeLiteralValue: 'postgres' });
      expect(facts.migrations).toEqual([
        expect.objectContaining({ serviceName: 'platformApi', tool: 'goose', command: 'go run ./cmd/platform-migrate' })
      ]);
      expect(facts.deploymentRequirements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'public-grpc', serviceName: 'platformEngine', port: 7077 }),
          expect.objectContaining({
            kind: 'persistent-bootstrap-artifacts',
            producerServiceName: 'platformAdmin',
            consumerServiceNames: ['platformEngine', 'platformApi'],
            paths: ['/platform/generated'],
            evidence: expect.arrayContaining([expect.objectContaining({ file: 'cmd/platform-admin/main.go' })])
          })
        ])
      );
    }
  );

  it('keeps an ordinary admin HTTP service long-running and does not call a shared uploads volume bootstrap', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM python:3.14 AS admin\nCOPY . /app\nFROM node:24 AS api\nCOPY . /app\n',
      'compose.yaml': [
        'services:',
        '  admin:',
        '    build:',
        '      context: .',
        '      target: admin',
        '    command: python apps/admin/app.py',
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
      'apps/admin/app.py': [
        'from flask import Flask',
        'import click',
        'from pathlib import Path',
        '',
        'app = Flask(__name__)',
        '',
        '@click.command()',
        'def rotate_keys():',
        '    key = GenerateLocalKeys()',
        '    Path("generated/master.key").write_text(key)',
        '',
        'app.run(host="0.0.0.0", port=8080)',
        ''
      ].join('\n'),
      'api.js': 'require("http").createServer(() => {}).listen(3000);\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });

    expect(facts.services.find((service) => service.name === 'admin')).toMatchObject({
      exposesHttp: true,
      executionModel: 'long-running',
      port: 8080
    });
    expect(facts.services.find((service) => service.name === 'admin')?.evidence).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ file: 'apps/admin/app.py', field: 'executionModel' })])
    );
    expect(facts.deploymentRequirements).toEqual([]);
  });

  it('keeps an explicitly finite command authoritative even when Compose publishes a port', async () => {
    root = await makeRepo({
      Dockerfile: 'FROM python:3.14\nCOPY . /app\n',
      'compose.yaml': [
        'services:',
        '  maintenance:',
        '    build: .',
        '    command: python -m admin generate-keys',
        '    ports: ["8080:8080"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });

    expect(facts.services).toEqual([
      expect.objectContaining({
        name: 'maintenance',
        exposesHttp: false,
        executionModel: 'one-shot',
        startCommand: 'python -m admin generate-keys'
      })
    ]);
  });

  it('preserves a custom port and detects lifecycle work bundled behind the Dockerfile command', async () => {
    root = await makeRepo({
      'docker-compose.yml': [
        'services:',
        '  web:',
        '    build:',
        '      context: .',
        '      dockerfile: docker/Dockerfile',
        '    ports: ["8000:8000"]',
        '    depends_on: [db]',
        '  db:',
        '    image: postgres:17',
        ''
      ].join('\n'),
      'docker/Dockerfile': [
        'FROM python:3.14-slim',
        'COPY . /opt/app',
        'CMD ["uwsgi", "/opt/app/docker/uwsgi.ini"]',
        ''
      ].join('\n'),
      'docker/uwsgi.ini': [
        '[uwsgi]',
        'http-socket = :8000',
        'hook-pre-app = exec:./manage.py migrate',
        'attach-daemon = ./manage.py sendalerts',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'web',
      port: 8000,
      dockerfile: 'docker/Dockerfile',
      bundledLifecycle: { databaseMigrations: true, backgroundProcesses: true }
    });
    expect(facts.services[0]?.evidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ file: 'docker/uwsgi.ini', field: 'bundledLifecycle' })])
    );
  });

  it('forwards a Compose consumer through the language manifest service name', async () => {
    root = await makeRepo({
      'flask/requirements.txt': 'flask\npymongo\n',
      'flask/Dockerfile': 'FROM python:3.13\nCOPY . .\nCMD ["python", "server.py"]\n',
      'flask/server.py': [
        'from flask import Flask',
        'from pymongo import MongoClient',
        'app = Flask(__name__)',
        "app.run(host='0.0.0.0', port=9091)",
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  backend:',
        '    build: flask',
        '    depends_on: [mongo]',
        '  mongo:',
        '    image: mongo:8',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, serverEntrypointProbe, dockerComposeProbe]
    });

    expect(facts.services.map((entry) => entry.name)).toEqual(['flask']);
    expect(facts.dependencies[0]).toMatchObject({
      kind: 'mongodb',
      consumedBy: ['flask']
    });
  });

  it('transfers a published-image Compose database contract onto the source Go service without selecting its release Dockerfile', async () => {
    root = await makeRepo({
      'go.mod': [
        'module example.com/list-manager',
        'require (',
        '\tgithub.com/jackc/pgx/v5 v5.10.0',
        '\tgithub.com/labstack/echo/v4 v4.12.0',
        ')',
        ''
      ].join('\n'),
      'cmd/main.go': 'package main\nfunc main() { startServer() }\n',
      'cmd/init.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'func startServer() { server := echo.New(); server.Start(":9000") }',
        ''
      ].join('\n'),
      Dockerfile: 'FROM alpine:3.20\nCOPY list-manager /app/list-manager\nEXPOSE 9000\n',
      'docker-compose.yml': [
        'services:',
        '  app:',
        '    image: example/list-manager:latest',
        '    depends_on: [db]',
        '    environment:',
        '      LISTMONK_db__host: db',
        '      LISTMONK_db__port: 5432',
        '      LISTMONK_db__user: listmonk',
        '      LISTMONK_db__password: listmonk',
        '      LISTMONK_db__database: listmonk',
        '  db:',
        '    image: postgres:16',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, serverEntrypointProbe, dockerComposeProbe, dockerfileProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'list-manager',
      path: '.',
      containerEntrypoint: 'cmd/main.go',
      dockerfile: undefined
    });
    expect(facts.services[0]?.environmentVariables.map((variable) => variable.name).toSorted()).toEqual([
      'LISTMONK_db__database',
      'LISTMONK_db__host',
      'LISTMONK_db__password',
      'LISTMONK_db__port',
      'LISTMONK_db__user'
    ]);

    const composed = composeConfig({ facts });
    expect(composed.config.resources.listManager).toMatchObject({
      properties: {
        packaging: {
          type: 'stacktape-image-buildpack',
          properties: { entryfilePath: 'cmd/main.go' }
        },
        environment: [
          { name: 'LISTMONK_db__host', value: "$ResourceParam('mainDatabase', 'host')" },
          { name: 'LISTMONK_db__port', value: "$ResourceParam('mainDatabase', 'port')" },
          { name: 'LISTMONK_db__user', value: 'stacktape' },
          { name: 'LISTMONK_db__password', value: "$Secret('mainDatabase.password')" },
          { name: 'LISTMONK_db__database', value: "$ResourceParam('mainDatabase', 'dbName')" }
        ]
      }
    });
  });

  it('preserves an exact published-image command for a matching source-built container', async () => {
    root = await makeRepo({
      'go.mod': 'module example.com/notifier\nrequire github.com/labstack/echo/v4 v4.12.0\n',
      'main.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'func main() { server := echo.New(); server.Start(":80") }',
        ''
      ].join('\n'),
      Dockerfile: 'FROM alpine:3.20\nCOPY notifier /usr/bin/notifier\nEXPOSE 80\n',
      'Dockerfile-build': [
        'FROM golang:1.25 AS builder',
        'RUN apk add --no-cache build-base',
        'COPY go.mod main.go /src/',
        'RUN cd /src && go build -o /notifier .',
        'FROM alpine:3.20',
        'COPY --from=builder /notifier /usr/bin/notifier',
        'EXPOSE 80',
        'ENTRYPOINT ["notifier"]',
        ''
      ].join('\n'),
      'docker-compose.yml': [
        'services:',
        '  notifier:',
        '    image: example/notifier:latest',
        '    command: ["serve", "--listen-http", ":80"]',
        '    ports: ["80:80"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [serverEntrypointProbe, dockerComposeProbe, dockerfileProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'notifier',
      dockerfile: 'Dockerfile-build',
      containerCommand: ['serve', '--listen-http', ':80']
    });
    expect(composeConfig({ facts }).config.resources.notifier?.properties.packaging).toEqual({
      type: 'custom-dockerfile',
      properties: {
        buildContextPath: '.',
        dockerfilePath: 'Dockerfile-build',
        command: ['serve', '--listen-http', ':80']
      }
    });
  });

  it.each([
    { form: 'array', developmentCount: 2 },
    { form: 'string', developmentCount: 2 },
    { form: 'array', developmentCount: 12 },
    { form: 'string', developmentCount: 12 }
  ])('keeps a release $form command over $developmentCount development builds', async ({ form, developmentCount }) => {
    root = await makeRepo({
      'go.mod': 'module example.com/list-manager\nrequire github.com/labstack/echo/v4 v4.12.0\n',
      'cmd/main.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'func main() { server := echo.New(); server.Start(":9000") }',
        ''
      ].join('\n'),
      'docker-compose.yml': [
        'services:',
        '  app:',
        '    image: example/list-manager:latest',
        ...(form === 'array'
          ? [
              '    command:',
              '      - sh',
              '      - -c',
              '      - ./list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager'
            ]
          : [
              '    command: sh -c "./list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager"'
            ]),
        '    ports: ["9000:9000"]',
        ''
      ].join('\n'),
      'dev/app.Dockerfile': 'FROM golang:1.26\nWORKDIR /app\nCOPY . .\n',
      'dev/docker-compose.yml': [
        'services:',
        ...Array.from({ length: developmentCount }, (_, index) =>
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
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [serverEntrypointProbe, dockerComposeProbe]
    });
    const composition = composeConfig({ facts });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'list-manager',
      prebuiltImage: 'example/list-manager:latest',
      prebuiltImageAuthoritative: true,
      containerCommand: [
        'sh',
        '-c',
        './list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager'
      ]
    });
    expect(composition.config.resources.listManager?.properties.packaging).toEqual({
      type: 'prebuilt-image',
      properties: {
        image: 'example/list-manager:latest',
        command: [
          'sh',
          '-c',
          './list-manager --install --idempotent --yes && ./list-manager --upgrade --yes && ./list-manager'
        ]
      }
    });
    expect(composition.gaps).toContainEqual(
      expect.objectContaining({
        subject: 'list-manager.packaging',
        message: expect.stringMatching(/fresh database.*does not include changes.*no immutable tag or digest/)
      })
    );
  });

  it.each([
    { command: 'node server.js --label ""', argv: ['node', 'server.js', '--label', ''] },
    { command: 'node server.js --label "two words"', argv: ['node', 'server.js', '--label', 'two words'] },
    { command: "node server.js --label 'two words'", argv: ['node', 'server.js', '--label', 'two words'] },
    { command: 'node server.js --label two\\ words', argv: ['node', 'server.js', '--label', 'two words'] },
    { command: 'node server.js && echo ignored', argv: ['node', 'server.js'] },
    { command: 'node server.js --label $(echo literal)', argv: ['node', 'server.js', '--label', '$(echo literal)'] },
    { command: 'node server.js --label `echo literal`', argv: ['node', 'server.js', '--label', '`echo literal`'] }
  ])('preserves Compose shell-word semantics for $command', async ({ command, argv }) => {
    root = await makeRepo({
      Dockerfile: 'FROM node:24\nRUN apt-get update && apt-get install -y imagemagick\nCOPY . /app\nEXPOSE 3000\n',
      'compose.yaml': `services:\n  api:\n    build: .\n    command: ${JSON.stringify(command)}\n    ports: ["3000:3000"]\n`
    });
    const { facts } = await assembleCandidateFacts({ root, probes: [dockerComposeProbe] });
    expect(facts.services[0]?.containerCommand).toEqual([...argv]);
    expect(composeConfig({ facts }).config.resources.api?.properties.packaging).toMatchObject({
      type: 'custom-dockerfile',
      properties: { command: argv }
    });
  });

  it('uses a declared image only when missing embedded assets make source packaging unusable', async () => {
    root = await makeRepo({
      'go.mod': 'module example.com/notifier\n',
      'main.go': [
        'package main',
        'import "net/http"',
        'import _ "example.com/notifier/server"',
        'func main() { http.ListenAndServe(":80", nil) }',
        ''
      ].join('\n'),
      'server/assets.go': 'package server\nimport "embed"\n//go:embed site\nvar assets embed.FS\n',
      Dockerfile: 'FROM alpine:3.20\nCOPY notifier /usr/bin/notifier\nEXPOSE 80\n',
      'docker-compose.yml': [
        'services:',
        '  notifier:',
        '    image: example/notifier',
        '    command: ["serve"]',
        '    ports: ["80:80"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [serverEntrypointProbe, dockerComposeProbe, dockerfileProbe]
    });
    const composition = composeConfig({ facts });

    expect(facts.services[0]).toMatchObject({
      prebuiltImage: 'example/notifier',
      missingEmbeddedAssets: ['server/site'],
      containerCommand: ['serve']
    });
    expect(composition.config.resources.notifier?.properties.packaging).toEqual({
      type: 'prebuilt-image',
      properties: { image: 'example/notifier', command: ['serve'] }
    });
    expect(composition.gaps).toContainEqual(
      expect.objectContaining({
        subject: 'notifier.packaging',
        message: expect.stringMatching(/does not include changes from this checkout.*no immutable tag or digest/)
      })
    );
  });
});
