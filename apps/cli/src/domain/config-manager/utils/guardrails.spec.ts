import { type GuardrailDefinition, guardrailDefinitionInputSchema } from '@stacktape/console-api/guardrails';
import type { StackContext } from '@domain-services/stack-context';
import type { StacktapeConfig } from '@stacktape/config';
import { expect, test } from 'bun:test';
import { ConfigManager } from '../index';
import { assessSecurityPosture } from './security-posture';

const context: StackContext = {
  accountId: '123456789012',
  command: 'deploy',
  globallyUniqueStackHash: 'guardrail-test',
  invocationId: 'invocation',
  projectName: 'api',
  region: 'eu-west-1',
  stackName: 'api-production',
  stage: 'production',
  workingDir: process.cwd()
};

const protectedConfig = () =>
  ({
    deploymentConfig: { terminationProtection: true as boolean },
    resources: {
      orders: {
        type: 'relational-database',
        properties: {
          credentials: { masterUserPassword: "$Secret('password')" },
          engine: {
            type: 'postgres',
            properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.medium' } }
          },
          accessibility: { accessibilityMode: 'vpc' as 'vpc' | 'internet' },
          deletionProtection: true as boolean,
          automatedBackupRetentionDays: 7
        }
      },
      sessions: {
        type: 'dynamo-db-table',
        properties: {
          primaryKey: { partitionKey: { name: 'id', type: 'string' } },
          enablePointInTimeRecovery: true as boolean
        }
      },
      uploads: { type: 'efs-filesystem', properties: { backupEnabled: true as boolean } },
      api: {
        type: 'web-service',
        properties: {
          packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/api:1' } },
          resources: { cpu: 0.5, memory: 1024 },
          scaling: { minInstances: 2 },
          loadBalancing: { type: 'application-load-balancer' },
          useFirewall: 'firewall'
        }
      }
    }
  }) satisfies StacktapeConfig;

const policy = [
  { type: 'require-stack-termination-protection', properties: { enabled: true } },
  { type: 'require-vpc-databases', properties: { enabled: true } },
  { type: 'require-deletion-protection', properties: { enabled: true } },
  { type: 'require-data-backups', properties: { enabled: true } },
  { type: 'require-multiple-container-instances', properties: { enabled: true } },
  { type: 'require-waf', properties: { enabled: true } },
  { type: 'database-instance-restriction', properties: { allowedInstanceSizes: ['db.t4g.medium'] } }
] satisfies GuardrailDefinition[];

const managerFor = (config: StacktapeConfig, guardrails: GuardrailDefinition[] = policy) => {
  const manager = new ConfigManager();
  manager.setStackContext(context);
  manager.config = config;
  manager.globalConfigGuardrails = guardrails;
  return manager;
};

test('an authored production stack satisfies its policy; removing each protection rejects the normalized config', () => {
  const safe = managerFor(protectedConfig());
  expect(() => safe.validateGuardrails({ hasConfig: true })).not.toThrow();
  expect(
    assessSecurityPosture({ configManager: safe, rawConfig: safe.config, stackContext: context }).findings
  ).toEqual([]);
  const cases: Array<{ change: (config: ReturnType<typeof protectedConfig>) => void; message: string }> = [
    {
      change: (config) => {
        config.deploymentConfig.terminationProtection = false;
      },
      message: 'deploymentConfig.terminationProtection'
    },
    {
      change: (config) => {
        config.resources.orders.properties.accessibility.accessibilityMode = 'internet';
      },
      message: 'Blocked by the organization guardrail "Keep SQL and OpenSearch private". Database `orders`'
    },
    {
      change: (config) => {
        config.resources.orders.properties.deletionProtection = false;
      },
      message: 'deletionProtection'
    },
    {
      change: (config) => {
        config.resources.orders.properties.automatedBackupRetentionDays = 0;
      },
      message: 'automatedBackupRetentionDays'
    },
    {
      change: (config) => {
        config.resources.sessions.properties.enablePointInTimeRecovery = false;
      },
      message: 'enablePointInTimeRecovery'
    },
    {
      change: (config) => {
        config.resources.uploads.properties.backupEnabled = false;
      },
      message: 'backupEnabled'
    },
    {
      change: (config) => {
        config.resources.api.properties.scaling.minInstances = 1;
      },
      message: 'at least `2`'
    },
    {
      change: (config) => {
        config.resources.api.properties.useFirewall = '';
      },
      message: 'useFirewall'
    },
    {
      change: (config) => {
        config.resources.orders.properties.engine.properties.primaryInstance.instanceSize = 'db.r6g.large';
      },
      message: 'Allowed sizes'
    }
  ];
  for (const { change, message } of cases) {
    const config = protectedConfig();
    change(config);
    expect(() => managerFor(config).validateGuardrails({ hasConfig: true })).toThrow(message);
  }
  expect(() =>
    managerFor(protectedConfig(), [
      { type: 'database-instance-restriction', properties: { blockedInstanceSizes: ['db.t4g.medium'] } }
    ]).validateGuardrails({ hasConfig: true })
  ).toThrow('blocked instance size');
  // Backups use the actual defaults, rather than requiring every authored config to spell them out.
  const defaults = protectedConfig();
  delete (defaults.resources.orders.properties as { automatedBackupRetentionDays?: number })
    .automatedBackupRetentionDays;
  expect(() => managerFor(defaults).validateGuardrails({ hasConfig: true })).not.toThrow();
});

