import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../compose/compose';
import { assembleCandidateFacts, createProbeContext } from './assemble';
import { MAX_DOCKERFILE_LINK_DEPTH, readDockerfileDefinition } from './dockerfile-definition';
import { listRepositoryFiles } from './file-tree';
import type { Probe } from './probe';
import { dockerComposeProbe } from './probes/docker-compose';
import { dockerfileProbe } from './probes/dockerfile';
import { environmentProbe } from './probes/environment';
import { languageManifestProbe } from './probes/language-manifests';
import { manifestProbe } from './probes/manifest';
import { paasManifestsProbe } from './probes/paas-manifests';
import { serverEntrypointProbe } from './probes/server-entrypoint';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const ROOT_LINKS = {
  Dockerfile: 'docker/Dockerfile.alias',
  'docker/Dockerfile.alias': 'production.dockerfile'
};
const TARGET = 'docker/production.dockerfile';
const IMAGE = 'FROM node:24\nEXPOSE 8080\nSTOPSIGNAL SIGINT\nCMD ["node", "server.js"]\n';

const makeVariants = async (files: Record<string, string>, links: Record<string, string> = ROOT_LINKS) => {
  root = await mkdtemp(join(tmpdir(), 'stp-dockerfile-consumers-'));
  const prepare = async (representation: 'linked' | 'materialized') => {
    const repositoryRoot = join(root, representation);
    await mkdir(repositoryRoot, { recursive: true });
    await Promise.all(
      Object.entries(files).map(async ([path, contents]) => {
        await mkdir(join(repositoryRoot, path, '..'), { recursive: true });
        await writeFile(join(repositoryRoot, path), contents, 'utf8');
      })
    );
    await Promise.all(
      Object.entries(links).map(async ([path, target]) => {
        await mkdir(join(repositoryRoot, path, '..'), { recursive: true });
        if (representation === 'linked') await symlink(target, join(repositoryRoot, path), 'file');
        else await writeFile(join(repositoryRoot, path), `${target}\n`, 'utf8');
      })
    );
    return repositoryRoot;
  };
  const [linked, materialized] = await Promise.all([prepare('linked'), prepare('materialized')]);
  return { linked, materialized };
};

const contextFor = async (repositoryRoot: string, maxFiles?: number) => {
  const listing = await listRepositoryFiles(repositoryRoot, maxFiles === undefined ? {} : { maxFiles });
  return {
    listing,
    context: createProbeContext(
      repositoryRoot,
      listing.files,
      listing.descriptorDockerfiles,
      listing.dockerfileSymlinks
    )
  };
};

const scanBoth = (variants: { linked: string; materialized: string }, probes: Probe[]) =>
  Promise.all([
    assembleCandidateFacts({ root: variants.linked, probes }),
    assembleCandidateFacts({ root: variants.materialized, probes })
  ]);

