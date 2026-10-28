import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../compose/compose';
import { assembleCandidateFacts } from './assemble';
import { environmentProbe } from './probes/environment';
import { dockerfileProbe } from './probes/dockerfile';
import { lambdaSourceProbe } from './probes/lambda-source';
import { languageManifestProbe } from './probes/language-manifests';
import { manifestProbe } from './probes/manifest';
import { staticSiteProbe } from './probes/static-site';

const PROBES = [manifestProbe, environmentProbe];

const pkg = (name: string, start: string, dependencies: Record<string, string> = {}) =>
  JSON.stringify({ name, scripts: { start }, dependencies });

let root: string;

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'config-inference-assemble-'));
  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const absolute = join(root, relativePath);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return root;
};

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const packagedJob = (name: string, source: string) => ({
  [`jobs/${name}/package.json`]: JSON.stringify({
    name: `@shelf/${name}`,
    scripts: { start: `node src/${name}.js` },
    dependencies: { '@shelf/shared': 'workspace:*' }
  }),
  [`jobs/${name}/src/${name}.js`]: source
});

const queueJob = (name: string) => ({
  [`jobs/${name}/package.json`]: JSON.stringify({ name, scripts: { start: `node src/${name}.js` } }),
  [`jobs/${name}/src/${name}.js`]: `// Batch job: runs for every message on the ${name} queue.\nawait work();\n`
});