test('fixed Convex topology remains usable and DSQL refuses unavailable protection controls', () => {
  const convex = managerFor({ resources: { backend: { type: 'convex', properties: { appDirectory: './convex' } } } }, [
    { type: 'require-waf', properties: { enabled: true } },
    { type: 'require-multiple-container-instances', properties: { enabled: true } }
  ]);
  expect(() => convex.validateGuardrails({ hasConfig: true })).not.toThrow();
  for (const type of ['require-data-backups', 'require-vpc-databases', 'require-deletion-protection'] as const) {
    const dsql = managerFor({ resources: { ledger: { type: 'dsql-database', properties: {} } } }, [
      { type, properties: { enabled: true } }
    ]);
    expect(() => dsql.validateGuardrails({ hasConfig: true })).toThrow('ledger');
  }
  const dsqlProtected = managerFor(
    { resources: { ledger: { type: 'dsql-database', properties: { deletionProtection: true } } } },
    [{ type: 'require-deletion-protection', properties: { enabled: true } }]
  );
  expect(() => dsqlProtected.validateGuardrails({ hasConfig: true })).not.toThrow();
  const command = managerFor({ resources: {} }, [
    { type: 'command-restriction', properties: { blockedCommands: ['script:run'] } }
  ]);
  command.setStackContext({ ...context, command: 'script:run' });
  expect(() => command.validateGuardrails({ hasConfig: false })).toThrow('Command `script:run` is blocked');
});

