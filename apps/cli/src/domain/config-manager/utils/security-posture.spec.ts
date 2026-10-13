import type { StackContext } from '@domain-services/stack-context';
import { describe, expect, test } from 'bun:test';
import { ConfigManager } from '../index';
import type { StacktapeConfig } from '@stacktape/config';
import { assessSecurityPosture, detectSecretLikeValue, summarizeSecurityFindings } from './security-posture';

const stackContext: StackContext = {
  accountId: '123456789012',
  command: 'deploy',
  globallyUniqueStackHash: 'security-test',
  invocationId: 'invocation',
  projectName: 'api',
  region: 'eu-west-1',
  stackName: 'api-dev',
  stage: 'dev',
  workingDir: '/project'
};

/** Use authored resources and the actual normalization getters. */
const assess = (
  resources: NonNullable<StacktapeConfig['resources']> = {},
  {
    rawConfig,
    stage = 'dev',
    config = {}
  }: { rawConfig?: StacktapeConfig; stage?: string; config?: Omit<StacktapeConfig, 'resources'> } = {}
) => {
  const manager = new ConfigManager();
  const context = { ...stackContext, stage };
  manager.setStackContext(context);
  manager.config = { ...config, resources };
  return assessSecurityPosture({
    configManager: manager,
    rawConfig: rawConfig ?? manager.config,
    stackContext: context
  });
};

const ruleIds = (assessment: ReturnType<typeof assess>) => assessment.findings.map(({ ruleId }) => ruleId);

