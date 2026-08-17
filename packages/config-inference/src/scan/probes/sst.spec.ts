/**
 * The SST importer: Ion components read as text, never executed.
 *
 * Properties under protection: components arrive as the concepts they declare — an SSR app, a
 * database with its instance size, a function with its handler; `link:` becomes consumption
 * wiring; stateful components are live-on-AWS; and computed values read as absent, not as guesses.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { lambdaSourceProbe } from './lambda-source';
import { readSstComponents, sstProbe } from './sst';

describe('readSstComponents', () => {
  it('reads component constructors with their literal bodies', () => {
    const components = readSstComponents(
      [
        'const db = new sst.aws.Postgres("Database", { instance: "db.t4g.small" });',
        'new sst.aws.Nextjs("Web", { path: "packages/web", link: [db] });',
        'new sst.aws.Bucket("Uploads");',
        ''
      ].join('\n')
    );

    expect(components.map((entry) => `${entry.component}:${entry.name}`)).toEqual([
      'Postgres:Database',
      'Nextjs:Web',
      'Bucket:Uploads'
    ]);
    expect(components[0]?.body).toContain('db.t4g.small');
  });

  it('does not let braces in literal commands swallow the next component', () => {
    const components = readSstComponents(
      [
        'new sst.aws.Function("Api", { handler: "src/api.handler", transform: "echo }" });',
        'new sst.aws.Bucket("Uploads", { transform: `keep ${value ? { nested: true } : {}}` });'
      ].join('\n')
    );

    expect(components).toHaveLength(2);
    expect(components[0]?.body).toContain('src/api.handler');
    expect(components[0]?.body).not.toContain('Uploads');
  });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-sst-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the sst probe, end to end', () => {
  let root: string;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  const SST_CONFIG = [
    'export default $config({',
    '  app(input) {',
    '    return { name: "shop", home: "aws" };',
    '  },',
    '  async run() {',
    '    const db = new sst.aws.Postgres("Database", { instance: "db.t4g.small", version: "16.4", password: "inline-secret-must-not-travel" });',
    '    const queue = new sst.aws.Queue("Jobs");',
    '    new sst.aws.Nextjs("Web", { path: "packages/web", link: [db, queue] });',
    '    new sst.aws.Function("Worker", { handler: "packages/functions/src/worker.handler", url: true });',
    '  }',
    '});',
    ''
  ].join('\n');

  it('imports components as concepts: services, live dependencies, sizes, and wiring', async () => {
    root = await makeRepo({
      'sst.config.ts': SST_CONFIG,
      'packages/functions/src/worker.ts': 'export const handler = async () => ({ statusCode: 200 });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [sstProbe] });

    const web = facts.services.find((entry) => entry.name === 'web');
    expect(web).toMatchObject({ framework: 'nextjs', path: 'packages/web', exposesHttp: true });

    const worker = facts.services.find((entry) => entry.name === 'worker');
    expect(worker).toMatchObject({
      functionEntrypoint: 'packages/functions/src/worker.ts',
      executionModel: 'per-request'
    });
    expect(worker?.functionTriggers).toEqual([{ type: 'http', method: '*', path: '/{proxy+}' }]);
    expect(JSON.stringify(facts)).not.toContain('inline-secret-must-not-travel');

    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');
    expect(database).toMatchObject({
      engineVersion: '16.4',
      sizeHint: { instance: 'db.t4g.small' },
      hostingEvidence: 'deployment-manifest'
    });
    expect(database?.currentlyHostedOn).toBeUndefined();
    // `link:` is SST's own statement of who uses what.
    expect(database?.consumedBy).toContain('web');
    expect(facts.dependencies.find((entry) => entry.kind === 'queue')?.consumedBy).toContain('web');
  });

  it('quiets the handler pattern-matcher, like every other declaring manifest', async () => {
    root = await makeRepo({
      'sst.config.ts': SST_CONFIG,
      'packages/functions/src/worker.ts': 'export const handler = async () => ({ statusCode: 200 });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [sstProbe, lambdaSourceProbe] });
    const workers = facts.services.filter((entry) => entry.functionEntrypoint === 'packages/functions/src/worker.ts');
    expect(workers).toHaveLength(1);
  });

  it('reads nothing from a config with no recognizable components', async () => {
    root = await makeRepo({
      'sst.config.ts': 'export default $config({ app() { return { name: "x" }; }, async run() {} });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [sstProbe] });
    expect(facts.services).toEqual([]);
    expect(facts.dependencies).toEqual([]);
  });

  it('follows the bounded local config graph used by the official monorepo template', async () => {
    root = await makeRepo({
      'sst.config.ts': [
        'export default $config({',
        '  app() { return { name: "template", home: "aws" }; },',
        '  async run() {',
        '    await import("./infra/storage");',
        '    await import("./infra/api");',
        '  }',
        '});',
        ''
      ].join('\n'),
      'infra/storage.ts': 'export const bucket = new sst.aws.Bucket("MyBucket");\n',
      'infra/api.ts': [
        'import { bucket } from "./storage";',
        'export const api = new sst.aws.Function("MyApi", {',
        '  url: true,',
        '  link: [bucket],',
        '  handler: "packages/functions/src/api.handler"',
        '});',
        ''
      ].join('\n'),
      'packages/functions/src/api.ts': 'export const handler = async () => ({ statusCode: 200 });\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [sstProbe] });

    expect(facts.services).toEqual([
      expect.objectContaining({
        name: 'myApi',
        functionEntrypoint: 'packages/functions/src/api.ts',
        functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}' }]
      })
    ]);
    expect(facts.dependencies).toEqual([
      expect.objectContaining({
        name: 'storageBucket',
        kind: 'object-storage',
        consumedBy: ['myApi'],
        hostingEvidence: 'deployment-manifest'
      })
    ]);
  });

  it('imports Ion API routes, queue subscriptions, and cron jobs as invoked functions', async () => {
    root = await makeRepo({
      'sst.config.ts': [
        'export default $config({',
        '  app() { return { name: "shop", home: "aws" }; },',
        '  async run() {',
        '    const api = new sst.aws.ApiGatewayV2("Api");',
        '    api.route("POST /orders", "src/orders.create");',
        '    api.route("$default", "src/fallback.handler");',
        '    const queue = new sst.aws.Queue("Jobs");',
        '    queue.subscribe("src/worker.handler");',
        '    new sst.aws.Cron("Cleanup", { schedule: "rate(1 day)", job: { handler: "src/cleanup.handler" } });',
        '  }',
        '});',
        ''
      ].join('\n'),
      'src/orders.ts': 'export const create = async () => ({ statusCode: 201 });',
      'src/fallback.ts': 'export const handler = async () => ({ statusCode: 404 });',
      'src/worker.ts': 'export const handler = async () => undefined;',
      'src/cleanup.ts': 'export const handler = async () => undefined;'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [sstProbe] });
    const orders = facts.services.find((entry) => entry.functionEntrypoint === 'src/orders.ts');
    const fallback = facts.services.find((entry) => entry.functionEntrypoint === 'src/fallback.ts');
    const worker = facts.services.find((entry) => entry.functionEntrypoint === 'src/worker.ts');
    const cleanup = facts.services.find((entry) => entry.functionEntrypoint === 'src/cleanup.ts');

    expect(orders?.functionTriggers).toEqual([{ type: 'http', method: 'POST', path: '/orders' }]);
    expect(fallback?.functionTriggers).toEqual([{ type: 'http', method: '*', path: '/{proxy+}' }]);
    expect(worker?.functionTriggers).toEqual([{ type: 'queue', dependencyName: 'jobQueue' }]);
    expect(cleanup?.functionTriggers).toEqual([{ type: 'schedule', rate: 'rate(1 day)' }]);
    expect(facts.dependencies[0]?.consumedBy).toEqual([worker!.name]);
  });
});
