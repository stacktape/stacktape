import type { RealProjectCorpusCase } from './init-real-project-corpus-cases';

/** Additional pinned platform examples and infrastructure-heavy applications for the v4 release corpus. */
const ALL_REAL_PROJECT_PLATFORM_CASES = [
  {
    id: 'render-workflow-agents',
    repository: 'https://github.com/render-examples/workflow-agents-workshop-ts.git',
    commit: '4302f35863d3c7d87353fed403a9eebc6b0c7ef1',
    source: 'official-example',
    exercises: ['render', 'typescript', 'web-worker', 'postgres', 'redis'],
    expect: {
      resourceTypes: { bastion: 1, 'redis-cluster': 1, 'relational-database': 1, 'web-service': 4 },
      dependencyKinds: { postgres: 1, redis: 1 },
      serviceCount: 4,
      httpServiceCount: 4,
      existingDeployments: ['render'],
      requiredGapPatterns: ['Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'render-strapi-postgres',
    repository: 'https://github.com/render-examples/strapi-postgres.git',
    commit: '5ab436c5289349b8a7290a7da1ccf3603c48e54b',
    source: 'official-example',
    exercises: ['render', 'strapi', 'postgres', 'persistent-storage'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['render'],
      requiredGapPatterns: ['Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'render-rails-7',
    repository: 'https://github.com/render-examples/rails-7.git',
    commit: '0bd502bdcf26ee11af9b4bc5a90e36c7b779c97d',
    source: 'official-example',
    exercises: ['render', 'rails', 'postgres', 'migration'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['render'],
      requiredGapPatterns: ['Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'render-dify-template',
    repository: 'https://github.com/render-examples/dify-render-template.git',
    commit: 'e93a0979384ac7bff7cadbff097e7e6286e4f30e',
    source: 'official-example',
    exercises: ['render', 'multi-service', 'postgres', 'redis', 'persistent-storage'],
    expect: {
      resourceTypes: {
        bastion: 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'web-service': 2,
        'worker-service': 1
      },
      dependencyKinds: { postgres: 1, redis: 1 },
      serviceCount: 3,
      httpServiceCount: 2,
      existingDeployments: ['render'],
      requiredGapPatterns: ['Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fly-live-beats',
    repository: 'https://github.com/fly-apps/live_beats.git',
    commit: 'ac9780472e7019af274110a1cf71250a8d40c986',
    source: 'official-example',
    exercises: ['fly', 'elixir', 'phoenix', 'websocket', 'release-command'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['fly'],
      requiredGapPatterns: ['Fly\.io deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fly-cron-manager',
    repository: 'https://github.com/fly-apps/cron-manager.git',
    commit: '6afda48c47356c0efabaa872ee4091a63043ff2b',
    source: 'official-example',
    exercises: ['fly', 'scheduler', 'sqlite', 'machines'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['fly'],
      requiredGapPatterns: ['Fly\.io deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fly-laravel-litefs',
    repository: 'https://github.com/fly-apps/fly-laravel-litefs.git',
    commit: '2efe156c24b3037034d2655c73bbcd316cd3cca2',
    source: 'official-example',
    exercises: ['fly', 'laravel', 'litefs', 'sqlite', 'docker'],
    expect: {
      resourceTypes: { 'redis-cluster': 1, 'web-service': 1 },
      dependencyKinds: { redis: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['fly'],
      requiredGapPatterns: ['Fly\.io deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fly-epic-stack',
    repository: 'https://github.com/epicweb-dev/epic-stack.git',
    commit: 'da819d69af1bb66b19cfee35ad81aa8502d0be05',
    source: 'official-starter',
    exercises: ['fly', 'remix', 'prisma', 'litefs', 'monorepo'],
    expect: {
      resourceTypes: { bucket: 1, 'web-service': 1 },
      dependencyKinds: { 'object-storage': 1, sqlite: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['fly'],
      requiredGapPatterns: ['SQLite runs inside|Fly\.io deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fly-remix-indie-stack',
    repository: 'https://github.com/remix-run/indie-stack.git',
    commit: '56abb93bf81f635b574d9ca23eed05602699458a',
    source: 'official-starter',
    exercises: ['fly', 'remix', 'prisma', 'sqlite', 'volume'],
    expect: {
      resourceTypes: { 'remix-web': 1 },
      dependencyKinds: { sqlite: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['fly'],
      requiredGapPatterns: ['SQLite runs inside|Fly\.io deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-ghost',
    repository: 'https://github.com/railwayapp-templates/ghost.git',
    commit: '67a63633b8824b5a0c888eb262bfb024c1466848',
    source: 'official-starter',
    exercises: ['railway', 'ghost', 'mysql', 'docker', 'persistent-storage'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { mysql: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-strapi',
    repository: 'https://github.com/railwayapp-templates/strapi.git',
    commit: '92b236b0de2b4cbb91dfc5b289b43ac73f4e750b',
    source: 'official-starter',
    exercises: ['railway', 'strapi', 'postgres', 'object-storage'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-postgres-s3-backups',
    repository: 'https://github.com/railwayapp-templates/postgres-s3-backups.git',
    commit: '5665c7d0aa0a4fd3ca8823050d4d2b0d0dc9e5fd',
    source: 'official-starter',
    exercises: ['railway', 'scheduled-job', 'postgres', 'object-storage', 'docker'],
    expect: {
      resourceTypes: { bucket: 1, 'worker-service': 1 },
      dependencyKinds: { 'object-storage': 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: [],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-stack-demo-api',
    repository: 'https://github.com/AnomalyInnovations/serverless-stack-demo-api.git',
    commit: '755e2e49dd0a69556b39249b57f5db54b4ae893e',
    source: 'official-example',
    exercises: ['serverless-framework', 'http', 'dynamodb', 's3', 'cognito'],
    expect: {
      resourceTypes: { bucket: 1, function: 6, 'http-api-gateway': 1 },
      dependencyKinds: { 'object-storage': 1 },
      serviceCount: 6,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: ['type: http-api-gateway', 'type: function'],
      requiredGapPatterns: ['Serverless Framework deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-websocket-feature-toggles',
    repository: 'https://github.com/aws-samples/amazon-api-gateway-websocket-feature-toggles.git',
    commit: 'd76308f3e025d34a7f238cd287c023a73e98a62b',
    source: 'official-example',
    exercises: ['aws-sam', 'websocket', 'dynamodb-stream', 'lambda'],
    expect: {
      resourceTypes: { 'dynamo-db-table': 2, function: 3 },
      dependencyKinds: { dynamodb: 2 },
      serviceCount: 3,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredGapPatterns: ['WebSocket route|AWS SAM deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'cdk-serverless-full-stack-starter',
    repository: 'https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit.git',
    commit: '87db08dc0ea3d3d89bd509faae94a7559a251195',
    subdirectory: 'apps/cdk',
    source: 'official-starter',
    exercises: ['aws-cdk', 'nextjs', 'dsql', 'eventbridge', 'appsync'],
    expect: {
      resourceTypes: { bucket: 1, function: 1, 'sqs-queue': 1 },
      dependencyKinds: { 'object-storage': 1, queue: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['sst'],
      requiredGapPatterns: ['SST deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sst-bucket-queue-subscriber',
    repository: 'https://github.com/anomalyco/sst.git',
    commit: 'a0bd20f762883e72a35caccb4896c42ce5b3f707',
    subdirectory: 'examples/aws-bucket-queue-subscriber',
    source: 'official-example',
    exercises: ['sst', 's3', 'sqs', 'subscriber', 'function'],
    expect: {
      resourceTypes: { bucket: 1, function: 1, 'sqs-queue': 1 },
      dependencyKinds: { 'object-storage': 1, queue: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['sst'],
      requiredGapPatterns: ['SST deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sst-realtime',
    repository: 'https://github.com/anomalyco/sst.git',
    commit: 'a0bd20f762883e72a35caccb4896c42ce5b3f707',
    subdirectory: 'examples/aws-realtime',
    source: 'official-example',
    exercises: ['sst', 'realtime', 'websocket', 'authorizer', 'function'],
    expect: {
      resourceTypes: { function: 1, 'hosting-bucket': 1, 'http-api-gateway': 1 },
      serviceCount: 2,
      httpServiceCount: 0,
      existingDeployments: ['sst'],
      requiredGapPatterns: ['SST deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fleet-terraform',
    repository: 'https://github.com/fleetdm/fleet-terraform.git',
    commit: '6e7ffb2625aaa6b45f890d6b2d6777d108f44781',
    source: 'official-example',
    exercises: ['terraform', 'ecs', 'aurora-mysql', 'redis', 's3', 'modules'],
    expect: {
      resourceTypes: { 'relational-database': 1 },
      serviceCount: 0,
      httpServiceCount: 0,
      forbidCurrentlyHostedDependencies: true
    }
  }
] as const satisfies readonly RealProjectCorpusCase[];

const STRESS_CASE_IDS = new Set(['railway-strapi', 'cdk-serverless-full-stack-starter', 'fleet-terraform']);

/** Audited, deployable platform examples whose exact topology is a release contract. */
export const REAL_PROJECT_PLATFORM_CASES: readonly RealProjectCorpusCase[] = ALL_REAL_PROJECT_PLATFORM_CASES.filter(
  (entry) => !STRESS_CASE_IDS.has(entry.id)
);

/** Useful negative/stress inputs that must not be promoted to golden output while their import is incomplete. */
export const REAL_PROJECT_PLATFORM_STRESS_CASES: readonly RealProjectCorpusCase[] =
  ALL_REAL_PROJECT_PLATFORM_CASES.filter((entry) => STRESS_CASE_IDS.has(entry.id));
