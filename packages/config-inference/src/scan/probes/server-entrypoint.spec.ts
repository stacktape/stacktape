import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { dockerfileProbe } from './dockerfile';
import { manifestProbe } from './manifest';
import { serverEntrypointProbe } from './server-entrypoint';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'stp-entrypoint-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(root, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return root;
};

const goHttpMain = (port: number): string =>
  ['package main', 'import "net/http"', `func main() { http.ListenAndServe(":${port}", nil) }`, ''].join('\n');

describe('the server entrypoint probe', () => {
  it('gives a scriptless TypeScript API to the zero-config container buildpack', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '5.0.0' }
      }),
      'src/server.ts': 'const app = express();\napp.listen(3000);'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'api',
      containerEntrypoint: 'src/server.ts',
      exposesHttp: true
    });
  });

  it('records the ASGI application object, not an invented shell command', async () => {
    const repositoryRoot = await makeRepo({
      'requirements.txt': 'fastapi==1.0.0\n',
      'app/main.py': 'from fastapi import FastAPI\napi = FastAPI()\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services[0]).toMatchObject({
      framework: 'fastapi',
      containerEntrypoint: 'app/main.py:api'
    });
  });

  it('does not turn a non-web Spring Boot process into a web service', async () => {
    const repositoryRoot = await makeRepo({
      'pom.xml': [
        '<artifactId>spring-boot-starter-parent</artifactId>',
        '<artifactId>spring-boot-starter</artifactId>'
      ].join('\n'),
      'src/main/java/WorkerApplication.java': [
        '@SpringBootApplication',
        'class WorkerApplication {',
        '  public static void main(String[] args) { SpringApplication.run(WorkerApplication.class, args); }',
        '}'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      exposesHttp: false,
      executionModel: 'long-running',
      containerEntrypoint: 'src/main/java/WorkerApplication.java'
    });
  });

  it('recognises a Hono fetch export without inventing a listen call', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': '{"name":"api","dependencies":{"hono":"4"}}',
      'src/index.ts': ['import { Hono } from "hono";', 'const app = new Hono();', 'export default app;'].join('\n')
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services[0]).toMatchObject({
      framework: 'hono',
      exposesHttp: true,
      containerEntrypoint: 'src/index.ts'
    });
  });

  it('uses a public PHP front controller as the container entrypoint', async () => {
    const repositoryRoot = await makeRepo({
      'composer.json': '{"name":"demo/api"}',
      'public/index.php': "<?php\nrequire __DIR__ . '/../vendor/autoload.php';\n"
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services[0]).toMatchObject({
      language: 'php',
      exposesHttp: true,
      containerEntrypoint: 'public/index.php'
    });
  });

  it('finds a BullMQ worker without turning a Nest application context into HTTP', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': JSON.stringify({
        name: 'jobs',
        dependencies: { '@nestjs/core': '10', bullmq: '5', ioredis: '5' }
      }),
      'src/main.ts': [
        'import { NestFactory } from "@nestjs/core";',
        'await NestFactory.createApplicationContext(class AppModule {});'
      ].join('\n'),
      'src/worker.ts': ['import { Worker } from "bullmq";', 'new Worker("emails", async job => job.data);'].join('\n')
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'worker',
      processType: 'worker',
      exposesHttp: false,
      containerEntrypoint: 'src/worker.ts'
    });
    expect(facts.dependencies[0]?.consumedBy).toEqual(['worker']);
  });

  it('uses the worker package identity for a conventional src/index BullMQ entrypoint', async () => {
    const repositoryRoot = await makeRepo({
      'apps/worker/package.json': JSON.stringify({
        name: '@acme/worker',
        scripts: { start: 'node dist/index.js' },
        dependencies: { bullmq: '5' }
      }),
      'apps/worker/src/index.ts': [
        'import { Worker } from "bullmq";',
        'new Worker("emails", async job => job.data);'
      ].join('\n')
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [manifestProbe, serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'worker',
      path: 'apps/worker',
      processType: 'worker',
      containerEntrypoint: 'apps/worker/src/index.ts'
    });
  });

  it('does not deploy server-shaped test files', async () => {
    const repositoryRoot = await makeRepo({
      'package.json': '{"name":"database-library"}',
      'src/wait-for-database.test.ts': 'const server = net.createServer();\nserver.listen(5432);\n',
      'src/http.spec.ts': 'const app = express();\napp.listen(3000);\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('recognises a configured Go http.Server', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/api\n',
      'main.go': 'package main\nimport "net/http"\nfunc main() { server := &http.Server{}; server.ListenAndServe() }\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services[0]).toMatchObject({
      language: 'go',
      exposesHttp: true,
      containerEntrypoint: 'main.go'
    });
  });

  it('joins a Go main function with the HTTP listener in another file of the same package', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/list-manager\n',
      'cmd/main.go': 'package main\nfunc main() { startApplication() }\n',
      'cmd/http.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'func startApplication() {',
        '  server := echo.New()',
        '  server.Start(":9000")',
        '}',
        ''
      ].join('\n')
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'list-manager',
      path: '.',
      language: 'go',
      exposesHttp: true,
      containerEntrypoint: 'cmd/main.go'
    });
  });

  it('uses an exposed production Dockerfile to identify a delegated Go server entrypoint', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/notify/v2\n',
      'main.go': 'package main\nfunc main() { app.Run(os.Args) }\n',
      Dockerfile: 'FROM scratch\nCOPY notify /notify\nEXPOSE 8080\nENTRYPOINT ["/notify"]\n',
      'server/server.go': 'package server\nimport "net/http"\nfunc serve() { http.ListenAndServe(":8080", handler) }\n',
      'examples/demo/main.go':
        'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":9090", handler) }\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'notify',
      path: '.',
      language: 'go',
      exposesHttp: true,
      port: 8080,
      containerEntrypoint: 'main.go'
    });
  });

  it('does not turn a Go CLI or its example server into the deployed application', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/toolbox\n',
      'main.go': 'package main\nfunc main() { app.Run(os.Args) }\n',
      Dockerfile: 'FROM scratch\nCOPY toolbox /toolbox\nENTRYPOINT ["/toolbox"]\n',
      'examples/demo/main.go':
        'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":9090", handler) }\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('does not use a module-level EXPOSE to choose between multiple delegated Go binaries', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/tool-suite\n',
      'cmd/api/main.go': 'package main\nfunc main() { app.Run(os.Args) }\n',
      'cmd/worker/main.go': 'package main\nfunc main() { worker.Run(os.Args) }\n',
      Dockerfile: 'FROM scratch\nCOPY application /application\nEXPOSE 8080\nENTRYPOINT ["/application"]\n'
    });
    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe]
    });

    expect(facts.services).toEqual([]);
  });

  it('does not treat ordinary Start, Listen, or Serve methods as proof that a Go CLI serves HTTP', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/task-runner\n',
      'main.go': [
        'package main',
        'type daemon struct{}',
        'func (daemon) Start() {}',
        'func (daemon) Listen() {}',
        'func (daemon) Serve() {}',
        'func main() { var command daemon; command.Start(); command.Listen(); command.Serve() }',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toEqual([]);
  });

  it('does not accept known-framework listener text that exists only in comments or strings', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/task-runner\n',
      'main.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'func main() {',
        '  server := echo.New()',
        '  // server.Start(":8080")',
        '  _ = `server.Start(":8080")`',
        '  _ = server',
        '}',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toEqual([]);
  });

  it('completely excludes Go test files even when they contain a main function and a real HTTP listener', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/library\n',
      'main.go': 'package main\nfunc main() { runCommand() }\n',
      'server_test.go': [
        'package main',
        'import "net/http"',
        'func main() { http.ListenAndServe(":8080", nil) }',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toEqual([]);
  });

  it('recognises an aliased standard-library HTTP import', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/api\n',
      'main.go': ['package main', 'import web "net/http"', 'func main() { web.ListenAndServe(":8080", nil) }', ''].join(
        '\n'
      )
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({ name: 'api', path: '.', containerEntrypoint: 'main.go' });
  });

  it('keeps every real HTTP main package in one Go module under a stable distinct identity', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/control-plane\n',
      'cmd/api/main.go': goHttpMain(8080),
      'cmd/admin/main.go': goHttpMain(8081)
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toHaveLength(2);
    expect(facts.services).toContainEqual(
      expect.objectContaining({
        name: 'api',
        path: 'cmd/api',
        buildRoot: '.',
        containerEntrypoint: 'cmd/api/main.go'
      })
    );
    expect(facts.services).toContainEqual(
      expect.objectContaining({
        name: 'admin',
        path: 'cmd/admin',
        buildRoot: '.',
        containerEntrypoint: 'cmd/admin/main.go'
      })
    );
  });

  it('records missing go:embed inputs but not assets present in the checkout', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/notifier\n',
      'main.go': [
        'package main',
        'import "net/http"',
        'import _ "example.com/notifier/server"',
        'func main() { http.ListenAndServe(":80", nil) }',
        ''
      ].join('\n'),
      'server/assets.go': [
        'package server',
        'import "embed"',
        '//go:embed site docs generated/*',
        'var assets embed.FS',
        ''
      ].join('\n'),
      'server/site/index.html': '<main>ready</main>',
      'server/generated/app.js': 'console.log("ready")',
      'internal/demo/assets.go': 'package demo\nimport "embed"\n//go:embed absent\nvar assets embed.FS\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]?.missingEmbeddedAssets).toEqual(['server/docs']);
  });

  it('requires syntactic Go imports and main declarations instead of comment or string lookalikes', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/decoy\n',
      'main.go': [
        'package main',
        'var docs = "net/http"',
        '// func main() { http.ListenAndServe(":8080", nil) }',
        'type httpClient struct{}',
        'func (httpClient) ListenAndServe() {}',
        'func run() { http.ListenAndServe() }',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toEqual([]);
  });

  it('associates a root Dockerfile with its exact Go build target without minting a third service', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/control-plane\n',
      Dockerfile: [
        'FROM golang:1.25 AS build',
        'WORKDIR /src',
        'COPY go.mod ./',
        'COPY cmd/api ./cmd/api',
        'RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /api ./cmd/api',
        'FROM scratch',
        'COPY --from=build /api /api',
        'EXPOSE 8080',
        'ENTRYPOINT ["/api"]',
        ''
      ].join('\n'),
      'cmd/api/main.go': 'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":8080", nil) }\n',
      'cmd/admin/main.go': 'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":8081", nil) }\n'
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [serverEntrypointProbe, dockerfileProbe]
    });

    expect(facts.services).toHaveLength(2);
    expect(facts.services.find((service) => service.name === 'api')).toMatchObject({
      path: 'cmd/api',
      buildRoot: '.',
      dockerfile: 'Dockerfile',
      containerEntrypoint: 'cmd/api/main.go'
    });
    expect(facts.services.find((service) => service.name === 'admin')).toMatchObject({
      path: 'cmd/admin',
      containerEntrypoint: 'cmd/admin/main.go'
    });
    expect(facts.services.find((service) => service.name === 'admin')?.dockerfile).toBeUndefined();
  });

  it('uses target-compatible reachable Go files and Go character classes for embed checks', async () => {
    const repositoryRoot = await makeRepo({
      'go.mod': 'module example.com/targeted\n',
      'cmd/api/main.go': [
        'package main',
        'import "net/http"',
        'import _ "example.com/targeted/internal/assets"',
        'var decoy = "example.com/targeted/internal/unreachable"',
        'func main() { http.ListenAndServe(":8080", nil) }',
        ''
      ].join('\n'),
      'internal/assets/assets_linux.go': 'package assets\nimport "embed"\n//go:embed site/[ab].html\nvar fs embed.FS\n',
      'internal/assets/assets_windows.go':
        '//go:build windows\n\npackage assets\nimport "embed"\n//go:embed windows-missing\nvar windows embed.FS\n',
      'internal/assets/site/a.html': '<main>ready</main>',
      'internal/unreachable/assets.go': 'package unreachable\nimport "embed"\n//go:embed missing\nvar fs embed.FS\n'
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [serverEntrypointProbe] });

    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]?.missingEmbeddedAssets).toBeUndefined();
  });
});
