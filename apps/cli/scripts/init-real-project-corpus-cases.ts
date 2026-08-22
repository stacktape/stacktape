import { REAL_PROJECT_APPLICATION_CASES } from './init-real-project-corpus-application-cases';
import { REAL_PROJECT_PLATFORM_CASES } from './init-real-project-corpus-platform-cases';
export { REAL_PROJECT_APPLICATION_STRESS_CASES } from './init-real-project-corpus-application-cases';
export { REAL_PROJECT_PLATFORM_STRESS_CASES } from './init-real-project-corpus-platform-cases';

/**
 * Public repositories used by the release-grade `stacktape init` importer corpus.
 *
 * These are deliberately not copied into this repository. The runner checks out the exact commit,
 * copies the selected project into an isolated temporary directory, and exercises the real
 * terminal init entry point. Pinning commits makes a failure attributable to Stacktape rather than
 * to an upstream repository changing underneath a release check.
 */

export type RealProjectCorpusExpectation = {
  /** Exact generated resource counts by Stacktape resource type. */
  resourceTypes: Readonly<Record<string, number>>;
  /** Exact dependency fact counts by portable dependency kind. */
  dependencyKinds?: Readonly<Record<string, number>>;
  serviceCount: number;
  httpServiceCount: number;
  /** Exact set of deployment tools declared by the project. A declaration is not proof of a live deployment. */
  existingDeployments?: readonly string[];
  requiredConfig?: readonly string[];
  forbiddenConfig?: readonly string[];
  /** Case-insensitive regular expressions matched against a gap's subject and message. */
  requiredGapPatterns?: readonly string[];
  forbiddenGapPatterns?: readonly string[];
  /** Static manifests in this corpus must never be reported as evidence that a dependency is live. */
  forbidCurrentlyHostedDependencies?: boolean;
};

export type RealProjectCorpusCase = {
  id: string;
  repository: string;
  commit: string;
  /** Directory in the upstream repository that is itself a runnable project. */
  subdirectory?: string;
  source: 'official-starter' | 'official-example' | 'real-application';
  exercises: readonly string[];
  expect: RealProjectCorpusExpectation;
};