describe('canonical Dockerfile definitions', () => {
  it('resolves two-hop links to a suffix-named Dockerfile without truncating its instructions', async () => {
    const raw = `FROM node:24\n${'# image documentation\n'.repeat(170)}EXPOSE 8080\n`;
    const variants = await makeVariants({ [TARGET]: raw });
    await Promise.all(
      Object.values(variants).map(async (repositoryRoot) => {
        const { context } = await contextFor(repositoryRoot);
        expect(await readDockerfileDefinition(context, 'Dockerfile')).toEqual({ path: TARGET, raw });
      })
    );
    const { listing } = await contextFor(variants.linked);
    expect(listing.dockerfileSymlinks).toContainEqual({ path: 'Dockerfile', target: 'docker/Dockerfile.alias' });
  });

  it('resolves a parent-relative hop when it stays inside the repository', async () => {
    const variants = await makeVariants(
      { 'production.dockerfile': IMAGE },
      { Dockerfile: 'docker/Dockerfile.alias', 'docker/Dockerfile.alias': '../production.dockerfile' }
    );
    await Promise.all(
      Object.values(variants).map(async (repositoryRoot) => {
        const { context } = await contextFor(repositoryRoot);
        expect(await readDockerfileDefinition(context, 'Dockerfile')).toEqual({
          path: 'production.dockerfile',
          raw: IMAGE
        });
      })
    );
  });

  it.each([1, 2])('does not bypass an unlisted hop at maxFiles=%i', async (maxFiles) => {
    const variants = await makeVariants(
      { 'docker/Dockerfile.a-production': IMAGE },
      { Dockerfile: 'docker/Dockerfile.z-alias', 'docker/Dockerfile.z-alias': 'Dockerfile.a-production' }
    );
    await Promise.all(
      Object.values(variants).map(async (repositoryRoot) => {
        const { context, listing } = await contextFor(repositoryRoot, maxFiles);
        expect(listing.truncated).toBe(true);
        expect(await readDockerfileDefinition(context, 'Dockerfile')).toBeUndefined();
        expect(listing.dockerfileSymlinks.every(({ target }) => listing.files.includes(target))).toBe(true);
      })
    );
  });

  it('refuses broken, escaped, self-referential, and cyclic links in both representations', async () => {
    const variants = await makeVariants(
      { [TARGET]: IMAGE },
      {
        'Dockerfile.broken': 'docker/Dockerfile.missing',
        'Dockerfile.escaped': '../outside/production.dockerfile',
        'Dockerfile.self': 'Dockerfile.self',
        'Dockerfile.cycle-a': 'Dockerfile.cycle-b',
        'Dockerfile.cycle-b': 'Dockerfile.cycle-a'
      }
    );
    await mkdir(join(root, 'outside'), { recursive: true });
    await writeFile(join(root, 'outside/production.dockerfile'), 'FROM scratch\nEXPOSE 9999\n', 'utf8');
    await Promise.all(
      Object.values(variants).map(async (repositoryRoot) => {
        const { context } = await contextFor(repositoryRoot);
        await Promise.all(
          ['Dockerfile.broken', 'Dockerfile.escaped', 'Dockerfile.self', 'Dockerfile.cycle-a'].map(async (path) => {
            expect(await readDockerfileDefinition(context, path)).toBeUndefined();
          })
        );
      })
    );
  });

  it('bounds pointer chains and refuses absolute materialized targets', async () => {
    const links = Object.fromEntries(
      Array.from({ length: MAX_DOCKERFILE_LINK_DEPTH + 1 }, (_, index) => [
        `Dockerfile.${index}`,
        index === MAX_DOCKERFILE_LINK_DEPTH ? TARGET : `Dockerfile.${index + 1}`
      ])
    );
    const variants = await makeVariants({ [TARGET]: IMAGE }, links);
    await Promise.all(
      Object.values(variants).map(async (repositoryRoot) => {
        const { context } = await contextFor(repositoryRoot);
        expect(await readDockerfileDefinition(context, 'Dockerfile.0')).toBeUndefined();
      })
    );
    await writeFile(
      join(variants.materialized, 'Dockerfile.absolute'),
      `${join(variants.materialized, TARGET)}\n`,
      'utf8'
    );
    await symlink(join(variants.linked, TARGET), join(variants.linked, 'Dockerfile.absolute'), 'file');
    const { context } = await contextFor(variants.materialized);
    expect(await readDockerfileDefinition(context, 'Dockerfile.absolute')).toBeUndefined();
    const linkedContext = await contextFor(variants.linked);
    expect(await readDockerfileDefinition(linkedContext.context, 'Dockerfile.absolute')).toBeUndefined();
  });
});

