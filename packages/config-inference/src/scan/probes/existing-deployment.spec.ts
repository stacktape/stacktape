/**
 * Noticing that a repository is already deployed.
 *
 * The tests that matter here are the negative ones. Claiming to have found somebody's Terraform when
 * all we found was a `.tf` file in a fixtures directory is worse than finding nothing: it is a
 * confident, specific, wrong statement about their infrastructure, made by a tool they have just met.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '../../facts/project-facts';
import { assembleCandidateFacts } from '../assemble';
import { dockerComposeProbe } from './docker-compose';
import { existingDeploymentProbe } from './existing-deployment';
import { environmentProbe } from './environment';
import { manifestProbe } from './manifest';
import { procfileProbe } from './procfile';

const PROBES = [manifestProbe, existingDeploymentProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-deployment-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

const APP_MANIFEST = JSON.stringify({
  name: 'api',
  scripts: { start: 'node index.js' }
});

describe('the existing-deployment probe', () => {
  it('finds an unambiguous deployment declaration and cites it', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'serverless.yml': 'service: orders-api\nprovider:\n  name: aws\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(1);
    expect(facts.existingDeployments[0]).toMatchObject({
      tool: 'serverless-framework',
      managesAws: true
    });
    expect(facts.existingDeployments[0]?.evidence[0]).toMatchObject({
      file: 'serverless.yml',
      line: 1
    });
  });

  it('asks the Terraform files which cloud they are for', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'infra/main.tf': 'provider "google" {\n  project = "example"\n}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // Terraform deploys anywhere. Reporting "you have AWS resources" for a Google project would send
    // a future takeover flow looking for things that are not there.
    expect(facts.existingDeployments[0]).toMatchObject({
      tool: 'terraform',
      managesAws: false
    });
  });

  it('ignores a stray .tf file that is not somebody’s infrastructure', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'src/__fixtures__/sample.tf': 'provider "aws" {}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
  });

  it('does not read every template.yaml as CloudFormation', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      // The most common filename in the world, and here it is a mail template.
      'template.yaml': 'subject: Welcome\nbody: Hello {{name}}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
  });

  it('does not call a platform-neutral Procfile a live Heroku deployment', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node src/index.js' },
        dependencies: { express: '^5.0.0', pg: '^8.0.0' }
      }),
      Procfile: 'web: node src/index.js\nrelease: node migrate.js\n',
      '.env.example': 'DATABASE_URL=postgres://localhost/example\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, procfileProbe, environmentProbe, existingDeploymentProbe]
    });
    const composed = composeConfig({ facts, projectName: 'api' });

    expect(facts.existingDeployments).toEqual([]);
    expect(composed.gaps.some((gap) => gap.subject === 'heroku')).toBe(false);
    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'api',
      exposesHttp: true,
      executionModel: 'long-running',
      // A Procfile's web command is the exact production declaration; a matching package script is
      // only an alias and must not displace it.
      startCommand: 'node src/index.js'
    });
    expect(facts.dependencies).toContainEqual(
      expect.objectContaining({
        kind: 'postgres',
        addressedBy: ['DATABASE_URL']
      })
    );
    expect(facts.migrations[0]).toMatchObject({
      command: 'node migrate.js',
      runsAt: 'ci'
    });
    expect(composed.config.resources.api).toMatchObject({
      type: 'web-service',
      properties: {
        packaging: { properties: { startCmd: 'node src/index.js' } },
        connectTo: ['mainDatabase'],
        environment: [
          {
            name: 'DATABASE_URL',
            value: "$ResourceParam('mainDatabase', 'connectionString')"
          }
        ]
      }
    });
    expect(composed.config.scripts?.migrateDatabase).toMatchObject({
      properties: {
        executeCommand: 'node migrate.js',
        connectTo: ['mainDatabase']
      }
    });
  });

  it('recognises a Heroku-specific app manifest without relying on a Procfile', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'app.json': JSON.stringify({
        name: 'orders',
        addons: ['heroku-postgresql:essential-0'],
        env: {
          API_TOKEN: {
            value: 'existing-deployment-citation-must-not-copy-this'
          }
        }
      })
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]).toMatchObject({
      tool: 'heroku',
      managesAws: false
    });
    expect(JSON.stringify(facts)).not.toContain('existing-deployment-citation-must-not-copy-this');
  });

  it('recognises a platform deployment and says the right thing about it', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'fly.toml': 'app = "orders-api"\n\n[http_service]\n  internal_port = 8080\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'orders' });
    const message = composed.gaps.find((gap) => gap.subject === 'fly')?.message ?? '';

    expect(facts.existingDeployments[0]).toMatchObject({
      tool: 'fly',
      managesAws: false
    });
    // Somebody deploying this without realising they now have two copies running will blame us for
    // the bill, so the second copy has to be stated before the deploy, not discovered after it.
    expect(message).toContain('second copy on AWS');
    expect(message).toContain('Fly.io');
  });

  it('recognises Wrangler without pretending Cloudflare runtime bindings are portable', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'feedback-worker',
        type: 'module'
      }),
      'wrangler.jsonc': '{ "name": "feedback", "main": "src/index.ts", "d1_databases": [] }',
      'src/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'feedback' });

    expect(facts.existingDeployments).toContainEqual(
      expect.objectContaining({
        tool: 'cloudflare-workers',
        managesAws: false
      })
    );
    expect(composed.config.resources).toEqual({});
    expect(composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message).toContain(
      'could not associate that runtime'
    );
  });

  it('cites one-line JSONC runtime keys without retaining adjacent values', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'edge', scripts: { dev: 'wrangler dev' } }),
      'wrangler.jsonc':
        '{ "main": "src/index.ts", "vars": { "API_TOKEN": "never-retain-this" }, "durable_objects": { "bindings": [{ "name": "ROOM", "class_name": "Room" }] } }',
      'src/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const constraint = facts.existingDeployments[0]?.runtimeConstraints[0];

    expect(constraint?.evidence).toEqual([
      { file: 'wrangler.jsonc', line: 1, quote: 'main' },
      { file: 'wrangler.jsonc', line: 1, quote: 'durable_objects' }
    ]);
    expect(JSON.stringify(facts)).not.toContain('never-retain-this');
    expect(constraint?.evidence.every((citation) => citation.quote.length > 0)).toBe(true);
  });

  it('keeps the durable-chat runtime as cited evidence without inventing an AWS service', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'durable-chat-template',
        dependencies: { react: '19.2.1', partyserver: '0.0.75' },
        devDependencies: { wrangler: '4.123.0' },
        scripts: { dev: 'wrangler dev', deploy: 'wrangler deploy' }
      }),
      'wrangler.json': JSON.stringify({
        main: 'src/server/index.ts',
        assets: { directory: './public' },
        durable_objects: { bindings: [{ name: 'Chat', class_name: 'Chat' }] }
      }),
      'src/server/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'durable-chat' });
    const cloudflare = facts.existingDeployments.find((deployment) => deployment.tool === 'cloudflare-workers');

    expect(cloudflare?.runtimeConstraints).toEqual([
      expect.objectContaining({
        platform: 'cloudflare-worker',
        scope: '.',
        entrypoint: 'src/server/index.ts',
        bindings: ['durable-object']
      })
    ]);
    expect(composed.config.resources).toEqual({});
    expect(composed.deployable).toBe(false);
    expect(composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message).toContain(
      'generated no AWS resources'
    );
  });

  it('does not leave a database and generic server behind for a Cloudflare React Router Worker', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'react-router-postgres-ssr-template',
        dependencies: { react: '19.2.1', 'react-router': '7.9.6' },
        devDependencies: { '@react-router/dev': '7.9.6', postgres: '3.4.7', wrangler: '4.123.0' },
        scripts: {
          build: 'react-router build',
          start: 'wrangler dev'
        }
      }),
      'wrangler.jsonc': `{
        "main": "./api/index.js",
        "services": [{ "binding": "BOOKS_SERVICE", "service": "books", "entrypoint": "BooksService" }]
      }`,
      'api/index.js': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'books' });

    expect(facts.services).toHaveLength(1);
    expect(facts.dependencies).toEqual([expect.objectContaining({ kind: 'postgres' })]);
    expect(composed.config.resources).toEqual({});
    expect(composed.serviceResources).toEqual({});
    expect(composed.deployable).toBe(false);
    const message = composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message ?? '';
    expect(message).toContain('service bindings');
    expect(message).toContain('generated no AWS resources');
  });

  it('does not turn an unowned package hint into an orphan database beside an unrecognized Worker', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'edge-only',
        dependencies: { postgres: '3.4.7' },
        devDependencies: { wrangler: '4.123.0' },
        scripts: { dev: 'wrangler dev' }
      }),
      'wrangler.json': '{ "main": "worker/index.ts" }',
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'edge-only' });

    expect(facts.services).toEqual([]);
    expect(facts.dependencies).toEqual([expect.objectContaining({ kind: 'postgres' })]);
    expect(composed.config.resources).toEqual({});
    expect(composed.deployable).toBe(false);
    const message = composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message ?? '';
    expect(message).toContain('detected Postgres dependency');
    expect(message).toContain('orphan AWS resources');
  });

  it('does not publish only the frontend of a Cloudflare Workflow application', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'workflows-starter-template',
        dependencies: { react: '19.2.1' },
        devDependencies: { vite: '7.0.0', wrangler: '4.123.0' },
        scripts: { build: 'vite build', dev: 'vite' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.jsonc': `{
        "main": "worker/index.ts",
        "workflows": [{ "name": "my-workflow", "binding": "MY_WORKFLOW", "class_name": "MyWorkflow" }],
        "durable_objects": { "bindings": [{ "name": "STATUS", "class_name": "Status" }] }
      }`,
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'workflows' });

    expect(facts.services).toEqual([
      expect.objectContaining({ framework: 'react', servesStaticAssets: { path: 'dist' } })
    ]);
    expect(composed.config.resources).toEqual({});
    expect(composed.deployable).toBe(false);
    const message = composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message ?? '';
    expect(message).toContain('Workflows');
    expect(message).toContain('Durable Objects');
    expect(message).toContain('generated no AWS resources');
  });

  it('does not let incidental Wrangler metadata suppress a platform-neutral service', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'orders',
        dependencies: { express: '5.1.0' },
        scripts: { start: 'node index.js' }
      }),
      'wrangler.toml': 'name = "local-tooling"\ncompatibility_date = "2026-01-01"\nd1_databases = []\n',
      'index.js': 'require("express")().listen(3000);'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'orders' });

    expect(facts.existingDeployments[0]?.runtimeConstraints).toEqual([]);
    expect(composed.config.resources.orders?.type).toBe('web-service');
    expect(composed.deployable).toBe(true);
    const message = composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message ?? '';
    expect(message).toContain('left the detected platform-neutral services unchanged');
    expect(message).not.toContain('generated no AWS resources');
  });

  it('suppresses only an app-local Worker and keeps a sibling service visible for review', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'] }),
      'apps/edge/package.json': JSON.stringify({
        name: 'edge',
        dependencies: { hono: '4.11.1', postgres: '3.4.7' },
        scripts: { start: 'wrangler dev' }
      }),
      'apps/edge/wrangler.toml': `main = "src/index.ts"
        [[d1_databases]]
        binding = "DB"
        database_name = "edge"
        database_id = "redacted"`,
      'apps/edge/src/index.ts': 'export default { fetch() { return new Response("ok"); } };',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '5.1.0', redis: '5.10.0' },
        scripts: { start: 'node index.js' }
      }),
      'apps/api/index.js': 'require("express")().listen(3000);'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'workspace' });

    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['api', 'edge']);
    expect(
      Object.values(composed.config.resources)
        .map((resource) => resource.type)
        .toSorted()
    ).toEqual(['redis-cluster', 'web-service']);
    expect(composed.config.resources.api?.type).toBe('web-service');
    expect(composed.serviceResources).toEqual({ api: 'api' });
    expect(composed.deployable).toBe(false);
    const message = composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message ?? '';
    expect(message).toContain('only for the platform-neutral parts');
    expect(message).toContain('not a deployable configuration for the complete app');
    expect(message).not.toContain('generated no AWS resources');
  });

  it('keeps a retained nested API database discovered through a shared root environment file', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'dashboard',
        private: true,
        workspaces: ['apps/*'],
        dependencies: { react: '19.2.1' },
        devDependencies: { vite: '7.0.0', wrangler: '4.123.0' },
        scripts: { build: 'vite build' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.json': '{ "main": "worker/index.ts", "workflows": [{ "binding": "FLOW" }] }',
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };',
      '.env.example': 'DATABASE_URL=postgres://localhost/app\n',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '5.1.0' },
        scripts: { start: 'node index.js' }
      }),
      'apps/api/index.js':
        'const express = require("express"); console.log(process.env.DATABASE_URL); express().listen(3000);'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, environmentProbe, existingDeploymentProbe]
    });
    const composed = composeConfig({ facts, projectName: 'workspace' });

    expect(facts.dependencies).toContainEqual(
      expect.objectContaining({
        kind: 'postgres',
        consumedBy: ['api'],
        evidence: [expect.objectContaining({ file: '.env.example', line: 1 })]
      })
    );
    expect(composed.config.resources.api?.type).toBe('web-service');
    expect(composed.config.resources.mainDatabase?.type).toBe('relational-database');
    expect(composed.config.resources.dashboard).toBeUndefined();
    expect(composed.deployable).toBe(false);
    expect(composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message).not.toContain(
      'left the detected Postgres dependency out'
    );
  });

  it('keeps a retained nested API database declared by root Compose', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'] }),
      'compose.yaml': `services:
        api:
          build:
            context: ./apps/api
          command: node index.js
          ports: ["3000:3000"]
          depends_on: [db]
        db:
          image: postgres:16`,
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '5.1.0' },
        scripts: { start: 'node index.js' }
      }),
      'apps/api/index.js': 'require("express")().listen(3000);',
      'apps/edge/package.json': JSON.stringify({ name: 'edge', devDependencies: { wrangler: '4.123.0' } }),
      'apps/edge/wrangler.json': '{ "main": "src/index.ts", "durable_objects": { "bindings": [{ "name": "ROOM" }] } }',
      'apps/edge/src/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, dockerComposeProbe, existingDeploymentProbe]
    });
    const composed = composeConfig({ facts, projectName: 'workspace' });

    expect(facts.dependencies).toContainEqual(
      expect.objectContaining({
        kind: 'postgres',
        consumedBy: ['api'],
        evidence: [expect.objectContaining({ file: 'compose.yaml' })]
      })
    );
    expect(composed.config.resources.api?.type).toBe('web-service');
    expect(composed.config.resources.mainDatabase?.type).toBe('relational-database');
    expect(composed.deployable).toBe(false);
    expect(composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message).not.toContain(
      'left the detected Postgres dependency out'
    );
  });

  it('does not assign one root Worker entrypoint to every unrelated Procfile process', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'mixed-root', dependencies: { express: '5.1.0' } }),
      Procfile: 'web: node src/web.js\nworker: node src/jobs.js\n',
      'wrangler.json': '{ "main": "src/cloudflare.ts", "durable_objects": { "bindings": [{ "name": "ROOM" }] } }',
      'src/web.js': 'require("express")().listen(3000);',
      'src/jobs.js': 'setInterval(() => undefined, 1000);',
      'src/cloudflare.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, procfileProbe, existingDeploymentProbe]
    });
    const composed = composeConfig({ facts, projectName: 'mixed-root' });

    expect(facts.services).toHaveLength(2);
    expect(
      Object.values(composed.config.resources)
        .map((resource) => resource.type)
        .toSorted()
    ).toEqual(['web-service', 'worker-service']);
    expect(composed.deployable).toBe(false);
    const message = composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message ?? '';
    expect(message).toContain('could not associate that runtime');
    expect(message).toContain('retained the detected platform-neutral services only for review');
    expect(message).toContain('not a deployable configuration');
  });

  it('does not publish a root Worker frontend when an unrelated nested API makes ownership look ambiguous', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'dashboard',
        private: true,
        workspaces: ['apps/*'],
        dependencies: { react: '19.2.1' },
        devDependencies: { vite: '7.0.0', wrangler: '4.123.0' },
        scripts: { build: 'vite build', dev: 'vite' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.json': '{ "main": "worker/index.ts", "workflows": [{ "binding": "FLOW" }] }',
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '5.1.0' },
        scripts: { start: 'node index.js' }
      }),
      'apps/api/index.js': 'require("express")().listen(3000);'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'workspace' });

    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['api', 'dashboard']);
    expect(composed.config.resources).toEqual({ api: expect.objectContaining({ type: 'web-service' }) });
    expect(composed.serviceResources).toEqual({ api: 'api' });
    expect(composed.deployable).toBe(false);
    expect(composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message).toContain(
      'not a deployable configuration for the complete app'
    );
  });

  it('ignores a nested documentation Worker instead of blocking the root application', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'orders',
        dependencies: { express: '5.1.0' },
        scripts: { start: 'node index.js' }
      }),
      'index.js': 'require("express")().listen(3000);',
      'docs/cloudflare/wrangler.jsonc': '{ "main": "worker.ts", "workflows": [{ "binding": "FLOW" }] }',
      'docs/cloudflare/worker.ts': 'export default { fetch() { return new Response("docs"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'orders' });

    expect(facts.existingDeployments).toEqual([]);
    expect(composed.config.resources.orders?.type).toBe('web-service');
    expect(composed.deployable).toBe(true);
    expect(composed.gaps.some((gap) => gap.subject === 'cloudflare-workers')).toBe(false);
  });

  it('still recognizes a deployed documentation app inside a workspace', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'] }),
      'apps/docs/package.json': JSON.stringify({ name: 'docs', scripts: { start: 'wrangler dev' } }),
      'apps/docs/wrangler.json': '{ "main": "src/index.ts" }',
      'apps/docs/src/index.ts': 'export default { fetch() { return new Response("docs"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toContainEqual(
      expect.objectContaining({
        tool: 'cloudflare-workers',
        runtimeConstraints: [expect.objectContaining({ scope: 'apps/docs', entrypoint: 'apps/docs/src/index.ts' })]
      })
    );
  });

  it('recognizes a real application directly under the root docs directory', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'workspace', private: true, workspaces: ['docs'] }),
      'docs/package.json': JSON.stringify({ name: 'docs', scripts: { start: 'wrangler dev' } }),
      'docs/wrangler.json': '{ "main": "src/index.ts" }',
      'docs/src/index.ts': 'export default { fetch() { return new Response("docs"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]?.runtimeConstraints).toContainEqual(
      expect.objectContaining({ scope: 'docs', entrypoint: 'docs/src/index.ts' })
    );
  });

  it('uses service identity instead of a duplicate name when suppressing an app-local Worker', async () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        {
          name: 'api',
          path: 'apps/edge',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'wrangler dev',
          evidence: [{ file: 'apps/edge/package.json', line: 1, quote: '"name"' }],
          source: 'probe'
        },
        {
          name: 'api',
          path: 'apps/node',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'node index.js',
          evidence: [{ file: 'apps/node/package.json', line: 1, quote: '"name"' }],
          source: 'probe'
        }
      ],
      dependencies: [
        {
          name: 'edgeDatabase',
          kind: 'postgres',
          consumedBy: ['api'],
          evidence: [{ file: 'apps/edge/package.json', line: 1, quote: 'postgres' }],
          source: 'probe'
        }
      ],
      existingDeployments: [
        {
          tool: 'cloudflare-workers',
          managesAws: false,
          runtimeConstraints: [
            {
              platform: 'cloudflare-worker',
              scope: 'apps/edge',
              entrypoint: 'apps/edge/src/index.ts',
              evidence: [{ file: 'apps/edge/wrangler.json', line: 1, quote: 'main' }]
            }
          ],
          evidence: [{ file: 'apps/edge/wrangler.json', line: 1, quote: 'main' }],
          source: 'probe'
        }
      ]
    });
    const composed = composeConfig({ facts, projectName: 'workspace' });

    expect(facts.services).toHaveLength(2);
    expect(composed.config.resources).toEqual({ api: expect.objectContaining({ type: 'web-service' }) });
    expect(composed.config.resources.edgeDatabase).toBeUndefined();
    expect(composed.provenance.api?.evidence).toContainEqual(
      expect.objectContaining({ file: 'apps/node/package.json' })
    );
    expect(composed.deployable).toBe(false);
  });

  it('does not assign a shared-root dependency across a retained and suppressed same-name collision', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        {
          name: 'api',
          path: 'apps/edge',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'wrangler dev',
          evidence: [{ file: 'apps/edge/package.json', line: 1, quote: '"name"' }],
          source: 'probe'
        },
        {
          name: 'api',
          path: 'apps/node',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'node index.js',
          evidence: [{ file: 'apps/node/package.json', line: 1, quote: '"name"' }],
          source: 'probe'
        }
      ],
      dependencies: [
        {
          name: 'sharedDatabase',
          kind: 'postgres',
          consumedBy: ['api'],
          evidence: [{ file: '.env.example', line: 1, quote: 'DATABASE_URL' }],
          source: 'probe'
        },
        {
          name: 'nodeCache',
          kind: 'redis',
          consumedBy: ['api'],
          evidence: [{ file: 'apps/node/package.json', line: 1, quote: 'redis' }],
          source: 'probe'
        }
      ],
      existingDeployments: [
        {
          tool: 'cloudflare-workers',
          managesAws: false,
          runtimeConstraints: [
            {
              platform: 'cloudflare-worker',
              scope: 'apps/edge',
              entrypoint: 'apps/edge/src/index.ts',
              evidence: [{ file: 'apps/edge/wrangler.json', line: 1, quote: 'main' }]
            }
          ],
          evidence: [{ file: 'apps/edge/wrangler.json', line: 1, quote: 'main' }],
          source: 'probe'
        }
      ]
    });
    const composed = composeConfig({ facts, projectName: 'workspace' });

    expect(composed.config.resources.api?.type).toBe('web-service');
    expect(composed.config.resources.nodeCache?.type).toBe('redis-cluster');
    expect(composed.config.resources.sharedDatabase).toBeUndefined();
    expect(composed.gaps.find((gap) => gap.subject === 'cloudflare-workers')?.message).toContain(
      'detected Postgres dependency out'
    );
    expect(composed.deployable).toBe(false);
  });

  it('ignores supporting-material Wrangler apps whose package is not active from the repository root', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'examples/worker/package.json': JSON.stringify({
        name: 'example-worker',
        scripts: { dev: 'wrangler dev' },
        devDependencies: { wrangler: '4.123.0' }
      }),
      'examples/worker/package-lock.json': '{}',
      'examples/worker/wrangler.json': '{ "main": "src/index.ts", "durable_objects": { "bindings": [] } }',
      'examples/worker/src/index.ts': 'export default { fetch() { return new Response("example"); } };',
      'tests/package.json': JSON.stringify({ name: 'worker-test' }),
      'tests/wrangler.toml': 'main = "worker.ts"\n',
      'tests/worker.ts': 'export default { fetch() { return new Response("test"); } };',
      'demos/cloudflare/package.json': JSON.stringify({
        name: 'demo-worker',
        scripts: { deploy: 'echo wrangler deploy' }
      }),
      'demos/cloudflare/package-lock.json': '{}',
      'demos/cloudflare/wrangler.json': '{ "main": "worker.ts" }',
      'demos/cloudflare/worker.ts': 'export default { fetch() { return new Response("demo"); } };',
      'templates/cloudflare/package.json': JSON.stringify({
        name: 'worker-template',
        scripts: { deploy: 'wrangler deploy' }
      }),
      'templates/cloudflare/wrangler.json': '{ "main": "worker.ts" }',
      'templates/cloudflare/worker.ts': 'export default { fetch() { return new Response("template"); } };',
      'playgrounds/cloudflare/package.json': JSON.stringify({ name: 'worker-playground' }),
      'playgrounds/cloudflare/wrangler.json': '{ "main": "worker.ts" }',
      'playgrounds/cloudflare/worker.ts': 'export default { fetch() { return new Response("playground"); } };',
      'docs/cloudflare/package.json': JSON.stringify({ name: 'worker-docs' }),
      'docs/cloudflare/wrangler.json': '{ "main": "worker.ts" }',
      'docs/cloudflare/worker.ts': 'export default { fetch() { return new Response("docs"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'api' });

    expect(facts.existingDeployments).toEqual([]);
    expect(composed.config.resources.api).toBeDefined();
    expect(composed.deployable).toBe(true);
  });

  it('recognizes an incidental directory selected by the root pnpm workspace', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'workspace', private: true }),
      'pnpm-workspace.yaml': 'packages:\n  - examples/*\n',
      'examples/worker/package.json': JSON.stringify({ name: 'worker' }),
      'examples/worker/wrangler.json': '{ "main": "src/index.ts" }',
      'examples/worker/src/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]?.runtimeConstraints).toContainEqual(
      expect.objectContaining({ scope: 'examples/worker', entrypoint: 'examples/worker/src/index.ts' })
    );
  });

  it('recognizes a bounded standalone Wrangler deployment signal outside a root workspace', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'examples/deployed-worker/package.json': JSON.stringify({
        name: 'deployed-worker',
        scripts: { dev: 'wrangler dev', deploy: 'wrangler deploy --env production' },
        devDependencies: { wrangler: '4.123.0' }
      }),
      'examples/deployed-worker/package-lock.json': '{}',
      'examples/deployed-worker/wrangler.json': '{ "main": "src/index.ts" }',
      'examples/deployed-worker/src/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]?.runtimeConstraints).toContainEqual(
      expect.objectContaining({
        scope: 'examples/deployed-worker',
        entrypoint: 'examples/deployed-worker/src/index.ts'
      })
    );
  });

  it('keeps legitimately named demo, template, and playground applications', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'workspace',
        private: true,
        workspaces: ['demo', 'template', 'playground']
      }),
      'demo/package.json': JSON.stringify({ name: 'demo' }),
      'demo/wrangler.json': '{ "main": "src/index.ts" }',
      'demo/src/index.ts': 'export default { fetch() { return new Response("demo"); } };',
      'template/package.json': JSON.stringify({ name: 'template' }),
      'template/wrangler.json': '{ "main": "src/index.ts" }',
      'template/src/index.ts': 'export default { fetch() { return new Response("template"); } };',
      'playground/package.json': JSON.stringify({ name: 'playground' }),
      'playground/wrangler.json': '{ "main": "src/index.ts" }',
      'playground/src/index.ts': 'export default { fetch() { return new Response("playground"); } };'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]?.runtimeConstraints.map((constraint) => constraint.scope).toSorted()).toEqual([
      'demo',
      'playground',
      'template'
    ]);
  });

  it('recognises an app-local deployment manifest in a monorepo', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'apps/api/fly.toml': 'app = "orders-api"\n\n[http_service]\n  internal_port = 8080\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]).toMatchObject({
      tool: 'fly',
      managesAws: false
    });
    expect(facts.existingDeployments[0]?.evidence[0]).toMatchObject({
      file: 'apps/api/fly.toml'
    });
  });

  it('does not call a deployment example the repository’s current platform', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'examples/fly.toml': 'app = "sample"\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
  });

  it('tells an infrastructure-as-code user that we are not taking anything over', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'infra/main.tf': 'provider "aws" {\n  region = "eu-west-1"\n}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'orders' });

    expect(composed.gaps.find((gap) => gap.subject === 'terraform')?.message).toContain(
      'does not read, change, or take over anything those files may manage'
    );
  });

  it('says nothing at all about a repository nobody deploys yet', async () => {
    root = await makeRepo({ 'package.json': APP_MANIFEST });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
    expect(composeConfig({ facts, projectName: 'orders' }).gaps).toHaveLength(0);
  });
});
