/**
 * The registry of referenceable parameters (`REFERENCEABLE_PARAMS` in `@stacktape/config-authoring`) lists what each
 * resource type can expose to `$ResourceParam`. A web build uses it to tell a parameter this deployment adds, such as
 * the `customDomainUrl` of an API that gets its first custom domain, from a typo. This test synthesizes every resource
 * type, nested resources included, in configurations that together publish every parameter: with and without custom
 * domains and CDNs, RDS read replicas, Aurora and a sharded Redis cluster. The registry must list exactly what they
 * publish, and the configurations must exercise every resource type, so a new type cannot skip the registry.
 */
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { defineConfig } from '@stacktape/config-authoring';
import { STACKTAPE_RESOURCE_TYPES } from '@stacktape/config/resource-types';
import {
  getReferenceableParamNames,
  isReferenceableParam,
  NUMBERED_REFERENCEABLE_PARAMS,
  REFERENCEABLE_PARAMS
} from '@stacktape/config-authoring/resource-metadata';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

const fixturesDir = join(import.meta.dir, 'fixtures');
const certificate = 'arn:aws:acm:us-east-1:123456789999:certificate/referenceable-params';
const regionalCertificate = 'arn:aws:acm:eu-west-1:123456789999:certificate/referenceable-params';
const domain = (name: string, regional = false) => ({
  domainName: `${name}.example.com`,
  customCertificateArn: regional ? regionalCertificate : certificate,
  disableDnsRecordCreation: true
});
const cdn = (name: string) => ({ enabled: true, customDomains: [domain(`${name}-cdn`)] });
const lambdaPackaging = (entry = './src/handler.ts') => ({
  type: 'js-bundle',
  properties: { entryfilePath: entry }
});
const imagePackaging = { type: 'js-bundle', properties: { entryfilePath: './src/web.ts' } };
const containerResources = { cpu: 0.25, memory: 512 };

const pgEngine = (readReplicas = false) => ({
  type: 'postgres',
  properties: {
    version: '18.1',
    primaryInstance: { instanceSize: 'db.t4g.micro' },
    ...(readReplicas ? { readReplicas: [{ instanceSize: 'db.t4g.micro' }] } : {})
  }
});

const apiKeyExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const domains = (withDomains: boolean, name: string) => (withDomains ? { customDomains: [domain(name, true)] } : {});
const cdnFor = (withDomains: boolean, name: string) =>
  withDomains ? cdn(name) : ({ enabled: true } as Record<string, unknown>);
const ssrWeb = (type: string, withDomains: boolean, name: string) => ({
  type,
  properties: { appDirectory: './web', ...(withDomains ? { customDomains: [domain(name)] } : {}) }
});

/**
 * Resources whose parameters differ with and without custom domains: a custom domain replaces the default `domain`
 * and `url` of an API and adds the `canonicalDomain`, and a CDN publishes `cdnUrl` only without its own domains.
 */
