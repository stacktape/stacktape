import type { GuardrailDefinition } from '@stacktape/console-api/guardrails';
import type { StackContext } from '@domain-services/stack-context';
import { describe, expect, test } from 'bun:test';
import type { ConfigManager } from '../index';
import { validateGuardrails } from './validation';

const stackContext: StackContext = {
  accountId: '123456789012',
  command: 'deploy',
  globallyUniqueStackHash: 'guardrail-test',
  invocationId: 'invocation',
  projectName: 'api',
  region: 'eu-west-1',
  stackName: 'api-production',
  stage: 'production',
  workingDir: 'C:\\project'
};

const baseConfigManager = {
  allApplicationLoadBalancers: [],
  allConfigResources: [],
  allContainerWorkloads: [],
  databases: [],
  deploymentConfig: {},
  dynamoDbTables: [],
  edgeLambdaFunctions: [],
  efsFilesystems: [],
  functions: [],
  hostingBuckets: [],
  openSearchDomains: [],
  sqsQueues: [],
  webServices: []
};

const validate = (
  guardrail: GuardrailDefinition,
  configOverrides: Partial<typeof baseConfigManager> = {},
  contextOverrides: Partial<StackContext> = {}
) =>
  validateGuardrails({
    guardrails: [guardrail],
    hasConfig: true,
    configManager: { ...baseConfigManager, ...configOverrides } as unknown as ConfigManager,
    stackContext: { ...stackContext, ...contextOverrides }
  });

describe('guardrail enforcement', () => {
  test('blocks organization-restricted local scripts before they run', () => {
    const guardrail = {
      type: 'command-restriction',
      properties: { blockedCommands: ['script:run'] }
    } satisfies GuardrailDefinition;

    expect(() => validate(guardrail, {}, { command: 'script:run' })).toThrow('Command `script:run` is blocked');
  });

  test('requires CloudFormation termination protection', () => {
    const guardrail = {
      type: 'require-stack-termination-protection',
      properties: { enabled: true }
    } satisfies GuardrailDefinition;

    expect(() => validate(guardrail)).toThrow('deploymentConfig.terminationProtection');
    expect(() => validate(guardrail, { deploymentConfig: { terminationProtection: true } })).not.toThrow();
  });

  test.each([
    ['RDS', { databases: [{ name: 'orders', automatedBackupRetentionDays: 0 }] }, 'automatedBackupRetentionDays'],
    ['DynamoDB', { dynamoDbTables: [{ name: 'sessions', enablePointInTimeRecovery: false }] }, 'sessions'],
    ['EFS', { efsFilesystems: [{ name: 'uploads', backupEnabled: false }] }, 'backupEnabled']
  ])('requires recoverable %s data stores', (_service, overrides, expectedMessage) => {
    const guardrail = { type: 'require-data-backups', properties: { enabled: true } } satisfies GuardrailDefinition;
    expect(() => validate(guardrail, overrides as Partial<typeof baseConfigManager>)).toThrow(expectedMessage);
  });

  test('accepts the default non-zero RDS backup retention but requires explicit DynamoDB and EFS backups', () => {
    const guardrail = { type: 'require-data-backups', properties: { enabled: true } } satisfies GuardrailDefinition;
    expect(() =>
      validate(guardrail, {
        databases: [{ name: 'orders' }],
        dynamoDbTables: [{ name: 'events', enablePointInTimeRecovery: true }],
        efsFilesystems: [{ name: 'uploads', backupEnabled: true }]
      } as Partial<typeof baseConfigManager>)
    ).not.toThrow();
  });

  test('requires two running instances for container services', () => {
    const guardrail = {
      type: 'require-multiple-container-instances',
      properties: { enabled: true }
    } satisfies GuardrailDefinition;
    expect(() =>
      validate(guardrail, {
        allContainerWorkloads: [{ name: 'api', configParentResourceType: 'web-service', scaling: { minInstances: 1 } }]
      } as Partial<typeof baseConfigManager>)
    ).toThrow('at least `2`');
    expect(() =>
      validate(guardrail, {
        allContainerWorkloads: [{ name: 'api', configParentResourceType: 'web-service', scaling: { minInstances: 2 } }]
      } as Partial<typeof baseConfigManager>)
    ).not.toThrow();
    expect(() =>
      validate(guardrail, {
        allContainerWorkloads: [
          { name: 'convex-backend', configParentResourceType: 'convex', scaling: { minInstances: 1 } }
        ]
      } as Partial<typeof baseConfigManager>)
    ).not.toThrow();
  });

  test('checks generated web-service load balancers when WAF is required', () => {
    const guardrail = { type: 'require-waf', properties: { enabled: true } } satisfies GuardrailDefinition;
    expect(() =>
      validate(guardrail, {
        allApplicationLoadBalancers: [{ name: 'api-load-balancer', useFirewall: false }]
      } as Partial<typeof baseConfigManager>)
    ).toThrow('api-load-balancer');
    expect(() =>
      validate(guardrail, {
        allApplicationLoadBalancers: [
          { name: 'convex-load-balancer', configParentResourceType: 'convex', useFirewall: false }
        ]
      } as Partial<typeof baseConfigManager>)
    ).not.toThrow();
  });

  test('uses an allowlist for database sizes while preserving old blocklists', () => {
    const database = {
      name: 'orders',
      engine: { type: 'postgres', properties: { primaryInstance: { instanceSize: 'db.r6g.large' } } }
    };
    expect(() =>
      validate(
        {
          type: 'database-instance-restriction',
          properties: { allowedInstanceSizes: ['db.t4g.medium'] }
        },
        { databases: [database] } as Partial<typeof baseConfigManager>
      )
    ).toThrow('Allowed sizes');
    expect(() =>
      validate(
        {
          type: 'database-instance-restriction',
          properties: { blockedInstanceSizes: ['db.r6g.large'] }
        },
        { databases: [database] } as Partial<typeof baseConfigManager>
      )
    ).toThrow('blocked instance size');
  });
});
