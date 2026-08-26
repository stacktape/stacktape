import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../compose/compose';
import { assembleCandidateFacts, createProbeContext } from './assemble';
import {
  dockerfileIgnoreRequirement,
  MAX_DOCKERFILE_LINK_DEPTH,
  readDockerfileDefinition
} from './dockerfile-definition';
import { listRepositoryFiles } from './file-tree';
import type { Probe } from './probe';
import { dockerComposeProbe } from './probes/docker-compose';
import { dockerfileProbe } from './probes/dockerfile';
import { environmentProbe } from './probes/environment';
import { languageManifestProbe } from './probes/language-manifests';
import { manifestProbe } from './probes/manifest';
import { paasManifestsProbe } from './probes/paas-manifests';
import { procfileProbe } from './probes/procfile';
import { serverEntrypointProbe } from './probes/server-entrypoint';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe('Dockerfile alias ignore-file safety', () => {
  const IGNORE = 'private-marker.txt\n';
  const OTHER_IGNORE = 'another-file.txt\n';
  const COPY_IMAGE = 'FROM scratch\nCOPY . /app\nEXPOSE 8080\n';
  const cases: Array<{ name: string; files: Record<string, string>; safe: boolean }> = [
    { name: 'no ignore files', files: {}, safe: true },
    { name: 'shared context-root ignore', files: { '.dockerignore': IGNORE }, safe: true },
    { name: 'alias ignore disappears', files: { 'Dockerfile.dockerignore': IGNORE }, safe: false },
    { name: 'target ignore appears', files: { [`${TARGET}.dockerignore`]: IGNORE }, safe: false },
    {
      name: 'identical specific ignores',
      files: { 'Dockerfile.dockerignore': IGNORE, [`${TARGET}.dockerignore`]: IGNORE },
      safe: true
    },
    {
      name: 'alias matches context-root fallback',
      files: { 'Dockerfile.dockerignore': IGNORE, '.dockerignore': IGNORE },
      safe: true
    },
    {
      name: 'target matches context-root fallback',
      files: { [`${TARGET}.dockerignore`]: IGNORE, '.dockerignore': IGNORE },
      safe: true
    },
    {
      name: 'alias differs from context-root fallback',
      files: { 'Dockerfile.dockerignore': IGNORE, '.dockerignore': OTHER_IGNORE },
      safe: false
    },
    {
      name: 'target differs from context-root fallback',
      files: { [`${TARGET}.dockerignore`]: IGNORE, '.dockerignore': OTHER_IGNORE },
      safe: false
    },
    {
      name: 'specific ignores differ',
      files: { 'Dockerfile.dockerignore': IGNORE, [`${TARGET}.dockerignore`]: OTHER_IGNORE },
      safe: false
    },
    {
      name: 'identical specifics override a different root policy',
      files: { 'Dockerfile.dockerignore': IGNORE, [`${TARGET}.dockerignore`]: IGNORE, '.dockerignore': OTHER_IGNORE },
      safe: true
    },
    {
      name: 'unselected intermediate alias ignore is irrelevant',
      files: { 'docker/Dockerfile.alias.dockerignore': IGNORE },
      safe: true
    },
    {
      name: 'unselected intermediate does not override equal selected policies',
      files: {
        'Dockerfile.dockerignore': IGNORE,
        [`${TARGET}.dockerignore`]: IGNORE,
        'docker/Dockerfile.alias.dockerignore': OTHER_IGNORE
      },
      safe: true
    },
    {
      name: 'empty alias overrides nonempty context-root ignore',
      files: { 'Dockerfile.dockerignore': '', '.dockerignore': IGNORE },
      safe: false
    },
    {
      name: 'empty target overrides nonempty context-root ignore',
      files: { [`${TARGET}.dockerignore`]: '', '.dockerignore': IGNORE },
      safe: false
    },
    {
      name: 'empty alias and absent fallback both exclude nothing',
      files: { 'Dockerfile.dockerignore': '' },
      safe: true
    }
  ];

  it.each(cases)('$name', async ({ files, safe }) => {
    const variants = await makeVariants({
      'package.json': '{"name":"orders","dependencies":{"express":"5"}}',
      [TARGET]: COPY_IMAGE,
      'private-marker.txt': 'fixture-private-marker-never-emitted',
      ...files
    });
    const results = await scanBoth(variants, [manifestProbe, dockerfileProbe]);
    expect(results[0]!.facts.services).toEqual(results[1]!.facts.services);
    for (const { facts } of results) {
      expect(facts.services[0]).toMatchObject({ dockerfile: TARGET, dockerfileAlias: 'Dockerfile' });
      const composition = composeConfig({ facts });
      expect(composition.deployable).toBe(safe);
      expect(composition.config.resources.orders?.properties.packaging).toMatchObject({
        type: 'custom-dockerfile',
        properties: { dockerfilePath: safe ? TARGET : 'Dockerfile' }
      });
      expect(facts.deploymentRequirements.filter(({ kind }) => kind === 'dockerfile-ignore-policy')).toHaveLength(
        safe ? 0 : 1
      );
      if (!safe) {
        expect(composition.gaps).toContainEqual(
          expect.objectContaining({ subject: 'orders.dockerignore', severity: 'blocking' })
        );
        expect(composition.gaps.map(({ message }) => message).join('\n')).toContain('private files');
      }
      expect(JSON.stringify({ facts, composition })).not.toContain('fixture-private-marker-never-emitted');
    }
  });

  it('does not block a selected published image on an unused local Dockerfile ignore policy', async () => {
    const variants = await makeVariants({
      [TARGET]: COPY_IMAGE,
      'Dockerfile.dockerignore': IGNORE
    });
    const [{ facts }] = await scanBoth(variants, [dockerfileProbe]);
    const service = facts.services[0]!;
    const context = createProbeContext(variants.linked, (await listRepositoryFiles(variants.linked)).files);
    expect(await dockerfileIgnoreRequirement(context, service)).toBeDefined();
    expect(
      await dockerfileIgnoreRequirement(context, {
        ...service,
        prebuiltImage: 'example/orders:1',
        prebuiltImageAuthoritative: true
      })
    ).toBeUndefined();
    expect(await dockerfileIgnoreRequirement(context, { ...service, prebuiltImage: 'example/orders:1' })).toBeDefined();
  });

  it('preserves a descriptor-selected alias when standalone discovery ran first or last', async () => {
    const variants = await makeVariants(
      {
        Dockerfile: COPY_IMAGE,
        'package.json': '{"name":"orders","dependencies":{"express":"5"}}',
        'private-marker.txt': 'test marker',
        'deploy/Dockerfile.alias.dockerignore': IGNORE,
        'compose.yml':
          'services:\n  web:\n    build: {context: ., dockerfile: deploy/Dockerfile.alias}\n    ports: ["8080:8080"]\n'
      },
      { 'deploy/Dockerfile.alias': '../Dockerfile' }
    );
    for (const probes of [
      [manifestProbe, dockerfileProbe, dockerComposeProbe],
      [dockerComposeProbe, manifestProbe, dockerfileProbe]
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- exercise both deterministic probe precedence orders.
      for (const { facts } of await scanBoth(variants, probes)) {
        expect(facts.services).toHaveLength(1);
        expect(facts.services[0]).toMatchObject({
          dockerfile: 'Dockerfile',
          dockerfileAlias: 'deploy/Dockerfile.alias',
          dockerfileDeclared: true
        });
        expect(facts.deploymentRequirements).toHaveLength(1);
        const composition = composeConfig({ facts });
        expect(composition.deployable).toBe(false);
        expect(Object.values(composition.config.resources)[0]?.properties.packaging).toMatchObject({
          type: 'custom-dockerfile',
          properties: { buildContextPath: '.', dockerfilePath: 'deploy/Dockerfile.alias' }
        });
      }
    }
  });

  it('keeps an explicitly selected canonical build instead of adopting an unscoped alias', async () => {
    const variants = await makeVariants({
      [TARGET]: COPY_IMAGE,
      'package.json': '{"name":"orders","dependencies":{"express":"5"}}',
      'Dockerfile.dockerignore': IGNORE,
      'private-marker.txt': 'test marker',
      'compose.yml': `services:\n  web:\n    build: {context: ., dockerfile: ${TARGET}}\n    ports: ["8080:8080"]\n`
    });
    for (const { facts } of await scanBoth(variants, [manifestProbe, dockerfileProbe, dockerComposeProbe])) {
      expect(facts.services).toHaveLength(1);
      expect(facts.services[0]?.dockerfileAlias).toBeUndefined();
      expect(facts.deploymentRequirements).toEqual([]);
      expect(composeConfig({ facts }).deployable).toBe(true);
    }
  });

  it('keeps Compose process aliases separate, including an explicitly selected intermediate hop', async () => {
    const variants = await makeVariants({
      [TARGET]: COPY_IMAGE,
      'private-marker.txt': 'test marker',
      'docker/Dockerfile.alias.dockerignore': IGNORE,
      'compose.yml': [
        'services:',
        '  web:',
        '    build: {context: ., dockerfile: docker/Dockerfile.alias}',
        '    ports: ["8080:8080"]',
        '  worker:',
        `    build: {context: ., dockerfile: ${TARGET}}`,
        '    command: node worker.js',
        ''
      ].join('\n')
    });
    for (const { facts } of await scanBoth(variants, [dockerComposeProbe])) {
      expect(facts.services).toHaveLength(2);
      expect(facts.deploymentRequirements).toEqual([
        {
          kind: 'dockerfile-ignore-policy',
          serviceName: 'web',
          aliasDockerfile: 'docker/Dockerfile.alias',
          canonicalDockerfile: TARGET,
          buildRoot: '.',
          evidence: []
        }
      ]);
      expect(composeConfig({ facts }).deployable).toBe(false);
    }
  });

  it.each(['render', 'fly'] as const)(
    'checks the actual %s build context rather than the application directory',
    async (platform) => {
      const target = 'apps/api/docker/production.dockerfile';
      const variants = await makeVariants(
        {
          [target]: COPY_IMAGE,
          'apps/api/Dockerfile.dockerignore': IGNORE,
          '.dockerignore': OTHER_IGNORE,
          'apps/api/.dockerignore': IGNORE,
          'apps/api/private-marker.txt': 'test marker',
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
      for (const { facts } of await scanBoth(variants, [paasManifestsProbe])) {
        expect(facts.services[0]).toMatchObject({ dockerfile: target, dockerfileAlias: 'apps/api/Dockerfile' });
        expect(facts.deploymentRequirements).toHaveLength(platform === 'render' ? 1 : 0);
        expect(composeConfig({ facts }).deployable).toBe(platform === 'fly');
      }
    }
  );

  it('blocks Go discovery and every Procfile process sharing an unsafe alias', async () => {
    const variants = await makeVariants({
      [TARGET]: COPY_IMAGE,
      'go.mod': 'module example.com/orders\n',
      'main.go': 'package main\nfunc main() { run() }\n',
      'Dockerfile.dockerignore': IGNORE,
      'private-marker.txt': 'test marker',
      Procfile: 'web: ./orders\nworker: ./orders --worker\n'
    });
    for (const { facts } of await scanBoth(variants, [serverEntrypointProbe])) {
      expect(facts.deploymentRequirements).toHaveLength(1);
      expect(composeConfig({ facts }).deployable).toBe(false);
    }
    for (const { facts } of await scanBoth(variants, [dockerfileProbe, procfileProbe])) {
      expect(facts.services).toHaveLength(2);
      expect(facts.services.every(({ dockerfileAlias }) => dockerfileAlias === 'Dockerfile')).toBe(true);
      expect(facts.deploymentRequirements).toHaveLength(2);
      expect(composeConfig({ facts }).deployable).toBe(false);
    }
  });

  it.each(['unlisted', 'unreadable', 'oversized', 'symlink', 'broken-symlink'] as const)(
    'does not treat an %s ignore file as absent or compare only its prefix',
    async (failure) => {
      const variants = await makeVariants({
        [TARGET]: COPY_IMAGE,
        'Dockerfile.dockerignore': failure === 'oversized' ? `${'# policy\n'.repeat(30_000)}${IGNORE}` : IGNORE,
        [`${TARGET}.dockerignore`]: failure === 'oversized' ? `${'# policy\n'.repeat(30_000)}${OTHER_IGNORE}` : IGNORE
      });
      await Promise.all(
        Object.values(variants).map(async (repositoryRoot) => {
          if (failure === 'symlink' || failure === 'broken-symlink') {
            await rm(join(repositoryRoot, 'Dockerfile.dockerignore'));
            await symlink(
              failure === 'symlink' ? `${TARGET}.dockerignore` : 'missing-ignore',
              join(repositoryRoot, 'Dockerfile.dockerignore'),
              'file'
            );
          }
          const { context } = await contextFor(repositoryRoot);
          if (failure === 'unlisted')
            context.files = context.files.filter((path) => path !== 'Dockerfile.dockerignore');
          if (failure === 'unreadable') {
            const read = context.read;
            context.read = async (path, options) =>
              path === 'Dockerfile.dockerignore'
                ? { kind: 'unreadable', path, reason: 'Fixture refuses access.' }
                : read(path, options);
          }
          expect(
            await dockerfileIgnoreRequirement(context, {
              name: 'orders',
              path: '.',
              language: 'container',
              executionModel: 'long-running',
              exposesHttp: true,
              port: 8080,
              dockerfile: TARGET,
              dockerfileAlias: 'Dockerfile',
              source: 'probe'
            })
          ).toMatchObject({ kind: 'dockerfile-ignore-policy' });
        })
      );
    }
  );
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
          command: ['node', `${name === 'web' ? 'server' : 'worker'}.js`]
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
      expect(linked.facts.services[0]).toMatchObject({
        name: 'orders',
        path: platform === 'render' ? '.' : 'apps/api',
        dockerfile: target
      });
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
