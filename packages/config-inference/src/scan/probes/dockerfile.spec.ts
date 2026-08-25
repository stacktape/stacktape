import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { environmentProbe } from './environment';
import { dockerfileProbe } from './dockerfile';
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
