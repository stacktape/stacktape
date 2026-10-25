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
import { validateScheduleSyntax } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/functions/events/utils';
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
    expect(resources.todosWeb!.properties).toMatchObject({
      dev: { command: 'npm run dev', workingDirectory: 'web' },
      injectEnvironment: [{ name: 'VITE_API_URL', value: "$ResourceParam('httpApiGateway', 'url')" }]
    });
    expect(result.composition.gaps).toEqual([]);
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
    const events = resources.prune!.properties.events as Array<{ type: string; properties: { scheduleRate: string } }>;
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('schedule');
    // The code states no rate, so the default is an assumption the user sees, written in a form Stacktape accepts.
    expect(validateScheduleSyntax(events[0]!.properties.scheduleRate)).toBeNull();
    expect(result.composition.assumptions.map((assumption) => assumption.kind)).toEqual(['schedule-unknown']);
    expect(resources.prune!.properties.connectTo).toEqual(['items']);
    expect(result.composition.gaps).toEqual([]);
  });
});