describe('security posture through authored configuration', () => {
  test('defaults expose production risks; private data and explicit development stages change the assessment', () => {
    const resources = {
      orders: {
        type: 'relational-database',
        properties: {
          credentials: { masterUserPassword: "$Secret('password')" },
          automatedBackupRetentionDays: 0,
          engine: {
            type: 'postgres',
            properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.medium' } }
          }
        }
      },
      jobs: { type: 'sqs-queue' },
      events: { type: 'sqs-queue', properties: { redrivePolicy: { targetSqsQueueName: 'jobs', maxReceiveCount: 3 } } },
      sessions: {
        type: 'dynamo-db-table',
        properties: { primaryKey: { partitionKey: { name: 'id', type: 'string' } } }
      },
      files: { type: 'efs-filesystem' },
      uploads: { type: 'bucket', properties: { accessibility: { accessibilityMode: 'public-read-write' } } },
      assets: { type: 'bucket', properties: { accessibility: { accessibilityMode: 'public-read' } } },
      internal: { type: 'application-load-balancer', properties: { interface: 'internal' } },
      edge: { type: 'application-load-balancer' }
    } satisfies NonNullable<StacktapeConfig['resources']>;
    const production = assess(resources, { stage: 'production' });
    expect(ruleIds(production).toSorted()).toEqual([
      'bucket-publicly-accessible',
      'bucket-publicly-accessible',
      'database-backups-disabled',
      'database-backups-disabled',
      'database-backups-disabled',
      'database-deletion-protection-disabled',
      'database-reachable-from-internet',
      'load-balancer-without-firewall',
      'queue-without-dead-letter-queue',
      'stack-termination-protection-disabled'
    ]);
    expect(production.exposure.map(({ resourceName }) => resourceName).toSorted()).toEqual([
      'assets',
      'edge',
      'orders',
      'uploads'
    ]);
    expect(production.findings.find(({ resourceName }) => resourceName === 'uploads')).toMatchObject({
      ruleId: 'bucket-publicly-accessible',
      severity: 'HIGH'
    });
    expect(production.findings.find(({ resourceName }) => resourceName === 'assets')).toMatchObject({
      ruleId: 'bucket-publicly-accessible',
      severity: 'MEDIUM'
    });
    expect(production.findings.find(({ ruleId }) => ruleId === 'database-reachable-from-internet')).toMatchObject({
      resourceName: 'orders',
      fingerprint: 'database-reachable-from-internet:orders'
    });
    expect(production.findings[0].severity).toBe('HIGH');
    expect(production.findings.map(({ severity }) => severity)).toEqual([
      'HIGH',
      'HIGH',
      'MEDIUM',
      'MEDIUM',
      'MEDIUM',
      'MEDIUM',
      'MEDIUM',
      'MEDIUM',
      'LOW',
      'LOW'
    ]);
    expect(summarizeSecurityFindings(production.findings)).toBe('2 high, 6 medium, 2 low');
    expect(summarizeSecurityFindings([])).toBe('no findings');
    expect(production.findings.map(({ resourceName }) => resourceName)).not.toContain('events');
    const development = assess(resources, {
      stage: 'production',
      config: { stackConfig: { stageType: 'non-production' } }
    });
    expect(development.isProduction).toBe(false);
    expect(ruleIds(development)).not.toContain('database-deletion-protection-disabled');
    expect(ruleIds(development)).toContain('database-reachable-from-internet');
    expect(development.findings.find(({ resourceName }) => resourceName === 'jobs')).toMatchObject({
      ruleId: 'queue-without-dead-letter-queue',
      fingerprint: 'queue-without-dead-letter-queue:jobs'
    });
    expect(development.findings.map(({ resourceName }) => resourceName)).not.toContain('events');
    const namedDevelopment = assess(resources);
    expect(namedDevelopment.isProduction).toBe(false);
    expect(namedDevelopment.findings.find(({ resourceName }) => resourceName === 'jobs')).toMatchObject({
      ruleId: 'queue-without-dead-letter-queue',
      fingerprint: 'queue-without-dead-letter-queue:jobs'
    });
    expect(namedDevelopment.findings.map(({ resourceName }) => resourceName)).not.toContain('events');
    const privateResources = {
      ...resources,
      orders: {
        ...resources.orders,
        properties: {
          ...resources.orders.properties,
          accessibility: { accessibilityMode: 'vpc' as const },
          deletionProtection: true
        }
      }
    };
    expect(ruleIds(assess(privateResources))).not.toContain('database-reachable-from-internet');
    expect(assess(privateResources).exposure.find(({ resourceName }) => resourceName === 'orders')?.accessibility).toBe(
      'vpc'
    );
    expect(assess({}, { stage: 'client-a', config: { stackConfig: { stageType: 'production' } } }).isProduction).toBe(
      true
    );
    const iam = [
      { Effect: 'Allow' as const, Action: ['*'], Resource: ['*'] },
      { Effect: 'Allow' as const, Action: ['s3:*'], Resource: ['*'] },
      { Effect: 'Allow' as const, Action: ['s3:*'], Resource: ['arn:aws:s3:::owned/*'] },
      { Effect: 'Deny' as const, Action: ['*'], Resource: ['*'] }
    ];
    const roles = assess(
      {
        worker: {
          type: 'function',
          properties: {
            packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
            iamRoleStatements: iam
          }
        },
        site: { type: 'nextjs-web', properties: { appDirectory: '.', iamRoleStatements: iam } },
        migrate: {
          type: 'deployment-script',
          properties: {
            trigger: 'after:deploy',
            packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
            iamRoleStatements: iam
          }
        },
        seed: {
          type: 'custom-resource-definition',
          properties: {
            packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
            iamRoleStatements: iam
          }
        },
        agent: {
          type: 'agentcore-runtime',
          properties: {
            packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/agent:1' } },
            iamRoleStatements: iam
          }
        },
        api: {
          type: 'web-service',
          properties: {
            packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/api:1' } },
            resources: { cpu: 0.5, memory: 1024 },
            scaling: { minInstances: 1 },
            loadBalancing: { type: 'application-load-balancer' },
            useFirewall: 'firewall'
          }
        },
        gateway: { type: 'http-api-gateway' },
        hosted: { type: 'hosting-bucket', properties: { uploadDirectoryPath: '.' } }
      },
      { stage: 'production' }
    );
    for (const name of ['worker', 'site', 'migrate', 'agent', 'seed']) {
      expect(
        roles.findings
          .filter(({ resourceName }) => resourceName === name)
          .map(({ ruleId, severity }) => [ruleId, severity])
      ).toEqual([
        ['iam-statement-allows-any-action', 'HIGH'],
        ['iam-statement-wildcard-service-on-any-resource', 'MEDIUM']
      ]);
    }
    expect(ruleIds(roles)).toContain('container-single-instance-in-production');
    expect(roles.exposure.find(({ resourceName }) => resourceName === 'api')).toMatchObject({
      protectedByFirewall: true
    });
    expect(roles.exposure.map(({ resourceName }) => resourceName)).toEqual(
      expect.arrayContaining(['gateway', 'hosted'])
    );
  });
  test('Convex fixed topology avoids unactionable posture warnings while its public endpoint remains visible', () => {
    const convex = assess(
      { backend: { type: 'convex', properties: { appDirectory: './convex', deletionProtection: true } } },
      { stage: 'production', config: { deploymentConfig: { terminationProtection: true } } }
    );
    expect(convex.findings).toEqual([]);
    // Convex does not expose configurable WAF or replica controls. Its generated ALB still serves public traffic.
    expect(
      convex.exposure.filter(
        ({ resourceType }) => resourceType === 'convex' || resourceType === 'application-load-balancer'
      )
    ).toEqual([
      expect.objectContaining({ kind: 'public-endpoint', accessibility: 'internet', protectedByFirewall: false })
    ]);
  });
  test('a finding keeps its identity when an unrelated statement or container is inserted before it', () => {
    const wildcard = { Effect: 'Allow' as const, Action: ['s3:*'], Resource: ['*'] };
    const scoped = {
      Effect: 'Allow' as const,
      Action: ['sqs:SendMessage'],
      Resource: ['arn:aws:sqs:eu-west-1:123456789012:jobs']
    };
    const before = assess({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
          iamRoleStatements: [wildcard]
        }
      }
    });
    const after = assess({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
          iamRoleStatements: [scoped, wildcard]
        }
      }
    });
    expect(after.findings.map(({ fingerprint }) => fingerprint)).toEqual(
      before.findings.map(({ fingerprint }) => fingerprint)
    );

    // Writing the same condition with its keys in another order is the same statement.
    const conditioned = (Condition: Record<string, Record<string, string | string[]>>) =>
      assess({
        worker: {
          type: 'function',
          properties: {
            packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
            iamRoleStatements: [{ ...wildcard, Condition }]
          }
        }
      }).findings[0]?.fingerprint;
    const originalOrder = conditioned({
      Bool: { 'aws:SecureTransport': 'true' },
      StringEquals: { 'aws:RequestedRegion': ['eu-west-1'] }
    });
    const reordered = conditioned({
      StringEquals: { 'aws:RequestedRegion': ['eu-west-1'] },
      Bool: { 'aws:SecureTransport': 'true' }
    });
    expect(originalOrder).toMatch(/^iam-statement-wildcard-service-on-any-resource:worker:statement-[0-9a-f]{8}$/);
    expect(reordered).toBe(originalOrder);

    const secretValue = 'q8Zr2Lm9Xv4Kp7Ws1Tn6Yb3Hd5Fg0Jc';
    const app = {
      name: 'app',
      packaging: { type: 'prebuilt-image' as const, properties: { image: 'example.invalid/app:1' } },
      environment: [{ name: 'CLIENT_SECRET', value: secretValue }]
    };
    const proxy = {
      name: 'proxy',
      packaging: { type: 'prebuilt-image' as const, properties: { image: 'example.invalid/proxy:1' } },
      environment: [{ name: 'PORT', value: '8080' }]
    };
    const rawConfig = (containers: (typeof app)[]) => ({
      resources: {
        api: {
          type: 'multi-container-workload' as const,
          properties: {
            resources: { cpu: 0.5 as const, memory: 1024 },
            containers: containers.map((container) => ({
              ...container,
              packaging: { type: 'prebuilt-image' as const, properties: { image: 'example.invalid/app:1' } }
            }))
          }
        }
      }
    });
    const single = assess({}, { rawConfig: rawConfig([app]) });
    const shifted = assess({}, { rawConfig: rawConfig([proxy, app]) });
    expect(single.findings[0]?.fingerprint).toBe(
      'secret-in-environment-variable:api:containers.app.environment.CLIENT_SECRET'
    );
    expect(shifted.findings.map(({ fingerprint }) => fingerprint)).toEqual(
      single.findings.map(({ fingerprint }) => fingerprint)
    );
  });
});

