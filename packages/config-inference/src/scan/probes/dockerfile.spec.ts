import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
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

describe('the standalone Dockerfile probe', () => {
  it('uses an exposed Dockerfile as the exact packaging for a web service', async () => {
    const repositoryRoot = await makeRepo({
      'apps/api/package.json': '{"name":"api","dependencies":{"express":"5"}}',
      'apps/api/Dockerfile': 'FROM node:24\nEXPOSE 8080\nCMD ["node", "server.js"]\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe]
    });

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
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe]
    });

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

  it('moves a source-proven default SQLite database off the declared network volume', async () => {
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
      Dockerfile: 'docker/Dockerfile.production\n',
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
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [dockerfileProbe, languageManifestProbe]
    });
    const composed = composeConfig({ facts });

    expect(facts.dependencies).toContainEqual(
      expect.objectContaining({
        name: 'mainDatabase',
        kind: 'postgres',
        consumedBy: ['password-vault'],
        addressedBy: ['DATABASE_URL']
      })
    );
    expect(facts.services[0]).toMatchObject({
      defaultLocalDatabase: {
        kind: 'sqlite',
        path: '/data/db.sqlite3',
        connectionVariable: 'DATABASE_URL'
      }
    });
    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({
        name: 'DATABASE_URL',
        role: 'infra-dependency',
        dependencyName: 'mainDatabase'
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
    expect(composed.config.resources.passwordVault?.properties.environment).toEqual(
      expect.arrayContaining([
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'DOMAIN', value: "$ResourceParam('passwordVault', 'url')" }
      ])
    );
    expect(composed.gaps.some((gap) => gap.subject === 'password-vault.database-persistence')).toBe(false);
    expect(composed.deployable).toBe(true);
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
