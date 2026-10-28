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

const jsPackage = JSON.stringify({ name: 'fixture-app', private: true, type: 'module' });
const lines = (...entries: string[]): string => `${entries.join('\n')}\n`;
const serverless = (...functionsAndResources: string[]): string =>
  lines('service: fixture', 'provider:', '  name: aws', '  runtime: nodejs22.x', ...functionsAndResources);
const samTemplate = (...resources: string[]): string =>
  lines('AWSTemplateFormatVersion: "2010-09-09"', 'Transform: AWS::Serverless-2016-10-31', 'Resources:', ...resources);
const samFunction = (handler: string, ...rest: string[]): string[] => [
  '  Api:',
  '    Type: AWS::Serverless::Function',
  '    Properties:',
  '      Runtime: nodejs22.x',
  `      Handler: ${handler}`,
  '      CodeUri: .',
  ...rest
];
const handlerFile = 'export async function handler(event) { return { statusCode: 200 }; }\n';

/**
 * Settings whose loss makes the imported stack less safe than the one it was imported from: a protected route turned
 * public, a disabled job started, a partially failed batch acknowledged, persistent files kept on a disposable disk.
 * Each case is a minimal repository from the r2ss init audit.
 */
const FIDELITY_CASES: EvalCase[] = [
  {
    name: 'Serverless aws_iam route stays IAM-protected',
    files: {
      'package.json': jsPackage,
      'handler.js': handlerFile,
      'serverless.yml': serverless(
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - http:',
        '          path: admin',
        '          method: get',
        '          authorizer: aws_iam'
      )
    },
    expect: {
      resources: { api: 'function', httpApiGateway: 'http-api-gateway' },
      resourceProperties: [
        { resource: 'api', path: 'events.0.properties.path', value: '/admin' },
        { resource: 'api', path: 'events.0.properties.authorizer', value: { type: 'aws-iam' } }
      ]
    }
  },
  {
    name: 'SAM AWS_IAM route stays IAM-protected and keeps its custom export',
    files: {
      'package.json': jsPackage,
      'handler.js': 'export async function main(event) { return { statusCode: 200 }; }\n',
      'template.yaml': samTemplate(
        ...samFunction(
          'handler.main',
          '      Events:',
          '        Read:',
          '          Type: Api',
          '          Properties:',
          '            Path: /hello',
          '            Method: get',
          '            Auth:',
          '              Authorizer: AWS_IAM'
        )
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'api', path: 'events.0.properties.authorizer', value: { type: 'aws-iam' } },
        { resource: 'api', path: 'packaging.properties.handlerFunction', value: 'main' }
      ]
    }
  },
  {
    name: 'a SAM route behind a default Cognito authorizer is left out instead of made public',
    files: {
      'package.json': jsPackage,
      'handler.js': handlerFile,
      'template.yaml': samTemplate(
        '  Gateway:',
        '    Type: AWS::Serverless::Api',
        '    Properties:',
        '      StageName: prod',
        '      Auth:',
        '        DefaultAuthorizer: UsersPool',
        ...samFunction(
          'handler.handler',
          '      Events:',
          '        Read:',
          '          Type: Api',
          '          Properties:',
          '            RestApiId: !Ref Gateway',
          '            Path: /admin',
          '            Method: get'
        )
      )
    },
    expect: {
      resources: { api: 'function' },
      resourceProperties: [{ resource: 'api', path: 'events', value: undefined }],
      gapsInclude: ['GET /admin', 'we left the route out rather than make it public']
    }
  },
  {
    name: 'Serverless partial batch responses reach the SQS trigger',
    files: {
      'package.json': jsPackage,
      'handler.js': lines(
        'export async function handler(event) {',
        '  return { batchItemFailures: event.Records.filter((r) => JSON.parse(r.body).retry).map((r) => ({ itemIdentifier: r.messageId })) };',
        '}'
      ),
      'serverless.yml': serverless(
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - sqs:',
        '          arn: !GetAtt WorkQueue.Arn',
        '          batchSize: 10',
        '          functionResponseType: ReportBatchItemFailures',
        'resources:',
        '  Resources:',
        '    WorkQueue:',
        '      Type: AWS::SQS::Queue',
        '      Properties:',
        '        QueueName: work'
      )
    },
    expect: {
      resources: { api: 'function', jobQueue: 'sqs-queue' },
      resourceProperties: [
        {
          resource: 'api',
          path: 'events.0.properties',
          value: { sqsQueueName: 'jobQueue', batchSize: 10, reportBatchItemFailures: true }
        },
        { resource: 'jobQueue', path: 'fifoEnabled', value: undefined }
      ]
    }
  },
  {
    name: 'a Serverless FIFO queue stays FIFO with content deduplication',
    files: {
      'package.json': jsPackage,
      'handler.js': handlerFile,
      'serverless.yml': serverless(
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - sqs:',
        '          arn: !GetAtt WorkQueue.Arn',
        '          batchSize: 1',
        'resources:',
        '  Resources:',
        '    WorkQueue:',
        '      Type: AWS::SQS::Queue',
        '      Properties:',
        '        QueueName: work.fifo',
        '        FifoQueue: true',
        '        ContentBasedDeduplication: true'
      )
    },
    expect: {
      resources: { jobQueue: 'sqs-queue' },
      resourceProperties: [
        { resource: 'jobQueue', path: 'fifoEnabled', value: true },
        { resource: 'jobQueue', path: 'contentBasedDeduplication', value: true }
      ]
    }
  },
  {
    name: 'Serverless and SAM disabled schedules deploy paused',
    files: {
      'package.json': jsPackage,
      'handler.js': handlerFile,
      'serverless.yml': serverless(
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - schedule:',
        '          rate: rate(5 minutes)',
        '          enabled: false'
      ),
      'jobs/handler.js': handlerFile,
      'jobs/template.yaml': samTemplate(
        '  NightlyFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Runtime: nodejs22.x',
        '      Handler: handler.handler',
        '      CodeUri: .',
        '      Events:',
        '        Tick:',
        '          Type: Schedule',
        '          Properties:',
        '            Schedule: rate(1 hour)',
        '            Enabled: false'
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'api', path: 'events.0.properties', value: { scheduleRate: 'rate(5 minutes)', enabled: false } },
        { resource: 'nightly', path: 'events.0.properties', value: { scheduleRate: 'rate(1 hour)', enabled: false } }
      ]
    }
  },
  {
    name: 'Serverless schedule payloads and every rate survive',
    files: {
      'package.json': jsPackage,
      'handler.js':
        "export async function handler(event) { if (event.operation !== 'settle') throw Error('missing operation'); }\n",
      'serverless.yml': serverless(
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - schedule:',
        '          rate: rate(1 hour)',
        '          input:',
        '            operation: settle',
        '      - schedule:',
        '          rate:',
        '            - cron(0 9 ? * MON-FRI *)',
        '            - cron(0 12 ? * SAT,SUN *)'
      )
    },
    expect: {
      resourceProperties: [
        {
          resource: 'api',
          path: 'events',
          value: [
            { type: 'schedule', properties: { scheduleRate: 'rate(1 hour)', input: { operation: 'settle' } } },
            { type: 'schedule', properties: { scheduleRate: 'cron(0 9 ? * MON-FRI *)' } },
            { type: 'schedule', properties: { scheduleRate: 'cron(0 12 ? * SAT,SUN *)' } }
          ]
        }
      ]
    }
  },
  {
    name: 'Serverless handler exports stay selected in JavaScript and Python',
    files: {
      'package.json': jsPackage,
      'handler.js': lines(
        'export async function read() { return { statusCode: 200 }; }',
        'export async function write() { return { statusCode: 201 }; }'
      ),
      'serverless.yml': serverless(
        'functions:',
        '  read:',
        '    handler: handler.read',
        '    events:',
        '      - httpApi: GET /items',
        '  write:',
        '    handler: handler.write',
        '    events:',
        '      - httpApi: POST /items'
      ),
      'py/requirements.txt': '',
      'py/handler.py': 'def main(event, context):\n    return {"statusCode": 200}\n',
      'py/serverless.yml': lines(
        'service: python',
        'provider:',
        '  name: aws',
        '  runtime: python3.12',
        'functions:',
        '  hello:',
        '    handler: handler.main',
        '    events:',
        '      - httpApi: GET /hello'
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'read', path: 'packaging.properties.handlerFunction', value: 'read' },
        { resource: 'write', path: 'packaging.properties.handlerFunction', value: 'write' },
        { resource: 'hello', path: 'packaging.properties.handlerFunction', value: 'main' }
      ]
    }
  },
  {
    name: 'SAM S3 key filters and Serverless SNS filter policies are kept',
    files: {
      'package.json': jsPackage,
      'handler.js': handlerFile,
      'template.yaml': samTemplate(
        '  Uploads:',
        '    Type: AWS::S3::Bucket',
        ...samFunction(
          'handler.handler',
          '      Events:',
          '        Upload:',
          '          Type: S3',
          '          Properties:',
          '            Bucket: !Ref Uploads',
          '            Events: s3:ObjectCreated:*',
          '            Filter:',
          '              S3Key:',
          '                Rules:',
          '                  - Name: prefix',
          '                    Value: incoming/',
          '                  - Name: suffix',
          '                    Value: .csv'
        )
      ),
      'orders/handler.js': handlerFile,
      'orders/serverless.yml': serverless(
        'functions:',
        '  billing:',
        '    handler: handler.handler',
        '    events:',
        '      - sns:',
        '          arn: !Ref Orders',
        '          filterPolicy:',
        '            kind: [paid]',
        'resources:',
        '  Resources:',
        '    Orders:',
        '      Type: AWS::SNS::Topic',
        '    Refunds:',
        '      Type: AWS::SNS::Topic'
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'api', path: 'events.0.properties.filterRule', value: { prefix: 'incoming/', suffix: '.csv' } },
        { resource: 'billing', path: 'events.0.properties.filterPolicy', value: { kind: ['paid'] } }
      ]
    }
  },
  {
    name: 'SAM timeout and memory are carried',
    files: {
      'package.json': jsPackage,
      'handler.js':
        'export async function handler() { await new Promise((resolve) => setTimeout(resolve, 60_000)); }\n',
      'template.yaml': samTemplate(
        ...samFunction(
          'handler.handler',
          '      Timeout: 180',
          '      MemorySize: 2048',
          '      Events:',
          '        Tick:',
          '          Type: Schedule',
          '          Properties:',
          '            Schedule: rate(1 hour)'
        )
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'api', path: 'timeout', value: 180 },
        { resource: 'api', path: 'memory', value: 2048 }
      ]
    }
  },
  {
    name: 'a Compose named volume becomes a persistent disk on the service',
    files: {
      'package.json': JSON.stringify({
        name: 'fixture-app',
        private: true,
        type: 'module',
        dependencies: { express: '^4.21.0' },
        scripts: { start: 'node server.js' }
      }),
      Dockerfile: 'FROM node:22\nWORKDIR /app\nCOPY . .\nEXPOSE 3000\nCMD ["node","server.js"]\n',
      'server.js': lines(
        "import express from 'express';",
        "import { mkdirSync, writeFileSync } from 'node:fs';",
        'const app = express();',
        "app.post('/upload', (req, res) => { mkdirSync('/app/uploads', { recursive: true }); writeFileSync('/app/uploads/record.txt', 'saved'); res.sendStatus(201); });",
        "app.listen(3000, '0.0.0.0');"
      ),
      'compose.yaml': lines(
        'services:',
        '  api:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    volumes: ["uploads:/app/uploads", "node_modules:/app/node_modules"]',
        'volumes:',
        '  uploads:',
        '  node_modules:'
      )
    },
    expect: {
      resources: { fixtureApp: 'web-service', uploadsVolume: 'efs-filesystem' },
      resourceProperties: [
        {
          resource: 'fixtureApp',
          path: 'volumeMounts',
          value: [{ type: 'efs', properties: { efsFilesystemName: 'uploadsVolume', mountPath: '/app/uploads' } }]
        }
      ]
    }
  }
];