test('each limit admits its boundary and the defaults it applies, and blocks the first configuration past it', () => {
  const code = { type: 'js-bundle' as const, properties: { entryfilePath: 'index.ts' } };
  const fn = (properties: { memory?: number; timeout?: number } = {}) => ({
    type: 'function' as const,
    properties: { packaging: code, ...properties }
  });
  const postgres = (extra: { readReplicas?: { instanceSize: string }[] } = {}) => ({
    type: 'relational-database' as const,
    properties: {
      credentials: { masterUserPassword: "$Secret('password')" },
      engine: {
        type: 'postgres' as const,
        properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.medium' }, ...extra }
      },
      accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' as const }
    }
  });
  const service = (cpu: 0.5 | 1, memory: number, customDomains?: { domainName: string }[]) => ({
    type: 'web-service' as const,
    properties: {
      packaging: { type: 'prebuilt-image' as const, properties: { image: 'example.invalid/api:1' } },
      resources: { cpu, memory },
      ...(customDomains ? { customDomains } : {})
    }
  });
  const site = (customDomains?: { domainName: string }[]) => ({
    type: 'hosting-bucket' as const,
    properties: { uploadDirectoryPath: './dist', ...(customDomains ? { customDomains } : {}) }
  });
  const bucket = { type: 'bucket' as const };
  type Attempt = { resources: StacktapeConfig['resources']; context?: Partial<StackContext> };
  const cases: Array<{
    guardrail: GuardrailDefinition;
    allowed: Attempt[];
    blocked: Array<Attempt & { message: string }>;
  }> = [
    {
      guardrail: { type: 'stage-restriction', properties: { allowedStages: ['production'] } },
      allowed: [{ resources: {} }],
      blocked: [{ resources: {}, context: { stage: 'preview' }, message: 'Stage `preview` is not allowed' }]
    },
    {
      guardrail: { type: 'region-restriction', properties: { allowedRegions: ['eu-west-1'] } },
      allowed: [{ resources: {} }],
      blocked: [{ resources: {}, context: { region: 'us-east-1' }, message: 'Region `us-east-1` is not allowed' }]
    },
    {
      guardrail: { type: 'command-restriction', properties: { blockedCommands: ['delete'] } },
      allowed: [{ resources: {} }],
      blocked: [{ resources: {}, context: { command: 'delete' }, message: 'Command `delete` is blocked' }]
    },
    {
      guardrail: { type: 'resource-type-restriction', properties: { blockedResourceTypes: ['sqs-queue'] } },
      allowed: [{ resources: { files: bucket } }],
      blocked: [
        { resources: { jobs: { type: 'sqs-queue' } }, message: 'Resource `jobs` uses blocked type `sqs-queue`' }
      ]
    },
    {
      // A database keeps the internet accessibility it defaults to unless the config says otherwise.
      guardrail: { type: 'require-vpc-databases', properties: { enabled: true } },
      allowed: [{ resources: { orders: postgres() } }],
      blocked: [
        {
          resources: { orders: { ...postgres(), properties: { ...postgres().properties, accessibility: undefined } } },
          message: 'uses accessibility mode `internet`'
        }
      ]
    },
    {
      // The dead-letter queue itself has nowhere to send its messages; requiring one there would need a cycle.
      guardrail: { type: 'require-dead-letter-queue', properties: { enabled: true } },
      allowed: [
        {
          resources: {
            failed: { type: 'sqs-queue' },
            jobs: {
              type: 'sqs-queue',
              properties: { redrivePolicy: { targetSqsQueueName: 'failed', maxReceiveCount: 3 } }
            }
          }
        }
      ],
      blocked: [
        { resources: { jobs: { type: 'sqs-queue' } }, message: 'SQS queue `jobs` must configure a `redrivePolicy`' }
      ]
    },
    {
      // A function without `memory` gets 1024 MB and without `timeout` 20 seconds; the limits count those.
      guardrail: { type: 'function-memory-limit', properties: { maxMemoryMB: 512 } },
      allowed: [{ resources: { api: fn({ memory: 512 }) } }],
      blocked: [{ resources: { api: fn() }, message: 'uses `1024 MB`, exceeding the `512 MB` limit' }]
    },
    {
      guardrail: { type: 'function-timeout-limit', properties: { maxTimeoutSeconds: 10 } },
      allowed: [{ resources: { api: fn({ timeout: 10 }) } }],
      blocked: [{ resources: { api: fn() }, message: 'uses a `20s` timeout, exceeding the `10s` limit' }]
    },
    {
      guardrail: { type: 'container-resource-limit', properties: { maxCpu: 0.5, maxMemoryMB: 1024 } },
      allowed: [{ resources: { api: service(0.5, 1024) } }],
      blocked: [
        { resources: { api: service(1, 1024) }, message: 'uses `1 vCPU`, exceeding the `0.5 vCPU` limit' },
        { resources: { api: service(0.5, 2048) }, message: 'uses `2048 MB`, exceeding the `1024 MB` limit' }
      ]
    },
    {
      guardrail: { type: 'database-engine-restriction', properties: { allowedEngines: ['postgres'] } },
      allowed: [{ resources: { orders: postgres() } }],
      blocked: [
        {
          resources: {
            orders: {
              type: 'relational-database',
              properties: {
                credentials: { masterUserPassword: "$Secret('password')" },
                engine: {
                  type: 'aurora-postgresql',
                  properties: { version: '16.6', instances: [{ instanceSize: 'db.r6g.large' }] }
                }
              }
            }
          },
          message: 'uses disallowed engine `aurora-postgresql`'
        }
      ]
    },
    {
      guardrail: { type: 'database-instance-restriction', properties: { allowedInstanceSizes: ['db.t4g.medium'] } },
      allowed: [{ resources: { orders: postgres({ readReplicas: [{ instanceSize: 'db.t4g.medium' }] }) } }],
      blocked: [
        {
          resources: { orders: postgres({ readReplicas: [{ instanceSize: 'db.r6g.large' }] }) },
          message: 'uses instance size `db.r6g.large`'
        }
      ]
    },
    {
      guardrail: { type: 'require-custom-domain', properties: { enabled: true } },
      allowed: [
        {
          resources: {
            api: service(0.5, 1024, [{ domainName: 'api.example.com' }]),
            web: site([{ domainName: 'example.com' }])
          }
        }
      ],
      blocked: [
        { resources: { api: service(0.5, 1024) }, message: 'Web service `api` must configure a custom domain' },
        { resources: { web: site() }, message: 'Hosting bucket `web` must configure a custom domain' }
      ]
    },
    {
      guardrail: { type: 'resource-count-limit', properties: { maxResources: 2 } },
      allowed: [{ resources: { a: bucket, b: bucket } }],
      blocked: [{ resources: { a: bucket, b: bucket, c: bucket }, message: 'Stack has `3` resources' }]
    }
  ];
  for (const { guardrail, allowed, blocked } of cases) {
    // Each policy is one the Console accepts when an admin saves it.
    const saved = guardrailDefinitionInputSchema.parse(guardrail);
    const attempt = ({ resources, context: overrides = {} }: Attempt) => {
      const manager = managerFor({ resources }, [saved]);
      manager.setStackContext({ ...context, ...overrides });
      return () => manager.validateGuardrails({ hasConfig: true });
    };
    for (const config of allowed) expect(attempt(config), guardrail.type).not.toThrow();
    for (const { message, ...config } of blocked) expect(attempt(config), guardrail.type).toThrow(message);
  }
  // A command the CLI never runs under that name would make a restriction that blocks nothing.
  expect(
    guardrailDefinitionInputSchema.safeParse({
      type: 'command-restriction',
      properties: { blockedCommands: ['deploy:all'] }
    }).success
  ).toBe(false);
});
