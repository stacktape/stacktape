import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from './assemble';
import { environmentProbe } from './probes/environment';
import { manifestProbe } from './probes/manifest';
import { staticSiteProbe } from './probes/static-site';

const PROBES = [manifestProbe, environmentProbe];

const startLibraryManifest = (name: string) =>
  JSON.stringify({
    name,
    scripts: { build: 'vite build && tsc --emitDeclarationOnly' },
    dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
  });

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

  it('produces an empty but valid document for a repository with nothing to deploy', async () => {
    const repoRoot = await makeRepo({ 'README.md': '# just docs' });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services).toEqual([]);
    expect(facts.dependencies).toEqual([]);
  });

  it('identifies TanStack Start from @tanstack/react-start and infers tanstack-start framework', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'tanstack-app',
        scripts: { build: 'vite build', start: 'node .output/server/index.mjs' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          '@tanstack/react-router': '^1.170.32',
          react: '^19.0.0'
        }
      }),
      'pnpm-lock.yaml': ''
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'tanstack-app',
      framework: 'tanstack-start',
      exposesHttp: true
    });
  });

  it('identifies TanStack Start from @tanstack/solid-start and infers tanstack-start framework', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'tanstack-solid-app',
        scripts: { build: 'vite build', start: 'node .output/server/index.mjs' },
        dependencies: {
          '@tanstack/solid-start': '^1.168.26',
          '@tanstack/solid-router': '^1.170.32',
          'solid-js': '^1.9.0'
        }
      }),
      'pnpm-lock.yaml': ''
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'tanstack-solid-app',
      framework: 'tanstack-start',
      exposesHttp: true
    });
  });

  it('identifies TanStack Start from @tanstack/vue-start and infers tanstack-start framework', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'tanstack-vue-app',
        scripts: { build: 'vite build', start: 'node .output/server/index.mjs' },
        dependencies: {
          '@tanstack/vue-start': '^1.168.46',
          '@tanstack/vue-router': '^1.170.32',
          vue: '^3.5.0'
        }
      }),
      'pnpm-lock.yaml': ''
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'tanstack-vue-app',
      framework: 'tanstack-start',
      exposesHttp: true
    });
  });

  it('does not turn a workspace library with Start dependencies into a service without start, build, or config', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/ui-kit/package.json': JSON.stringify({
        name: '@acme/ui-kit',
        private: true,
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          react: '^19.0.0'
        }
      })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('does not turn a Vite-built TypeScript library using Start APIs into an SSR application', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/start-helpers/package.json': JSON.stringify({
        name: '@acme/start-helpers',
        private: true,
        scripts: {
          build: 'vite build && tsc --emitDeclarationOnly',
          dev: 'vite build --watch'
        },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          react: '^19.0.0'
        },
        devDependencies: {
          typescript: '^6.0.0',
          vite: '^8.0.14',
          'vite-plugin-dts': '^4.5.4'
        }
      }),
      'packages/start-helpers/vite.config.ts': [
        "import { defineConfig } from 'vite';",
        "import dts from 'vite-plugin-dts';",
        "export default defineConfig({ plugins: [dts()], build: { lib: { entry: 'src/index.ts' } } });"
      ].join('\n'),
      'packages/start-helpers/src/index.ts': [
        "import type { AnyStartInstance } from '@tanstack/react-start';",
        'export type StartPluginOptions = { start?: AnyStartInstance };'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('does not treat a type-only Start import in a library Vite config as deployment evidence', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'start-adapter-library',
        private: true,
        scripts: { build: 'vite build && tsc --emitDeclarationOnly' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          react: '^19.0.0'
        },
        devDependencies: {
          typescript: '^6.0.0',
          vite: '^8.0.14',
          'vite-plugin-dts': '^4.5.4'
        }
      }),
      'vite.config.ts': [
        "import type { AnyStartInstance } from '@tanstack/react-start';",
        "import dts from 'vite-plugin-dts';",
        "export default { plugins: [dts()], build: { lib: { entry: 'src/index.ts' } } };"
      ].join('\n'),
      'src/index.ts': 'export type AdapterOptions = { start?: AnyStartInstance };'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('does not treat an unrelated start script as proof of a TanStack Start server', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'component-library',
        private: true,
        scripts: {
          build: 'vite build && tsc --emitDeclarationOnly',
          start: 'storybook dev -p 6006'
        },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          react: '^19.0.0'
        },
        devDependencies: {
          storybook: '^10.0.0',
          typescript: '^6.0.0',
          vite: '^8.0.14'
        }
      }),
      'vite.config.ts': "export default { build: { lib: { entry: 'src/index.ts' } } };",
      'src/index.ts': 'export const component = true;'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('keeps a build-only Start deployment when its Vite config proves the framework plugin', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'tanstack-serverless-app',
        scripts: { build: 'vite build', dev: 'vite dev' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          '@tanstack/react-router': '^1.170.32',
          react: '^19.0.0'
        }
      }),
      'vite.config.ts': [
        "import { defineConfig } from 'vite';",
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default defineConfig({ plugins: [tanstackStart()] });'
      ].join('\n'),
      'src/routes/index.tsx': 'export const Route = {};'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      name: 'tanstack-serverless-app',
      framework: 'tanstack-start',
      buildCommand: 'npm run build'
    });
    expect(facts.services[0]?.startCommand).toBeUndefined();
  });

  it('keeps a legacy build-only Start deployment configured through @tanstack/start/config', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'legacy-tanstack-app',
        scripts: { build: 'vinxi build', dev: 'vinxi dev' },
        dependencies: {
          '@tanstack/start': '^1.120.20',
          '@tanstack/react-router': '^1.120.20',
          react: '^19.0.0'
        }
      }),
      'app.config.ts': [
        "import { defineConfig } from '@tanstack/start/config';",
        'export default defineConfig({});'
      ].join('\n'),
      'src/routes/index.tsx': 'export const Route = {};'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      name: 'legacy-tanstack-app',
      framework: 'tanstack-start',
      buildCommand: 'npm run build'
    });
  });

  it('resolves framework ambiguity between @solidjs/start and @tanstack/solid-start via config plugins', async () => {
    const tanstackRepo = await makeRepo({
      'package.json': JSON.stringify({
        name: 'solid-hybrid-app',
        scripts: { build: 'vite build', start: 'node .output/server/index.mjs' },
        dependencies: {
          '@solidjs/start': '^1.0.0',
          '@tanstack/solid-start': '^1.168.49',
          'solid-js': '^1.9.0'
        }
      }),
      'vite.config.ts':
        "import { tanstackStart } from '@tanstack/solid-start/plugin/vite';\nexport default { plugins: [tanstackStart()] };"
    });

    const { facts: tanstackFacts } = await assembleCandidateFacts({ root: tanstackRepo, probes: PROBES });
    expect(tanstackFacts.services[0]?.framework).toBe('tanstack-start');

    const solidRepo = await makeRepo({
      'package.json': JSON.stringify({
        name: 'solid-start-app',
        scripts: { build: 'vinxi build', start: 'vinxi start' },
        dependencies: {
          '@solidjs/start': '^1.0.0',
          '@tanstack/solid-start': '^1.168.49',
          'solid-js': '^1.9.0'
        }
      }),
      'app.config.ts': "import { defineConfig } from '@solidjs/start/config';\nexport default defineConfig({});"
    });

    const { facts: solidFacts } = await assembleCandidateFacts({ root: solidRepo, probes: PROBES });
    expect(solidFacts.services[0]?.framework).toBe('solid-start');
  });

  it('resolves framework ambiguity between Next.js and Remix via build script or config', async () => {
    const remixRepo = await makeRepo({
      'package.json': JSON.stringify({
        name: 'competing-app',
        scripts: { build: 'remix vite:build', start: 'remix-serve build/server/index.js' },
        dependencies: {
          next: '^15.0.0',
          '@remix-run/node': '^2.15.0'
        }
      })
    });

    const { facts: remixFacts } = await assembleCandidateFacts({ root: remixRepo, probes: PROBES });
    expect(remixFacts.services[0]?.framework).toBe('remix');

    const nextRepo = await makeRepo({
      'package.json': JSON.stringify({
        name: 'competing-app',
        scripts: { build: 'next build', start: 'next start' },
        dependencies: {
          next: '^15.0.0',
          '@remix-run/node': '^2.15.0'
        }
      })
    });

    const { facts: nextFacts } = await assembleCandidateFacts({ root: nextRepo, probes: PROBES });
    expect(nextFacts.services[0]?.framework).toBe('nextjs');
  });

  it('prefers an active TanStack Vite plugin over a stale Next.js config', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'migrated-app',
        scripts: { build: 'vite build', dev: 'vite dev' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          next: '^15.0.0',
          react: '^19.0.0'
        }
      }),
      'next.config.js': 'module.exports = {};',
      'vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [tanstackStart()] };'
      ].join('\n'),
      'src/routes/index.tsx': 'export const Route = {};'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      name: 'migrated-app',
      framework: 'tanstack-start',
      buildCommand: 'npm run build'
    });
  });

  it('ignores Start plugin text in comments, strings, and inline type-only imports', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/comment-decoy/package.json': JSON.stringify({
        name: 'comment-decoy',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/comment-decoy/vite.config.ts': [
        "// import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'const example = "tanstackStart()";',
        'export default { example };'
      ].join('\n'),
      'packages/type-decoy/package.json': JSON.stringify({
        name: 'type-decoy',
        scripts: { build: 'vite build && tsc --emitDeclarationOnly' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/type-decoy/vite.config.ts': [
        "import { type tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export type PluginFactory = typeof tanstackStart;',
        'export default { build: { lib: { entry: "src/index.ts" } } };'
      ].join('\n'),
      'packages/uncalled-import/package.json': JSON.stringify({
        name: 'uncalled-import',
        scripts: { build: 'vite build && tsc --emitDeclarationOnly' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/uncalled-import/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export { tanstackStart };',
        'export default { build: { lib: { entry: "src/index.ts" } } };'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('requires a parse-clean imported plugin call reachable from the exported config plugin graph', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/helper-only/package.json': startLibraryManifest('helper-only'),
      'packages/helper-only/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export const createStartPlugin = () => tanstackStart();',
        'export default { build: { lib: { entry: "src/index.ts" } }, plugins: [] };'
      ].join('\n'),
      'packages/false-branch/package.json': startLibraryManifest('false-branch'),
      'packages/false-branch/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [false && tanstackStart()], build: { lib: { entry: "src/index.ts" } } };'
      ].join('\n'),
      'packages/shadowed/package.json': startLibraryManifest('shadowed'),
      'packages/shadowed/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'const createPlugin = (tanstackStart: () => unknown) => tanstackStart();',
        'export default { plugins: [createPlugin(() => ({}))] };'
      ].join('\n'),
      'packages/malformed/package.json': startLibraryManifest('malformed'),
      'packages/malformed/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [tanstackStart(] };'
      ].join('\n'),
      'packages/namespace-helper/package.json': startLibraryManifest('namespace-helper'),
      'packages/namespace-helper/vite.config.ts': [
        "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
        'export const createStartPlugin = () => startPlugin.tanstackStart();',
        'export default { build: { lib: { entry: "src/index.ts" } }, plugins: [] };'
      ].join('\n'),
      'packages/uncalled-object-helper/package.json': startLibraryManifest('uncalled-object-helper'),
      'packages/uncalled-object-helper/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'const helpers = { make: () => tanstackStart() };',
        'export default { build: { lib: { entry: "src/index.ts" } }, plugins: [helpers.make] };'
      ].join('\n'),
      'packages/shadowed-object-helper/package.json': startLibraryManifest('shadowed-object-helper'),
      'packages/shadowed-object-helper/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'const helpers = { make: () => tanstackStart() };',
        'const createConfig = (helpers = { make: () => ({}) }) => ({ plugins: [helpers.make()] });',
        'export default createConfig();'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });

  it('recognizes called namespace imports for current React, Solid, and Vue Start plugins', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['apps/*'] }),
      'apps/react/package.json': JSON.stringify({
        name: 'react-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'apps/react/vite.config.ts': [
        "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [startPlugin.tanstackStart()] };'
      ].join('\n'),
      'apps/solid/package.json': JSON.stringify({
        name: 'solid-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/solid-start': '^1.168.49', 'solid-js': '^1.9.0' }
      }),
      'apps/solid/vite.config.ts': [
        "import * as startPlugin from '@tanstack/solid-start/plugin/vite';",
        "export default { plugins: [startPlugin['tanstackStart']()] };"
      ].join('\n'),
      'apps/vue/package.json': JSON.stringify({
        name: 'vue-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/vue-start': '^1.168.49', vue: '^3.5.0' }
      }),
      'apps/vue/vite.config.ts': [
        "import { tanstackStart as createStartPlugin } from '@tanstack/vue-start/plugin/vite';",
        'export default { plugins: [createStartPlugin()] };'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.map((service) => [service.name, service.framework]).toSorted()).toEqual([
      ['react-start', 'tanstack-start'],
      ['solid-start', 'tanstack-start'],
      ['vue-start', 'tanstack-start']
    ]);
  });

  it('follows local config, plugin-list, and helper bindings from the default export', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['apps/*'] }),
      'apps/named/package.json': JSON.stringify({
        name: 'named-binding-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'apps/named/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'const plugins = [tanstackStart()];',
        'const config = () => ({ plugins });',
        'export default config;'
      ].join('\n'),
      'apps/namespace/package.json': JSON.stringify({
        name: 'namespace-helper-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/vue-start': '^1.168.49', vue: '^3.5.0' }
      }),
      'apps/namespace/vite.config.ts': [
        "import * as startPlugin from '@tanstack/vue-start/plugin/vite';",
        'const createStartPlugin = () => startPlugin.tanstackStart();',
        'export default { plugins: [createStartPlugin()] };'
      ].join('\n'),
      'apps/object-property/package.json': JSON.stringify({
        name: 'object-property-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'apps/object-property/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'const helpers = { make: () => tanstackStart() };',
        'export default { plugins: [helpers.make()] };'
      ].join('\n'),
      'apps/object-element/package.json': JSON.stringify({
        name: 'object-element-start',
        scripts: { build: 'vite build' },
        dependencies: { '@tanstack/solid-start': '^1.168.49', 'solid-js': '^1.9.0' }
      }),
      'apps/object-element/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/solid-start/plugin/vite';",
        'const helpers = { make() { return tanstackStart(); } };',
        "export default { plugins: [helpers['make']()] };"
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.map((service) => service.name)).toEqual([
      'named-binding-start',
      'namespace-helper-start',
      'object-element-start',
      'object-property-start'
    ]);
  });

  it('recognizes a called legacy namespace config import', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'legacy-start',
        scripts: { build: 'vinxi build' },
        dependencies: { '@tanstack/start': '^1.120.20', react: '^19.0.0' }
      }),
      'app.config.ts': [
        "import * as startConfig from '@tanstack/start/config';",
        'export default startConfig.defineConfig({});'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services[0]?.framework).toBe('tanstack-start');
  });

  it('does not let type-only TanStack evidence override an active SolidStart config', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'solid-app',
        scripts: { build: 'vinxi build', start: 'vinxi start' },
        dependencies: {
          '@solidjs/start': '^1.0.0',
          '@tanstack/solid-start': '^1.168.49',
          'solid-js': '^1.9.0'
        }
      }),
      'app.config.ts': [
        "import { type tanstackStart } from '@tanstack/solid-start/plugin/vite';",
        "import { defineConfig as defineSolidConfig } from '@solidjs/start/config';",
        'export type Decoy = typeof tanstackStart;',
        'export default defineSolidConfig({});'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services[0]?.framework).toBe('solid-start');
  });

  it('parses Start production commands as invocations instead of matching echo arguments', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/echo-vinxi/package.json': JSON.stringify({
        name: 'echo-vinxi',
        scripts: { build: 'vite build', start: 'echo vinxi start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/echo-tanstack/package.json': JSON.stringify({
        name: 'echo-tanstack',
        scripts: { build: 'vite build', start: 'echo tanstack start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/real-server/package.json': JSON.stringify({
        name: 'real-server',
        scripts: { build: 'vite build', start: 'node ./dist/server/server.js' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/require-hook/package.json': JSON.stringify({
        name: 'require-hook',
        scripts: { build: 'vite build', start: 'node -r dotenv/config ./dist/server/server.js' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/import-hook/package.json': JSON.stringify({
        name: 'import-hook',
        scripts: { build: 'vite build', start: 'node --import ./register.mjs ./dist/server/server.js' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/env-file/package.json': JSON.stringify({
        name: 'env-file',
        scripts: { build: 'vite build', start: 'node --env-file .env ./dist/server/server.js' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/yarn-vinxi/package.json': JSON.stringify({
        name: 'yarn-vinxi',
        scripts: { build: 'vite build', start: 'yarn vinxi start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/yarn-run-vinxi/package.json': JSON.stringify({
        name: 'yarn-run-vinxi',
        scripts: { build: 'vite build', start: 'yarn run vinxi start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/yarn-silent-vinxi/package.json': JSON.stringify({
        name: 'yarn-silent-vinxi',
        scripts: { build: 'vite build', start: 'yarn --silent vinxi start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/echo-node/package.json': JSON.stringify({
        name: 'echo-node',
        scripts: { build: 'vite build', start: 'echo node -r dotenv/config ./dist/server/server.js' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/yarn-echo/package.json': JSON.stringify({
        name: 'yarn-echo',
        scripts: { build: 'vite build', start: 'yarn echo vinxi start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/yarn-run-echo/package.json': JSON.stringify({
        name: 'yarn-run-echo',
        scripts: { build: 'vite build', start: 'yarn run echo vinxi start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/node-argument-decoy/package.json': JSON.stringify({
        name: 'node-argument-decoy',
        scripts: { build: 'vite build', start: 'node --env-file .env ./scripts/log.js ./dist/server/server.js' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.map((service) => service.name)).toEqual([
      'env-file',
      'import-hook',
      'real-server',
      'require-hook',
      'yarn-run-vinxi',
      'yarn-silent-vinxi',
      'yarn-vinxi'
    ]);
  });

  it('prefers active config/build evidence over stale or decoy Next.js lifecycle text', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['apps/*'] }),
      'apps/stale-lifecycle/package.json': JSON.stringify({
        name: 'stale-lifecycle',
        scripts: { build: 'vite build', dev: 'next dev', start: 'next start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', next: '^15.0.0', react: '^19.0.0' }
      }),
      'apps/stale-lifecycle/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [tanstackStart()] };'
      ].join('\n'),
      'apps/echo-build/package.json': JSON.stringify({
        name: 'echo-build',
        scripts: { build: 'echo next build && vite build', start: 'next start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', next: '^15.0.0', react: '^19.0.0' }
      }),
      'apps/echo-build/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [tanstackStart()] };'
      ].join('\n'),
      'apps/active-next/package.json': JSON.stringify({
        name: 'active-next',
        scripts: { build: 'cross-env NODE_ENV=production next build', start: 'next start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', next: '^15.0.0', react: '^19.0.0' }
      }),
      'apps/active-next/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [tanstackStart()] };'
      ].join('\n'),
      'apps/start-only-next/package.json': JSON.stringify({
        name: 'start-only-next',
        scripts: { start: 'npx --yes next start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', next: '^15.0.0', react: '^19.0.0' }
      }),
      'apps/start-only-next/vite.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        'export default { plugins: [tanstackStart()] };'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });
    const frameworks = Object.fromEntries(facts.services.map((service) => [service.name, service.framework]));

    expect(frameworks).toEqual({
      'active-next': 'nextjs',
      'echo-build': 'tanstack-start',
      'stale-lifecycle': 'tanstack-start',
      'start-only-next': 'nextjs'
    });
  });

  it('recognizes current React, Solid, and Vue TanStack Start Rsbuild configs', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['apps/*'] }),
      'apps/react/package.json': JSON.stringify({
        name: 'react-rsbuild',
        scripts: { build: 'rsbuild build', start: 'rsbuild start' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'apps/react/rsbuild.config.ts': [
        "import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';",
        'export default { plugins: [tanstackStart()] };'
      ].join('\n'),
      'apps/solid/package.json': JSON.stringify({
        name: 'solid-rsbuild',
        scripts: { build: 'rsbuild build' },
        dependencies: { '@tanstack/solid-start': '^1.168.49', 'solid-js': '^1.9.0' }
      }),
      'apps/solid/rsbuild.config.ts': [
        "import * as startPlugin from '@tanstack/solid-start/plugin/rsbuild';",
        'export default { plugins: [startPlugin.tanstackStart()] };'
      ].join('\n'),
      'apps/vue/package.json': JSON.stringify({
        name: 'vue-rsbuild',
        scripts: { build: 'rsbuild build', start: 'node ./dist/server/index.js' },
        dependencies: { '@tanstack/vue-start': '^1.168.49', vue: '^3.5.0' }
      }),
      'apps/vue/rsbuild.config.ts': [
        "import { tanstackStart as createStart } from '@tanstack/vue-start/plugin/rsbuild';",
        'export default { plugins: [createStart()] };'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services.map((service) => [service.name, service.framework]).toSorted()).toEqual([
      ['react-rsbuild', 'tanstack-start'],
      ['solid-rsbuild', 'tanstack-start'],
      ['vue-rsbuild', 'tanstack-start']
    ]);
  });

  it('does not treat Rsbuild plugin comments or type-only imports as Start applications', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'monorepo', private: true, workspaces: ['packages/*'] }),
      'packages/comment/package.json': JSON.stringify({
        name: 'comment-rsbuild',
        scripts: { build: 'rsbuild build' },
        dependencies: { '@tanstack/react-start': '^1.168.49', react: '^19.0.0' }
      }),
      'packages/comment/rsbuild.config.ts':
        "// import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';\nexport default {};",
      'packages/type-only/package.json': JSON.stringify({
        name: 'type-rsbuild',
        scripts: { build: 'rsbuild build' },
        dependencies: { '@tanstack/vue-start': '^1.168.49', vue: '^3.5.0' }
      }),
      'packages/type-only/rsbuild.config.ts': [
        "import type * as startPlugin from '@tanstack/vue-start/plugin/rsbuild';",
        'export type Factory = typeof startPlugin.tanstackStart;',
        'export default {};'
      ].join('\n'),
      'packages/uncalled/package.json': JSON.stringify({
        name: 'uncalled-rsbuild',
        scripts: { build: 'rsbuild build' },
        dependencies: { '@tanstack/solid-start': '^1.168.49', 'solid-js': '^1.9.0' }
      }),
      'packages/uncalled/rsbuild.config.ts': [
        "import { tanstackStart } from '@tanstack/solid-start/plugin/rsbuild';",
        'export { tanstackStart };',
        'export default {};'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: PROBES });

    expect(facts.services).toEqual([]);
  });
});
