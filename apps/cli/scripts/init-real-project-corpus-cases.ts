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
      resourceTypes: { 'hosting-bucket': 1, 'relational-database': 1, 'web-service': 1 },
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
      resourceTypes: { 'relational-database': 1, 'web-service': 2 },
      dependencyKinds: { mysql: 1 },
      serviceCount: 2,
      httpServiceCount: 2,
      existingDeployments: [],
      requiredConfig: ["$Secret('docker-react-express-mysql-mainDatabase.password')", '- mainDatabase'],
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
      resourceTypes: { 'relational-database': 1 },
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
      resourceTypes: { 'relational-database': 1, 'web-service': 1 },
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
  }
] as const;
