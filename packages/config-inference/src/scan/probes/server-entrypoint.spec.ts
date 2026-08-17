import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
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
});