describe('assembleCandidateFacts', () => {
  it('describes an ordinary Express + Postgres + Redis app with no AI involved', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'shop-api',
        engines: { node: '>=22' },
        scripts: { build: 'tsc -p .', start: 'node dist/index.js' },
        dependencies: { express: '^5.0.0', pg: '^8.11.0', ioredis: '^5.4.0' }
      }),
      'package-lock.json': '{}',
      'src/index.ts': 'import express from "express";'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.packageManager).toBe('npm');
    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'shop-api',
      path: '.',
      framework: 'express',
      exposesHttp: true,
      runtimeVersion: '22',
      buildCommand: 'npm run build',
      startCommand: 'npm run start'
    });

    const kinds = facts.dependencies.map((dependency) => dependency.kind).toSorted();
    expect(kinds).toEqual(['postgres', 'redis']);
    // Attribution matters: an unconsumed dependency reads as noise downstream.
    expect(facts.dependencies.every((dependency) => dependency.consumedBy.includes('shop-api'))).toBe(true);
  });

  it('cites real lines, so the provenance UI can point at the user own code', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify(
        {
          name: 'api',
          scripts: { start: 'node index.js' },
          dependencies: { pg: '^8.0.0' }
        },
        null,
        2
      ),
      'pnpm-lock.yaml': ''
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });
    const citation = facts.dependencies[0]?.evidence[0];

    expect(citation).toBeDefined();
    expect(citation!.file).toBe('package.json');
    expect(citation!.quote).toContain('pg');
  });

  it('never carries an unrelated value from a one-line package manifest into a citation', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: { express: '^5.0.0', pg: '^8.0.0' },
        privateConfig: { token: 'one-line-value-must-not-travel' }
      })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(JSON.stringify(facts)).not.toContain('one-line-value-must-not-travel');
    expect(facts.services[0]?.evidence.some((citation) => citation.quote === '"start":')).toBe(true);
    expect(facts.dependencies[0]?.evidence.some((citation) => citation.quote === '"pg"')).toBe(true);
  });

  it('reads the engine out of a connection string without carrying the value anywhere', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
      '.env': 'DATABASE_URL=mysql://<DATABASE_USER>:<DATABASE_PASSWORD>@db.internal:3306/shop\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });
    const database = facts.dependencies.find((dependency) => dependency.kind === 'mysql');

    expect(database).toBeDefined();
    // The scheme settled the engine; the password must not have survived the trip.
    const serialized = JSON.stringify(facts);
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('db.internal');
    expect(database!.evidence[0]?.quote).toBe('DATABASE_URL=');
  });

  it('identifies a managed provider without disclosing the host', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
      '.env': 'DATABASE_URL=postgres://<DATABASE_USER>:<DATABASE_PASSWORD>@db.abcdefg.supabase.co:5432/postgres\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.dependencies[0]).toMatchObject({
      kind: 'postgres',
      currentlyHostedOn: 'supabase'
    });
    expect(JSON.stringify(facts)).not.toContain('abcdefg');
    // The variable *name* comes along, because leaving this database alone means the composer has to
    // write the address back into the service itself. The value still does not.
    expect(facts.dependencies[0]?.addressedBy).toEqual(['DATABASE_URL']);
  });

  it('uses localhost environment values as topology evidence, not live-hosting evidence', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'api', scripts: { start: 'node index.js' } }),
      '.env': 'DATABASE_URL=postgres://postgres:postgres@localhost:5432/app\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.dependencies[0]).toMatchObject({ kind: 'postgres', addressedBy: ['DATABASE_URL'] });
    expect(facts.dependencies[0]?.currentlyHostedOn).toBeUndefined();
    expect(facts.dependencies[0]?.hostingEvidence).toBeUndefined();
  });

  it('does not provision optional Laravel-style backends from mode settings', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'app', scripts: { start: 'node index.js' } }),
      '.env.example': [
        'FILESYSTEM_DISK=local',
        'QUEUE_CONNECTION=database',
        'CACHE_STORE=database',
        'REDIS_CLIENT=phpredis',
        'REDIS_HOST=127.0.0.1',
        'REDIS_CLUSTER=redis',
        'REDIS_PREFIX=app_',
        'SQS_PREFIX=https://sqs.example.test/account',
        ''
      ].join('\n'),
      'index.js': [
        'process.env.QUEUE_CONNECTION;',
        'process.env.REDIS_CLIENT;',
        'process.env.REDIS_HOST;',
        'process.env.REDIS_CLUSTER;',
        'process.env.REDIS_PREFIX;',
        'process.env.SQS_PREFIX;'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.dependencies).toEqual([]);
  });

  it('does not treat a lookalike hostname as a managed provider', async () => {
    // `supabase.co.evil.test` contains `supabase.co`. Reading it as a live Supabase database would
    // make composition refuse to create the database the user actually needs, on the say-so of
    // whoever wrote that hostname.
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
      '.env': 'DATABASE_URL=postgres://<DATABASE_USER>:<DATABASE_PASSWORD>@db.supabase.co.evil.test:5432/app\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.dependencies[0]?.kind).toBe('postgres');
    expect(facts.dependencies[0]?.currentlyHostedOn).toBeUndefined();
  });

  it('reads environment files that do not begin with .env', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
      'prod.env': 'REDIS_URL=redis://cache.internal:6379\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.dependencies.map((dependency) => dependency.kind)).toEqual(['redis']);
    expect(JSON.stringify(facts)).not.toContain('cache.internal');
  });

  it('asks which engine when nothing settles it', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
      '.env.example': 'DATABASE_URL=\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.uncertainties[0]).toMatchObject({
      kind: 'database-engine-ambiguous',
      environmentVariableName: 'DATABASE_URL',
      blocksDeploy: true
    });
  });

  it('does not ask about the engine when the manifest already proves it', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: { pg: '^8.0.0' }
      }),
      '.env.example': 'DATABASE_URL=\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.uncertainties).toHaveLength(0);
    expect(facts.dependencies.map((dependency) => dependency.kind)).toEqual(['postgres']);
  });

  it('wires the datasource variable declared by Prisma without needing an env file', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'web',
        scripts: { start: 'next start' },
        dependencies: { next: '^15.0.0', '@prisma/client': '^6.0.0' }
      }),
      'prisma/schema.prisma': ['datasource db {', '  provider = "postgresql"', '  url = env("DATABASE_URL")', '}'].join(
        '\n'
      )
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });
    const database = facts.dependencies.find((dependency) => dependency.kind === 'postgres');

    expect(database?.addressedBy).toEqual(['DATABASE_URL']);
    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({
        name: 'DATABASE_URL',
        role: 'infra-dependency',
        dependencyName: 'mainDatabase'
      })
    );
  });

  it('does not replace a Redis-backed queue library with incompatible SQS', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'worker',
        scripts: { start: 'node worker.js' },
        dependencies: { bullmq: '^5.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.dependencies.map((dependency) => dependency.kind)).toEqual(['redis']);
  });

  it('finds each app in a workspace and does not invent one at the root', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'monorepo',
        private: true,
        workspaces: ['apps/*']
      }),
      'pnpm-lock.yaml': '',
      'apps/web/package.json': JSON.stringify({
        name: '@acme/web',
        scripts: { build: 'next build', start: 'next start' },
        dependencies: { next: '^15.0.0' }
      }),
      'apps/worker/package.json': JSON.stringify({
        name: '@acme/worker',
        scripts: { start: 'node index.js' },
        dependencies: { bullmq: '^5.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.workspaceGlobs).toContain('apps/*');
    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['web', 'worker']);
    expect(facts.services.find((service) => service.name === 'web')?.framework).toBe('nextjs');
  });

  it('does not keep a non-deployable workspace package as a dependency consumer', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'monorepo',
        private: true,
        workspaces: ['apps/*']
      }),
      'apps/web/package.json': JSON.stringify({
        name: 'web',
        dependencies: { next: '^15.0.0' }
      }),
      'apps/library/package.json': JSON.stringify({
        name: 'library',
        dependencies: { ioredis: '^5.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services.map((service) => service.name)).toEqual(['web']);
    expect(facts.dependencies[0]?.consumedBy).toEqual([]);
  });

  it('treats Vite as a static build, not as a missing server', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'dashboard',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^7.0.0' }
      }),
      'index.html': '<div id="root"></div>',
      'package-lock.json': '{}'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services[0]).toMatchObject({
      name: 'dashboard',
      exposesHttp: false,
      framework: 'react',
      buildCommand: 'npm run build',
      servesStaticAssets: { path: 'dist' }
    });
    expect(facts.services[0]?.startCommand).toBeUndefined();
  });

  it('tells a server written for Bun from a project that only installs with Bun', async () => {
    const bunServer = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { dev: 'bun run --hot src/index.ts' },
        dependencies: { hono: '^4.0.0' },
        devDependencies: { '@types/bun': 'latest' }
      })
    });
    expect(
      (await assembleCandidateFacts({ root: bunServer, probes: PROBES })).facts.services[0]?.javascriptRuntime
    ).toBe('bun');

    const nodeServer = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node dist/index.js', build: 'bun run build:js' },
        dependencies: { hono: '^4.0.0' }
      }),
      'bun.lock': '{}'
    });
    expect(
      (await assembleCandidateFacts({ root: nodeServer, probes: PROBES })).facts.services[0]?.javascriptRuntime
    ).toBeUndefined();
  });

  it("does not deploy a monorepo's example packages", async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'whiteboard', private: true, workspaces: ['app', 'examples/*'] }),
      'app/package.json': JSON.stringify({
        name: 'whiteboard-app',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^5.0.0' }
      }),
      'examples/with-nextjs/package.json': JSON.stringify({
        name: 'with-nextjs',
        scripts: { build: 'next build', start: 'next start' },
        dependencies: { next: '^16.0.0' }
      })
    });
    expect(
      (await assembleCandidateFacts({ root: repoRoot, probes: PROBES })).facts.services.map(({ name }) => name)
    ).toEqual(['whiteboard-app']);

    // A repository that holds nothing but starters still offers them.
    const startersRoot = await makeRepo({
      'templates/api/package.json': JSON.stringify({
        name: 'api-starter',
        scripts: { start: 'node index.js' },
        dependencies: { hono: '^4.0.0' }
      })
    });
    expect(
      (await assembleCandidateFacts({ root: startersRoot, probes: PROBES })).facts.services.map(({ name }) => name)
    ).toEqual(['api-starter']);
  });

  it('does not deploy a package whose start script only runs a development server', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'whiteboard', private: true, workspaces: ['app', 'dev-docs'] }),
      'app/package.json': JSON.stringify({
        name: 'whiteboard-app',
        scripts: { start: 'yarn && vite', build: 'vite build' },
        dependencies: { react: '^19.0.0' }
      }),
      'dev-docs/package.json': JSON.stringify({
        name: 'docs',
        scripts: { start: 'docusaurus start', build: 'docusaurus build' },
        dependencies: { '@docusaurus/core': '^3.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('keeps a Lambda-wrapped HTTP app a function rather than a server', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'api', dependencies: { hono: '^4.0.0', '@hono/aws-lambda': '^1.0.0' } }),
      'src/index.ts': "import { handle } from '@hono/aws-lambda';\nexport const handler = handle(app);\n"
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: [manifestProbe, lambdaSourceProbe] });

    expect(facts.services.map(({ functionEntrypoint, exposesHttp }) => ({ functionEntrypoint, exposesHttp }))).toEqual([
      { functionEntrypoint: 'src/index.ts', exposesHttp: false }
    ]);
  });

  it('treats React Router framework mode as an HTTP service', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'storefront',
        scripts: { build: 'react-router build', start: 'react-router-serve ./build/server/index.js' },
        dependencies: { '@react-router/node': '^7.0.0', '@react-router/serve': '^7.0.0', react: '^19.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services[0]).toMatchObject({ exposesHttp: true, startCommand: 'npm run start' });
  });

  it('keeps a Go server and its same-named React client as two services', async () => {
    // The repository directory is the root service's name (memos), so it has to match the client package's name
    // for the merge-by-name rule this test guards to be reached at all.
    const repoRoot = join(
      await makeRepo({
        'notes/go.mod': 'module github.com/acme/notes\n\ngo 1.24\n\nrequire github.com/labstack/echo/v4 v4.13.0\n',
        'notes/main.go': 'package main\n',
        'notes/scripts/Dockerfile': 'FROM golang:1.24\nCOPY . .\nEXPOSE 5230\nCMD ["notes"]\n',
        'notes/web/package.json': JSON.stringify({
          name: 'notes',
          scripts: { build: 'vite build' },
          dependencies: { react: '^19.0.0' },
          devDependencies: { vite: '^7.0.0' }
        }),
        'notes/web/index.html': '<div id="root"></div>'
      }),
      'notes'
    );

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, dockerfileProbe, languageManifestProbe]
    });

    expect(
      facts.services
        .map(({ path, language, dockerfile }) => ({ path, language, dockerfile }))
        .toSorted((a, b) => a.path.localeCompare(b.path))
    ).toEqual([
      { path: '.', language: 'go', dockerfile: 'scripts/Dockerfile' },
      { path: 'web', language: 'javascript', dockerfile: undefined }
    ]);
  });

  it('hosts an Astro project without a server adapter as static files', async () => {
    const staticRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'marketing-site',
        scripts: { start: 'astro dev', build: 'astro build' },
        dependencies: { astro: '^7.0.0', '@astrojs/sitemap': '^3.0.0' }
      })
    });
    const staticFacts = (await assembleCandidateFacts({ root: staticRoot, probes: PROBES })).facts;
    expect(staticFacts.services[0]).toMatchObject({ exposesHttp: false, servesStaticAssets: { path: 'dist' } });
    expect(staticFacts.services[0]?.startCommand).toBeUndefined();
    expect(composeConfig({ facts: staticFacts }).config.resources.marketingSite).toMatchObject({
      type: 'hosting-bucket',
      properties: { uploadDirectoryPath: 'dist', build: { command: 'npm run build' } }
    });

    const serverRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'storefront',
        scripts: { build: 'astro build' },
        dependencies: { astro: '^7.0.0', '@astrojs/node': '^9.0.0' }
      })
    });
    const serverFacts = (await assembleCandidateFacts({ root: serverRoot, probes: PROBES })).facts;
    expect(composeConfig({ facts: serverFacts }).config.resources.storefront?.type).toBe('astro-web');
  });

  it('does not turn a Vite-built workspace library into a static website', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/database/package.json': JSON.stringify({
        name: '@acme/database',
        private: true,
        scripts: { build: 'vite build' },
        dependencies: { pg: '^8.0.0' },
        devDependencies: { vite: '^7.0.0', 'vite-plugin-dts': '^4.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
    expect(facts.dependencies[0]?.consumedBy).toEqual([]);
  });

  it('records which workspace packages a member imports, whatever specifier it uses', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*', 'shared/*'] }),
      'packages/api/package.json': JSON.stringify({
        name: '@acme/api',
        scripts: { start: 'node index.js' },
        dependencies: { express: '^5.0.0', '@acme/db': '*', '@acme/ui': 'workspace:*' }
      }),
      'shared/db/package.json': JSON.stringify({ name: '@acme/db', private: true }),
      'shared/ui/package.json': JSON.stringify({ name: '@acme/ui', private: true })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.find((entry) => entry.name === 'api')?.workspace).toEqual({
      packageName: '@acme/api',
      internalDependencies: ['@acme/db', '@acme/ui'],
      buildsFromRoot: false
    });
  });

  it('does not turn a workspace root start orchestrator into a service', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'monorepo',
        workspaces: ['apps/*'],
        scripts: { start: 'turbo run start' }
      }),
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: { express: '^5.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services.map((entry) => entry.name)).toEqual(['api']);
  });

  it('detects a plain root HTML site without inventing a process', async () => {
    const repoRoot = await makeRepo({
      'index.html': '<!doctype html><html><body>Hello</body></html>'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [staticSiteProbe]
    });

    expect(facts.services[0]).toMatchObject({
      name: 'staticSite',
      exposesHttp: false,
      servesStaticAssets: { path: '.' }
    });
  });

  it('reports a migration tool without inventing when it runs', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: { prisma: '^6.0.0', pg: '^8.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.migrations[0]).toMatchObject({
      tool: 'prisma',
      runsAt: 'unknown'
    });
  });

  // r2gg part B: what makes a service private, a script a job, and a workspace package a library. When the evidence is
  // short of that, each stays what it was before: a web service, a worker, a package.
  it('makes a service private only when it says it is internal, other containers call it, and it takes no webhooks', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'shop', workspaces: ['apps/*'] }),
      'package-lock.json': '{}',
      'apps/api/package.json': pkg('api', 'node src/index.js', { express: '^5.0.0' }),
      'apps/api/src/index.js': [
        'fetch(`${process.env.PRICING_URL}/price`);',
        'fetch(`${process.env.LEDGER_URL}/entries`);',
        'fetch(`${process.env.PAYMENTS_URL}/charge`);',
        'app.listen(3000);',
        ''
      ].join('\n'),
      'apps/pricing/package.json': pkg('pricing', 'node src/index.js', { express: '^5.0.0' }),
      'apps/pricing/src/index.js': '// Internal service: only the API calls it.\napp.listen(3001);\n',
      // Called only by the API, but nothing says nobody else does.
      'apps/ledger/package.json': pkg('ledger', 'node src/index.js', { express: '^5.0.0' }),
      'apps/ledger/src/index.js': 'app.listen(3003);\n',
      // Says it is internal, but Stripe calls its webhook.
      'apps/payments/package.json': pkg('payments', 'node src/index.js', { express: '^5.0.0' }),
      'apps/payments/src/index.js':
        "// Internal service: only the API calls it.\napp.post('/webhooks/stripe', onEvent);\napp.listen(3004);\n",
      'apps/worker/package.json': pkg('worker', 'node src/index.js'),
      'apps/worker/src/index.js': 'setInterval(() => fetch(`${process.env.API_URL}/tick`), 1000);\n',
      // A function reads its address: a private service would be out of its reach.
      'apps/search/package.json': pkg('search', 'node src/index.js', { express: '^5.0.0' }),
      'apps/search/src/index.js': '// Internal service.\napp.listen(3002);\n',
      'apps/api/src/search.js': 'fetch(`${process.env.SEARCH_URL}/q`);\n',
      'functions/suggest.ts':
        "import type { APIGatewayProxyEventV2 } from 'aws-lambda';\nexport const handler = async (event: APIGatewayProxyEventV2) => fetch(`${process.env.SEARCH_URL}/q?${event.rawQueryString}`);\n"
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: [...PROBES, lambdaSourceProbe] });
    const result = composeConfig({ facts, projectName: 'shop' });

    expect(
      Object.fromEntries(Object.entries(result.config.resources).map(([name, resource]) => [name, resource.type]))
    ).toMatchObject({
      api: 'web-service',
      pricing: 'private-service',
      ledger: 'web-service',
      payments: 'web-service',
      search: 'web-service',
      suggest: 'function',
      worker: 'worker-service'
    });
  });

  it('makes a script a job only when it says so, binds it to the one queue, and leaves libraries out', async () => {
    const files = {
      'package.json': JSON.stringify({ name: 'shelf', private: true }),
      'pnpm-workspace.yaml': 'packages:\n  - apps/*\n  - jobs/*\n  - packages/*\n',
      'pnpm-lock.yaml': '',
      'apps/api/package.json': JSON.stringify({
        name: '@shelf/api',
        scripts: { start: 'node src/index.js' },
        dependencies: { express: '^5.0.0', '@aws-sdk/client-sqs': '^3.700.0' }
      }),
      'apps/api/src/index.js':
        'sqs.send(new SendMessageCommand({ QueueUrl: process.env.REPORT_QUEUE_URL }));\napp.listen(3000);\n',
      ...packagedJob(
        'report',
        '// Batch job: builds a report. It runs for every message on the report queue.\nconst rows = await load();\nawait save(rows);\n'
      ),
      // Runs once and exits, but nothing says it is a job: a worker, as before.
      ...packagedJob('export', 'const rows = await load();\nawait upload(rows);\n'),
      // Each says it is a job, and each keeps running.
      ...packagedJob('stream', '// Batch job.\nfor await (const event of subscription) await handle(event);\n'),
      ...packagedJob('poll', '// Batch job.\nlet running = true;\nwhile (running) await poll();\n'),
      ...packagedJob(
        'temporal',
        "// Batch job.\nconst worker = await Worker.create({ taskQueue: 'reports' });\nawait worker.run();\n"
      ),
      'packages/shared/package.json': JSON.stringify({ name: '@shelf/shared', exports: { '.': './src/index.ts' } })
    };
    const repoRoot = await makeRepo(files);

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    const shapes = Object.fromEntries(
      facts.services.map((service) => [service.name, [service.executionModel, service.functionTriggers]])
    );
    expect(shapes).toEqual({
      api: ['long-running', []],
      report: ['one-shot', [{ type: 'queue', dependencyName: 'jobQueue' }]],
      export: ['long-running', []],
      stream: ['long-running', []],
      poll: ['long-running', []],
      temporal: ['long-running', []]
    });
  });

  it('binds no queue when two jobs could each mean a different one', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'jobs', private: true, workspaces: ['jobs/*'] }),
      'package-lock.json': '{}',
      ...queueJob('invoices'),
      ...queueJob('emails'),
      'jobs/invoices/src/enqueue.js': 'sqs.send({ QueueUrl: process.env.INVOICES_QUEUE_URL });\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.map((service) => [service.name, service.executionModel, service.functionTriggers])).toEqual([
      ['emails', 'one-shot', []],
      ['invoices', 'one-shot', []]
    ]);
  });

  it('keeps a workspace package a frontend imports only in tests', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'm', private: true }),
      'pnpm-workspace.yaml': 'packages:\n  - apps/*\n  - packages/*\n',
      'pnpm-lock.yaml': '',
      'apps/web/package.json': JSON.stringify({
        name: '@m/web',
        scripts: { build: 'vite build', dev: 'vite' },
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^6.0.0' }
      }),
      'apps/web/index.html': '<div id="root"></div>\n',
      'apps/e2e/package.json': JSON.stringify({
        name: '@m/e2e',
        devDependencies: { '@m/web': 'workspace:*', '@playwright/test': '^1.50.0' }
      }),
      // A library build that the web app imports at runtime is no static site.
      'packages/ui/package.json': JSON.stringify({
        name: '@m/ui',
        scripts: { build: 'vite build' },
        dependencies: { react: '^19.0.0', vite: '^6.0.0' }
      }),
      'apps/admin/package.json': JSON.stringify({
        name: '@m/admin',
        scripts: { build: 'vite build' },
        dependencies: { '@m/ui': 'workspace:*', react: '^19.0.0', vite: '^6.0.0' }
      }),
      'apps/admin/index.html': '<div id="root"></div>\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['admin', 'web']);
  });

  it('produces an empty but valid document for a repository with nothing to deploy', async () => {
    const repoRoot = await makeRepo({ 'README.md': '# just docs' });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services).toEqual([]);
    expect(facts.dependencies).toEqual([]);
  });
});
