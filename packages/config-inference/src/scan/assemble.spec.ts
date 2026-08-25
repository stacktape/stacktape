import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from './assemble';
import { dockerfileProbe } from './probes/dockerfile';
import { environmentProbe } from './probes/environment';
import { manifestProbe } from './probes/manifest';
import { serverEntrypointProbe } from './probes/server-entrypoint';
import { staticSiteProbe } from './probes/static-site';

const PROBES = [manifestProbe, environmentProbe];

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

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

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
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
      '.env': 'DATABASE_URL=postgres://postgres:postgres@localhost:5432/app\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

    expect(facts.dependencies[0]).toMatchObject({
      kind: 'postgres',
      addressedBy: ['DATABASE_URL']
    });
    expect(facts.dependencies[0]?.currentlyHostedOn).toBeUndefined();
    expect(facts.dependencies[0]?.hostingEvidence).toBeUndefined();
  });

  it('does not provision optional Laravel-style backends from mode settings', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'app',
        scripts: { start: 'node index.js' }
      }),
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

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

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

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });
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
      'package.json': JSON.stringify({
        name: 'monorepo',
        private: true,
        workspaces: ['packages/*']
      }),
      'packages/database/package.json': JSON.stringify({
        name: '@acme/database',
        private: true,
        scripts: { build: 'vite build' },
        dependencies: { pg: '^8.0.0' },
        devDependencies: { vite: '^7.0.0', 'vite-plugin-dts': '^4.0.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: PROBES
    });

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

  it('recognizes a React Router Framework default template as an HTTP web service even without EXPOSE in Dockerfile', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'my-react-router-app',
        scripts: {
          build: 'react-router build',
          dev: 'react-router dev',
          start: 'react-router-serve ./build/server/index.js'
        },
        dependencies: {
          '@react-router/node': '^8.0.0',
          '@react-router/serve': '^8.0.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0'
        }
      }),
      'react-router.config.ts': 'export default { ssr: true };\n',
      Dockerfile: ['FROM node:24-alpine', 'COPY . /app', 'WORKDIR /app', 'CMD ["npm", "run", "start"]'].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'my-react-router-app',
      path: '.',
      framework: 'react-router',
      exposesHttp: true,
      executionModel: 'long-running',
      buildCommand: 'npm run build',
      startCommand: 'npm run start',
      dockerfile: 'Dockerfile'
    });
  });

  it('recognizes a React Router Node custom-server template with Express entrypoint', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'custom-server-app',
        scripts: {
          build: 'react-router build',
          start: 'node server.js'
        },
        dependencies: {
          '@react-router/express': '^8.0.0',
          '@react-router/node': '^8.0.0',
          express: '^5.0.0',
          react: '^19.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0'
        }
      }),
      'server.js': [
        'import express from "express";',
        'const app = express();',
        'const PORT = process.env.PORT || 3000;',
        'app.listen(PORT, () => console.log(`Listening on ${PORT}`));'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'custom-server-app',
      path: '.',
      framework: 'react-router',
      exposesHttp: true,
      containerEntrypoint: 'server.js',
      startCommand: 'npm run start'
    });
  });

  it('treats a React Router SPA with ssr: false as a static hosting site for build/client', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'spa-app',
        scripts: {
          build: 'react-router build'
        },
        dependencies: {
          '@react-router/node': '^8.0.0',
          react: '^19.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0',
          vite: '^8.0.0'
        }
      }),
      'react-router.config.ts': 'export default { ssr: false };\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'spa-app',
      path: '.',
      framework: 'react-router',
      exposesHttp: false,
      servesStaticAssets: { path: 'build/client' },
      buildCommand: 'npm run build'
    });
    expect(facts.services[0]?.startCommand).toBeUndefined();
  });

  it('reads quoted React Router SPA properties and honors a safe custom build directory', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'custom-output-spa',
        scripts: { build: 'react-router build' },
        dependencies: { 'react-router': '^8.0.0' },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts': [
        'export default {',
        '  "ssr": false,',
        "  'buildDirectory': './dist/router',",
        '} satisfies Config;'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      framework: 'react-router',
      exposesHttp: false,
      buildCommand: 'npm run build',
      servesStaticAssets: { path: 'dist/router/client' }
    });
    expect(facts.services[0]?.evidence.some((citation) => citation.file === 'react-router.config.ts')).toBe(true);
  });

  it('ignores ssr: false text in comments and strings', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'server-rendered-app',
        scripts: {
          build: 'react-router build',
          start: 'react-router-serve ./build/server/index.js'
        },
        dependencies: {
          '@react-router/node': '^8.0.0',
          '@react-router/serve': '^8.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts': [
        'const documentation = "ssr: false";',
        'export default {',
        '  // ssr: false',
        '  example: /ignore, ssr: false/,',
        '  ssr: true,',
        '};'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      framework: 'react-router',
      exposesHttp: true,
      startCommand: 'npm run start'
    });
    expect(facts.services[0]?.servesStaticAssets).toBeUndefined();
  });

  it('stays silent when React Router config values are indirect instead of literal', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'computed-config-app',
        scripts: {
          build: 'react-router build',
          start: 'react-router-serve ./build/server/index.js'
        },
        dependencies: {
          '@react-router/serve': '^8.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts': [
        'const config = { ssr: false };',
        'export default config;',
        'const example = { pattern: /ignore, ssr: false/ };'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({ framework: 'react-router', exposesHttp: true });
    expect(facts.services[0]?.servesStaticAssets).toBeUndefined();
  });

  it('ignores an export-shaped React Router SPA decoy inside a top-level regex literal', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'regex-decoy-app',
        scripts: { build: 'react-router build', start: 'react-router-serve ./build/server/index.js' },
        dependencies: { '@react-router/serve': '^8.0.0', 'react-router': '^8.0.0' },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts':
        'const docs = /export default { ssr: false }/; const config = { ssr: true }; export default config;\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: [manifestProbe] });
    expect(facts.services[0]).toMatchObject({ framework: 'react-router', exposesHttp: true });
    expect(facts.services[0]?.servesStaticAssets).toBeUndefined();
  });

  it('does not treat a false-prefixed expression as definite React Router SPA mode', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'conditional-spa',
        scripts: { build: 'react-router build', start: 'react-router-serve ./build/server/index.js' },
        dependencies: { '@react-router/serve': '^8.0.0', 'react-router': '^8.0.0' },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts': "export default { ssr: false || process.env.SPA === '1' };\n"
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: [manifestProbe] });
    expect(facts.services[0]).toMatchObject({ framework: 'react-router', exposesHttp: true });
    expect(facts.services[0]?.servesStaticAssets).toBeUndefined();
  });

  it('does not truncate a computed React Router build directory to its first string', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'computed-output-spa',
        scripts: { build: 'react-router build', start: 'react-router-serve ./build/server/index.js' },
        dependencies: { '@react-router/serve': '^8.0.0', 'react-router': '^8.0.0' },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts': "export default { ssr: false, buildDirectory: 'dist' + suffix };\n"
    });

    const { facts } = await assembleCandidateFacts({ root: repoRoot, probes: [manifestProbe] });
    expect(facts.services[0]).toMatchObject({ framework: 'react-router', exposesHttp: true });
    expect(facts.services[0]?.servesStaticAssets).toBeUndefined();
  });

  it('allows an independently proven custom server to override React Router ssr: false SPA mode', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'spa-custom-server',
        scripts: {
          build: 'react-router build',
          start: 'node server.js'
        },
        dependencies: {
          '@react-router/express': '^8.0.0',
          express: '^5.0.0',
          react: '^19.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0'
        }
      }),
      'react-router.config.ts': 'export default { ssr: false };\n',
      'server.js': ['import express from "express";', 'const app = express();', 'app.listen(3000);'].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'spa-custom-server',
      path: '.',
      framework: 'react-router',
      exposesHttp: true,
      containerEntrypoint: 'server.js',
      startCommand: 'node server.js'
    });
  });

  it('does not promote a React Router SPA for an unused server source', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'spa-with-example-server',
        scripts: {
          build: 'react-router build',
          start: 'node main.js'
        },
        dependencies: {
          '@react-router/express': '^8.0.0',
          express: '^5.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'react-router.config.ts': 'export default { ssr: false };\n',
      'main.js': 'console.log("static assets are served by the platform");\n',
      'examples/server.js': 'import express from "express"; express().listen(3000);\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      framework: 'react-router',
      exposesHttp: false,
      servesStaticAssets: { path: 'build/client' }
    });
    expect(facts.services[0]?.containerEntrypoint).toBe('examples/server.js');
  });

  it('does not promote a non-React-Router static site for a colocated server source', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'vite-site',
        scripts: { build: 'vite build', start: 'node server.js' },
        dependencies: { react: '^19.0.0', vite: '^8.0.0' }
      }),
      'index.html': '<div id="root"></div>\n',
      'server.js': 'import express from "express"; express().listen(3000);\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      framework: 'react',
      exposesHttp: false,
      servesStaticAssets: { path: 'dist' }
    });
  });

  it('does not mint a phantom service when @react-router/dev is present with no runnable scripts or config', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'tooling-package',
        devDependencies: {
          '@react-router/dev': '^8.0.0'
        }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('does not mint a phantom service when @react-router/dev is present with only a library tsc build script', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'shared-utils',
        scripts: {
          build: 'tsc -p tsconfig.json'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0',
          typescript: '^5.9.0'
        }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('does not treat a client-only @remix-run/react dependency as a server', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'remix-ui-library',
        dependencies: { '@remix-run/react': '^2.17.0' }
      })
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('prefers React Router over a leftover @remix-run/node dependency when React Router config/scripts are present', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'migrated-app',
        scripts: {
          build: 'react-router build',
          start: 'react-router-serve ./build/server/index.js'
        },
        dependencies: {
          '@remix-run/node': '^2.15.0',
          '@react-router/node': '^8.0.0',
          '@react-router/serve': '^8.0.0',
          'react-router': '^8.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0'
        }
      }),
      'react-router.config.ts': 'export default { ssr: true };\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'migrated-app',
      framework: 'react-router',
      exposesHttp: true
    });
  });

  it('retains Remix classification when actual Remix build/dev scripts are present', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'remix-app',
        scripts: {
          build: 'remix build',
          dev: 'remix dev'
        },
        dependencies: {
          '@remix-run/node': '^2.15.0',
          '@remix-run/react': '^2.15.0',
          'react-router': '^8.0.0'
        },
        devDependencies: {
          '@remix-run/dev': '^2.15.0'
        }
      }),
      'remix.config.js': 'module.exports = { appDirectory: "app" };\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'remix-app',
      framework: 'remix',
      exposesHttp: true
    });
  });

  it('retains Next.js classification when incidental React Router dependencies are present', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'next-app',
        scripts: {
          build: 'next build',
          dev: 'next dev'
        },
        dependencies: {
          next: '^15.0.0',
          'react-router': '^8.0.0',
          '@react-router/node': '^8.0.0'
        }
      }),
      'next.config.js': 'module.exports = {};\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'next-app',
      framework: 'nextjs',
      exposesHttp: true
    });
  });

  it('retains Express classification when an unused @react-router/dev dependency is present', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'express-service',
        scripts: {
          start: 'node server.js'
        },
        dependencies: {
          express: '^5.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^8.0.0'
        }
      }),
      'server.js': 'import express from "express"; const app = express(); app.listen(3000);\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'express-service',
      framework: 'express',
      exposesHttp: true,
      containerEntrypoint: 'server.js'
    });
  });

  it('limits framework script evidence to build, dev, and start', async () => {
    const repoRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'express-with-router-tooling',
        scripts: {
          start: 'node server.js',
          test: 'react-router typegen && vitest'
        },
        dependencies: { express: '^5.0.0' },
        devDependencies: { '@react-router/dev': '^8.0.0' }
      }),
      'server.js': 'import express from "express"; const app = express(); app.listen(3000);\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repoRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      framework: 'express',
      exposesHttp: true,
      containerEntrypoint: 'server.js'
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
});
