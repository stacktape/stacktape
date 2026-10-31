/**
 * Every repository from the two adversarial init audits and the review of their fix, through the complete init
 * pipeline.
 *
 * Each case states the one property that makes its output no less safe than its source: a protected route stays
 * protected or is left out, a disabled or conditional job does not start running, declared storage, ordering and
 * failure handling survive, and anything init cannot carry is named in a "Before you deploy" gap. The repositories
 * are kept verbatim in `import-audit-repros.json`; a later importer change that makes one of them less safe fails here.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { runGreenfieldMission } from '../missions/greenfield';
import repros from './import-audit-repros.json' with { type: 'json' };

type Resource = { type: string; properties: Record<string, unknown> };
type Outcome = { resources: Record<string, Resource>; gaps: string[] };
type Event = { type: string; properties: Record<string, unknown> };

const run = async (files: Record<string, string>): Promise<Outcome> => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-import-audit-'));
  try {
    for (const [path, contents] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), contents, 'utf8');
    }
    const result = await runGreenfieldMission({ repositoryRoot: root, projectName: 'audit' });
    return {
      resources: result.composition.config.resources as Record<string, Resource>,
      gaps: result.composition.gaps.map((gap) => gap.message)
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

const ofType = (outcome: Outcome, type: string): Resource[] =>
  Object.values(outcome.resources).filter((resource) => resource.type === type);

const events = (outcome: Outcome, type?: string): Event[] =>
  Object.values(outcome.resources)
    .flatMap((resource) => (resource.properties.events as Event[] | undefined) ?? [])
    .filter((event) => type === undefined || event.type === type);

const routes = (outcome: Outcome) => events(outcome, 'http-api-gateway').map((event) => event.properties);

const expectGap = (outcome: Outcome, ...fragments: string[]): void => {
  for (const fragment of fragments) {
    expect(outcome.gaps.some((gap) => gap.includes(fragment))).toBe(true);
  }
};

/** No route on `path` accepts unauthenticated callers. */
const noPublicRoute = (outcome: Outcome, path: string): void => {
  for (const route of routes(outcome).filter((entry) => entry.path === path)) {
    expect(route.authorizer).toBeDefined();
  }
};

/** Nothing runs on a schedule unless it is switched off. */
const noActiveSchedule = (outcome: Outcome): void => {
  for (const schedule of events(outcome, 'schedule')) expect(schedule.properties.enabled).toBe(false);
};

const activeSchedules = (outcome: Outcome): number =>
  events(outcome, 'schedule').filter((schedule) => schedule.properties.enabled !== false).length;

const webService = (outcome: Outcome): Resource => {
  const [service] = ofType(outcome, 'web-service');
  expect(service).toBeDefined();
  return service!;
};

const packagedEntry = (resource: Resource): unknown =>
  (resource.properties.packaging as { properties?: Record<string, unknown> }).properties?.entryfilePath;

/** No workload gives two of its variables one pool's client: identity domains the source keeps apart stay apart. */
const noSharedClient = (outcome: Outcome): void => {
  for (const resource of Object.values(outcome.resources)) {
    const clients = ((resource.properties.environment as Array<{ value: unknown }> | undefined) ?? [])
      .map((variable) => variable.value)
      .filter((value) => typeof value === 'string' && value.endsWith("'clientId')"));
    expect(new Set(clients).size).toBe(clients.length);
  }
};

