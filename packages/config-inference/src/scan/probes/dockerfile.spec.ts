import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { dockerfileProbe } from './dockerfile';

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
});
