import type { StackContext } from '@domain-services/stack-context';
import { describe, expect, test } from 'bun:test';
import type { ConfigManager } from '../index';
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

const emptyConfigManager = {
  agentCoreRuntimes: [],
  allApplicationLoadBalancers: [],
  allContainerWorkloads: [],
  applicationLoadBalancers: [],
  astroWebs: [],
  batchJobs: [],
  buckets: [],
  customResourceDefinitions: [],
  databases: [],
  deploymentConfig: {},
  deploymentScripts: [],
  dsqlDatabases: [],
  dynamoDbTables: [],
  edgeLambdaFunctions: [],
  efsFilesystems: [],
  functions: [],
  hostingBuckets: [],
  httpApiGateways: [],
  nextjsWebs: [],
  nuxtWebs: [],
  openSearchDomains: [],
  remixWebs: [],
  solidstartWebs: [],
  sqsQueues: [],
  stackConfig: {},
  sveltekitWebs: [],
  tanstackWebs: [],
  webServices: []
};

/** Evaluates a development stage by default, so stage-independent rules are tested without production noise. */
const assess = (
  overrides: Partial<typeof emptyConfigManager> & Record<string, unknown> = {},
  { rawConfig = { resources: {} }, stage = 'dev' }: { rawConfig?: unknown; stage?: string } = {}
) =>
  assessSecurityPosture({
    configManager: { ...emptyConfigManager, ...overrides } as unknown as ConfigManager,
    rawConfig: rawConfig as never,
    stackContext: { ...stackContext, stage }
  });

const ruleIds = (assessment: ReturnType<typeof assess>) => assessment.findings.map(({ ruleId }) => ruleId);

describe('security posture rules', () => {
  test('a database left on the default accessibility is reachable from the internet; a VPC database is not', () => {
    const unsafe = assess({ databases: [{ name: 'orders' }] });
    expect(ruleIds(unsafe)).toEqual(['database-reachable-from-internet']);
    expect(unsafe.findings[0]).toMatchObject({
      severity: 'HIGH',
      resourceName: 'orders',
      resourceType: 'relational-database',
      fingerprint: 'database-reachable-from-internet:orders'
    });

    const safe = assess({
      databases: [{ name: 'orders', accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' } }]
    });
    expect(safe.findings).toEqual([]);
  });

  test('production-only rules stay quiet on a development stage and fire on production', () => {
    const overrides = {
      databases: [{ name: 'orders', accessibility: { accessibilityMode: 'vpc' } }],
      dynamoDbTables: [{ name: 'sessions' }],
      allContainerWorkloads: [{ name: 'api', scaling: { minInstances: 1 } }]
    };
    const development = assess(overrides);
    expect(ruleIds(development)).toEqual([]);
    expect(development.isProduction).toBe(false);

    const production = assess(overrides, { stage: 'production' });
    expect(production.isProduction).toBe(true);
    expect(ruleIds(production).toSorted()).toEqual([
      'container-single-instance-in-production',
      'database-backups-disabled',
      'database-deletion-protection-disabled',
      'stack-termination-protection-disabled'
    ]);
    expect(
      ruleIds(assess({ ...overrides, deploymentConfig: { terminationProtection: true } }, { stage: 'production' }))
    ).not.toContain('stack-termination-protection-disabled');
  });

  test('an explicit stageType overrides what the stage name suggests', () => {
    const overrides = { stackConfig: { stageType: 'production' }, dynamoDbTables: [{ name: 'sessions' }] };
    expect(ruleIds(assess(overrides, { stage: 'client-a' }))).toContain('database-backups-disabled');
    expect(
      ruleIds(assess({ ...overrides, stackConfig: { stageType: 'non-production' } }, { stage: 'production' }))
    ).toEqual([]);
  });

  test('internet-facing load balancers need a firewall; internal ones and the fixed Convex one do not', () => {
    const assessment = assess({
      allApplicationLoadBalancers: [
        { name: 'public', configParentResourceType: 'application-load-balancer' },
        { name: 'convex-internal', configParentResourceType: 'convex' },
        { name: 'protected', useFirewall: 'apiFirewall', configParentResourceType: 'web-service' },
        { name: 'private-service-lb', interface: 'internal', configParentResourceType: 'private-service' },
        { name: 'internal', interface: 'internal', configParentResourceType: 'application-load-balancer' }
      ]
    });
    expect(assessment.findings.map(({ resourceName }) => resourceName)).toEqual(['public']);
  });

  test('a writable public bucket ranks above a readable one', () => {
    const assessment = assess({
      buckets: [
        { name: 'uploads', accessibility: { accessibilityMode: 'public-read-write' } },
        { name: 'assets', accessibility: { accessibilityMode: 'public-read' } },
        { name: 'private', accessibility: { accessibilityMode: 'private' } },
        { name: 'default' }
      ]
    });
    expect(assessment.findings.map(({ resourceName, severity }) => `${resourceName}:${severity}`)).toEqual([
      'uploads:HIGH',
      'assets:MEDIUM'
    ]);
  });

  test('IAM statements: any action is high, a whole service on any resource is medium, scoped statements pass', () => {
    const assessment = assess({
      functions: [
        {
          name: 'worker',
          iamRoleStatements: [
            { Effect: 'Allow', Action: ['*'], Resource: ['*'] },
            { Effect: 'Allow', Action: ['s3:*'], Resource: ['*'] },
            { Effect: 'Allow', Action: ['s3:*'], Resource: ['arn:aws:s3:::my-bucket/*'] },
            { Effect: 'Allow', Action: ['s3:GetObject'], Resource: ['*'] },
            { Effect: 'Deny', Action: ['*'], Resource: ['*'] }
          ]
        }
      ]
    });
    expect(assessment.findings.map(({ ruleId, fingerprint }) => `${ruleId} ${fingerprint}`)).toEqual([
      'iam-statement-allows-any-action iam-statement-allows-any-action:worker:statement-0',
      'iam-statement-wildcard-service-on-any-resource iam-statement-wildcard-service-on-any-resource:worker:statement-1'
    ]);
  });

  test('IAM statements on rendered webs, deployment scripts and other role-bearing resources are checked too', () => {
    const anyAction = [{ Effect: 'Allow', Action: ['*'], Resource: ['*'] }];
    const assessment = assess({
      nextjsWebs: [{ name: 'site', type: 'nextjs-web', iamRoleStatements: anyAction }],
      deploymentScripts: [{ name: 'migrate', type: 'deployment-script', iamRoleStatements: anyAction }],
      customResourceDefinitions: [{ name: 'seed', iamRoleStatements: anyAction }],
      agentCoreRuntimes: [{ name: 'agent', iamRoleStatements: anyAction }]
    });
    const subjects = assessment.findings.map(({ resourceType, resourceName }) => `${resourceType}:${resourceName}`);
    expect(subjects).toHaveLength(4);
    expect(subjects).toEqual(
      expect.arrayContaining([
        'nextjs-web:site',
        'deployment-script:migrate',
        'custom-resource-definition:seed',
        'agentcore-runtime:agent'
      ])
    );
  });

  test('queues without a redrive policy are reported on every stage', () => {
    const assessment = assess({
      sqsQueues: [{ name: 'jobs' }, { name: 'events', redrivePolicy: { targetSqsQueueName: 'dlq' } }]
    });
    expect(assessment.findings.map(({ resourceName }) => resourceName)).toEqual(['jobs']);
  });

  test('findings are ordered most severe first and summarized by severity', () => {
    const assessment = assess(
      { databases: [{ name: 'orders' }], sqsQueues: [{ name: 'jobs' }] },
      { stage: 'production' }
    );
    // internet database (high), deletion protection (medium), termination protection and the queue (low)
    expect(assessment.findings.map(({ severity }) => severity)).toEqual(['HIGH', 'MEDIUM', 'LOW', 'LOW']);
    expect(summarizeSecurityFindings(assessment.findings)).toBe('1 high, 1 medium, 2 low');
    expect(summarizeSecurityFindings([])).toBe('no findings');
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
                containers: [
                  { name: 'app', environment: [{ name: 'CLIENT_SECRET', value: secretValue }] },
                  { name: 'sidecar', environment: [{ name: 'DB_PASSWORD', value: "$Secret('db-password')" }] }
                ]
              }
            },
            web: {
              type: 'nextjs-web',
              properties: { environment: { NEXT_PUBLIC_API_URL: 'https://api.example.com' } }
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
      fingerprint: 'secret-in-environment-variable:api:containers.0.environment.CLIENT_SECRET'
    });
    expect(JSON.stringify(finding)).not.toContain(secretValue);
  });
});