const SAFE: Record<string, (outcome: Outcome) => void> = {
  // ── First audit (r2ss) ─────────────────────────────────────────────────────────────────────────────────────────────
  'r2ss/03-hono': (outcome) => expect(webService(outcome).properties.port).toBe(4000),
  'r2ss/10-vite': (outcome) => expect(ofType(outcome, 'hosting-bucket')).toHaveLength(1),
  'r2ss/12-fastapi': (outcome) => expect(webService(outcome).properties.port).toBe(8000),
  'r2ss/13-flask': (outcome) => expect(webService(outcome).properties.port).toBe(5000),
  'r2ss/21-spring': (outcome) => expect(webService(outcome).properties.port).toBe(8088),
  'r2ss/22-java-lambda': (outcome) => expect(ofType(outcome, 'function')).toHaveLength(1),
  'r2ss/31-serverless-auth': (outcome) => {
    noPublicRoute(outcome, '/admin');
    expect(routes(outcome).find((route) => route.path === '/admin')?.authorizer).toEqual({ type: 'aws-iam' });
  },
  'r2ss/32-serverless-disabled': noActiveSchedule,
  'r2ss/33-serverless-handler': (outcome) =>
    expect(JSON.stringify(ofType(outcome, 'function')[0]?.properties.packaging)).toContain('handlerFunction'),
  'r2ss/35-serverless-fifo': (outcome) => expect(ofType(outcome, 'sqs-queue')[0]?.properties.fifoEnabled).toBe(true),
  'r2ss/36-serverless-mysql': (outcome) =>
    expect((ofType(outcome, 'relational-database')[0]?.properties.engine as { type: string }).type).toMatch(/mysql/),
  'r2ss/37-sam-auth': (outcome) => {
    noPublicRoute(outcome, '/admin');
    expect(routes(outcome).find((route) => route.path === '/admin')?.authorizer).toEqual({ type: 'aws-iam' });
  },
  'r2ss/39-sam-disabled': noActiveSchedule,
  // A commented-out listen call is not a public server.
  'r2ss/41-comments': (outcome) => expect(ofType(outcome, 'web-service')).toHaveLength(0),
  // A string holding handler code is not a Lambda function.
  'r2ss/42-string-route': (outcome) => expect(ofType(outcome, 'function')).toHaveLength(0),
  'r2ss/46-websocket': (outcome) =>
    expect(webService(outcome).properties.loadBalancing).toEqual({ type: 'application-load-balancer' }),
  'r2ss/50-fastapi-nested': (outcome) => expect(webService(outcome).properties.port).toBe(8080),
  'r2ss/52-sam-timeout': (outcome) => expect(ofType(outcome, 'function')[0]?.properties.timeout).toBe(180),
  'r2ss/53-serverless-event-input': (outcome) =>
    expect(events(outcome, 'schedule')[0]?.properties.input).toEqual({ operation: 'settle' }),
  'r2ss/55-compose-persistent': (outcome) => expect(ofType(outcome, 'efs-filesystem')).toHaveLength(1),
  'r2ss/56-serverless-two-exports': (outcome) =>
    expect(
      ofType(outcome, 'function')
        .map((resource) => (resource.properties.packaging as { properties: { handlerFunction?: string } }).properties)
        .map((properties) => properties.handlerFunction)
        .toSorted()
    ).toEqual(['read', 'write']),
  'r2ss/57-java-acme-control': (outcome) => expect(ofType(outcome, 'function')).toHaveLength(1),
  'r2ss/58-spring-acme-control': (outcome) => expect(webService(outcome).properties.port).toBe(8088),
  'r2ss/59-secret-imported': (outcome) =>
    expect(webService(outcome).properties.environment).toEqual([{ name: 'API_TOKEN', value: "$Secret('api_token')" }]),
  'r2ss/60-secret-inline': (outcome) =>
    expect(webService(outcome).properties.environment).toEqual([{ name: 'API_TOKEN', value: "$Secret('api_token')" }]),
  'r2ss/61-comments-control': (outcome) => expect(ofType(outcome, 'web-service')).toHaveLength(0),
  'r2ss/62-hono-3000-control': (outcome) => expect(webService(outcome).properties.port).toBeUndefined(),
  'r2ss/63-procfile-port-env': (outcome) => expect(ofType(outcome, 'web-service')).toHaveLength(1),
  'r2ss/65-sam-filter': (outcome) =>
    expect(events(outcome, 's3')[0]?.properties.filterRule).toEqual({ prefix: 'incoming/', suffix: '.csv' }),
  'r2ss/66-sam-custom-handler': (outcome) => noPublicRoute(outcome, '/hello'),
  'r2ss/67-python-handler': (outcome) =>
    expect(JSON.stringify(ofType(outcome, 'function')[0]?.properties.packaging)).toContain('"handlerFunction":"main"'),
  'r2ss/69-serverless-sns-filter': (outcome) =>
    expect(events(outcome, 'sns')[0]?.properties.filterPolicy).toBeDefined(),
  'r2ss/70-sqs-partial-batch': (outcome) =>
    expect(events(outcome, 'sqs')[0]?.properties.reportBatchItemFailures).toBe(true),
  'r2ss/71-vite-custom-outdir': (outcome) =>
    expect(ofType(outcome, 'hosting-bucket')[0]?.properties.uploadDirectoryPath).toBe('public-build'),
  'r2ss/72-fastapi-websocket': (outcome) =>
    expect(webService(outcome).properties.loadBalancing).toEqual({ type: 'application-load-balancer' }),
  'r2ss/73-persistent-upload': (outcome) => expect(ofType(outcome, 'efs-filesystem')).toHaveLength(1),
  'r2ss/74-partial-batch-standard': (outcome) =>
    expect(events(outcome, 'sqs')[0]?.properties.reportBatchItemFailures).toBe(true),
  'r2ss/76-mixed-monorepo': (outcome) => expect(ofType(outcome, 'function')).toHaveLength(2),
  'r2ss/77-schedule-multiple': (outcome) => expect(activeSchedules(outcome)).toBe(2),
  'r2ss/78-sam-long-job': (outcome) => expect(ofType(outcome, 'function')[0]?.properties.timeout).toBe(180),

  // ── Second audit (r2ah): imports ───────────────────────────────────────────────────────────────────────────────────
  'r2ah/01-sam-global-auth-local-cors': (outcome) => {
    noPublicRoute(outcome, '/admin');
    expect(routes(outcome)).toHaveLength(1);
  },
  // The route sits behind a JWT authorizer of an API selected through Fn::If; it is left out, never public.
  'r2ah/02-sam-auth-short-join': (outcome) => {
    expect(routes(outcome)).toHaveLength(0);
    expectGap(outcome, 'GET /admin');
  },
  'r2ah/03-sam-resource-condition-false': (outcome) => {
    expect(activeSchedules(outcome)).toBe(0);
    expectGap(outcome, '`PurgeFunction` out', 'Condition');
  },
  'r2ah/04-sam-event-if-false': (outcome) => expect(activeSchedules(outcome)).toBe(0),
  // `!ImportValue` is no literal prefix: the filtered event is left out instead of subscribing to a wrong prefix.
  'r2ah/05-sam-filter-importvalue': (outcome) => {
    expect(events(outcome, 's3')).toHaveLength(0);
    expectGap(outcome, 'key filter init cannot resolve');
  },
  'r2ah/06-sam-filter-sub-literal': (outcome) =>
    expect(events(outcome, 's3')[0]?.properties.filterRule).toEqual({ prefix: 'incoming/' }),
  'r2ah/07-sam-filter-parameter': (outcome) =>
    expect(events(outcome, 's3')[0]?.properties.filterRule).toEqual({ prefix: 'incoming/' }),
  // A literal that happens to be a parameter's name stays the literal.
  'r2ah/08-sam-filter-literal-parameter-name': (outcome) =>
    expect(events(outcome, 's3')[0]?.properties.filterRule).toEqual({ prefix: 'Prefix' }),
  'r2ah/09-sam-sizing-parameters': (outcome) =>
    expect(ofType(outcome, 'function')[0]?.properties).toMatchObject({ timeout: 240, memory: 2048 }),
  'r2ah/10-sam-queue-parameter-fifo': (outcome) =>
    expect(ofType(outcome, 'sqs-queue')[0]?.properties).toMatchObject({
      fifoEnabled: true,
      contentBasedDeduplication: true,
      visibilityTimeoutSeconds: 300
    }),
  // `Enabled: !Ref Enabled` defaults to true: the schedule runs, as it does from the template.
  'r2ah/11-sam-schedule-disabled-ref': (outcome) => expect(activeSchedules(outcome)).toBe(1),
  'r2ah/12-sam-global-layers-vpc': (outcome) => {
    expect(ofType(outcome, 'function')).toHaveLength(0);
    expectGap(outcome, '`ReadFunction` out', '`VpcConfig`');
  },
  'r2ah/13-sam-sqs-max-batching': (outcome) =>
    expect(events(outcome, 'sqs')[0]?.properties).toMatchObject({
      batchSize: 100,
      maxBatchWindowSeconds: 10,
      maximumConcurrency: 2
    }),
  'r2ah/14-sam-queue-redrive': (outcome) =>
    expect(outcome.resources.jobs?.properties.redrivePolicy).toEqual({
      targetSqsQueueName: 'dead',
      maxReceiveCount: 2
    }),
  'r2ah/15-sam-s3-versioned': (outcome) => expect(ofType(outcome, 'bucket')[0]?.properties.versioning).toBe(true),
  'r2ah/16-sam-dynamo-composite': (outcome) => {
    expect(ofType(outcome, 'dynamo-db-table')[0]?.properties.primaryKey).toEqual({
      partitionKey: { name: 'tenant', type: 'string' },
      sortKey: { name: 'createdAt', type: 'number' }
    });
    expectGap(outcome, '`TimeToLiveSpecification`');
  },
  'r2ah/17-sam-nested-custom-template': (outcome) => expect(ofType(outcome, 'function')).toHaveLength(1),
  // The parent passes `Public: no`, so the nested job's condition is false.
  'r2ah/18-sam-nested-parameter-auth': (outcome) => {
    expect(activeSchedules(outcome)).toBe(0);
    expectGap(outcome, '`JobFunction` out');
  },
  'r2ah/19-sam-globals-sizing-control': (outcome) => {
    noActiveSchedule(outcome);
    expect(ofType(outcome, 'function')[0]?.properties).toMatchObject({ timeout: 180, memory: 2048 });
  },
  'r2ah/20-sam-efs-required': (outcome) => {
    expect(ofType(outcome, 'function')).toHaveLength(0);
    expectGap(outcome, '`FileSystemConfigs`');
  },
  'r2ah/21-sls-schedule-v3-timezone': (outcome) => {
    expect(activeSchedules(outcome)).toBe(0);
    expectGap(outcome, 'America/New_York');
  },
  'r2ah/22-sls-provider-httpapi-iam': (outcome) => expect(routes(outcome)).toHaveLength(1),
  'r2ah/23-sls-sqs-parameter-batch': (outcome) =>
    expect(events(outcome, 'sqs')[0]?.properties).toMatchObject({
      batchSize: 100,
      maxBatchWindowSeconds: 10,
      maximumConcurrency: 2
    }),
  // No function URL is created, so nothing is exposed without IAM.
  'r2ah/24-sls-function-url-iam': (outcome) => {
    expect(ofType(outcome, 'function')[0]?.properties.url).toBeUndefined();
    expectGap(outcome, '`url`');
  },
  'r2ah/25-sls-vpc-layers': (outcome) => {
    expect(ofType(outcome, 'function')).toHaveLength(0);
    expectGap(outcome, '`provider.vpc`');
  },
  'r2ah/26-sls-custom-timeout': (outcome) => expect(ofType(outcome, 'function')[0]?.properties.timeout).toBe(300),
  'r2ah/27-sls-resource-condition-false': (outcome) => {
    expect(ofType(outcome, 'sqs-queue')).toHaveLength(0);
    expectGap(outcome, '`Jobs` out');
  },
  'r2ah/28-sls-rest-path-parameters': (outcome) => {
    expect(routes(outcome)[0]?.path).toBe('/users/{id}');
    expectGap(outcome, '`request`');
  },
  'r2ah/29-sls-sns-body-filter': (outcome) => expect(events(outcome, 'sns')).toHaveLength(0),
  'r2ah/30-sls-disabled-sqs-control': (outcome) => expect(events(outcome, 'sqs')).toHaveLength(0),
  'r2ah/31-sls-two-handler-pairs': (outcome) =>
    expect(
      routes(outcome)
        .map((route) => route.path)
        .toSorted()
    ).toEqual(['/', '/other']),
  'r2ah/32-sls-s3-delete-filter': (outcome) =>
    expect(events(outcome, 's3')[0]?.properties).toMatchObject({
      s3EventType: 's3:ObjectRemoved:*',
      filterRule: { prefix: 'deleted/', suffix: '.json' }
    }),
  'r2ah/33-compose-debug-profile': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(1);
    expect(packagedEntry(webService(outcome))).toBe('server.js');
    expectGap(outcome, '`services.debug` out', '`profiles`');
  },
  'r2ah/34-compose-extends-file': (outcome) => {
    expect(webService(outcome).properties.environment).toEqual(
      expect.arrayContaining([{ name: 'MODE', value: 'production' }])
    );
    expect(ofType(outcome, 'efs-filesystem')).toHaveLength(1);
  },
  // Names only: the file's values never reach the configuration.
  'r2ah/35-compose-envfile-custom': (outcome) => {
    const environment = webService(outcome).properties.environment as Array<{ name: string; value: string }>;
    expect(environment.map((variable) => variable.name).toSorted()).toEqual(['REQUIRED_KEY', 'TENANT_ID']);
    expect(JSON.stringify(outcome.resources)).not.toContain('demo');
  },
  'r2ah/36-compose-healthcheck': (outcome) =>
    expect(webService(outcome).properties.internalHealthCheck).toMatchObject({
      healthCheckCommand: ['CMD', 'node', 'health.js'],
      startPeriodSeconds: 60
    }),
  'r2ah/37-compose-internal-networks': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(1);
    expect(ofType(outcome, 'private-service')).toHaveLength(1);
  },
  'r2ah/38-compose-command-array': (outcome) => expect(packagedEntry(webService(outcome))).toBe('worker.js'),
  'r2ah/39-compose-entrypoint-override': (outcome) => expect(packagedEntry(webService(outcome))).toBe('special.js'),
  'r2ah/40-compose-readonly-root': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(0);
    expectGap(outcome, '`read_only`');
  },
  'r2ah/41-compose-ro-subpath-control': (outcome) =>
    expect(webService(outcome).properties.volumeMounts).toEqual([
      {
        type: 'efs',
        properties: {
          efsFilesystemName: 'dataVolume',
          rootDirectory: '/archive',
          mountPath: '/app/data',
          readOnly: true
        }
      }
    ]),
  'r2ah/42-compose-sqlite-varlib': (outcome) => expect(ofType(outcome, 'efs-filesystem')).toHaveLength(1),
  'r2ah/43-compose-dotdir-state': (outcome) => expect(ofType(outcome, 'efs-filesystem')).toHaveLength(1),
  'r2ah/44-compose-mariadb': (outcome) =>
    expect((ofType(outcome, 'relational-database')[0]?.properties.engine as { type: string }).type).toBe('mariadb'),
  'r2ah/45-compose-db-debug-profile': (outcome) => {
    expect(ofType(outcome, 'relational-database')).toHaveLength(0);
    expectGap(outcome, '`services.db` out');
  },
  'r2ah/46-compose-healthy-dependency': (outcome) => expect(ofType(outcome, 'relational-database')).toHaveLength(1),
  // An existing pool's users must not be replaced by an empty new pool.
  'r2ah/47-cognito-existing-pool': (outcome) => expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0),
  'r2ah/48-cognito-iac-mfa': (outcome) =>
    expect(ofType(outcome, 'user-auth-pool')[0]?.properties.mfaConfiguration).toEqual({
      status: 'ON',
      enabledTypes: ['SOFTWARE_TOKEN']
    }),
  'r2ah/49-cognito-unrelated-admin-script': (outcome) => expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0),
  'r2ah/50-cognito-template-string-admin': (outcome) => expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0),
  // The repository declares the pool for Amplify (`defineAuth` in amplify/auth/resource.ts), as infrastructure code
  // does, so the pool is the project's. Amplify reads it from Amplify.configure(), which the gap says how to set.
  'r2ah/51-cognito-amplify-owned': (outcome) => {
    expect(ofType(outcome, 'user-auth-pool')).toHaveLength(1);
    expectGap(outcome, 'Amplify.configure()', 'stop deploying the pool from amplify/auth/resource.ts');
  },
  'r2ah/52-cognito-readme-negation': (outcome) => expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0),
  // Two pools stay two pools. Nothing says which client each variable names, so neither is bound to a pool.
  'r2ah/53-cognito-two-owned-pools': (outcome) => {
    expect(ofType(outcome, 'user-auth-pool')).toHaveLength(2);
    expect(webService(outcome).properties.environment).toEqual(
      expect.arrayContaining([
        { name: 'AUTH_CLIENT_ID', value: "$Secret('auth_client_id')" },
        { name: 'STAFF_CLIENT_ID', value: "$Secret('staff_client_id')" }
      ])
    );
  },
  'r2ah/54-cognito-python-string-admin': (outcome) => expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0),

  // ── Second audit (r2ah): source inference that is not an F21–F25 finding ─────────────────────────────────────────
  'r2ah/63-python-fstring-executable': (outcome) => expect(ofType(outcome, 'web-service')).toHaveLength(1),
  // Server code inside a raw string runs nothing.
  // Listener text in a string is no server; the program blocks forever, so it is a worker.
  'r2ah/65-go-rawstring-server': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(0);
    expect(ofType(outcome, 'worker-service')).toHaveLength(1);
  },
  'r2ah/67-docker-heredoc-inert-source': (outcome) => expect(packagedEntry(webService(outcome))).toBe('server.js'),
  'r2ah/68-nx-apps-lib': (outcome) => expect(Object.keys(outcome.resources)).toEqual(['api']),
  'r2ah/69-turbo-apps-lib': (outcome) => expect(Object.keys(outcome.resources)).toEqual(['api']),
  'r2ah/70-rush-apps-lib': (outcome) => expect(Object.keys(outcome.resources)).toEqual(['api']),
  'r2ah/71-lerna-apps-lib': (outcome) => expect(Object.keys(outcome.resources)).toEqual(['api']),
  'r2ah/72-python-uv-workspace': (outcome) => expect(ofType(outcome, 'web-service')).toHaveLength(1),
  'r2ah/73-go-work-two-apps': (outcome) => {
    expect(outcome.resources.api?.type).toBe('web-service');
    expect(outcome.resources.worker?.type).toBe('worker-service');
  },
  'r2ah/74-java-maven-multimodule': (outcome) => expect(outcome.resources.api?.type).toBe('web-service'),
  'r2ah/77-remix-vite-custom-build': (outcome) => expect(ofType(outcome, 'remix-web')).toHaveLength(1),
  // `nuxt generate` writes only files, so they are served from storage rather than a Nuxt server.
  'r2ah/78-nuxt-static-output': (outcome) => {
    expect(ofType(outcome, 'nuxt-web')).toHaveLength(0);
    expect(ofType(outcome, 'hosting-bucket')).toHaveLength(1);
  },
  // WebSockets need the load balancer; the channel layer's Redis exists, and its fixed address is a gap.
  'r2ah/81-django-channels-asgi': (outcome) => {
    expect(webService(outcome).properties.loadBalancing).toEqual({ type: 'application-load-balancer' });
    expect(ofType(outcome, 'redis')).toHaveLength(1);
    expectGap(outcome, 'sets CHANNEL_LAYERS to a fixed Redis address');
  },
  'r2ah/80-rails-sidekiq-with-web': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(1);
    expect(ofType(outcome, 'worker-service')).toHaveLength(1);
  },
  'r2ah/82-celery-beat-plus-worker': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(0);
    expect(ofType(outcome, 'worker-service')).toHaveLength(2);
  },

  // ── Second audit (r2ah): imports, continued ──────────────────────────────────────────────────────────────────────
  'r2ah/83-sam-private-api': (outcome) => {
    expect(routes(outcome)).toHaveLength(0);
    expectGap(outcome, '`Gateway` out', '`Auth.ResourcePolicy`', '`EndpointConfiguration`');
  },
  'r2ah/84-sam-resourcepolicy-ip': (outcome) => {
    expect(routes(outcome)).toHaveLength(0);
    expectGap(outcome, '`Auth.ResourcePolicy`');
  },
  'r2ah/85-sls-resourcepolicy-ip': (outcome) => {
    expect(routes(outcome)).toHaveLength(0);
    expectGap(outcome, '`apiGateway.resourcePolicy`');
  },
  'r2ah/86-sam-layer-runtime-use': (outcome) =>
    expect(ofType(outcome, 'function')[0]?.properties.layers).toEqual([
      'arn:aws:lambda:us-east-1:123456789012:layer:corporate-runtime:3'
    ]),
  'r2ah/87-compose-dotdir-real-writes': (outcome) =>
    expect(webService(outcome).properties.volumeMounts).toEqual([
      { type: 'efs', properties: { efsFilesystemName: 'stateVolume', mountPath: '/home/node/.local/share/app' } }
    ]),
  'r2ah/88-sam-dynamo-key-real-use': (outcome) =>
    expect(ofType(outcome, 'dynamo-db-table')[0]?.properties.primaryKey).toEqual({
      partitionKey: { name: 'tenant', type: 'string' },
      sortKey: { name: 'createdAt', type: 'number' }
    }),
  'r2ah/89-sam-java-two-modules': (outcome) => expect(ofType(outcome, 'function')).toHaveLength(2),
  'r2ah/92-ws-unaliased-control': (outcome) =>
    expect(webService(outcome).properties.loadBalancing).toEqual({ type: 'application-load-balancer' }),
  // ── Review of #396 ───────────────────────────────────────────────────────────────────────────────────────────────
  // A client that exists only under a condition takes its pool with it: the replacement client would always exist.
  'r2aj-review/cognito-client-condition': (outcome) => {
    expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0);
    expectGap(outcome, '`Staff` out', '`Condition:Enabled`');
  },
  'r2aj-review/cognito-password-ref': (outcome) =>
    expect(ofType(outcome, 'user-auth-pool')[0]?.properties.passwordPolicy).toEqual({
      minimumLength: 20,
      requireSymbols: true
    }),
  // A Number parameter's default written as a string is still the number.
  'r2aj-review/cognito-password-stringdefault': (outcome) =>
    expect(ofType(outcome, 'user-auth-pool')[0]?.properties.passwordPolicy).toEqual({
      minimumLength: 20,
      requireSymbols: true
    }),
  'r2aj-review/cognito-password-unresolved': (outcome) => {
    expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0);
    expectGap(outcome, '`Policies.PasswordPolicy.MinimumLength`');
  },
  // Admin-only recovery is stricter than the pool Stacktape would create. The five-minute access token is carried.
  'r2aj-review/cognito-restricted-client': (outcome) => {
    expect(ofType(outcome, 'user-auth-pool')).toHaveLength(0);
    expectGap(outcome, '`AccountRecoverySetting`');
  },
  'r2aj/cognito-client-restrictions-carried': (outcome) =>
    expect(ofType(outcome, 'user-auth-pool')[0]?.properties).toMatchObject({
      allowedAuthFlows: ['ALLOW_ADMIN_USER_PASSWORD_AUTH'],
      readAttributes: ['name'],
      writeAttributes: ['name']
    }),
  'r2aj-review/compose-envfile': (outcome) => {
    const environment = webService(outcome).properties.environment as Array<{ name: string; value: string }>;
    expect(environment.every((variable) => variable.value.startsWith('$Secret('))).toBe(true);
  },
  // Compose replaces an extended command instead of appending to it.
  'r2aj-review/compose-extends-command': (outcome) => expect(packagedEntry(webService(outcome))).toBe('production.js'),
  // A service that names no network joins `default`, which this file declares internal.
  'r2aj-review/compose-internal-default': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(0);
    expect(ofType(outcome, 'private-service')).toHaveLength(1);
  },
  'r2aj-review/compose-internal-named': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(0);
    expect(ofType(outcome, 'private-service')).toHaveLength(1);
  },
  'r2aj-review/compose-kitchen-sink': (outcome) =>
    expectGap(outcome, '`deploy`', '`cap_add`', '`secrets`', '`logging`', '`tmpfs`', '`init`', '`stop_grace_period`'),
  'r2aj-review/compose-security-control': (outcome) => {
    expect(ofType(outcome, 'web-service')).toHaveLength(0);
    expectGap(outcome, '`read_only`');
  },
  // `ApiKeyRequired: !If [Off, true, false]` is true with the default parameters.
  'r2aj-review/sam-apikey-if': (outcome) => {
    expect(routes(outcome)).toHaveLength(0);
    expectGap(outcome, 'GET /admin', 'API key');
  },
  'r2aj-review/sam-carry-control': (outcome) => {
    expect(outcome.resources.jobs?.properties.redrivePolicy).toEqual({
      targetSqsQueueName: 'dead',
      maxReceiveCount: 3
    });
    expect(ofType(outcome, 'function')[0]?.properties).toMatchObject({ architecture: 'arm64', reservedConcurrency: 0 });
  },
  'r2aj-review/sam-conditions': (outcome) => {
    expect(ofType(outcome, 'function')).toHaveLength(1);
    expectGap(outcome, '`Inactive` out');
  },
  // A queue whose dead-letter queue is left out is left out too, with the function that only consumed it.
  'r2aj-review/sam-dlq-omitted': (outcome) => {
    expect(ofType(outcome, 'sqs-queue')).toHaveLength(0);
    expect(ofType(outcome, 'function')).toHaveLength(0);
    expectGap(outcome, '`Jobs` out', '`RedrivePolicy`');
  },
  'r2aj-review/sls-dlq-omitted': (outcome) => {
    expect(ofType(outcome, 'sqs-queue')).toHaveLength(0);
    expect(ofType(outcome, 'function')).toHaveLength(0);
    expectGap(outcome, '`Jobs` out', '`RedrivePolicy`');
  },
  'r2aj-review/sam-kitchen-sink': (outcome) => {
    const [service] = ofType(outcome, 'function');
    expect(service?.properties.iamRoleStatements).toEqual([
      { Effect: 'Deny', Action: ['s3:DeleteObject'], Resource: ['*'] }
    ]);
    expect(service?.properties.connectTo).toBeUndefined();
  },
  // A read-only policy and an explicit Deny stay exactly that; `connectTo` would grant every object operation.
  'r2aj-review/sam-policy-deny': (outcome) => {
    const [service] = ofType(outcome, 'function');
    expect(service?.properties.connectTo).toBeUndefined();
    expect(service?.properties.iamRoleStatements).toEqual([
      {
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:ListBucket',
          's3:GetBucketLocation',
          's3:GetObjectVersion',
          's3:GetLifecycleConfiguration'
        ],
        Resource: ["$ResourceParam('archive', 'arn')", "$CfFormat('{}/*', $ResourceParam('archive', 'arn'))"]
      },
      { Effect: 'Deny', Action: ['s3:DeleteObject'], Resource: ['*'] }
    ]);
  },
  'r2ah/93-cognito-explicit-client-bindings': (outcome) => {
    expect(ofType(outcome, 'user-auth-pool')).toHaveLength(2);
    expect(ofType(outcome, 'function')[0]?.properties.environment).toEqual([
      { name: 'STAFF_CLIENT_ID', value: "$ResourceParam('staff', 'clientId')" },
      { name: 'AUTH_CLIENT_ID', value: "$ResourceParam('customers', 'clientId')" }
    ]);
  }
};

