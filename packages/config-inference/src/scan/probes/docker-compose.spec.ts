/**
 * The compose file is the dependency list somebody already wrote down.
 *
 * These tests exist mostly to protect two properties that are easy to lose: that a stated engine
 * version reaches the composed database, and that reading a compose file never lets a laptop's
 * container speak for where production data lives.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
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
    expect(byName.OPAQUE_SETTING).toMatchObject({
      role: 'runtime-config',
      hasDeclaredValue: true
    });
    expect(byName.OPAQUE_SETTING?.safeLiteralValue).toBeUndefined();
    expect(JSON.stringify(facts)).not.toContain('do-not-retain-this-value');
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
});
