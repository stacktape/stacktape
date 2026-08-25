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

  it('rejects a release-image Dockerfile whose required prebuilt binary is absent from a clean checkout', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/list-manager\n',
      'cmd/main.go': 'package main\nfunc main() {}\n',
      Dockerfile: 'FROM alpine:3.20\nCOPY list-manager /app/list-manager\nEXPOSE 8080\n'
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
});