const endpoints = (withDomains: boolean): Record<string, unknown> => ({
  fn: {
    type: 'function',
    properties: { packaging: lambdaPackaging(), url: { enabled: true }, cdn: cdnFor(withDomains, 'fn') }
  },
  httpApi: {
    type: 'http-api-gateway',
    properties: { ...domains(withDomains, 'api'), cdn: cdnFor(withDomains, 'api') }
  },
  websocketApi: { type: 'websocket-api-gateway', properties: domains(withDomains, 'ws') },
  alb: {
    type: 'application-load-balancer',
    properties: { ...domains(withDomains, 'alb'), cdn: cdnFor(withDomains, 'alb') }
  },
  files: { type: 'bucket', properties: { cdn: cdnFor(withDomains, 'files') } },
  site: {
    type: 'hosting-bucket',
    properties: { uploadDirectoryPath: './web', hostingContentType: 'static-website', ...domains(withDomains, 'site') }
  },
  albService: {
    type: 'web-service',
    properties: {
      packaging: imagePackaging,
      resources: containerResources,
      ...domains(withDomains, 'alb-service'),
      loadBalancing: { type: 'application-load-balancer' },
      cdn: cdnFor(withDomains, 'alb-service')
    }
  },
  apiService: {
    type: 'web-service',
    properties: {
      packaging: imagePackaging,
      resources: containerResources,
      ...domains(withDomains, 'api-service'),
      cdn: cdnFor(withDomains, 'api-service')
    }
  },
  nlbService: {
    type: 'web-service',
    properties: {
      packaging: imagePackaging,
      resources: containerResources,
      ...domains(withDomains, 'nlb-service'),
      loadBalancing: { type: 'network-load-balancer', properties: { ports: [{ port: 8443, protocol: 'TLS' }] } }
    }
  },
  privateService: {
    type: 'private-service',
    properties: {
      packaging: imagePackaging,
      resources: containerResources,
      loadBalancing: { type: 'application-load-balancer' }
    }
  },
  astro: ssrWeb('astro-web', withDomains, 'astro'),
  nuxt: ssrWeb('nuxt-web', withDomains, 'nuxt'),
  sveltekit: ssrWeb('sveltekit-web', withDomains, 'sveltekit'),
  solidstart: ssrWeb('solidstart-web', withDomains, 'solidstart'),
  nextjs: ssrWeb('nextjs-web', withDomains, 'nextjs'),
  tanstack: ssrWeb('tanstack-web', withDomains, 'tanstack'),
  remix: ssrWeb('remix-web', withDomains, 'remix'),
  graphql: {
    type: 'appsync-api',
    properties: {
      authentication: withDomains ? { type: 'aws-iam' } : { type: 'api-key', properties: { expiresAt: apiKeyExpiry } },
      schemaFilePath: 'schema.graphql',
      ...(withDomains ? { customDomain: domain('graphql') } : {})
    }
  },
  pool: {
    type: 'user-auth-pool',
    properties: withDomains
      ? { generateClientSecret: true, customDomain: domain('auth') }
      : { enableHostedUi: true, hostedUiDomainPrefix: 'referenceable-params' }
  }
});

