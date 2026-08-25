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

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [dockerfileProbe] });

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
});
