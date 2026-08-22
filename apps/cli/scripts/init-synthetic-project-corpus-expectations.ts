/**
 * Release contracts for the reusable full-application corpus.
 *
 * These are intentionally semantic rather than snapshots: exact resource topology, dependency
 * protocols, deployable process identities, HTTP exposure, deployment descriptors, and the few
 * gaps whose honesty is part of the result. Generated YAML formatting and explanatory prose that
 * does not carry one of those decisions remain free to improve.
 */

export type SyntheticProjectExpectation = {
  resources: Readonly<Record<string, number>>;
  dependencies: readonly string[];
  services: readonly string[];
  httpServices: readonly string[];
  deployments: readonly string[];
  requiredGapFragments?: readonly string[];
  forbiddenGapFragments?: readonly string[];
};

export const SYNTHETIC_PROJECT_EXPECTATIONS = {
  'aspnet-orders-platform': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 1
    },
    dependencies: ['amqp', 'postgres', 'redis'],
    services: ['Orders.Api', 'worker'],
    httpServices: ['Orders.Api'],
    deployments: [],
    requiredGapFragments: ['RabbitMQ-compatible AMQP broker']
  },
  'bun-hono-drizzle': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['postgres', 'redis'],
    services: ['api', 'scheduler', 'worker'],
    httpServices: ['api'],
    deployments: []
  },
  'cdk-orders-platform': {
    resources: {
      bucket: 1,
      'dynamo-db-table': 1,
      function: 6,
      'http-api-gateway': 1,
      'sns-topic': 1,
      'sqs-queue': 1
    },
    dependencies: ['dynamodb', 'object-storage', 'queue', 'topic'],
    services: [
      'createOrderFunction',
      'getOrderFunction',
      'invoiceUploadedFunction',
      'listOrdersFunction',
      'processOrderFunction',
      'reconciliationFunction'
    ],
    httpServices: [],
    deployments: ['aws-cdk'],
    requiredGapFragments: ['AWS CDK deployment files', 'no event that invokes it']
  },
  'cloudflare-workers-saas': {
    resources: {},
    dependencies: [],
    services: [],
    httpServices: [],
    deployments: ['cloudflare-workers'],
    requiredGapFragments: ['cannot translate those APIs', 'D1, R2, Queue, Durable Object']
  },
  'compose-polyglot-commerce': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 2,
      'worker-service': 1
    },
    dependencies: ['email', 'postgres', 'redis'],
    services: ['polyglot-commerce-api', 'proxy', 'worker'],
    httpServices: ['polyglot-commerce-api', 'proxy'],
    deployments: [],
    requiredGapFragments: ['Sending email uses SES']
  },
  'deno-fresh-jobs-platform': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['postgres', 'redis'],
    services: ['scheduler', 'web', 'worker'],
    httpServices: ['web'],
    deployments: []
  },
  'django-channels-platform': {
    resources: {
      bastion: 1,
      bucket: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['object-storage', 'postgres', 'redis'],
    services: ['scheduler', 'web', 'worker'],
    httpServices: ['web'],
    deployments: [],
    forbiddenGapFragments: ['AWS_STORAGE_BUCKET_NAME points at something we are not creating']
  },
  'fly-go-multiprocess': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 1
    },
    dependencies: ['postgres', 'redis'],
    services: ['flyGoMultiprocessApp', 'flyGoMultiprocessAppWorker'],
    httpServices: ['flyGoMultiprocessApp'],
    deployments: ['fly'],
    requiredGapFragments: ['Fly.io deployment config']
  },
  'go-grpc-gateway-platform': {
    resources: { bastion: 1, 'relational-database': 1, 'web-service': 1, 'worker-service': 1 },
    dependencies: ['nats', 'postgres'],
    services: ['api', 'worker'],
    httpServices: ['api'],
    deployments: [],
    requiredGapFragments: ['NATS-compatible broker'],
    forbiddenGapFragments: ['SQS-compatible broker']
  },
  'helm-payments-platform': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['postgres', 'redis'],
    services: ['helm-payments-platform', 'scheduler', 'worker'],
    httpServices: ['helm-payments-platform'],
    deployments: ['kubernetes'],
    requiredGapFragments: ['Kubernetes deployment config']
  },
  'heroku-rails-sidekiq': {
    resources: {
      bastion: 1,
      bucket: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 1
    },
    dependencies: ['object-storage', 'postgres', 'redis'],
    services: ['heroku-rails-sidekiq', 'worker'],
    httpServices: ['heroku-rails-sidekiq'],
    deployments: ['heroku'],
    requiredGapFragments: ['Heroku deployment config']
  },
  'laravel-agency-portal': {
    resources: {
      bastion: 1,
      bucket: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['object-storage', 'postgres', 'redis'],
    services: ['scheduler', 'web', 'worker'],
    httpServices: ['web'],
    deployments: []
  },
  'nestjs-operations-monorepo': {
    resources: {
      bastion: 1,
      bucket: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['object-storage', 'postgres', 'redis'],
    services: ['api', 'scheduler', 'worker'],
    httpServices: ['api'],
    deployments: [],
    requiredGapFragments: ['did not wire the command']
  },
  'nixpacks-fastapi-celery': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['postgres', 'redis'],
    services: ['nixpacks-fastapi-celery', 'scheduler', 'worker'],
    httpServices: ['nixpacks-fastapi-celery'],
    deployments: ['railway'],
    requiredGapFragments: ['Railway deployment config']
  },
  'phoenix-oban-platform': {
    resources: { bastion: 1, bucket: 1, 'relational-database': 1, 'web-service': 1, 'worker-service': 1 },
    dependencies: ['object-storage', 'postgres'],
    services: ['web', 'worker'],
    httpServices: ['web'],
    deployments: []
  },
  'pulumi-typescript-serverless': {
    resources: {},
    dependencies: ['dynamodb', 'object-storage', 'queue', 'topic'],
    services: [],
    httpServices: [],
    deployments: ['pulumi'],
    requiredGapFragments: ['orphaned queues', 'Add the functions and triggers explicitly']
  },
  'rails-hotwire-platform': {
    resources: {
      bastion: 1,
      bucket: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['object-storage', 'postgres', 'redis'],
    services: ['rails-hotwire-platform', 'scheduler', 'worker'],
    httpServices: ['rails-hotwire-platform'],
    deployments: []
  },
  'render-django-operations': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 2
    },
    dependencies: ['postgres', 'redis'],
    services: ['djangoOpsScheduler', 'djangoOpsWeb', 'djangoOpsWorker'],
    httpServices: ['djangoOpsWeb'],
    deployments: ['render'],
    requiredGapFragments: ['Render deployment config']
  },
  'rust-nats-orders': {
    resources: { bastion: 1, 'relational-database': 1, 'web-service': 1, 'worker-service': 1 },
    dependencies: ['nats', 'postgres'],
    services: ['web', 'worker'],
    httpServices: ['web'],
    deployments: [],
    requiredGapFragments: ['NATS-compatible broker'],
    forbiddenGapFragments: ['SQS-compatible broker']
  },
  'sam-media-pipeline': {
    resources: {
      bucket: 1,
      'dynamo-db-table': 1,
      function: 5,
      'http-api-gateway': 1,
      'sns-topic': 1,
      'sqs-queue': 1
    },
    dependencies: ['dynamodb', 'object-storage', 'queue', 'topic'],
    services: ['cleanupScheduler', 's3Processor', 'sqsConsumer', 'streamHandler', 'uploadTicket'],
    httpServices: [],
    deployments: ['aws-sam'],
    requiredGapFragments: ['DynamoDB event whose resource could not be resolved', 'AWS SAM deployment files']
  },
  'serverless-event-pipeline': {
    resources: { bucket: 1, 'dynamo-db-table': 2, function: 9, 'http-api-gateway': 1, 'sqs-queue': 2 },
    dependencies: ['dynamodb', 'dynamodb', 'object-storage', 'queue', 'queue'],
    services: [
      'cleanupCron',
      'createJob',
      'processDynamoStream',
      'processQueue',
      'processS3Upload',
      'wsAuthorizer',
      'wsConnect',
      'wsDisconnect',
      'wsMessage'
    ],
    httpServices: [],
    deployments: ['serverless-framework'],
    requiredGapFragments: ['WebSocket route', 'Serverless Framework deployment files'],
    forbiddenGapFragments: [
      'AUDIT_BUCKET points at something we are not creating',
      'JOBS_TABLE points at something we are not creating',
      'WS_CONNECTIONS_TABLE points at something we are not creating'
    ]
  },
  'spring-events-service': {
    resources: {
      bastion: 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 1
    },
    dependencies: ['amqp', 'postgres', 'redis'],
    services: ['web', 'worker'],
    httpServices: ['web'],
    deployments: [],
    requiredGapFragments: ['RabbitMQ-compatible AMQP broker']
  },
  'sst-support-platform': {
    resources: { bucket: 1, 'dynamo-db-table': 1, function: 1, 'sqs-queue': 1 },
    dependencies: ['dynamodb', 'object-storage', 'queue'],
    services: ['staleTicketCleanup'],
    httpServices: [],
    deployments: ['sst'],
    requiredGapFragments: ['SST deployment files']
  },
  'terraform-lambda-pipeline': {
    resources: {
      bucket: 1,
      'dynamo-db-table': 1,
      function: 5,
      'http-api-gateway': 1,
      'sns-topic': 1,
      'sqs-queue': 1
    },
    dependencies: ['dynamodb', 'object-storage', 'queue', 'topic'],
    services: ['apiHandler', 's3Processor', 'scheduledWorker', 'sqsProcessor', 'streamProcessor'],
    httpServices: [],
    deployments: ['terraform'],
    requiredGapFragments: ['no event that invokes it', 'Terraform deployment files']
  },
  'turbo-saas-monorepo': {
    resources: {
      bastion: 1,
      'nextjs-web': 1,
      'redis-cluster': 1,
      'relational-database': 1,
      'web-service': 1,
      'worker-service': 1
    },
    dependencies: ['postgres', 'redis'],
    services: ['api', 'web', 'worker'],
    httpServices: ['api', 'web'],
    deployments: []
  }
} satisfies Readonly<Record<string, SyntheticProjectExpectation>>;