/** Source-inference findings of the second audit (F21–F25) that another change fixes; each becomes a case then. */
const PENDING: Record<string, string> = {
  'r2ah/55-js-template-interpolation': 'F22 listener port from an expression',
  'r2ah/56-js-regex-listen': 'F24 framework dependency without a listener',
  'r2ah/57-js-regex-after-block': 'F24 framework dependency without a listener',
  'r2ah/58-js-ws-client-only': 'F21 WebSocket ingress',
  'r2ah/59-js-ws-server-alias': 'F21 WebSocket ingress',
  'r2ah/60-js-socketio-client': 'F21 WebSocket ingress',
  'r2ah/61-js-port-underscore': 'F22 listener port from an expression',
  'r2ah/62-js-port-arithmetic': 'F22 listener port from an expression',
  'r2ah/64-python-decorator-websocket': 'F21 WebSocket ingress',
  'r2ah/66-go-listen-constant': 'F22 listener port from an expression',
  'r2ah/75-dotnet-solution-two-projects': 'F22 listener port from an expression',
  'r2ah/76-nest-microservice-only': 'F23 TCP-only NestJS microservice',
  'r2ah/79-laravel-queue-worker': 'F24 framework dependency without a listener',
  'r2ah/90-vite-outdir-string-decoy': 'F25 Vite outDir from strings',
  'r2ah/91-vite-outdir-plugin-option': 'F25 Vite outDir from plugin options'
};

const cases = Object.entries(repros as Record<string, Record<string, string>>);

describe('init output is no less safe than each audited repository', () => {
  it('has a safety assertion or a pending finding for every audited repository', () => {
    for (const [name] of cases) expect(name in SAFE || name in PENDING).toBe(true);
    for (const name of [...Object.keys(SAFE), ...Object.keys(PENDING)]) {
      expect(cases.some(([candidate]) => candidate === name)).toBe(true);
    }
  });

  for (const [name, files] of cases) {
    const check = SAFE[name];
    if (check === undefined) {
      it.todo(`${name} (${PENDING[name] ?? 'no assertion'})`, () => undefined);
      continue;
    }
    it(name, async () => {
      const outcome = await run(files);
      check(outcome);
      noSharedClient(outcome);
    });
  }
});
