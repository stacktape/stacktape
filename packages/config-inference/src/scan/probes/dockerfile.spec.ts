import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts, createProbeContext } from '../assemble';
import { listRepositoryFiles } from '../file-tree';
import { environmentProbe } from './environment';
import { dockerfileProbe } from './dockerfile';
import { languageManifestProbe } from './language-manifests';
import { manifestProbe } from './manifest';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'stp-dockerfile-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(root, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return root;
};

const dockerfileFactsAtLimit = async (repositoryRoot: string) => {
  const listing = await listRepositoryFiles(repositoryRoot, { maxFiles: 1 });
  const context = createProbeContext(
    repositoryRoot,
    listing.files,
    listing.descriptorDockerfiles,
    listing.dockerfileSymlinks
  );
  return { listing, output: await dockerfileProbe.run(context) };
};

describe('the standalone Dockerfile probe', () => {
  it('uses an exposed Dockerfile as the exact packaging for a web service', async () => {
    const repositoryRoot = await makeRepo({
      'apps/api/package.json': '{"name":"api","dependencies":{"express":"5"}}',
      'apps/api/Dockerfile': 'FROM node:24\nEXPOSE 8080\nCMD ["node", "server.js"]\n'
    });
    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services[0]).toMatchObject({
      path: 'apps/api',
      exposesHttp: true,
      port: 8080,
      dockerfile: 'apps/api/Dockerfile'
    });
    const composed = composeConfig({ facts });
    expect(composed.config.resources.api).toMatchObject({
      type: 'web-service',
      properties: {
        packaging: {
          type: 'custom-dockerfile',
          properties: {
            buildContextPath: 'apps/api',
            dockerfilePath: 'Dockerfile'
          }
        }
      }
    });
  });

  it('treats a Dockerfile with no exposed port as a worker', async () => {
    const repositoryRoot = await makeRepo({
      'requirements.txt': 'celery==5\nredis==5\n',
      Dockerfile: 'FROM python:3.12\nCMD ["python", "worker.py"]\n'
    });
    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services[0]).toMatchObject({
      path: '.',
      exposesHttp: false,
      dockerfile: 'Dockerfile'
    });
  });

  it('ignores development and CI environment Dockerfiles', async () => {
    const repositoryRoot = await makeRepo({
      '.devcontainer/Dockerfile': 'FROM node:24\nEXPOSE 3000\n',
      '.github/actions/test/Dockerfile': 'FROM node:24\n',
      'package.json': '{"name":"library"}'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('rejects a release-image Dockerfile whose required prebuilt binary is absent from a clean checkout', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/list-manager\n',
      'cmd/main.go': 'package main\nfunc main() {}\n',
      Dockerfile: 'FROM alpine:3.20\nCOPY list-manager /app/list-manager\nEXPOSE 8080\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('falls through an unusable release Dockerfile to a checked-in source-build Dockerfile', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/notifier\n',
      'main.go': 'package main\nfunc main() {}\n',
      Dockerfile: 'FROM alpine:3.20\nCOPY notifier /usr/bin/notifier\nEXPOSE 80\n',
      'Dockerfile-build': [
        'FROM golang:1.25 AS builder',
        'COPY go.mod main.go /src/',
        'RUN cd /src && go build -o /notifier .',
        'FROM alpine:3.20',
        'COPY --from=builder /notifier /usr/bin/notifier',
        'EXPOSE 80',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({ dockerfile: 'Dockerfile-build', port: 80 });
  });

  it('rejects a stale source Dockerfile that omits a module-local imported package', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/notifier\n',
      'main.go': 'package main\nimport _ "example.com/notifier/metrics"\nfunc main() {}\n',
      'metrics/metrics.go': 'package metrics\n',
      'cmd/serve.go': 'package cmd\n',
      'Dockerfile-build': [
        'FROM golang:1.25 AS builder',
        'COPY go.mod main.go /src/',
        'COPY cmd /src/cmd',
        'RUN cd /src && go build -o /notifier .',
        'FROM alpine:3.20',
        'COPY --from=builder /notifier /usr/bin/notifier',
        'EXPOSE 80',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toEqual([]);
  });

  it('accepts local directories, globs, and JSON COPY sources that exist in the build context', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': '{"name":"api"}',
      'src/index.js': 'console.log("ready");\n',
      'config/app.json': '{}\n',
      Dockerfile: [
        'FROM node:24 AS builder',
        'COPY ["package.json", "/app/"]',
        'COPY src /app/src',
        'COPY config/*.json /app/config/',
        'FROM node:24',
        'COPY --from=builder /app /app',
        'EXPOSE 8080',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({ dockerfile: 'Dockerfile', port: 8080 });
  });

  it('rejects a Go Dockerfile when dockerignore removes a reachable imported package', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/api\n',
      '.dockerignore': 'internal/private\n',
      Dockerfile: 'FROM golang:1.25\nCOPY . .\nRUN go build -o /api .\nEXPOSE 8080\n',
      'main.go': 'package main\nimport _ "example.com/api/internal/private"\nfunc main() {}\n',
      'internal/private/private.go': 'package private\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toEqual([]);
  });

  it('rejects an implicit root Go build when a recursive dockerignore pattern removes its target', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/api\n',
      '.dockerignore': '**/main.go\n',
      Dockerfile: 'FROM golang:1.25\nCOPY . .\nRUN go build -o /api\nEXPOSE 8080\n',
      'main.go': 'package main\nfunc main() {}\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toEqual([]);
  });

  it('validates exact imported Go package directories instead of their shared top-level parent', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/api\n',
      Dockerfile: [
        'FROM golang:1.25',
        'COPY go.mod main.go ./',
        'COPY internal/foo ./internal/foo',
        'RUN go build -o /api .',
        'EXPOSE 8080',
        ''
      ].join('\n'),
      'main.go': 'package main\nimport _ "example.com/api/internal/bar"\nfunc main() {}\n',
      'internal/foo/foo.go': 'package foo\n',
      'internal/bar/bar.go': 'package bar\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toEqual([]);
  });

  it('does not reject a Dockerfile for an omitted package reachable only from another binary', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/control-plane\n',
      '.dockerignore': 'internal/tooldep\n',
      Dockerfile: 'FROM golang:1.25\nCOPY . .\nRUN go build -o /api ./cmd/api\nEXPOSE 8080\n',
      'cmd/api/main.go': 'package main\nfunc main() {}\n',
      'cmd/tool/main.go': 'package main\nimport _ "example.com/control-plane/internal/tooldep"\nfunc main() {}\n',
      'internal/tooldep/tooldep.go': 'package tooldep\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]?.dockerfile).toBe('Dockerfile');
  });

  it('honors Dockerfile-specific ignore files such as Dockerfile.release.dockerignore', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/api\n',
      '.dockerignore': '# default ignores nothing\n',
      'Dockerfile.release.dockerignore': 'internal/private\n',
      'Dockerfile.release': 'FROM golang:1.25\nCOPY . .\nRUN go build -o /api .\nEXPOSE 8080\n',
      'main.go': 'package main\nimport _ "example.com/api/internal/private"\nfunc main() {}\n',
      'internal/private/private.go': 'package private\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toEqual([]);
  });

  it('resolves RUN go build targets relative to WORKDIR across COPY destination mapping', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/mono\n',
      'cmd/api/main.go': 'package main\nfunc main() {}\n',
      'cmd/cli/main.go': 'package main\nimport _ "example.com/mono/internal/clidriver"\nfunc main() {}\n',
      'internal/clidriver/clidriver.go': 'package clidriver\n',
      Dockerfile: [
        'FROM golang:1.25 AS builder',
        'WORKDIR /src',
        'COPY go.mod ./',
        'COPY cmd/api ./cmd/api',
        'RUN go build -o /bin/api ./cmd/api',
        'FROM alpine:3.20',
        'COPY --from=builder /bin/api /usr/local/bin/api',
        'EXPOSE 8080',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]?.dockerfile).toBe('Dockerfile');
  });

  it('follows a repository-local root Dockerfile pointer and persists declared volumes', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'password-vault', dependencies: { express: '5' } }),
      Dockerfile: 'docker/Dockerfile.production\n',
      'docker/Dockerfile.production': [
        'FROM node:24',
        'EXPOSE 80',
        'VOLUME ["/data"]',
        'ENTRYPOINT ["/app/start.sh"]',
        ''
      ].join('\n')
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, dockerfileProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'password-vault',
      path: '.',
      port: 80,
      dockerfile: 'docker/Dockerfile.production',
      writesLocalFilesystem: { paths: ['/data'], purpose: 'unknown' },
      declaredContainerVolumes: { paths: ['/data'] }
    });

    const composed = composeConfig({ facts });
    expect(composed.config.resources.passwordVault).toMatchObject({
      type: 'web-service',
      properties: {
        containerPort: 80,
        packaging: {
          type: 'custom-dockerfile',
          properties: {
            buildContextPath: '.',
            dockerfilePath: 'docker/Dockerfile.production'
          }
        },
        scaling: { minInstances: 1, maxInstances: 1 },
        volumeMounts: [{ type: 'efs', properties: { efsFilesystemName: 'passwordVaultData', mountPath: '/data' } }]
      }
    });
    expect(composed.config.resources.passwordVaultData).toMatchObject({
      type: 'efs-filesystem',
      properties: { backupEnabled: true }
    });
    expect(
      (composed.config.resources.passwordVault?.properties.packaging as { properties?: unknown } | undefined)
        ?.properties
    ).not.toHaveProperty('command');
    expect(composed.deployable).toBe(true);
  });

  it('produces the same Dockerfile facts for a contained symlink and its materialized pointer', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-dockerfile-equivalence-'));
    const materializedRoot = join(root, 'materialized');
    const linkedRoot = join(root, 'linked');
    const dockerfile = ['FROM node:24', 'EXPOSE 80', 'VOLUME ["/data"]', 'ENTRYPOINT ["/app/start.sh"]', ''].join('\n');
    await Promise.all(
      [materializedRoot, linkedRoot].map(async (repositoryRoot) => {
        await mkdir(join(repositoryRoot, 'docker'), { recursive: true });
        await Promise.all([
          writeFile(
            join(repositoryRoot, 'package.json'),
            JSON.stringify({
              name: 'password-vault',
              dependencies: { express: '5' }
            }),
            'utf8'
          ),
          writeFile(join(repositoryRoot, 'docker/Dockerfile.production'), dockerfile, 'utf8')
        ]);
      })
    );
    await writeFile(join(materializedRoot, 'Dockerfile'), 'docker/Dockerfile.production\n', 'utf8');
    await symlink('docker/Dockerfile.production', join(linkedRoot, 'Dockerfile'), 'file');

    const [materialized, linked] = await Promise.all([
      assembleCandidateFacts({
        root: materializedRoot,
        probes: [manifestProbe, dockerfileProbe]
      }),
      assembleCandidateFacts({
        root: linkedRoot,
        probes: [manifestProbe, dockerfileProbe]
      })
    ]);

    expect(linked.facts.services).toEqual(materialized.facts.services);
    expect(composeConfig({ facts: linked.facts }).config).toEqual(composeConfig({ facts: materialized.facts }).config);
  });

  it('does not read an unlisted Dockerfile target through either symlink representation', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-dockerfile-truncated-equivalence-'));
    const materializedRoot = join(root, 'materialized');
    const linkedRoot = join(root, 'linked');
    await Promise.all(
      [materializedRoot, linkedRoot].map(async (repositoryRoot) => {
        await mkdir(join(repositoryRoot, 'docker'), { recursive: true });
        await writeFile(join(repositoryRoot, 'docker/Dockerfile.production'), 'FROM node:24\nEXPOSE 8080\n', 'utf8');
      })
    );
    await writeFile(join(materializedRoot, 'Dockerfile'), 'docker/Dockerfile.production\n', 'utf8');
    await symlink('docker/Dockerfile.production', join(linkedRoot, 'Dockerfile'), 'file');

    const [materialized, linked] = await Promise.all([
      dockerfileFactsAtLimit(materializedRoot),
      dockerfileFactsAtLimit(linkedRoot)
    ]);

    expect(materialized.listing.files).not.toContain('docker/Dockerfile.production');
    expect(linked.listing.files).not.toContain('docker/Dockerfile.production');
    expect(linked.listing.dockerfileSymlinks).toEqual([]);
    expect(linked.output.services ?? []).toEqual(materialized.output.services ?? []);
    expect(linked.output.services ?? []).toEqual([]);
  });

  it('ignores nested test harness Dockerfiles, manifests, and environment values', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': JSON.stringify({ name: 'api', dependencies: { express: '5' } }),
      Dockerfile: 'FROM node:24\nEXPOSE 8080\n',
      'playwright/package.json': JSON.stringify({
        name: 'browser-tests',
        dependencies: { mysql2: '3', pg: '8' }
      }),
      'playwright/test.env': [
        'POSTGRES_USER=test',
        'POSTGRES_PASSWORD=test',
        'MYSQL_USER=test',
        'MYSQL_PASSWORD=test',
        ''
      ].join('\n'),
      'playwright/docker-compose.yml': 'services:\n  postgres:\n    image: postgres:18\n',
      'playwright/compose/keycloak/Dockerfile': 'FROM quay.io/keycloak/keycloak:26\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, environmentProbe, dockerfileProbe]
    });

    expect(facts.services.map((service) => service.name)).toEqual(['api']);
    expect(facts.dependencies).toEqual([]);
  });

  it('offers a managed database choice without turning source capability into a dependency fact', async () => {
    const repositoryRoot = await makeRepo({
      'Cargo.toml': [
        '[package]',
        'name = "password-vault"',
        '[features]',
        'postgresql = ["diesel/postgres"]',
        '[dependencies]',
        'diesel = "2"',
        'rocket = "0.5"',
        ''
      ].join('\n'),
      'docker/Dockerfile.production': [
        'FROM rust:1 AS build',
        'ARG DB=sqlite,mysql,postgresql',
        'FROM debian:13',
        'WORKDIR /',
        'VOLUME /data',
        'EXPOSE 80',
        'CMD ["/start.sh"]',
        ''
      ].join('\n'),
      'docker/Dockerfile.alpine': 'FROM alpine:3.22\nEXPOSE 80\nVOLUME /data\n',
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
      ].join('\n')
    });
    await symlink('docker/Dockerfile.production', join(repositoryRoot, 'Dockerfile'), 'file');
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe, languageManifestProbe]
    });
    const composed = composeConfig({ facts });

    expect(facts.dependencies).toEqual([]);
    expect(facts.services[0]).toMatchObject({
      dockerfile: 'docker/Dockerfile.production',
      defaultLocalDatabase: {
        kind: 'sqlite',
        path: '/data/db.sqlite3',
        connectionVariable: 'DATABASE_URL'
      },
      managedDatabaseCapabilities: [{ kind: 'postgres', connectionVariable: 'DATABASE_URL' }]
    });
    expect(facts.services[0]?.environmentVariables).not.toContainEqual(
      expect.objectContaining({
        name: 'DATABASE_URL',
        role: 'infra-dependency'
      })
    );
    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({
        name: 'DOMAIN',
        role: 'cross-service-reference',
        targetServiceName: 'password-vault',
        targetServiceProperty: 'url'
      })
    );

    expect(composed.config.resources.mainDatabase?.type).toBe('relational-database');
    expect(composed.assumptions).toContainEqual(
      expect.objectContaining({
        id: 'sqlite-persistence:password-vault',
        kind: 'sqlite-persistence',
        chosen: 'migrate-to-managed-database',
        notable: true
      })
    );
    expect(composed.config.resources.passwordVault?.properties.environment).toEqual(
      expect.arrayContaining([
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'DOMAIN', value: "$ResourceParam('passwordVault', 'url')" }
      ])
    );
    expect(composed.gaps.some((gap) => gap.subject === 'password-vault.database-persistence')).toBe(false);
    expect(composed.deployable).toBe(true);

    const keptOnEfs = composeConfig({
      facts,
      decisions: { 'sqlite-persistence:password-vault': 'persistent-volume' }
    });
    expect(keptOnEfs.config.resources.mainDatabase).toBeUndefined();
    expect(keptOnEfs.config.resources.databaseBastion).toBeUndefined();
    expect(keptOnEfs.config.resources.passwordVaultData?.type).toBe('efs-filesystem');
    expect(keptOnEfs.assumptions).toContainEqual(
      expect.objectContaining({
        chosen: 'persistent-volume',
        alternatives: ['migrate-to-managed-database', 'persistent-volume']
      })
    );
    expect(keptOnEfs.gaps).toContainEqual(
      expect.objectContaining({
        subject: 'password-vault.database-persistence',
        message: expect.stringMatching(/SQLite WAL.*network filesystems.*application-consistent.*disabling WAL/i)
      })
    );
    expect(keptOnEfs.deployable).toBe(false);
  });

  it('retains legitimate services declared by an ordinary multi-service workspace', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': JSON.stringify({ private: true, workspaces: ['apps/*'] }),
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node server.js' },
        dependencies: { express: '5' }
      }),
      'apps/api/Dockerfile': 'FROM node:24\nEXPOSE 3000\n',
      'apps/worker/package.json': JSON.stringify({
        name: 'worker',
        scripts: { start: 'node worker.js' }
      }),
      'apps/worker/Dockerfile': 'FROM node:24\nCMD ["node", "worker.js"]\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, dockerfileProbe]
    });

    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['api', 'worker']);
    expect(facts.services.find((service) => service.name === 'api')).toMatchObject({
      path: 'apps/api',
      dockerfile: 'apps/api/Dockerfile',
      exposesHttp: true
    });
    expect(facts.services.find((service) => service.name === 'worker')).toMatchObject({
      path: 'apps/worker',
      dockerfile: 'apps/worker/Dockerfile',
      exposesHttp: false
    });
  });
});
