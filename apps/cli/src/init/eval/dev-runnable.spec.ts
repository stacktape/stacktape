/**
 * `stacktape init` must write a config that `stacktape dev` can run without hand edits.
 *
 * The r2d dogfood run found init producing two local databases and a frontend that dev mode skips: no functions,
 * no triggers, no `connectTo`, resource names that ignored the `STP_*` variables the code reads, and no `dev`
 * command. These cases run the whole init pipeline on the fixture apps and check what dev mode depends on. The same
 * fixtures are run live through `init`, `validate` and `dev --agent` before a release.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { StacktapeConfig } from '@stacktape/config';
import { validateConfigWithZod } from '@domain-services/config-manager/utils/zod-validator';
import { runGreenfieldMission, type GreenfieldResult } from '../missions/greenfield';
import { DEV_RUNNABLE_FIXTURES } from './dev-runnable-fixtures';

const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const initFixture = async (name: keyof typeof DEV_RUNNABLE_FIXTURES): Promise<GreenfieldResult> => {
  const root = await mkdtemp(join(tmpdir(), `stacktape-dev-runnable-${name}-`));
  roots.push(root);
  for (const [path, contents] of Object.entries(DEV_RUNNABLE_FIXTURES[name])) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), contents, 'utf8');
  }
  return runGreenfieldMission({ repositoryRoot: root, projectName: name });
};

type Resource = { type: string; properties: Record<string, unknown> };

const resourcesOf = (result: GreenfieldResult): Record<string, Resource> => {
  const config = { ...result.composition.config, region: 'eu-west-2' } as unknown as StacktapeConfig;
  const validation = validateConfigWithZod({ config, configPath: 'stacktape.yml' });
  if (!validation.valid) {
    throw new Error(`Generated config was rejected: ${'errorMessage' in validation ? validation.errorMessage : ''}`);
  }
  return result.composition.config.resources as Record<string, Resource>;
};

const typesOf = (resources: Record<string, Resource>) =>
  Object.fromEntries(Object.entries(resources).map(([name, resource]) => [name, resource.type]));

describe('init writes a config stacktape dev can run', () => {
  it('a Lambda API and SQS worker sharing Postgres and Redis, with a Vite frontend', async () => {
    const result = await initFixture('lambda-todos');
    const resources = resourcesOf(result);

    // Named after the `STP_DB_*`, `STP_CACHE_*` and `STP_JOBS_URL` reads, so `connectTo` injects exactly those.
    expect(typesOf(resources)).toMatchObject({
      db: 'relational-database',
      cache: 'redis-cluster',
      jobs: 'sqs-queue',
      httpApiGateway: 'http-api-gateway',
      api: 'function',
      worker: 'function',
      todosWeb: 'hosting-bucket'
    });
    expect(resources.api!.properties).toMatchObject({
      packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/api.ts' } },
      events: [
        {
          type: 'http-api-gateway',
          properties: { httpApiGatewayName: 'httpApiGateway', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }
        }
      ],
      connectTo: ['db', 'cache', 'jobs']
    });
    // The worker imports the shared database module but never publishes to the queue it consumes.
    expect(resources.worker!.properties).toMatchObject({
      events: [{ type: 'sqs', properties: { sqsQueueName: 'jobs' } }],
      connectTo: ['db', 'cache']
    });
    // `connectTo` already injects every `STP_*` value; restating them would drift.
    expect(resources.api!.properties.environment).toBeUndefined();
    // Only the project's own API address is wired; `VITE_STRIPE_API_URL` stays the user's to set.
    expect(resources.todosWeb!.properties).toMatchObject({
      dev: { command: 'npm run dev', workingDirectory: 'web' },
      injectEnvironment: [{ name: 'VITE_API_URL', value: "$ResourceParam('httpApiGateway', 'url')" }]
    });
    expect(result.composition.gaps.map((gap) => gap.subject)).toEqual(['todos-web.VITE_STRIPE_API_URL']);
    expect(result.composition.unsetSettings).toEqual([]);
  });

  it('an Express container with Postgres and a Next.js frontend', async () => {
    const result = await initFixture('container-api-nextjs');
    const resources = resourcesOf(result);

    expect(typesOf(resources)).toMatchObject({
      db: 'relational-database',
      notesApi: 'web-service',
      notesWeb: 'nextjs-web'
    });
    expect(resources.notesApi!.properties).toMatchObject({
      packaging: { type: 'js-bundle', properties: { entryfilePath: 'api/server.js' } },
      connectTo: ['db']
    });
    expect(resources.notesWeb!.properties).toMatchObject({
      appDirectory: 'web',
      dev: { command: 'npm run dev' },
      environment: [{ name: 'NEXT_PUBLIC_API_URL', value: "$ResourceParam('notesApi', 'url')" }]
    });
    expect(result.composition.gaps).toEqual([]);
  });

  it('a scheduled Lambda function and a DynamoDB table', async () => {
    const result = await initFixture('scheduled-dynamodb');
    const resources = resourcesOf(result);

    expect(typesOf(resources)).toEqual({ items: 'dynamo-db-table', prune: 'function' });
    // The code states no rate. A guessed one would run the prune against real data after the first deploy, so no
    // schedule is written: the function deploys and runs in dev, and the user is told to add one.
    expect(resources.prune!.properties.events).toBeUndefined();
    expect(result.composition.assumptions.map(({ kind, chosen }) => [kind, chosen])).toEqual([
      ['schedule-unknown', 'none']
    ]);
    expect(result.composition.gaps.map((gap) => gap.subject)).toEqual(['prune.schedule']);
    expect(resources.prune!.properties.connectTo).toEqual(['items']);
  });

  // CloudFormation rejects two `* /{proxy+}` routes on one HTTP API, in deploy and in dev alike.
  it.each([
    [
      'two-http-handlers',
      [
        ['getUser', 'getUser'],
        ['createUser', 'createUser']
      ]
    ],
    [
      'monorepo-apis',
      [
        ['users-api', 'usersApi'],
        ['orders-api', 'ordersApi']
      ]
    ]
  ] as const)(
    '%s: several HTTP handlers are asked for their routes instead of sharing the catch-all',
    async (fixture, names) => {
      const result = await initFixture(fixture);
      const resources = resourcesOf(result);

      expect(Object.values(resources).some((resource) => resource.type === 'http-api-gateway')).toBe(false);
      // Service names stay unique (`users-api`, not two `api`), and each resource is its camelCase form.
      for (const [service, resource] of names) {
        expect(resources[resource]?.type).toBe('function');
        expect(resources[resource]?.properties.events).toBeUndefined();
        expect(
          result.composition.gaps.some((gap) => gap.subject === service && gap.message.includes('which route'))
        ).toBe(true);
      }
    }
  );
});