/** Configurations that together enable every referenceable parameter of every resource type. */
const variants: Record<string, Record<string, unknown>> = {
  withDomains: endpoints(true),
  withoutDomains: endpoints(false),
  other: {
    table: {
      type: 'dynamo-db-table',
      properties: { primaryKey: { partitionKey: { name: 'id', type: 'string' } }, streamType: 'NEW_IMAGE' }
    },
    bus: { type: 'event-bus', properties: { archivation: { enabled: true } } },
    queue: { type: 'sqs-queue', properties: {} },
    topic: { type: 'sns-topic', properties: {} },
    stream: { type: 'kinesis-stream', properties: {} },
    machine: {
      type: 'state-machine',
      properties: { definition: { StartAt: 'Done', States: { Done: { Type: 'Pass', End: true } } } }
    },
    job: {
      type: 'batch-job',
      properties: { container: { packaging: imagePackaging }, resources: { cpu: 1, memory: 1024 } }
    },
    firewall: { type: 'web-app-firewall', properties: { scope: 'regional' } },
    search: { type: 'open-search-domain', properties: {} },
    efs: { type: 'efs-filesystem', properties: {} },
    upstash: { type: 'upstash-redis', properties: {} },
    sender: { type: 'email-sender', properties: { identity: 'example.com' } },
    kafka: { type: 'kafka-cluster', properties: {} },
    dsql: { type: 'dsql-database', properties: {} },
    worker: { type: 'worker-service', properties: { packaging: imagePackaging, resources: containerResources } },
    containers: {
      type: 'multi-container-workload',
      properties: { containers: [{ name: 'app', packaging: imagePackaging }], resources: containerResources }
    },
    edge: { type: 'edge-lambda-function', properties: { packaging: lambdaPackaging() } },
    bastion: { type: 'bastion', properties: {} },
    script: { type: 'deployment-script', properties: { trigger: 'after:deploy', packaging: lambdaPackaging() } },
    notifications: { type: 'aws-cdk-construct', properties: { entryfilePath: './cdk/notification-topic.ts' } },
    webhookProvider: {
      type: 'custom-resource-definition',
      properties: { packaging: lambdaPackaging('./src/webhook-provider.ts') }
    },
    webhook: {
      type: 'custom-resource-instance',
      properties: { definitionName: 'webhookProvider', resourceProperties: {} }
    },
    uptime: { type: 'uptime-check', properties: { url: 'https://example.com' } },
    flow: {
      type: 'synthetic-test',
      properties: { test: { type: 'api', properties: { scriptPath: './src/canary.ts' } } }
    },
    backend: { type: 'convex', properties: { appDirectory: './convex' } }
  },
  agents: {
    tools: { type: 'function', properties: { packaging: lambdaPackaging('./src/tool.ts') } },
    agentMemory: { type: 'agentcore-memory', properties: { expirationDays: 30 } },
    agentGateway: {
      type: 'agentcore-gateway',
      properties: {
        tools: [
          {
            name: 'lookupOrder',
            function: 'tools',
            toolSchema: [{ name: 'lookupOrder', description: 'Looks up an order', inputSchema: { type: 'object' } }]
          }
        ]
      }
    },
    agentBrowser: { type: 'agentcore-browser', properties: {} },
    agentInterpreter: { type: 'agentcore-code-interpreter', properties: {} },
    agent: {
      type: 'agentcore-runtime',
      properties: { packaging: { type: 'dockerfile', properties: { buildContextPath: './agent' } } }
    },
    atlas: {
      type: 'mongo-db-atlas-cluster',
      properties: { clusterTier: 'M10' }
    }
  },
  rdsDatabase: {
    database: {
      type: 'relational-database',
      properties: { credentials: { masterUserPassword: 'credential-placeholder' }, engine: pgEngine(true) }
    },
    redis: {
      type: 'redis-cluster',
      properties: {
        instanceSize: 'cache.t4g.micro',
        defaultUserPassword: 'credential-placeholder-1',
        numReplicaNodes: 1
      }
    }
  },
  auroraDatabase: {
    database: {
      type: 'relational-database',
      properties: {
        credentials: { masterUserPassword: 'credential-placeholder' },
        engine: {
          type: 'aurora-postgresql',
          properties: {
            version: '16.10',
            instances: [{ instanceSize: 'db.t4g.medium' }, { instanceSize: 'db.t4g.medium' }]
          }
        }
      }
    },
    redis: {
      type: 'redis-cluster',
      properties: {
        instanceSize: 'cache.t4g.micro',
        defaultUserPassword: 'credential-placeholder-1',
        enableSharding: true,
        numReplicaNodes: 1
      }
    }
  },
  auroraServerless: {
    database: {
      type: 'relational-database',
      properties: {
        credentials: { masterUserPassword: 'credential-placeholder' },
        engine: {
          type: 'aurora-postgresql-serverless-v2',
          properties: { version: '16.10', minCapacity: 0.5, maxCapacity: 2, serverlessReadersCount: 1 }
        }
      }
    }
  }
};

/** Stops a synthesis once its resources are resolved: the parameters are complete then, and Next.js would need a build. */
class ParametersCollected extends Error {}

type MapResource = {
  resourceType: string;
  referencableParams: Record<string, unknown>;
  _nestedResources?: Record<string, MapResource>;
};

/**
 * The parameters each resource type publishes in a configuration, nested resources included, and the resource types the
 * configuration exercised, including types that publish no parameters.
 */
