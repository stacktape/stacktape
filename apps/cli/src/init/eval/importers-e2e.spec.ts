/**
 * Synthetic repositories exercising each importer through the complete init pipeline.
 *
 * Probe specs protect parsing details. These protect the user outcome: after every other probe has
 * merged, verification has run, defaults have been applied, and the real composer has produced a
 * config, the imported service still exists once, its trigger still points at a resource that
 * exists, and an old deployment is never mistaken for permission to delete or replace it.
 */

import { describe, expect, it } from 'bun:test';
import { runEvalCase, type EvalCase } from './harness';

const CASES: EvalCase[] = [
  {
    name: 'Fly multi-process app',
    files: {
      'package.json': JSON.stringify({ name: 'shop', dependencies: { fastify: '^5.0.0' } }),
      'fly.toml': [
        'app = "shop-api"',
        '[processes]',
        'web = "node dist/server.js"',
        'jobs = "node dist/jobs.js"',
        '[http_service]',
        'internal_port = 4000',
        'processes = ["web"]',
        ''
      ].join('\n')
    },
    expect: {
      resources: { shopApi: 'web-service', shopApiJobs: 'worker-service' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Docker Compose app plus worker and database',
    files: {
      'package.json': JSON.stringify({ name: 'orders', dependencies: { express: '^5.0.0', pg: '^8.0.0' } }),
      Dockerfile: 'FROM node:24\nRUN apt-get update && apt-get install -y imagemagick\n',
      'compose.yaml': [
        'services:',
        '  web:',
        '    build: .',
        '    command: node dist/server.js',
        '    ports: ["4000:4000"]',
        '    environment:',
        '      DATABASE_URL: postgres://db:5432/orders',
        '  worker:',
        '    build: .',
        '    command: node dist/worker.js',
        '    depends_on: [db]',
        '  db:',
        '    image: postgres:16',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { web: 'web-service', worker: 'worker-service', mainDatabase: 'relational-database' },
      serviceEnvironment: [
        { resource: 'web', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Serverless Framework local queue event',
    files: {
      'serverless.yml': [
        'service: jobs',
        'functions:',
        '  worker:',
        '    handler: src/worker.handler',
        '    events:',
        '      - sqs:',
        '          arn: !GetAtt JobsQueue.Arn',
        'resources:',
        '  Resources:',
        '    JobsQueue:',
        '      Type: AWS::SQS::Queue',
        ''
      ].join('\n'),
      'src/worker.ts': 'export const handler = async () => undefined;'
    },
    expect: {
      dependencyKinds: ['queue'],
      resources: { worker: 'function', jobQueue: 'sqs-queue' },
      deployable: true
    }
  },
  {
    name: 'nested AWS SAM queue event',
    files: {
      'apps/jobs/template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Globals:',
        '  Function:',
        '    Runtime: python3.13',
        '    CodeUri: src/',
        'Resources:',
        '  JobsQueue:',
        '    Type: AWS::SQS::Queue',
        '  WorkerFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Handler: worker.handler',
        '      Events:',
        '        Jobs:',
        '          Type: SQS',
        '          Properties:',
        '            Queue: !GetAtt JobsQueue.Arn',
        ''
      ].join('\n'),
      'apps/jobs/src/worker.py': 'def handler(event, context):\n    return None\n'
    },
    expect: {
      dependencyKinds: ['queue'],
      resources: { worker: 'function', jobsQueue: 'sqs-queue' },
      deployable: true
    }
  },
  {
    name: 'SST Ion route and queue subscriber',
    files: {
      'sst.config.ts': [
        'export default $config({',
        '  app() { return { name: "shop", home: "aws" }; },',
        '  async run() {',
        '    const api = new sst.aws.ApiGatewayV2("Api");',
        '    api.route("POST /orders", "src/orders.create");',
        '    const queue = new sst.aws.Queue("Jobs");',
        '    queue.subscribe("src/worker.handler");',
        '  }',
        '});',
        ''
      ].join('\n'),
      'src/orders.ts': 'export const create = async () => ({ statusCode: 201 });',
      'src/worker.ts': 'export const handler = async () => undefined;'
    },
    expect: {
      dependencyKinds: ['queue'],
      resources: { apiOrders: 'function', jobsSubscriber: 'function', jobQueue: 'sqs-queue' },
      deployable: true
    }
  },
  {
    name: 'CDK HTTP API with table wiring',
    files: {
      'cdk.json': '{}',
      'lib/stack.ts': [
        "import * as cdk from 'aws-cdk-lib';",
        "import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';",
        "import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';",
        "import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';",
        "import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';",
        "import * as path from 'node:path';",
        'const table = new dynamodb.Table(this, "Orders");',
        'const handler = new lambdaNodejs.NodejsFunction(this, "Handler", {',
        '  entry: path.join(__dirname, "../src/handler.ts"),',
        '  environment: { TABLE_NAME: table.tableName }',
        '});',
        'const integration = new HttpLambdaIntegration("Integration", handler);',
        'const api = new HttpApi(this, "Api");',
        'api.addRoutes({ path: "/orders", methods: [HttpMethod.GET], integration });',
        ''
      ].join('\n'),
      'src/handler.ts': 'export const handler = async () => ({ statusCode: 200 });'
    },
    expect: {
      dependencyKinds: ['dynamodb'],
      resources: { handler: 'function', mainTable: 'dynamo-db-table' },
      serviceEnvironment: [{ resource: 'handler', name: 'TABLE_NAME', value: "$ResourceParam('mainTable', 'name')" }],
      deployable: true
    }
  },
  {
    name: 'Terraform literal variables plus a declared database',
    files: {
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node src/server.js' },
        dependencies: { express: '^5.0.0', pg: '^8.0.0' }
      }),
      'src/server.js': 'const url = process.env.DATABASE_URL;\n',
      'infra/variables.tf': 'variable "engine" {\n  default = "postgres"\n}\n',
      'infra/main.tf': [
        'provider "aws" {}',
        'resource "aws_db_instance" "main" {',
        '  engine = var.engine',
        '  instance_class = "db.t4g.small"',
        '}',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { api: 'web-service', mainDatabase: 'relational-database' },
      serviceEnvironment: [
        { resource: 'api', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: true
    }
  }
];

describe('importer synthetic end-to-end corpus', () => {
  for (const evalCase of CASES) {
    it(evalCase.name, async () => {
      const score = await runEvalCase(evalCase);
      if (!score.passed) {
        throw new Error(score.failures.map((failure) => `[${failure.stage}] ${failure.detail}`).join('\n'));
      }
      expect(score.passed).toBe(true);
    });
  }
});