describe('exposure inventory', () => {
  test('an internal load balancer is not something the internet can reach', () => {
    const assessment = assess({
      applicationLoadBalancers: [{ name: 'edge' }, { name: 'internal-lb', interface: 'internal' }]
    });
    expect(assessment.exposure).toEqual([
      {
        kind: 'public-endpoint',
        resourceName: 'edge',
        resourceType: 'application-load-balancer',
        accessibility: 'internet',
        protectedByFirewall: false
      }
    ]);
  });

  test('lists what the internet can reach and whether a firewall stands in front', () => {
    const assessment = assess({
      webServices: [{ name: 'api', useFirewall: 'apiFirewall' }],
      httpApiGateways: [{ name: 'gateway' }],
      hostingBuckets: [{ name: 'site' }],
      databases: [{ name: 'orders', accessibility: { accessibilityMode: 'vpc' } }],
      buckets: [{ name: 'private' }, { name: 'assets', accessibility: { accessibilityMode: 'public-read' } }]
    });
    expect(assessment.exposure).toEqual([
      {
        kind: 'public-endpoint',
        resourceName: 'api',
        resourceType: 'web-service',
        accessibility: 'internet',
        protectedByFirewall: true
      },
      { kind: 'public-endpoint', resourceName: 'gateway', resourceType: 'http-api-gateway', accessibility: 'internet' },
      {
        kind: 'public-endpoint',
        resourceName: 'site',
        resourceType: 'hosting-bucket',
        accessibility: 'internet',
        protectedByFirewall: false
      },
      { kind: 'database', resourceName: 'orders', resourceType: 'relational-database', accessibility: 'vpc' },
      { kind: 'bucket', resourceName: 'assets', resourceType: 'bucket', accessibility: 'public-read' }
    ]);
  });
});