const synthesizeParameters = async (resources: Record<string, unknown>) => {
  const published: [resourceType: string, param: string][] = [];
  const types = new Set(Object.values(resources).map((resource) => (resource as { type: string }).type));
  const collect = (resource: MapResource) => {
    for (const param of Object.keys(resource.referencableParams)) published.push([resource.resourceType, param]);
    for (const nested of Object.values(resource._nestedResources ?? {})) {
      types.add(nested.resourceType);
      collect(nested);
    }
  };
  const synthesis = synthesizeFixture({
    compiledConfig: defineConfig(() => ({ resources }) as never)({
      projectName: 'characterization',
      stage: 'baseline',
      region: 'eu-west-1',
      cliArgs: {} as never,
      command: 'synth',
      awsProfile: '',
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    }),
    workingDir: fixturesDir,
    beforeFinalize: () => {
      for (const resource of Object.values(calculatedStackOverviewManager.stackInfoMap.resources)) {
        collect(resource as unknown as MapResource);
      }
      throw new ParametersCollected();
    }
  });
  await synthesis.catch((error) => {
    if (!(error instanceof ParametersCollected)) throw error;
  });
  return { published, types };
};

test('the registry lists exactly the parameters each resource type publishes', async () => {
  const published: [resourceType: string, param: string][] = [];
  const exercisedTypes = new Set<string>();
  for (const resources of Object.values(variants)) {
    const result = await synthesizeParameters(resources);
    published.push(...result.published);
    for (const type of result.types) exercisedTypes.add(type);
  }
  expect([...exercisedTypes].sort()).toEqual([...STACKTAPE_RESOURCE_TYPES].sort());

  const unregistered = published
    .filter(([resourceType, param]) => !isReferenceableParam(resourceType, param))
    .map(([resourceType, param]) => `${resourceType}: ${param}`);
  expect([...new Set(unregistered)]).toEqual([]);

  const isPublished = (resourceType: string, matches: (param: string) => boolean) =>
    published.some(([type, param]) => type === resourceType && matches(param));
  const neverPublished = [
    ...Object.entries(REFERENCEABLE_PARAMS).flatMap(([resourceType, params]) =>
      params
        .filter(({ name }) => !isPublished(resourceType, (param) => param === name))
        .map(({ name }) => `${resourceType}: ${name}`)
    ),
    ...Object.entries(NUMBERED_REFERENCEABLE_PARAMS).flatMap(([resourceType, params]) =>
      params
        .filter(
          ({ prefix, suffix }) =>
            !isPublished(resourceType, (param) => param.startsWith(prefix) && param.endsWith(suffix))
        )
        .map(({ prefix, suffix }) => `${resourceType}: ${prefix}<number>${suffix}`)
    )
  ];
  expect(neverPublished).toEqual([]);
}, 120_000);

test('numbered parameters match only their number', () => {
  expect(isReferenceableParam('application-load-balancer', 'port443')).toBe(true);
  expect(isReferenceableParam('application-load-balancer', 'port')).toBe(false);
  expect(isReferenceableParam('application-load-balancer', 'portal')).toBe(false);
  expect(isReferenceableParam('relational-database', 'readReplica2Port')).toBe(true);
  expect(isReferenceableParam('relational-database', 'readReplicaPort')).toBe(false);
  expect(isReferenceableParam('relational-database', 'readReplica0Port')).toBe(true);
  expect(isReferenceableParam('relational-database', 'readReplica14Port')).toBe(true);
  expect(getReferenceableParamNames('relational-database')).toContain('readReplica<number>Port');
});

test('numbered parameters reject numbers synthesis never writes', () => {
  expect(isReferenceableParam('application-load-balancer', 'port000443')).toBe(false);
  expect(isReferenceableParam('application-load-balancer', 'port0')).toBe(false);
  expect(isReferenceableParam('application-load-balancer', 'port65535')).toBe(true);
  expect(isReferenceableParam('application-load-balancer', 'port65536')).toBe(false);
  expect(isReferenceableParam('web-service', 'port99999999999999999999')).toBe(false);
  expect(isReferenceableParam('application-load-balancer', 'port+443')).toBe(false);
  expect(isReferenceableParam('application-load-balancer', 'port4.43')).toBe(false);
  expect(isReferenceableParam('relational-database', 'readReplica00Port')).toBe(false);
  expect(isReferenceableParam('relational-database', 'readReplica01Port')).toBe(false);
  expect(isReferenceableParam('relational-database', 'readReplica15Port')).toBe(false);
});
