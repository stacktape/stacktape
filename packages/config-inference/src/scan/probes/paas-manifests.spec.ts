/**
 * The PaaS manifest importers: the user's declared deployment shape, read without claiming it ran.
 *
 * Properties under protection: the platform command beats every approximation; a database
 * declaration takes the cautious never-replace path without being called live; and
 * variable *names* travel with their roles while values never do.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { dockerComposeProbe } from './docker-compose';
import { manifestProbe } from './manifest';
import { paasManifestsProbe } from './paas-manifests';
import { procfileProbe } from './procfile';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-paas-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the render.yaml importer', () => {
  it('reads services, a declared database, and the wiring between them', async () => {
    root = await makeRepo({
      'render.yaml': [
        'services:',
        '  - type: web',
        '    name: orders-api',
        '    env: node',
        '    buildCommand: npm run build',
        '    startCommand: node dist/server.js',
        '    envVars:',
        '      - key: DATABASE_URL',
        '        fromDatabase:',
        '          name: orders-db',
        '          property: connectionString',
        '      - key: SESSION_SECRET',
        '        generateValue: true',
        '      - key: LOG_LEVEL',
        '        value: info',
        '      - key: NODE_ENV',
        '        value: production',
        '      - key: WORKER_HOST',
        '        fromService:',
        '          name: orders-worker',
        '          property: host',
        '  - type: worker',
        '    name: orders-worker',
        '    env: node',
        '    startCommand: node dist/worker.js',
        'databases:',
        '  - name: orders-db',
        '    postgresMajorVersion: "16"',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe, manifestProbe] });

    const service = facts.services.find((entry) => entry.name === 'ordersApi');
    expect(service).toMatchObject({
      language: 'javascript',
      exposesHttp: true,
      // The command Render runs in production today — not an approximation from scripts.
      startCommand: 'node dist/server.js',
      buildCommand: 'npm run build'
    });

    const byName = Object.fromEntries((service?.environmentVariables ?? []).map((entry) => [entry.name, entry]));
    expect(byName.DATABASE_URL).toMatchObject({ role: 'infra-dependency', dependencyName: 'mainDatabase' });
    expect(byName.SESSION_SECRET?.role).toBe('third-party-secret');
    expect(byName.LOG_LEVEL?.role).toBe('runtime-config');
    // Stacktape supplies this itself; a Render default must not become a secret or a setup chore.
    expect(byName.NODE_ENV).toBeUndefined();
    expect(byName.WORKER_HOST).toMatchObject({
      role: 'cross-service-reference',
      targetServiceName: 'ordersWorker',
      targetServiceProperty: 'host'
    });

    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');
    // The Blueprint proves intended topology, not that anybody deployed it or that live data exists.
    expect(database).toMatchObject({
      name: 'mainDatabase',
      engineVersion: '16',
      hostingEvidence: 'deployment-manifest',
      consumedBy: ['ordersApi'],
      addressedBy: ['DATABASE_URL']
    });
    expect(database?.currentlyHostedOn).toBeUndefined();
  });

  it('reads current nested projects, production environment databases, groups, and Docker commands', async () => {
    root = await makeRepo({
      'backend/Dockerfile': 'FROM python:3.13\n',
      'render.yaml': [
        'envVarGroups:',
        '  - name: shared',
        '    envVars:',
        '      - key: LOG_LEVEL',
        '        value: info',
        'projects:',
        '  - name: shop',
        '    environments:',
        '      - name: preview',
        '        services:',
        '          - type: web',
        '            name: preview-only',
        '            runtime: node',
        '      - name: production',
        '        services:',
        '          - type: web',
        '            name: shop-api',
        '            runtime: docker',
        '            dockerContext: .',
        '            dockerfilePath: backend/Dockerfile',
        '            dockerCommand: bash scripts/start.sh',
        '            healthCheckPath: /health',
        '            envVars:',
        '              - fromGroup: shared',
        '              - key: DATABASE_URL',
        '                fromDatabase:',
        '                  name: shop-db',
        '                  property: connectionString',
        '          - type: web',
        '            name: shop-frontend',
        '            runtime: static',
        '            buildCommand: pnpm build',
        '            staticPublishPath: frontend/dist',
        '        databases:',
        '          - name: shop-db',
        '            postgresMajorVersion: "17"',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe] });

    expect(facts.services.map((entry) => entry.name).toSorted()).toEqual(['shopApi', 'shopFrontend']);
    expect(facts.services.find((entry) => entry.name === 'shopApi')).toMatchObject({
      path: 'backend',
      buildRoot: '.',
      dockerfile: 'backend/Dockerfile',
      startCommand: 'bash scripts/start.sh',
      healthCheckPath: '/health'
    });
    expect(
      facts.services.find((entry) => entry.name === 'shopApi')?.environmentVariables.map((entry) => entry.name)
    ).toEqual(['LOG_LEVEL', 'DATABASE_URL']);
    expect(facts.services.find((entry) => entry.name === 'shopFrontend')?.servesStaticAssets).toEqual({
      path: 'frontend/dist'
    });
    expect(facts.services.find((entry) => entry.name === 'shopFrontend')).toMatchObject({
      path: 'frontend',
      buildRoot: '.'
    });
    expect(facts.dependencies[0]).toMatchObject({
      kind: 'postgres',
      engineVersion: '17',
      consumedBy: ['shopApi'],
      addressedBy: ['DATABASE_URL'],
      hostingEvidence: 'deployment-manifest'
    });
  });

  it('keeps a web and a worker over one codebase apart, and reads a static site as one', async () => {
    root = await makeRepo({
      'render.yaml': [
        'services:',
        '  - type: web',
        '    name: app',
        '    env: ruby',
        '    startCommand: bundle exec puma',
        '  - type: worker',
        '    name: jobs',
        '    env: ruby',
        '    startCommand: bundle exec sidekiq',
        '  - type: web',
        '    name: site',
        '    runtime: static',
        '    buildCommand: npm run build',
        '    staticPublishPath: ./dist',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe, manifestProbe] });

    expect(facts.services.map((entry) => entry.name).toSorted()).toEqual(['app', 'jobs', 'site']);
    expect(facts.services.find((entry) => entry.name === 'jobs')).toMatchObject({
      exposesHttp: false,
      startCommand: 'bundle exec sidekiq'
    });
    expect(facts.services.find((entry) => entry.name === 'site')).toMatchObject({
      exposesHttp: false,
      servesStaticAssets: { path: 'dist' }
    });
  });

  it('lets the platform command win over the package manifest approximation', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'orders',
        scripts: { start: 'node index.js' },
        dependencies: { express: '^4.19.0' }
      }),
      'render.yaml': [
        'services:',
        '  - type: web',
        '    name: orders',
        '    env: node',
        '    startCommand: node dist/server.js',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe, manifestProbe] });

    const service = facts.services.find((entry) => entry.name === 'orders');
    expect(service?.startCommand).toBe('node dist/server.js');
    // The package manifest still contributes what the platform manifest does not state.
    expect(service?.framework).toBe('express');
  });
});

describe('the fly.toml importer', () => {
  it('reads the port, the processes, and the non-secret environment names', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'app', dependencies: { fastify: '^4.0.0' } }),
      'fly.toml': [
        'app = "orders-api"',
        '',
        '[env]',
        '  LOG_FORMAT = "json"',
        '  PORT = 8080',
        '',
        '[processes]',
        '  app = "node dist/server.js"',
        '  worker = "node dist/worker.js"',
        '',
        '[http_service]',
        '  internal_port = 8080',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe] });

    const web = facts.services.find((entry) => entry.name === 'ordersApi');
    expect(web).toMatchObject({ exposesHttp: true, port: 8080, startCommand: 'node dist/server.js' });
    expect(web?.environmentVariables.map((entry) => entry.name)).toContain('LOG_FORMAT');
    expect(web?.environmentVariables.map((entry) => entry.name)).not.toContain('PORT');

    const worker = facts.services.find((entry) => entry.processType === 'fly:worker');
    expect(worker).toMatchObject({ exposesHttp: false, startCommand: 'node dist/worker.js' });
  });

  it('uses real TOML sections, accepts ordinary env keys, and scopes a nested app to its directory', async () => {
    root = await makeRepo({
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { fastify: '^5.0.0' } }),
      'apps/api/Dockerfile.prod': 'FROM node:24\nEXPOSE 3000\n',
      'apps/api/fly.toml': [
        'app = "orders-api"',
        '',
        '[env]',
        '  log_level = "info"',
        '  "PUBLIC_ORIGIN" = "https://example.com/{tenant}"',
        '',
        '[unrelated]',
        '  dockerfile = "Wrongfile"',
        '',
        '[build]',
        '  dockerfile = "Dockerfile.prod"',
        '',
        '[processes]',
        '  web = "node dist/server.js --template={id}"',
        '  jobs = "node dist/jobs.js"',
        '',
        '[http_service]',
        '  internal_port = 3000',
        '  processes = ["web"]',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe, manifestProbe] });
    const web = facts.services.find((entry) => entry.name === 'ordersApi');

    expect(web).toMatchObject({
      path: 'apps/api',
      dockerfile: 'apps/api/Dockerfile.prod',
      port: 3000,
      startCommand: 'node dist/server.js --template={id}'
    });
    expect(web?.environmentVariables.map((entry) => entry.name).toSorted()).toEqual(['PUBLIC_ORIGIN', 'log_level']);
    expect(facts.services.find((entry) => entry.processType === 'fly:jobs')).toMatchObject({
      exposesHttp: false,
      startCommand: 'node dist/jobs.js'
    });
    expect(facts.services).toHaveLength(2);
    expect(web?.language).toBe('javascript');
  });

  it('does not deploy the same web and worker twice when Compose and Fly describe both', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'orders', dependencies: { express: '^5.0.0' } }),
      Dockerfile: 'FROM node:24\n',
      'fly.toml': [
        'app = "orders"',
        '[processes]',
        '  web = "node dist/server.js"',
        '  worker = "node dist/worker.js"',
        '[http_service]',
        '  internal_port = 4000',
        ''
      ].join('\n'),
      'docker-compose.yml': [
        'services:',
        '  web:',
        '    build: .',
        '    command: node dist/server.js',
        '    ports: ["4000:4000"]',
        '  worker:',
        '    build: .',
        '    command: node dist/worker.js',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe, dockerComposeProbe] });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.map((service) => service.startCommand).toSorted()).toEqual([
      'node dist/server.js',
      'node dist/worker.js'
    ]);
    expect(facts.services.filter((service) => service.exposesHttp)).toHaveLength(1);
  });
});

describe('the app.json importer', () => {
  it('turns Heroku add-ons into declared backing services without claiming they are live', async () => {
    root = await makeRepo({
      'app.json': JSON.stringify({
        name: 'orders',
        addons: ['heroku-postgresql:standard-0', { plan: 'heroku-redis:premium-0' }]
      })
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe] });

    const kinds = Object.fromEntries(facts.dependencies.map((entry) => [entry.kind, entry]));
    expect(kinds.postgres).toMatchObject({ hostingEvidence: 'deployment-manifest' });
    expect(kinds.redis).toMatchObject({ hostingEvidence: 'deployment-manifest' });
    expect(kinds.postgres?.currentlyHostedOn).toBeUndefined();
    expect(kinds.redis?.currentlyHostedOn).toBeUndefined();
  });

  it('attaches config-var names to every Procfile process without carrying their values', async () => {
    root = await makeRepo({
      'app.json': JSON.stringify({
        name: 'orders',
        addons: ['heroku-postgresql:standard-0'],
        env: {
          LOG_LEVEL: { value: 'info' },
          NODE_ENV: { value: 'production' },
          STRIPE_SECRET_KEY: { value: 'should-never-appear' }
        }
      }),
      Procfile: 'web: node server.js\nworker: node worker.js\n',
      'package.json': JSON.stringify({ name: 'orders' })
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [paasManifestsProbe, procfileProbe] });

    expect(facts.services).toHaveLength(2);
    for (const service of facts.services) {
      expect(service.environmentVariables.map((entry) => entry.name).toSorted()).toEqual([
        'LOG_LEVEL',
        'STRIPE_SECRET_KEY'
      ]);
      expect(service.environmentVariables.find((entry) => entry.name === 'STRIPE_SECRET_KEY')?.role).toBe(
        'third-party-secret'
      );
    }
    expect(JSON.stringify(facts)).not.toContain('should-never-appear');
  });
});