const expressApp = (compose: string): Record<string, string> => ({
  'package.json': JSON.stringify({ name: 'app', dependencies: { express: '4.21.0' } }),
  'server.js': "require('express')().listen(3000);\n",
  'compose.yaml': compose
});

/** Cases from the review of the first version of these fixes. */
const REVIEW_CASES: EvalCase[] = [
  {
    name: 'a SAM API Auth that sets one key keeps the global IAM default authorizer',
    files: {
      'package.json': JSON.stringify({ name: 'review-app' }),
      'handler.js': 'exports.main = async () => ({ statusCode: 200 });\n',
      'template.yaml': samTemplate(
        '  Gateway:',
        '    Type: AWS::Serverless::Api',
        '    Properties:',
        '      StageName: prod',
        '      Auth:',
        '        AddDefaultAuthorizerToCorsPreflight: false',
        ...samFunction(
          'handler.main',
          '      Events:',
          '        Admin:',
          '          Type: Api',
          '          Properties:',
          '            RestApiId: !Ref Gateway',
          '            Path: /admin',
          '            Method: get'
        )
      ).replace('Resources:\n', 'Globals:\n  Api:\n    Auth:\n      DefaultAuthorizer: AWS_IAM\nResources:\n')
    },
    expect: {
      resourceProperties: [{ resource: 'api', path: 'events.0.properties.authorizer', value: { type: 'aws-iam' } }]
    }
  },
  {
    name: 'a SAM S3 key filter given as a parameter reference is resolved to its default',
    files: {
      'package.json': JSON.stringify({ name: 'review-app' }),
      'handler.js': 'exports.main = async () => ({ statusCode: 200 });\n',
      'template.yaml': lines(
        'Transform: AWS::Serverless-2016-10-31',
        'Parameters:',
        '  Prefix:',
        '    Type: String',
        '    Default: incoming/',
        'Resources:',
        '  Bucket:',
        '    Type: AWS::S3::Bucket',
        '  Worker:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Runtime: nodejs22.x',
        '      Handler: handler.main',
        '      Events:',
        '        Created:',
        '          Type: S3',
        '          Properties:',
        '            Bucket: !Ref Bucket',
        '            Events: s3:ObjectCreated:*',
        '            Filter:',
        '              S3Key:',
        '                Rules:',
        '                  - Name: prefix',
        '                    Value:',
        '                      Ref: Prefix'
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'worker', path: 'events.0.properties.filterRule', value: { prefix: 'incoming/' } }
      ]
    }
  },
  {
    name: 'Compose read-only volumes and subpaths become read-only and separate EFS directories',
    files: expressApp(
      lines(
        'services:',
        '  app:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    volumes:',
        '      - uploads:/app/uploads:ro',
        '      - type: volume',
        '        source: shared',
        '        target: /app/uploads-archive',
        '        volume:',
        '          subpath: uploads',
        '      - type: volume',
        '        source: shared',
        '        target: /app/archives',
        '        volume:',
        '          subpath: archives',
        'volumes:',
        '  uploads: {}',
        '  shared: {}'
      )
    ),
    expect: {
      resourceProperties: [
        {
          resource: 'app',
          path: 'volumeMounts',
          value: [
            {
              type: 'efs',
              properties: { efsFilesystemName: 'uploadsVolume', mountPath: '/app/uploads', readOnly: true }
            },
            {
              type: 'efs',
              properties: {
                efsFilesystemName: 'sharedVolume',
                rootDirectory: '/uploads',
                mountPath: '/app/uploads-archive'
              }
            },
            {
              type: 'efs',
              properties: { efsFilesystemName: 'sharedVolume', rootDirectory: '/archives', mountPath: '/app/archives' }
            }
          ]
        }
      ]
    }
  },
  {
    name: 'Compose caches, sockets, scratch space and installed dependencies get no disk',
    files: expressApp(
      lines(
        'services:',
        '  app:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '    volumes:',
        '      - cache:/root/.npm',
        '      - sockets:/run/app',
        '      - nestedcache:/app/node_modules/.cache',
        '      - dependencies:/app/node_modules/sharp',
        '      - temporary:/var/tmp',
        'volumes:',
        '  cache: {}',
        '  sockets: {}',
        '  nestedcache: {}',
        '  dependencies: {}',
        '  temporary: {}'
      )
    ),
    expect: {
      resources: { app: 'web-service' },
      resourceProperties: [{ resource: 'app', path: 'volumeMounts', value: undefined }]
    }
  }
];

describe('importer synthetic end-to-end corpus', () => {
  for (const evalCase of [...CASES, ...FIDELITY_CASES, ...REVIEW_CASES]) {
    it(evalCase.name, async () => {
      const score = await runEvalCase(evalCase);
      if (!score.passed) {
        throw new Error(score.failures.map((failure) => `[${failure.stage}] ${failure.detail}`).join('\n'));
      }
      expect(score.passed).toBe(true);
    });
  }
});
