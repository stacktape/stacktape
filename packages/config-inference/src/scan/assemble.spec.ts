import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from './assemble';
import { environmentProbe } from './probes/environment';
import { manifestProbe } from './probes/manifest';
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
});