export const REAL_PROJECT_CORPUS: readonly RealProjectCorpusCase[] = [
  {
    id: 'render-express-hello-world',
    repository: 'https://github.com/render-examples/express-hello-world.git',
    commit: '039c34770852fb07cef7f9f0f8534c5de408b207',
    source: 'official-starter',
    exercises: ['render', 'node', 'web-service'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['render'],
      forbiddenConfig: ['name: NODE_ENV'],
      requiredGapPatterns: ['Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'render-full-stack-fastapi',
    repository: 'https://github.com/render-examples/full-stack-fastapi-template.git',
    commit: '40d67481ff89b3dd3b79b06b4daf68bb55d63285',
    source: 'official-starter',
    exercises: ['render', 'nested-blueprint', 'docker', 'static-site', 'postgres', 'monorepo'],
    expect: {
      resourceTypes: { bastion: 1, 'hosting-bucket': 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      existingDeployments: ['render'],
      requiredConfig: [
        'entryfilePath: backend/app/main.py:app',
        'uploadDirectoryPath: frontend/dist',
        'executeCommand: alembic upgrade head',
        "$Secret('render-full-stack-fastapi-mainDatabase.password')"
      ],
      forbiddenConfig: ['type: worker-service'],
      requiredGapPatterns: ['Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'heroku-node-getting-started',
    repository: 'https://github.com/heroku/node-js-getting-started.git',
    commit: '63c6674c478b697fc20a6412c78a5f7a2dcf14be',
    source: 'official-starter',
    exercises: ['procfile', 'app-json', 'node', 'web-service', 'declared-vs-live'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      requiredConfig: ['entryfilePath: index.js'],
      forbiddenGapPatterns: ['Heroku|deploys to Heroku today|already running'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'fly-remix',
    repository: 'https://github.com/fly-apps/hello-remix.git',
    commit: 'b12a6b1fb5522478360dd7a7e93cbe1643cd48d6',
    source: 'official-example',
    exercises: ['fly', 'legacy-services', 'remix', 'web-service'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['fly'],
      forbiddenConfig: ['name: PORT'],
      requiredGapPatterns: ['Fly\\.io deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-node-express',
    repository: 'https://github.com/railwayapp-templates/node-express.git',
    commit: '52888d7a6c4de6c2d73bb885e6600c2bfd01d781',
    source: 'official-starter',
    exercises: ['railway', 'node', 'web-service', 'env-sample'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-nginx-node-redis',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'nginx-nodejs-redis',
    source: 'official-example',
    exercises: ['docker-compose', 'multiple-services', 'redis', 'dockerfiles'],
    expect: {
      resourceTypes: { 'redis-cluster': 1, 'web-service': 3 },
      dependencyKinds: { redis: 1 },
      serviceCount: 3,
      httpServiceCount: 3,
      existingDeployments: [],
      requiredConfig: ['connectTo:', '- cache'],
      requiredGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-react-express-mysql',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'react-express-mysql',
    source: 'official-example',
    exercises: ['docker-compose', 'multiple-services', 'mysql', 'static-site'],
    expect: {
      resourceTypes: { bastion: 1, 'hosting-bucket': 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { mysql: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      existingDeployments: [],
      requiredConfig: [
        "$Secret('docker-react-express-mysql-mainDatabase.password')",
        '- mainDatabase',
        'uploadDirectoryPath:'
      ],
      forbiddenConfig: ['type: mongo-db-atlas-cluster', 'name: NODE_ENV'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-nginx-flask-mongo',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'nginx-flask-mongo',
    source: 'official-example',
    exercises: ['docker-compose', 'multiple-services', 'mongodb', 'python'],
    expect: {
      resourceTypes: { 'mongo-db-atlas-cluster': 1, 'web-service': 1 },
      dependencyKinds: { mongodb: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      requiredConfig: ['entryfilePath: flask/server.py:app', '- mainDatabase'],
      requiredGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-node-dynamodb-rest',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-rest-api-with-dynamodb',
    source: 'official-example',
    exercises: ['serverless-framework', 'http', 'lambda', 'dynamodb'],
    expect: {
      resourceTypes: { 'dynamo-db-table': 1, function: 5, 'http-api-gateway': 1 },
      dependencyKinds: { dynamodb: 1 },
      serviceCount: 5,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: [
        'method: POST\n            path: /todos',
        'method: DELETE\n            path: /todos/{id}',
        "value: $ResourceParam('mainTable', 'name')"
      ],
      forbiddenConfig: ["$Secret('dynamodb_table')"],
      requiredGapPatterns: ['Serverless Framework deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-node-sqs-worker',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-sqs-worker',
    source: 'official-example',
    exercises: ['serverless-framework', 'lambda', 'sqs'],
    expect: {
      resourceTypes: { function: 2, 'http-api-gateway': 1, 'sqs-queue': 1 },
      dependencyKinds: { queue: 1 },
      serviceCount: 2,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: [
        'method: POST\n            path: /produce',
        'type: sqs\n          properties:\n            sqsQueueName: jobQueue',
        "value: $ResourceParam('jobQueue', 'url')"
      ],
      requiredGapPatterns: ['Serverless Framework deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-node-scheduled-cron',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-scheduled-cron',
    source: 'official-example',
    exercises: ['serverless-framework', 'lambda', 'schedule'],
    expect: {
      resourceTypes: { function: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: ['scheduleRate: rate(1 minute)'],
      requiredGapPatterns: ['Serverless Framework deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-sqs-lambda-node',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'sqs-lambda-nodejs-sam',
    source: 'official-example',
    exercises: ['aws-sam', 'lambda', 'sqs'],
    expect: {
      resourceTypes: { function: 1, 'sqs-queue': 2 },
      dependencyKinds: { queue: 2 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredConfig: ['entryfilePath: src/app.mjs', 'sqsQueueName: processingQueue', '- processingDLQ'],
      requiredGapPatterns: ['AWS SAM deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-api-lambda-dynamodb-java',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'apigw-lambda-dynamodb-sam-java',
    source: 'official-example',
    exercises: ['aws-sam', 'lambda', 'http', 'dynamodb', 'java'],
    expect: {
      resourceTypes: { 'dynamo-db-table': 1, function: 1, 'http-api-gateway': 1 },
      dependencyKinds: { dynamodb: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredConfig: ['entryfilePath: src/main/java/com/example/TicketFunction.java', 'method: POST', 'path: /ticket'],
      requiredGapPatterns: ['AWS SAM deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'terraform-api-lambda-dynamodb',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'apigw-lambda-dynamodb-terraform',
    source: 'official-example',
    exercises: ['terraform', 'lambda', 'http', 'dynamodb'],
    expect: {
      resourceTypes: { 'dynamo-db-table': 1, function: 1, 'http-api-gateway': 1 },
      dependencyKinds: { dynamodb: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['terraform'],
      requiredConfig: [
        'entryfilePath: src/app.py',
        'method: POST',
        'path: /movies',
        "value: $ResourceParam('mainTable', 'name')"
      ],
      forbiddenConfig: ['type: bucket'],
      requiredGapPatterns: ['Terraform deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sst-v3-monorepo-template',
    repository: 'https://github.com/anomalyco/monorepo-template.git',
    commit: 'f9c5b5a1c6e283e5a2307713d6a5588f34a00219',
    source: 'official-starter',
    exercises: ['sst-ion', 'monorepo', 'http', 'lambda', 'bucket'],
    expect: {
      resourceTypes: { bucket: 1, function: 1, 'http-api-gateway': 1 },
      dependencyKinds: { 'object-storage': 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['sst'],
      requiredConfig: [
        'entryfilePath: packages/functions/src/api.ts',
        'method: "*"',
        'path: /{proxy+}',
        '- storageBucket'
      ],
      requiredGapPatterns: ['SST deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'cdk-api-lambda-dynamodb',
    repository: 'https://github.com/aws-samples/aws-cdk-examples.git',
    commit: 'bccff1d2775e4b0bf777721c6b41c0107e122f73',
    subdirectory: 'typescript/api-cors-lambda-crud-dynamodb',
    source: 'official-example',
    exercises: ['aws-cdk', 'lambda', 'http', 'dynamodb', 'typescript'],
    expect: {
      resourceTypes: { 'dynamo-db-table': 1, function: 5, 'http-api-gateway': 1 },
      dependencyKinds: { dynamodb: 1 },
      serviceCount: 5,
      httpServiceCount: 0,
      existingDeployments: ['aws-cdk'],
      requiredConfig: [
        'method: GET\n            path: /items/{id}',
        'method: GET\n            path: /items',
        'method: POST\n            path: /items',
        'method: PATCH\n            path: /items/{id}',
        'method: DELETE\n            path: /items/{id}',
        "value: $ResourceParam('mainTable', 'name')"
      ],
      forbiddenConfig: ["$Secret('table_name')"],
      requiredGapPatterns: ['AWS CDK deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'terraform-rds-tutorial',
    repository: 'https://github.com/hashicorp/learn-terraform-rds.git',
    commit: '8681725fc66b4932873b8dde4d1727df4c30b9dc',
    source: 'official-example',
    exercises: ['terraform', 'rds', 'variables'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 0,
      httpServiceCount: 0,
      existingDeployments: ['terraform'],
      requiredGapPatterns: ['Terraform deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'vercel-next-postgres-auth',
    repository: 'https://github.com/vercel/nextjs-postgres-auth-starter.git',
    commit: 'fde8ecf1da9337223081f70cf88b420060039d6e',
    source: 'official-starter',
    exercises: ['vercel', 'nextjs', 'postgres', 'env-example'],
    expect: {
      resourceTypes: { 'nextjs-web': 1, 'relational-database': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      requiredConfig: ["value: $ResourceParam('mainDatabase', 'connectionString')", '- mainDatabase'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'nestjs-procfile-release',
    repository: 'https://github.com/brocoders/nestjs-boilerplate.git',
    commit: '9620f159eefe38f47747d02ab162852367c5472c',
    source: 'real-application',
    exercises: ['procfile', 'release-migration', 'worker', 'postgres', 'mongodb', 'declared-vs-live'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { email: 1, postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      requiredConfig: [
        'type: custom-dockerfile',
        'executeCommand: npm run migration:run',
        'afterDeploy:',
        "$Secret('nestjs-procfile-release-mainDatabase.password')"
      ],
      forbiddenConfig: [
        'type: mongo-db-atlas-cluster',
        'type: bucket',
        'type: redis-cluster',
        'type: worker-service',
        'Maildev',
        'executeCommand: echo',
        'migration:seed',
        "$Secret('nestjs-procfile-release.mainDatabase.password')"
      ],
      requiredGapPatterns: ['Sending email uses SES'],
      forbiddenGapPatterns: ['Heroku|deploys to Heroku today|already running'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-fastify-bullmq',
    repository: 'https://github.com/railwayapp-templates/fastify-bullmq.git',
    commit: '01414b40a853b5bfb065bcb60952848e13db58c5',
    source: 'official-starter',
    exercises: ['railway', 'fastify', 'bullmq', 'redis', 'background-jobs'],
    expect: {
      resourceTypes: { 'redis-cluster': 1, 'web-service': 1, 'worker-service': 1 },
      dependencyKinds: { redis: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      requiredGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-monorepo-example',
    repository: 'https://github.com/railwayapp-templates/monorepo-example.git',
    commit: 'e999b1fde8a50c44b1056cf77bce2c64d421cf65',
    source: 'official-starter',
    exercises: ['railway', 'monorepo', 'multiple-services', 'node'],
    expect: {
      resourceTypes: { 'hosting-bucket': 1, 'web-service': 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      requiredConfig: ['uploadDirectoryPath: frontend/dist', 'entryfilePath: backend/main.go'],
      requiredGapPatterns: ['VITE_BACKEND_HOST.*build argument'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-nextjs-prisma',
    repository: 'https://github.com/railwayapp-templates/nextjs-prisma.git',
    commit: '764e19f32760a2b9b6be5277859f1d16ee0b6398',
    source: 'official-starter',
    exercises: ['railway', 'nextjs', 'prisma', 'postgres'],
    expect: {
      resourceTypes: { 'nextjs-web': 1, 'relational-database': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredConfig: ['name: DATABASE_URL', "$ResourceParam('mainDatabase', 'connectionString')"],
      forbiddenGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-django',
    repository: 'https://github.com/railwayapp-templates/django.git',
    commit: '9c630a47d4a2988c7b7b596574ae01f95f5ee3a9',
    source: 'official-starter',
    exercises: ['railway', 'django', 'python', 'postgres'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['railway'],
      requiredGapPatterns: ['Railway deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-laravel',
    repository: 'https://github.com/railwayapp-templates/laravel.git',
    commit: '30b9ee74b5d5d6228b72bd852e1c8a4bea55bb81',
    source: 'official-starter',
    exercises: ['railway', 'laravel', 'php', 'postgres'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredConfig: ['name: APP_URL', "$ResourceParam('railwayLaravel', 'url')"],
      forbiddenConfig: ['type: sqs-queue', 'type: redis-cluster', 'type: bucket', 'name: QUEUE_CONNECTION'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-ruby-rails',
    repository: 'https://github.com/railwayapp-templates/ruby-rails.git',
    commit: '619fbaf1af67af1e60365c9f190a873b6d7a3d5b',
    source: 'official-starter',
    exercises: ['railway', 'rails', 'ruby', 'postgres'],
    expect: {
      resourceTypes: { bastion: 1, 'redis-cluster': 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1, redis: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredConfig: ['name: DATABASE_URL', 'name: REDIS_URL'],
      forbiddenGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-java-spring-boot',
    repository: 'https://github.com/railwayapp-templates/java-spring-boot.git',
    commit: '4f57b477a985d9cc1e67a30ea70e6aa20e7fadf4',
    source: 'official-starter',
    exercises: ['railway', 'spring-boot', 'java', 'gradle'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-go-mux',
    repository: 'https://github.com/railwayapp-templates/go-mux.git',
    commit: '8b198c33fbf7e0b274decc763a8cbd3649aa329b',
    source: 'official-starter',
    exercises: ['railway', 'go', 'gorilla-mux', 'web-service'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'railway-svelte-kit',
    repository: 'https://github.com/railwayapp-templates/svelte-kit.git',
    commit: 'bbc5c6a6f842b6c21dd3e1d3db6b42f847e09f07',
    source: 'official-starter',
    exercises: ['railway', 'sveltekit', 'typescript', 'ssr'],
    expect: {
      resourceTypes: { 'sveltekit-web': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'render-celery',
    repository: 'https://github.com/render-examples/celery.git',
    commit: 'ec6cac1ecd99b5adcd95e1061eb40c07507e366e',
    source: 'official-example',
    exercises: ['render', 'python', 'celery', 'redis', 'background-worker'],
    expect: {
      resourceTypes: { 'redis-cluster': 1, 'web-service': 2, 'worker-service': 1 },
      dependencyKinds: { amqp: 1, redis: 1 },
      serviceCount: 3,
      httpServiceCount: 2,
      existingDeployments: ['render'],
      requiredGapPatterns: ['RabbitMQ-compatible AMQP broker', 'Render deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-fastapi',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'fastapi',
    source: 'official-example',
    exercises: ['docker-compose', 'fastapi', 'python', 'dockerfile'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-flask-redis',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'flask-redis',
    source: 'official-example',
    exercises: ['docker-compose', 'flask', 'python', 'redis'],
    expect: {
      resourceTypes: { 'redis-cluster': 1, 'web-service': 1 },
      dependencyKinds: { redis: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-nginx-golang-postgres',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'nginx-golang-postgres',
    source: 'official-example',
    exercises: ['docker-compose', 'go', 'nginx', 'postgres', 'multiple-services'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredGapPatterns: ['does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-react-express-mongodb',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'react-express-mongodb',
    source: 'official-example',
    exercises: ['docker-compose', 'react', 'express', 'mongodb', 'multiple-services'],
    expect: {
      resourceTypes: { 'hosting-bucket': 1, 'mongo-db-atlas-cluster': 1, 'web-service': 1 },
      dependencyKinds: { mongodb: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      requiredConfig: ['type: hosting-bucket', 'type: web-service'],
      requiredGapPatterns: ['MongoDB Atlas.*separate service', 'PUBLIC_URL.*build argument'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'docker-spring-postgres',
    repository: 'https://github.com/docker/awesome-compose.git',
    commit: '30f4b7f6a6c3b0c0ecf4d4efb0de203c48d11562',
    subdirectory: 'spring-postgres',
    source: 'official-example',
    exercises: ['docker-compose', 'spring', 'java', 'postgres'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredGapPatterns: ['POSTGRES_DB.*deployment file', 'does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-python-http-dynamodb',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-python-http-api-with-dynamodb',
    source: 'official-example',
    exercises: ['serverless-framework', 'python', 'http', 'dynamodb'],
    expect: {
      resourceTypes: { 'dynamo-db-table': 1, function: 5, 'http-api-gateway': 1 },
      dependencyKinds: { dynamodb: 1 },
      serviceCount: 5,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: ["value: $ResourceParam('mainTable', 'name')", 'path: /todos/{id}'],
      requiredGapPatterns: ['Serverless Framework deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-node-dynamodb-stream',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-dynamodb-stream-processing',
    source: 'official-example',
    exercises: ['serverless-framework', 'node', 'dynamodb-stream', 'lambda'],
    expect: {
      resourceTypes: { bucket: 1, function: 1 },
      dependencyKinds: { 'object-storage': 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredGapPatterns: ['no event that invokes it', 'Serverless Framework deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-node-s3-replicator',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-s3-file-replicator',
    source: 'official-example',
    exercises: ['serverless-framework', 'node', 's3-event', 'object-storage'],
    expect: {
      resourceTypes: { bucket: 2, function: 1 },
      dependencyKinds: { 'object-storage': 2 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: [
        "bucketArn: $ResourceParam('inputBucket', 'arn')",
        "value: $ResourceParam('outputBucket', 'name')"
      ],
      forbiddenGapPatterns: ['no event that invokes it|cannot translate that trigger'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-typescript-kinesis',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-typescript-kinesis',
    source: 'official-example',
    exercises: ['serverless-framework', 'typescript', 'kinesis', 'stream-consumer'],
    expect: {
      resourceTypes: { function: 2, 'http-api-gateway': 1 },
      serviceCount: 2,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredGapPatterns: ['Kinesis or DynamoDB stream event.*cannot translate'],
      forbiddenGapPatterns: ['consumer handler but no event'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-python-sqs-worker',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-python-sqs-worker',
    source: 'official-example',
    exercises: ['serverless-framework', 'python', 'sqs', 'worker'],
    expect: {
      resourceTypes: { function: 2, 'http-api-gateway': 1, 'sqs-queue': 1 },
      dependencyKinds: { queue: 1 },
      serviceCount: 2,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredConfig: ['name: QUEUE_URL', 'sqsQueueName: jobQueue'],
      forbiddenConfig: ["$Secret('queue_url')"],
      forbiddenGapPatterns: ['QUEUE_URL is set in a deployment file|no event that invokes'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'serverless-node-websocket-authorizers',
    repository: 'https://github.com/serverless/examples.git',
    commit: '1e693205d58365f71502d5e035fef6cb2bb88f4d',
    subdirectory: 'aws-node-websockets-authorizers',
    source: 'official-example',
    exercises: ['serverless-framework', 'node', 'websocket', 'authorizer'],
    expect: {
      resourceTypes: { function: 3 },
      serviceCount: 3,
      httpServiceCount: 0,
      existingDeployments: ['serverless-framework'],
      requiredGapPatterns: ['connect.*WebSocket route.*cannot translate', 'default.*WebSocket route.*cannot translate'],
      forbiddenGapPatterns: ['connect handler but no event|default handler but no event'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-eventbridge-schedule-lambda',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'eventbridge-schedule-to-lambda-sam-go',
    source: 'official-example',
    exercises: ['aws-sam', 'eventbridge-scheduler', 'lambda', 'go', 'scheduled'],
    expect: {
      resourceTypes: { function: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredConfig: ['scheduleRate: rate(5 minute)', 'entryfilePath: src/main.go'],
      forbiddenGapPatterns: ['no event that invokes|cannot translate that trigger'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-lambda-s3-files',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'lambda-s3-files-sam',
    source: 'official-example',
    exercises: ['aws-sam', 'lambda', 's3-event', 'object-storage'],
    expect: {
      resourceTypes: { bucket: 1, function: 1 },
      dependencyKinds: { 'object-storage': 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredGapPatterns: ['no event that invokes it', 'AWS SAM deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-kinesis-firehose-api',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'kinesis-data-stream-firehose-apigw-sam',
    source: 'official-example',
    exercises: ['aws-sam', 'kinesis', 'firehose', 'api-gateway', 'streaming'],
    expect: {
      resourceTypes: { function: 2, 'http-api-gateway': 1 },
      serviceCount: 2,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredGapPatterns: ['lambdaAuthorizer handler but no event', 'AWS SAM deployment files'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'sam-api-fifo-sqs-lambda-sns',
    repository: 'https://github.com/aws-samples/serverless-patterns.git',
    commit: 'c407694899b1bfa4575b76e106e259e44d0a15fb',
    subdirectory: 'apigw-http-api-fifo-sqs-lambda-sns-sam',
    source: 'official-example',
    exercises: ['aws-sam', 'http', 'fifo-sqs', 'lambda', 'sns', 'event-driven'],
    expect: {
      resourceTypes: { function: 1, 'sns-topic': 1, 'sqs-queue': 1 },
      dependencyKinds: { queue: 1, topic: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['aws-sam'],
      requiredConfig: ['sqsQueueName: mySQSQueue', 'type: sns-topic'],
      forbiddenGapPatterns: ['no event that invokes'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'cdk-s3-sns-lambda-chain',
    repository: 'https://github.com/aws-samples/aws-cdk-examples.git',
    commit: 'bccff1d2775e4b0bf777721c6b41c0107e122f73',
    subdirectory: 'typescript/s3-sns-lambda-chain',
    source: 'official-example',
    exercises: ['aws-cdk', 's3', 'sns', 'lambda', 'event-chain'],
    expect: {
      resourceTypes: { bucket: 1, function: 1, 'sns-topic': 1, 'sqs-queue': 1 },
      dependencyKinds: { 'object-storage': 1, queue: 1, topic: 1 },
      serviceCount: 1,
      httpServiceCount: 0,
      existingDeployments: ['aws-cdk'],
      requiredConfig: ['sqsQueueName: csvUploadQueue'],
      forbiddenGapPatterns: ['no event that invokes'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-umami',
    repository: 'https://github.com/umami-software/umami.git',
    commit: 'de474a1da915d4666768cad0af0bed5b3449d661',
    source: 'real-application',
    exercises: ['real-saas', 'nextjs', 'postgres', 'prisma', 'docker'],
    expect: {
      resourceTypes: { bastion: 1, 'nextjs-web': 1, 'redis-cluster': 1, 'relational-database': 1 },
      dependencyKinds: { kafka: 1, postgres: 1, redis: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: ['heroku', 'netlify'],
      requiredConfig: ['name: DATABASE_URL', 'type: nextjs-web'],
      requiredGapPatterns: ['Managed Kafka', 'Netlify deployment config', 'Heroku deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-maybe-finance',
    repository: 'https://github.com/maybe-finance/maybe.git',
    commit: '77b5469832758d1cbee1a940f3012a1ae1c74cd3',
    source: 'real-application',
    exercises: ['real-saas', 'rails', 'postgres', 'redis', 'background-worker', 'docker-compose'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-formbricks',
    repository: 'https://github.com/formbricks/formbricks.git',
    commit: '9eac5fdd258a371cac1000c31a0f0cb83aaafb36',
    source: 'real-application',
    exercises: ['real-saas', 'nextjs', 'monorepo', 'postgres', 'redis', 'prisma'],
    expect: {
      resourceTypes: {
        bastion: 1,
        bucket: 1,
        'nextjs-web': 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'worker-service': 1
      },
      dependencyKinds: { email: 1, 'object-storage': 1, postgres: 1, redis: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      existingDeployments: ['kubernetes'],
      requiredConfig: ['type: nextjs-web', 'type: worker-service'],
      forbiddenConfig: ['type: hosting-bucket', 'packages/database/src/scripts/wait-for-database.test.ts'],
      requiredGapPatterns: ['Kubernetes deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-boxyhq-saas-starter',
    repository: 'https://github.com/boxyhq/saas-starter-kit.git',
    commit: 'abc9b686823cbfb4973c79bc36fea37a3244be6c',
    source: 'real-application',
    exercises: ['saas-starter', 'nextjs', 'postgres', 'prisma', 'authentication', 'multi-tenant'],
    expect: {
      resourceTypes: { 'nextjs-web': 1, 'relational-database': 1 },
      dependencyKinds: { email: 1, postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      requiredConfig: ['name: DATABASE_URL', 'name: APP_URL', "$ResourceParam('saasStarterKit', 'url')"],
      forbiddenConfig: ["$Secret('app_url')"],
      forbiddenGapPatterns: ['APP_URL is set in a deployment file|does not read a configurable address'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  ...REAL_PROJECT_PLATFORM_CASES,
  ...REAL_PROJECT_APPLICATION_CASES
] as const;
