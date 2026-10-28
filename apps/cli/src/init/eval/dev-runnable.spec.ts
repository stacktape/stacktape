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
import { ConfigManager } from '@domain-services/config-manager';
import { assessSecurityPosture } from '@domain-services/config-manager/utils/security-posture';
import { validateConfigWithZod } from '@domain-services/config-manager/utils/zod-validator';
import type { StackContext } from '@domain-services/stack-context';
import { runGreenfieldMission, type GreenfieldResult } from '../missions/greenfield';
import { projectNameFor } from '../project-name';
import { DEV_RUNNABLE_FIXTURES } from './dev-runnable-fixtures';

const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const writeFixture = async (name: keyof typeof DEV_RUNNABLE_FIXTURES): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `stacktape-dev-runnable-${name}-`));
  roots.push(root);
  for (const [path, contents] of Object.entries(DEV_RUNNABLE_FIXTURES[name])) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), contents, 'utf8');
  }
  return root;
};

const initFixture = async (name: keyof typeof DEV_RUNNABLE_FIXTURES): Promise<GreenfieldResult> =>
  runGreenfieldMission({ repositoryRoot: await writeFixture(name), projectName: name });

type Resource = { type: string; properties: Record<string, unknown> };

/** The checks `stacktape validate` runs without AWS: the config schema, then the security posture rules. */
const resourcesOf = (result: GreenfieldResult): Record<string, Resource> => {
  const config = { ...result.composition.config, region: 'eu-west-2' } as unknown as StacktapeConfig;
  const validation = validateConfigWithZod({ config, configPath: 'stacktape.yml' });
  if (!validation.valid) {
    throw new Error(`Generated config was rejected: ${'errorMessage' in validation ? validation.errorMessage : ''}`);
  }
  const assess = (stage: string) => {
    const stackContext: StackContext = {
      accountId: '123456789012',
      command: 'deploy',
      globallyUniqueStackHash: 'dev-runnable',
      invocationId: 'invocation',
      projectName: config.projectName ?? 'app',
      region: 'eu-west-2',
      stackName: `${config.projectName ?? 'app'}-${stage}`,
      stage,
      workingDir: '/project'
    };
    // A batch job's trigger function is built from the helper Lambda artifacts, which only a CLI command loads. Init
    // writes no IAM statements on a job, so the posture rules have nothing on it to rate.
    const assessed = {
      ...config,
      resources: Object.fromEntries(
        Object.entries(config.resources ?? {}).filter(([, resource]) => resource.type !== 'batch-job')
      )
    } as StacktapeConfig;
    const configManager = new ConfigManager();
    configManager.setStackContext(stackContext);
    configManager.config = assessed;
    return assessSecurityPosture({ configManager, rawConfig: assessed, stackContext });
  };
  // Init keeps the database public and password-protected by default (owner decision, 27 Oct 2026). That is fine for
  // a dev stage, so nothing there is HIGH; a production stage rates every public database HIGH.
  const development = assess('dev');
  expect(development.stage.purpose).toBe('non-production');
  expect(development.findings.filter(({ severity }) => severity === 'HIGH' || severity === 'CRITICAL')).toEqual([]);
  const production = assess('production');
  expect(production.stage.purpose).toBe('production');
  const publicDatabases = Object.entries(config.resources ?? {})
    .filter(
      ([, resource]) =>
        resource.type === 'relational-database' &&
        !(resource.properties as { accessibility?: { accessibilityMode?: string } }).accessibility?.accessibilityMode
    )
    .map(([name]) => [name, 'HIGH'])
    .toSorted();
  expect(
    production.findings
      .filter(({ ruleId }) => ruleId === 'database-reachable-from-internet')
      .map(({ resourceName, severity }) => [resourceName, severity])
      .toSorted()
  ).toEqual(publicDatabases);
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

  // The r2p dogfood run needed eight hand edits to this app's init output before its Playwright test passed. Every one
  // except the Python runtime is init's job and is asserted here; the runtime belongs to packaging.
  it('r2p: untyped Python API, SNS worker, scheduled job, presigned uploads and SvelteKit', async () => {
    const root = await writeFixture('r2p-files');
    // H1: the manifest names the project.
    const projectName = await projectNameFor(root);
    expect(projectName).toBe('r2p-files');
    const result = await runGreenfieldMission({ repositoryRoot: root, projectName });
    const resources = resourcesOf(result);

    expect(typesOf(resources)).toEqual({
      mainDatabase: 'relational-database',
      storageBucket: 'bucket',
      notificationsTopic: 'sns-topic',
      httpApiGateway: 'http-api-gateway',
      r2pFilesWeb: 'sveltekit-web',
      expireUploads: 'function',
      processUpload: 'function',
      api: 'function'
    });
    // H2 + H8: `event['requestContext']['http']` makes the Python handler the HTTP API with payload format 2.0, and
    // publishing to the topic it reads from `UPLOAD_EVENTS_TOPIC_ARN` connects it.
    expect(resources.api!.properties).toMatchObject({
      packaging: { type: 'buildpack', properties: { entryfilePath: 'api/main.py' } },
      events: [
        {
          type: 'http-api-gateway',
          properties: { httpApiGatewayName: 'httpApiGateway', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }
        }
      ],
      environment: [
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'UPLOAD_BUCKET', value: "$ResourceParam('storageBucket', 'name')" },
        { name: 'UPLOAD_EVENTS_TOPIC_ARN', value: "$ResourceParam('notificationsTopic', 'arn')" }
      ],
      connectTo: ['mainDatabase', 'storageBucket', 'notificationsTopic']
    });
    expect(resources.api!.properties.runtime).toBeUndefined();
    // H3: the schedule the code declares.
    expect(resources.expireUploads!.properties.events).toEqual([
      { type: 'schedule', properties: { scheduleRate: 'rate(2 minutes)' } }
    ]);
    // H4: the worker reads `UPLOAD_BUCKET` too.
    expect(resources.processUpload!.properties).toMatchObject({
      events: [{ type: 'sns', properties: { snsTopicName: 'notificationsTopic' } }],
      environment: [
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'UPLOAD_BUCKET', value: "$ResourceParam('storageBucket', 'name')" }
      ],
      connectTo: ['mainDatabase', 'storageBucket']
    });
    // H5: SvelteKit's `$env/dynamic/public` read of the API address.
    expect(resources.r2pFilesWeb!.properties).toMatchObject({
      appDirectory: 'web',
      environment: [{ name: 'PUBLIC_API_URL', value: "$ResourceParam('httpApiGateway', 'url')" }],
      dev: { command: 'npm run dev' }
    });
    // H6: the browser PUTs to the presigned URL the API returns.
    expect(resources.storageBucket!.properties.cors).toEqual({
      enabled: true,
      corsRules: [{ allowedOrigins: ['*'], allowedMethods: ['PUT'], allowedHeaders: ['*'] }]
    });
    // H9: `npm run seed`, against the database its source reads.
    expect(result.composition.config.scripts).toEqual({
      seed: {
        type: 'local-script',
        properties: {
          executeCommand: 'npm run seed',
          connectTo: ['mainDatabase'],
          environment: [{ name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }]
        }
      }
    });
    // The database stays public and password-protected, so the functions stay out of the VPC.
    expect(resources.mainDatabase!.properties.accessibility).toBeUndefined();
    for (const name of ['api', 'processUpload', 'expireUploads']) {
      expect(resources[name]!.properties.joinDefaultVpc).toBeUndefined();
    }
    expect(result.composition.gaps).toEqual([]);
    expect(result.composition.unsetSettings).toEqual([]);
  });

  it('untyped handlers: the event fields each one reads name its trigger', async () => {
    const result = await initFixture('untyped-handlers');
    const resources = resourcesOf(result);

    expect(resources.api!.properties).toMatchObject({
      packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/api.js' } },
      // `event.httpMethod` is the 1.0 payload, Stacktape's default, so no payloadFormat is written.
      events: [{ type: 'http-api-gateway', properties: { method: '*', path: '/{proxy+}' } }]
    });
    expect(
      (resources.api!.properties.events as Array<{ properties: Record<string, unknown> }>)[0]!.properties.payloadFormat
    ).toBeUndefined();
    expect(resources.worker!.properties.events).toEqual([{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }]);
    expect(resources.thumbnails!.properties.events).toEqual([
      {
        type: 's3',
        properties: { bucketArn: "$ResourceParam('storageBucket', 'arn')", s3EventType: 's3:ObjectCreated:*' }
      }
    ]);
    expect(resources.nightlyReport!.properties.events).toEqual([
      { type: 'schedule', properties: { scheduleRate: 'cron(0 3 * * ? *)' } }
    ]);
    // `ORDER_JOBS_QUEUE_URL` and `ORDERS_TABLE` name the one queue and the one table.
    const tableName = Object.entries(resources).find(([, resource]) => resource.type === 'dynamo-db-table')![0];
    expect(resources.api!.properties).toMatchObject({
      environment: [
        { name: 'ORDER_JOBS_QUEUE_URL', value: "$ResourceParam('jobQueue', 'url')" },
        { name: 'ORDERS_TABLE', value: `$ResourceParam('${tableName}', 'name')` }
      ]
    });
    expect(resources.api!.properties.connectTo).toEqual(expect.arrayContaining(['jobQueue', tableName]));
    expect(resources.worker!.properties.connectTo).toEqual(expect.arrayContaining([tableName]));
    // The API routes on its own, but reads `pathParameters.id`, which the catch-all route never fills.
    expect(result.composition.gaps.map((gap) => gap.subject)).toEqual(['api.route']);
  });

  // The r2w dogfood run needed ten hand edits to this app's init output (round2/r2w/report.md, "Hand edits"). H1–H6 are
  // init's job and asserted here. H7 was never needed, and H8–H10 work around WebSocket and dev-mode product bugs.
  it('r2w: WebSocket, DynamoDB stream and EventBridge handlers, a Go API and Next.js', async () => {
    const result = await initFixture('r2w-shop');
    const resources = resourcesOf(result);

    expect(typesOf(resources)).toEqual({
      cache: 'redis-cluster',
      mainTable: 'dynamo-db-table',
      eventBus: 'event-bus',
      websocketApi: 'websocket-api-gateway',
      r2wShopWeb: 'nextjs-web',
      orderNotify: 'function',
      orderStream: 'function',
      ws: 'function',
      ordersApi: 'web-service'
    });
    // H1: the key from `Key: { id: orderId }`, and the stream carries the `NewImage` the consumer reads.
    expect(resources.mainTable!.properties).toEqual({
      primaryKey: { partitionKey: { name: 'id', type: 'string' } },
      streamType: 'NEW_IMAGE'
    });
    // H2: the stream trigger, and the bus `PutEvents` names through `EVENT_BUS_NAME`.
    expect(resources.orderStream!.properties).toMatchObject({
      events: [
        {
          type: 'dynamo-db-stream',
          properties: { streamArn: "$ResourceParam('mainTable', 'streamArn')", startingPosition: 'LATEST' }
        }
      ],
      environment: [{ name: 'EVENT_BUS_NAME', value: "$ResourceParam('eventBus', 'arn')" }],
      connectTo: ['eventBus']
    });
    // H3: a rule for the detail type and source the stream handler publishes, and the API it pushes to.
    expect(resources.orderNotify!.properties).toMatchObject({
      events: [
        {
          type: 'event-bus',
          properties: {
            eventBusName: 'eventBus',
            eventPattern: { source: ['shop.orders'], 'detail-type': ['OrderCreated'] }
          }
        }
      ],
      environment: [
        { name: 'ORDERS_TABLE', value: "$ResourceParam('mainTable', 'name')" },
        { name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" },
        { name: 'WS_MANAGEMENT_URL', value: "$ResourceParam('websocketApi', 'managementEndpoint')" }
      ],
      connectTo: ['cache', 'mainTable', 'websocketApi']
    });
    // H4: the WebSocket handler with the routes it compares `routeKey` against, `$default` for its `else` branch.
    expect(resources.ws!.properties).toMatchObject({
      packaging: { type: 'js-bundle', properties: { entryfilePath: 'functions/ws.ts' } },
      events: ['$connect', '$disconnect', '$default'].map((routeKey) => ({
        type: 'websocket-api-gateway',
        properties: { websocketApiGatewayName: 'websocketApi', routeKey }
      })),
      joinDefaultVpc: true,
      environment: [{ name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" }],
      connectTo: ['cache']
    });
    // H5: what the Go service reads through its `env(name, fallback)` helper.
    expect(resources.ordersApi!.properties).toMatchObject({
      environment: [
        { name: 'ORDERS_TABLE', value: "$ResourceParam('mainTable', 'name')" },
        { name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" }
      ],
      connectTo: ['cache', 'mainTable']
    });
    // H6: the server components' API address and the browser's WebSocket URL.
    expect(resources.r2wShopWeb!.properties).toMatchObject({
      environment: [
        { name: 'ORDERS_API_URL', value: "$ResourceParam('ordersApi', 'url')" },
        { name: 'NEXT_PUBLIC_WS_URL', value: "$ResourceParam('websocketApi', 'url')" }
      ],
      dev: { command: 'npm run dev' }
    });
    expect(result.composition.gaps).toEqual([]);
    // `strconv.Atoi(os.Getenv("STARTUP_DELAY_SECONDS"))` has no fallback the scan can see; it is reported, not set.
    expect(result.composition.unsetSettings.map(({ variableName }) => variableName)).toEqual(['STARTUP_DELAY_SECONDS']);
  });

  // Each function in the directory is guarded against its own trigger only: the API and the EventBridge handler read the
  // table whose stream invokes order_stream, and only order_stream publishes to the bus.
  it('r2w ported to Python: sibling handlers keep their own variables', async () => {
    const result = await initFixture('r2w-python');
    const resources = resourcesOf(result);

    expect(typesOf(resources)).toEqual({
      mainTable: 'dynamo-db-table',
      eventBus: 'event-bus',
      httpApiGateway: 'http-api-gateway',
      api: 'function',
      orderStream: 'function',
      orderNotify: 'function'
    });
    expect(resources.mainTable!.properties).toEqual({
      primaryKey: { partitionKey: { name: 'id', type: 'string' } },
      streamType: 'NEW_IMAGE'
    });
    const table = [{ name: 'ORDERS_TABLE', value: "$ResourceParam('mainTable', 'name')" }];
    expect(resources.api!.properties).toMatchObject({
      events: [{ type: 'http-api-gateway', properties: { method: '*', path: '/{proxy+}', payloadFormat: '2.0' } }],
      environment: table,
      connectTo: ['mainTable']
    });
    expect(resources.orderNotify!.properties).toMatchObject({
      events: [
        {
          type: 'event-bus',
          properties: {
            eventBusName: 'eventBus',
            eventPattern: { source: ['shop.orders'], 'detail-type': ['OrderCreated'] }
          }
        }
      ],
      environment: table,
      connectTo: ['mainTable']
    });
    expect(resources.orderStream!.properties).toMatchObject({
      events: [{ type: 'dynamo-db-stream', properties: { streamArn: "$ResourceParam('mainTable', 'streamArn')" } }],
      environment: [{ name: 'EVENT_BUS_NAME', value: "$ResourceParam('eventBus', 'arn')" }],
      connectTo: ['eventBus']
    });
    expect(result.composition.gaps).toEqual([]);
    expect(result.composition.unsetSettings).toEqual([]);
  });

  // The r2cc dogfood (27 Oct 2026) needed seven config edits after init. Each one is asserted here; H5, the dead-letter
  // queue, stays a hand edit because only the README mentions it.
  it('r2cc receipts: Procfile migration, state machine, function URL and a Python schedule', async () => {
    const result = await initFixture('r2cc-receipts');
    const resources = resourcesOf(result);

    expect(typesOf(resources)).toEqual({
      mainDatabase: 'relational-database',
      jobQueue: 'sqs-queue',
      storageBucket: 'bucket',
      approvalWorkflow: 'state-machine',
      receiptsWeb: 'sveltekit-web',
      onUpload: 'function',
      score: 'function',
      stats: 'function',
      cleanup: 'function',
      markDecision: 'function',
      processReceipt: 'function',
      api: 'web-service'
    });
    // H1, H2: the start input feeds `score`, and its result feeds `markDecision`, so the order is the code's own.
    expect(resources.score!.properties.packaging).toEqual({
      type: 'js-bundle',
      properties: { entryfilePath: 'functions/score.ts' }
    });
    expect(resources.approvalWorkflow!.properties).toEqual({
      definition: {
        StartAt: 'Score',
        States: {
          Score: { Type: 'Task', Resource: "$ResourceParam('score', 'arn')", Next: 'MarkDecision' },
          MarkDecision: { Type: 'Task', Resource: "$ResourceParam('markDecision', 'arn')", End: true }
        }
      }
    });
    // H2, H7: the API starts the workflow, and its Procfile migrates before uvicorn starts.
    expect(resources.api!.properties).toMatchObject({
      packaging: {
        type: 'buildpack',
        properties: {
          sourceDirectoryPath: 'api',
          startCommand: 'alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}'
        }
      },
      port: 8000,
      environment: [
        { name: 'APPROVAL_WORKFLOW_ARN', value: "$ResourceParam('approvalWorkflow', 'arn')" },
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'UPLOAD_BUCKET', value: "$ResourceParam('storageBucket', 'name')" }
      ],
      connectTo: ['mainDatabase', 'storageBucket', 'approvalWorkflow']
    });
    expect(result.composition.config.hooks).toBeUndefined();
    // H3: a handler typed `LambdaFunctionURLEvent` serves its own URL, which the SvelteKit server reads.
    expect(resources.stats!.properties.url).toEqual({ enabled: true });
    expect(resources.stats!.properties.events).toBeUndefined();
    expect(resources.receiptsWeb!.properties.environment).toEqual([
      { name: 'API_URL', value: "$ResourceParam('api', 'url')" },
      { name: 'STATS_URL', value: "$ResourceParam('stats', 'url')" }
    ]);
    // H4: the schedule from the module docstring.
    expect(resources.cleanup!.properties.events).toEqual([
      { type: 'schedule', properties: { scheduleRate: 'rate(1 minute)' } }
    ]);
    // H6: the S3 trigger grants no access to the object the handler reads.
    expect(resources.onUpload!.properties.connectTo).toEqual(['storageBucket', 'jobQueue']);
    expect(result.composition.gaps).toEqual([]);
    expect(result.composition.unsetSettings).toEqual([]);
  });

  // The r2gg dogfood (28 Oct 2026) needed five config edits after init for init gaps, H1-H5; each is asserted here. Its
  // other edits worked around product bugs fixed elsewhere: Batch's Amazon Linux 2 compute environment (the job ran as a
  // function instead), the MySQL database name, and the Java handler format.
  it('r2gg shelf monorepo: Java function, private service, job per queue message, routes and function addresses', async () => {
    const result = await initFixture('r2gg-shelf');
    const resources = resourcesOf(result);

    // The shared package is built into its consumers, never a service.
    expect(typesOf(resources)).toEqual({
      mainDatabase: 'relational-database',
      jobQueue: 'sqs-queue',
      storageBucket: 'bucket',
      httpApiGateway: 'http-api-gateway',
      api: 'web-service',
      web: 'astro-web',
      report: 'batch-job',
      quote: 'function',
      tax: 'function',
      recs: 'private-service'
    });
    // H1: the Java function, with the handler the runtime loads, and the API invoking it by name.
    expect(resources.tax!.properties).toMatchObject({
      packaging: {
        type: 'buildpack',
        properties: {
          entryfilePath: 'functions/tax/src/main/java/shelf/TaxHandler.java',
          handlerFunction: 'TaxHandler::handleRequest'
        }
      },
      runtime: 'java21'
    });
    expect(resources.tax!.properties.events).toBeUndefined();
    // H1, H3: the API's addresses for the Java function and for the private service, with the scheme its fetch needs.
    expect(resources.api!.properties).toMatchObject({
      environment: [
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'REPORT_QUEUE_URL', value: "$ResourceParam('jobQueue', 'url')" },
        { name: 'RECS_URL', value: "$CfFormat('http://{}', $ResourceParam('recs', 'address'))" },
        { name: 'TAX_FUNCTION_NAME', value: "$ResourceParam('tax', 'arn')" }
      ],
      connectTo: ['mainDatabase', 'jobQueue', 'recs', 'tax']
    });
    // H2: the report script runs once per queue message, from the repository root so its workspace import resolves.
    expect(resources.report!.properties).toMatchObject({
      container: {
        packaging: {
          type: 'buildpack',
          properties: { sourceDirectoryPath: '.', startCommand: 'pnpm --filter @shelf/report start' }
        },
        environment: [
          { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
          { name: 'REPORTS_BUCKET', value: "$ResourceParam('storageBucket', 'name')" }
        ]
      },
      resources: { cpu: 1 },
      events: [{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }],
      connectTo: ['mainDatabase', 'storageBucket']
    });
    // H4: the path from the comment above the handler, which holds the `pathParameters.sku` it reads. Nothing turns
    // other methods away, so every method reaches it.
    expect(resources.quote!.properties.events).toEqual([
      {
        type: 'http-api-gateway',
        properties: { httpApiGatewayName: 'httpApiGateway', method: '*', path: '/quote/{sku}', payloadFormat: '2.0' }
      }
    ]);
    // H5: the Astro server's quote address is the HTTP API in front of the function.
    expect(resources.web!.properties.environment).toEqual([
      { name: 'API_URL', value: "$ResourceParam('api', 'url')" },
      { name: 'QUOTE_URL', value: "$ResourceParam('httpApiGateway', 'url')" }
    ]);
    expect(resources.recs!.properties).toMatchObject({ port: 5000 });
    expect(result.composition.gaps).toEqual([]);
    expect(result.composition.unsetSettings).toEqual([]);
  });

  // The r2ll dogfood (28 Oct 2026) needed five logical config edits after init for init gaps, H1-H5; each is asserted
  // here, as a config change or, where the code does not settle it, a gap. Its sixth edit, DynamoDB TTL through an override, has no native property to infer, and the route rename from
  // /ping avoided an API Gateway reserved path rather than an init gap.
  it('r2ll parcel: one Rails service from its Gemfile directory, its SNS topic, consumers sharing a queue, a Go function and an unproven table key', async () => {
    const result = await initFixture('r2ll-parcel');
    const resources = resourcesOf(result);

    // H1: no second worker building api/Dockerfile from the repository root.
    expect(typesOf(resources)).toEqual({
      mainDatabase: 'relational-database',
      mainTable: 'dynamo-db-table',
      jobQueue: 'sqs-queue',
      notificationsTopic: 'sns-topic',
      httpApiGateway: 'http-api-gateway',
      parcelWeb: 'sveltekit-web',
      audit: 'function',
      billing: 'function',
      ping: 'function',
      api: 'web-service'
    });
    expect(resources.api!.properties).toMatchObject({
      packaging: { type: 'dockerfile', properties: { buildContextPath: 'api', dockerfilePath: 'Dockerfile' } },
      // H3: the topic the controller publishes to, and the permission to publish.
      environment: [
        { name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { name: 'PARCEL_TOPIC_ARN', value: "$ResourceParam('notificationsTopic', 'arn')" }
      ],
      connectTo: ['mainDatabase', 'notificationsTopic']
    });
    // H4: only the README says the topic fans out, and prose is too weak to rearrange queues on. Both consumers keep
    // the one queue, and the result says each needs its own subscribed queue, naming the README line.
    expect(resources.billing!.properties.events).toEqual([{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }]);
    expect(resources.audit!.properties.events).toEqual([{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }]);
    expect('cloudformationResources' in result.composition.config).toBe(false);
    // H2: the Go handler takes an HTTP API v2 request and does not route, so every request reaches it, and the
    // SvelteKit server's PING_URL is that API.
    expect(resources.ping!.properties).toMatchObject({
      packaging: { type: 'buildpack', properties: { entryfilePath: 'functions/ping/main.go' } },
      events: [
        {
          type: 'http-api-gateway',
          properties: { httpApiGatewayName: 'httpApiGateway', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }
        }
      ]
    });
    expect(resources.parcelWeb!.properties.environment).toEqual([
      { name: 'API_URL', value: "$ResourceParam('api', 'url')" },
      { name: 'PING_URL', value: "$ResourceParam('httpApiGateway', 'url')" }
    ]);
    // H5: the audit item `{ id, expiresAt }` does not say which attribute is the key, so the placeholder stays and the
    // result says it has to be chosen.
    expect(resources.mainTable!.properties.primaryKey).toEqual({ partitionKey: { name: 'pk', type: 'string' } });
    expect(result.composition.gaps).toEqual([
      {
        subject: 'mainTable.primaryKey',
        message:
          "Your code writes items with id and expiresAt to mainTable, but no request names the table's key. Its partition key is the placeholder pk, which these items do not have, so DynamoDB rejects every write. Before deploying, set primaryKey.partitionKey to whichever of id or expiresAt identifies an item."
      },
      {
        subject: 'jobQueue.consumers',
        message:
          'audit and billing both consume jobQueue, so each message reaches only one of them. If each consumer must receive every message, give each its own queue subscribed to notificationsTopic before deploying: an sqs-queue and sqs event per consumer, an AWS::SNS::Subscription in cloudformationResources, and a policyStatements entry on the queue that lets sns.amazonaws.com send to it. README.md line 2 names billingQueue and auditQueue in a sentence about a topic. Leave it as is only if they share the work on purpose.'
      }
    ]);
    expect(result.composition.unsetSettings).toEqual([]);
  });

  // A function's output bound to its own trigger re-invokes it with every write, forever.
  it('trigger loops: a variable naming the kind that invokes the function is left unset and reported', async () => {
    const result = await initFixture('trigger-loops');
    const resources = resourcesOf(result);

    const variableNames = (name: string) =>
      ((resources[name]!.properties.environment ?? []) as Array<{ name: string }>).map((variable) => variable.name);
    expect(resources.thumbnail!.properties.events).toEqual([
      {
        type: 's3',
        properties: { bucketArn: "$ResourceParam('storageBucket', 'arn')", s3EventType: 's3:ObjectCreated:*' }
      }
    ]);
    expect(variableNames('thumbnail')).not.toContain('THUMBNAILS_BUCKET');
    expect(resources.worker!.properties.events).toEqual([{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }]);
    expect(variableNames('worker')).not.toContain('RESULTS_QUEUE_URL');
    // Invoked by its topic only: the fetch response's `.body` is not an SQS record.
    expect(resources.notify!.properties.events).toEqual([
      { type: 'sns', properties: { snsTopicName: 'notificationsTopic' } }
    ]);
    expect(variableNames('notify')).not.toContain('ALERTS_TOPIC_ARN');
    expect(result.composition.gaps.map((gap) => gap.subject).toSorted()).toEqual([
      'notify.ALERTS_TOPIC_ARN',
      'thumbnail.THUMBNAILS_BUCKET',
      'worker.RESULTS_QUEUE_URL'
    ]);
    expect(result.composition.unsetSettings).toEqual([]);
  });
});