describe('secret detection in raw configuration', () => {
  test('recognizes well-known credential formats regardless of the variable name', () => {
    expect(detectSecretLikeValue({ name: 'SOMETHING', value: 'AKIAIOSFODNN7EXAMPLE' })).toBe('aws-access-key-id');
    expect(detectSecretLikeValue({ name: 'KEY', value: 'sk_live_51H8xk2eZvKYlo2C0aBcDeFgH' })).toBe('stripe-key');
    // Assembled from parts so the synthetic values do not look like real credentials to the commit hook.
    const connectionStringWithPassword = ['postgres://app', 'not-a-real-password@db.internal:5432/app'].join(':');
    expect(detectSecretLikeValue({ name: 'DATABASE_URL', value: connectionStringWithPassword })).toBe(
      'connection-string-with-password'
    );
    const pemHeader = ['-----BEGIN RSA', 'KEY-----'].join(' PRIVATE ');
    expect(detectSecretLikeValue({ name: 'KEY', value: `${pemHeader}\nMIIE...` })).toBe('private-key');
  });

  test('flags a random value in a secret-named variable, but not references, placeholders or settings', () => {
    expect(detectSecretLikeValue({ name: 'API_SECRET', value: 'q8Zr2Lm9Xv4Kp7Ws1Tn6Yb3Hd5Fg0Jc' })).toBe(
      'high-entropy-value-in-secret-like-variable'
    );
    expect(detectSecretLikeValue({ name: 'API_SECRET', value: "$Secret('api-secret')" })).toBeNull();
    expect(detectSecretLikeValue({ name: 'API_SECRET', value: "$SsmParam('/app/api-secret')" })).toBeNull();
    // A directive embedded in a larger value, such as the password part of a connection string, is still a reference.
    const connectionStringWithReference = ['postgres://app', "$Secret('db-password')@db.internal:5432/app"].join(':');
    expect(detectSecretLikeValue({ name: 'DATABASE_URL', value: connectionStringWithReference })).toBeNull();
    // A literal password stays a finding even when another part of the value is a directive.
    const literalPasswordWithReference = [
      'postgres://app',
      "not-a-real-password@$ResourceParam('db', 'host'):5432/app"
    ].join(':');
    expect(detectSecretLikeValue({ name: 'DATABASE_URL', value: literalPasswordWithReference })).toBe(
      'connection-string-with-password'
    );
    expect(detectSecretLikeValue({ name: 'API_SECRET', value: "$Secret('api-secret')-v2" })).toBeNull();
    expect(detectSecretLikeValue({ name: 'API_SECRET', value: '<your-api-secret-here>' })).toBeNull();
    expect(detectSecretLikeValue({ name: 'API_SECRET', value: 'change-me-before-deploying' })).toBeNull();
    expect(detectSecretLikeValue({ name: 'TOKEN_TTL_SECONDS', value: '3600' })).toBeNull();
    expect(detectSecretLikeValue({ name: 'AUTH_PROVIDER', value: 'cognito-user-pool-default' })).toBeNull();
    expect(detectSecretLikeValue({ name: 'NODE_ENV', value: 'production' })).toBeNull();
    expect(detectSecretLikeValue({ name: 'PASSWORD_MIN_LENGTH', value: 12 })).toBeNull();
  });

  test('finds secrets in nested container environments and never repeats the value', () => {
    const secretValue = 'q8Zr2Lm9Xv4Kp7Ws1Tn6Yb3Hd5Fg0Jc';
    const assessment = assess(
      {},
      {
        rawConfig: {
          resources: {
            api: {
              type: 'multi-container-workload',
              properties: {
                resources: { cpu: 0.5, memory: 1024 },
                containers: [
                  {
                    name: 'app',
                    packaging: { type: 'prebuilt-image' as const, properties: { image: 'example.invalid/app:1' } },
                    environment: [{ name: 'CLIENT_SECRET', value: secretValue }]
                  },
                  {
                    name: 'sidecar',
                    packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/sidecar:1' } },
                    environment: [{ name: 'DB_PASSWORD', value: "$Secret('db-password')" }]
                  }
                ]
              }
            },
            web: {
              type: 'nextjs-web',
              properties: {
                appDirectory: '.',
                environment: [{ name: 'NEXT_PUBLIC_API_URL', value: 'https://api.example.com' }]
              }
            }
          }
        }
      }
    );
    expect(assessment.findings).toHaveLength(1);
    const [finding] = assessment.findings;
    expect(finding).toMatchObject({
      ruleId: 'secret-in-environment-variable',
      kind: 'SECRET',
      severity: 'CRITICAL',
      resourceName: 'api',
      resourceType: 'multi-container-workload',
      fingerprint: 'secret-in-environment-variable:api:containers.app.environment.CLIENT_SECRET'
    });
    expect(finding?.remediation).toContain('`stacktape secret:set`');
    expect(JSON.stringify(finding)).not.toContain(secretValue);
  });
});
