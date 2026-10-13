import type { GuardrailDefinition } from '@stacktape/console-api/guardrails';
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
      message: 'accessibility mode'
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
