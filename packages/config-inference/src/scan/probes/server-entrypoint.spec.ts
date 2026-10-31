import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts, createProbeContext } from '../assemble';
import { listRepositoryFiles } from '../file-tree';
import { languageManifestProbe } from './language-manifests';
import { manifestProbe } from './manifest';
import { procfileProbe } from './procfile';
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
      'main.go': 'package main\nfunc main() { server := &http.Server{}; server.ListenAndServe() }\n'
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
});

describe('the port a server listens on', () => {
  const NODE = JSON.stringify({ name: 'api', dependencies: { express: '5.0.0' } });
  const SPRING_POM =
    '<project><dependencies><dependency><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>';
  const SPRING_APP =
    '@SpringBootApplication\npublic class App { public static void main(String[] a) { SpringApplication.run(App.class, a); } }';
  const cases: Array<{ name: string; files: Record<string, string>; port: number | undefined; line?: number }> = [
    {
      name: 'a literal listen port',
      files: { 'package.json': NODE, 'src/server.js': 'app.listen(4000);' },
      port: 4000,
      line: 1
    },
    {
      name: 'a fallback after PORT',
      files: { 'package.json': NODE, 'src/server.js': 'const app = express();\napp.listen(process.env.PORT || 8081);' },
      port: 8081,
      line: 2
    },
    {
      name: 'a named constant',
      files: {
        'package.json': NODE,
        'src/server.ts': 'const PORT = Number(process.env.PORT) || 5001;\napp.listen(PORT, () => {});'
      },
      port: 5001,
      line: 1
    },
    {
      name: 'an options object over several lines',
      files: { 'package.json': NODE, 'src/server.js': 'app.listen({\n  host: "0.0.0.0",\n  port: 7000\n});' },
      port: 7000,
      line: 3
    },
    {
      name: 'a port read only from PORT',
      files: { 'package.json': NODE, 'src/server.js': 'app.listen(process.env.PORT);' },
      port: undefined
    },
    {
      name: 'a Go listen address',
      files: {
        'go.mod': 'module api\n',
        'main.go': 'package main\nfunc main() {\n\thttp.ListenAndServe(":8080", nil)\n}\n'
      },
      port: 8080,
      line: 3
    },
    {
      name: 'the Spring Boot default',
      files: { 'pom.xml': SPRING_POM, 'src/main/java/App.java': SPRING_APP },
      port: 8080
    },
    {
      name: 'a Spring Boot server.port with a default',
      files: {
        'pom.xml': SPRING_POM,
        'src/main/java/App.java': SPRING_APP,
        'src/main/resources/application.properties': 'spring.application.name=api\nserver.port=${SERVER_PORT:9090}\n'
      },
      port: 9090,
      line: 2
    },
    {
      name: 'a Spring Boot port that follows PORT',
      files: {
        'pom.xml': SPRING_POM,
        'src/main/java/App.java': SPRING_APP,
        'src/main/resources/application.yml': 'server:\n  port: ${PORT}\n'
      },
      port: undefined
    }
  ];

  for (const testCase of cases) {
    it(`reads ${testCase.name}`, async () => {
      const { facts } = await assembleCandidateFacts({
        root: await makeRepo(testCase.files),
        probes: [manifestProbe, serverEntrypointProbe]
      });
      const service = facts.services.find((candidate) => candidate.exposesHttp);

      expect(service?.port).toBe(testCase.port);
      if (testCase.line !== undefined) {
        expect(service?.evidence).toContainEqual(expect.objectContaining({ field: 'port', line: testCase.line }));
      }
    });
  }

  it.each([
    ['an entry script beside it', {}],
    ['a manifest of its own', { 'src/requirements.txt': 'django==5.1\n' }]
  ])(
    'keeps a Django project the root Procfile runs with --chdir src in the root service, with %s',
    async (_case, extra) => {
      const repositoryRoot = await makeRepo({
        'requirements.txt': 'django==5.1\ngunicorn==23\n',
        Procfile: 'web: gunicorn --chdir src config.wsgi:application\n',
        'src/manage.py':
          'import os, sys\nif __name__ == "__main__":\n    from django.core.management import execute_from_command_line\n    execute_from_command_line(sys.argv)\n',
        'src/config/wsgi.py':
          'from django.core.wsgi import get_wsgi_application\napplication = get_wsgi_application()\n',
        ...extra
      });
      const { facts } = await assembleCandidateFacts({
        root: repositoryRoot,
        probes: [procfileProbe, languageManifestProbe, serverEntrypointProbe]
      });

      expect(facts.services.map(({ path, startCommand }) => ({ path, startCommand }))).toEqual([
        { path: '.', startCommand: 'gunicorn --chdir src config.wsgi:application' }
      ]);
    }
  );
});

/**
 * The start-command rule never makes init worse than first-file order. Each fixture records what first-file order (the
 * probe before the rule) chose; the probe must choose the same, except the listed improvements, where the start command
 * unambiguously runs a file that listens itself. The fixtures are the variants three reviews of #416 used to find
 * regressions.
 */
/** Per service: process type, entry file, port and whether it serves HTTP. */
type Choice = Array<[string, string | null, number | null, boolean]>;
type StartFixture = {
  name: string;
  files: Record<string, string>;
  main: Choice;
  improvement?: { startCommand: string; reason: string; choice: Choice };
};
const startFixtures = JSON.parse(
  await readFile(join(import.meta.dir, 'server-entrypoint.start-fixtures.json'), 'utf8')
) as StartFixture[];

describe('the server entrypoint probe against first-file order', () => {
  for (const fixture of startFixtures) {
    it(`${fixture.name}: ${fixture.improvement === undefined ? 'keeps the first-file choice' : `${fixture.improvement.startCommand}: ${fixture.improvement.reason}`}`, async () => {
      const repositoryRoot = await makeRepo(fixture.files);
      const { services } = await serverEntrypointProbe.run(
        createProbeContext(repositoryRoot, (await listRepositoryFiles(repositoryRoot)).files)
      );
      const choice: Choice = (services ?? []).map((service) => [
        service.processType ?? 'main',
        service.containerEntrypoint ?? null,
        service.port ?? null,
        service.exposesHttp
      ]);
      expect(choice).toEqual(fixture.improvement?.choice ?? fixture.main);
    });
  }
});