describe('every Dockerfile consumer uses the canonical definition', () => {
  it('preserves standalone packaging and volume evidence through a two-hop suffix target', async () => {
    const variants = await makeVariants({
      'package.json': '{"name":"orders","dependencies":{"express":"5"}}',
      [TARGET]: `${IMAGE}VOLUME /data\n`
    });
    const [linked, materialized] = await scanBoth(variants, [manifestProbe, dockerfileProbe]);
    expect(linked.facts.services).toEqual(materialized.facts.services);
    expect(linked.facts.services).toHaveLength(1);
    expect(linked.facts.services[0]).toMatchObject({
      dockerfile: TARGET,
      path: '.',
      port: 8080,
      declaredContainerVolumes: { paths: ['/data'] }
    });
    expect(composeConfig({ facts: linked.facts }).config.resources.orders?.properties.packaging).toMatchObject({
      type: 'custom-dockerfile',
      properties: { buildContextPath: '.', dockerfilePath: TARGET }
    });
  });

  it('canonicalizes both Compose processes while preserving their common context and distinct commands', async () => {
    const variants = await makeVariants({
      [TARGET]: IMAGE,
      'compose.yml': [
        'services:',
        '  web:',
        '    build: {context: ., dockerfile: Dockerfile}',
        '    command: node server.js',
        '    ports: ["8080:8080"]',
        '  worker:',
        '    build: {context: ., dockerfile: Dockerfile}',
        '    command: node worker.js',
        ''
      ].join('\n')
    });
    const [linked, materialized] = await scanBoth(variants, [dockerComposeProbe]);
    expect(linked.facts.services).toEqual(materialized.facts.services);
    expect(
      linked.facts.services.map(({ name, path, buildRoot, dockerfile }) => ({ name, path, buildRoot, dockerfile }))
    ).toEqual([
      { name: 'web', path: '.', buildRoot: '.', dockerfile: TARGET },
      { name: 'worker', path: '.', buildRoot: '.', dockerfile: TARGET }
    ]);
    const config = composeConfig({ facts: linked.facts }).config;
    for (const name of ['web', 'worker']) {
      expect(config.resources[name]?.properties.packaging).toMatchObject({
        type: 'custom-dockerfile',
        properties: {
          buildContextPath: '.',
          dockerfilePath: TARGET,
          command: ['/bin/sh', '-c', `node ${name === 'web' ? 'server' : 'worker'}.js`]
        }
      });
    }
  });

  it.each(['render', 'fly'] as const)(
    'canonicalizes %s Dockerfiles without moving the declared build context',
    async (platform) => {
      const target = 'apps/api/docker/production.dockerfile';
      const variants = await makeVariants(
        {
          [target]: IMAGE,
          ...(platform === 'render'
            ? {
                'render.yaml':
                  'services:\n  - type: web\n    name: orders\n    runtime: docker\n    dockerContext: .\n    dockerfilePath: apps/api/Dockerfile\n'
              }
            : {
                'apps/api/fly.toml':
                  'app = "orders"\n[build]\ndockerfile = "Dockerfile"\n[http_service]\ninternal_port = 8080\n'
              })
        },
        {
          'apps/api/Dockerfile': 'docker/Dockerfile.alias',
          'apps/api/docker/Dockerfile.alias': 'production.dockerfile'
        }
      );
      const [linked, materialized] = await scanBoth(variants, [paasManifestsProbe]);
      expect(linked.facts.services).toEqual(materialized.facts.services);
      expect(linked.facts.services).toHaveLength(1);
      expect(linked.facts.services[0]).toMatchObject({ name: 'orders', path: 'apps/api', dockerfile: target });
      expect(composeConfig({ facts: linked.facts }).config.resources.orders?.properties.packaging).toMatchObject({
        type: 'custom-dockerfile',
        properties: {
          buildContextPath: platform === 'render' ? '.' : 'apps/api',
          dockerfilePath: platform === 'render' ? target : 'docker/production.dockerfile'
        }
      });
    }
  );

  it.each(['render', 'fly'] as const)('does not emit a broken or cyclic %s Dockerfile alias', async (platform) => {
    const variants = await makeVariants(
      platform === 'render'
        ? {
            'render.yaml':
              'services:\n  - type: web\n    name: orders\n    runtime: docker\n    dockerfilePath: Dockerfile\n'
          }
        : { 'fly.toml': 'app = "orders"\n[build]\ndockerfile = "Dockerfile"\n[http_service]\ninternal_port = 8080\n' },
      { Dockerfile: 'Dockerfile.alias', 'Dockerfile.alias': 'Dockerfile' }
    );
    const results = await scanBoth(variants, [paasManifestsProbe]);
    for (const { facts } of results) {
      expect(facts.services).toHaveLength(1);
      expect(facts.services[0]?.dockerfile).toBeUndefined();
    }
  });

  it('selects only the environment template copied by the canonical Dockerfile', async () => {
    const variants = await makeVariants({
      'package.json': '{"name":"orders","scripts":{"start":"node server.js"},"dependencies":{"express":"5"}}',
      'server.js': 'const database = new URL(process.env.DATABASE_URL);\nrequire("express")().listen(8080);\n',
      [TARGET]: 'FROM node:24\nCOPY env-example-postgres /app/.env\n',
      'env-example-postgres': 'DATABASE_URL=postgres://localhost/orders\n',
      'env-example-mongo': 'DATABASE_URL=mongodb://localhost/orders\n'
    });
    const [linked, materialized] = await scanBoth(variants, [manifestProbe, environmentProbe]);
    expect(linked.facts.dependencies).toEqual(materialized.facts.dependencies);
    expect(linked.facts.dependencies.map(({ kind }) => kind)).toEqual(['postgres']);
    expect(JSON.stringify(linked.facts)).not.toContain('postgres://');
  });

  it('uses canonical Go build evidence and citations without changing its module context', async () => {
    const variants = await makeVariants({
      'go.mod': 'module example.com/orders\n',
      'main.go': 'package main\nfunc main() { run() }\n',
      [TARGET]: 'FROM scratch\nEXPOSE 8080\n'
    });
    const [linked, materialized] = await scanBoth(variants, [serverEntrypointProbe]);
    expect(linked.facts.services).toEqual(materialized.facts.services);
    expect(linked.facts.services).toHaveLength(1);
    expect(linked.facts.services[0]).toMatchObject({ name: 'orders', path: '.', dockerfile: TARGET, port: 8080 });
    expect(linked.facts.services[0]?.evidence).toContainEqual(expect.objectContaining({ file: TARGET, field: 'port' }));
  });

  it('preserves source-proven database capability and SQLite default through the same chain', async () => {
    const variants = await makeVariants({
      'Cargo.toml':
        '[package]\nname = "password-vault"\n[features]\npostgresql = ["diesel/postgres"]\n[dependencies]\ndiesel = "2"\nrocket = "0.5"\n',
      [TARGET]:
        'FROM rust:1 AS build\nARG DB=sqlite,mysql,postgresql\nFROM debian:13\nWORKDIR /\nVOLUME /data\nEXPOSE 80\n',
      'src/config.rs': [
        'macro_rules! make_config { ($name:ident) => { stringify!([<$name:upper>]) }; }',
        'make_config! {',
        '  data_folder: String, false, def, "data".to_owned();',
        '  database_url: String, false, auto, |c| format!("sqlite://{}/db.sqlite3", c.data_folder);',
        '  enable_db_wal: bool, false, def, true;',
        '}',
        ''
      ].join('\n')
    });
    const [linked, materialized] = await scanBoth(variants, [languageManifestProbe, dockerfileProbe]);
    expect(linked.facts.services).toEqual(materialized.facts.services);
    expect(linked.facts.dependencies).toEqual([]);
    expect(linked.facts.services[0]).toMatchObject({
      dockerfile: TARGET,
      defaultLocalDatabase: { kind: 'sqlite', path: '/data/db.sqlite3', connectionVariable: 'DATABASE_URL' },
      managedDatabaseCapabilities: [{ kind: 'postgres', connectionVariable: 'DATABASE_URL' }]
    });
    expect(composeConfig({ facts: linked.facts }).assumptions).toContainEqual(
      expect.objectContaining({ kind: 'sqlite-persistence', chosen: 'migrate-to-managed-database' })
    );
  });
});
