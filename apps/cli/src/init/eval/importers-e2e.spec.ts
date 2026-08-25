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
    name: 'Django Compose image with custom port, split Postgres settings, and bundled lifecycle',
    directoryName: 'healthchecks',
    files: {
      'pyproject.toml': '[project]\nname = "healthchecks"\ndependencies = ["django", "psycopg[c]"]\n',
      'requirements.txt': 'django\npsycopg[c]\n',
      '.env.example': [
        'DB=postgres',
        'DB_HOST=localhost',
        'DB_PORT=5432',
        'DB_NAME=postgres',
        'DB_USER=postgres',
        'DB_PASSWORD=',
        'DEBUG=False',
        'SECRET_KEY=---',
        'SITE_ROOT=http://localhost:8000',
        'EMAIL_HOST=',
        'S3_BUCKET=',
        'S3_SECRET_KEY=',
        'GITHUB_CLIENT_ID=',
        'GITHUB_CLIENT_SECRET=',
        'METRICS_KEY=',
        ''
      ].join('\n'),
      'hc/settings.py': [
        'import os',
        'def envsecret(name, default=None): return os.getenv(name, default)',
        'DB = os.getenv("DB", "sqlite")',
        'DB_HOST = os.getenv("DB_HOST", "localhost")',
        'DB_PORT = os.getenv("DB_PORT", "5432")',
        'DB_NAME = os.getenv("DB_NAME", "postgres")',
        'DB_USER = os.getenv("DB_USER", "postgres")',
        'DB_PASSWORD = envsecret("DB_PASSWORD", "")',
        'DEBUG = os.getenv("DEBUG", "True")',
        'SECRET_KEY = envsecret("SECRET_KEY", "---")',
        'SITE_ROOT = os.getenv("SITE_ROOT", "http://localhost:8000")',
        'EMAIL_HOST = os.getenv("EMAIL_HOST", "")',
        'S3_BUCKET = os.getenv("S3_BUCKET", "")',
        'S3_SECRET_KEY = envsecret("S3_SECRET_KEY")',
        'GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")',
        'GITHUB_CLIENT_SECRET = envsecret("GITHUB_CLIENT_SECRET")',
        'METRICS_KEY = os.getenv("METRICS_KEY")',
        ''
      ].join('\n'),
      'docker/Dockerfile': [
        'FROM python:3.14-slim',
        'COPY . /opt/healthchecks',
        'WORKDIR /opt/healthchecks',
        'CMD ["uwsgi", "/opt/healthchecks/docker/uwsgi.ini"]',
        ''
      ].join('\n'),
      'docker/uwsgi.ini': [
        '[uwsgi]',
        'http-socket = :8000',
        'hook-pre-app = exec:./manage.py migrate',
        'attach-daemon = ./manage.py sendalerts',
        'attach-daemon = ./manage.py sendreports --loop',
        ''
      ].join('\n'),
      'docker/docker-compose.yml': [
        'services:',
        '  web:',
        '    build:',
        '      context: ..',
        '      dockerfile: docker/Dockerfile',
        '    ports: ["8000:8000"]',
        '    depends_on: [db]',
        '  db:',
        '    image: postgres:17',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres', 'email'],
      absentDependencyKinds: ['object-storage'],
      resources: { healthchecks: 'web-service', mainDatabase: 'relational-database' },
      serviceProperties: [{ resource: 'healthchecks', containerPort: 8000, minInstances: 1, maxInstances: 1 }],
      resourcePackaging: [{ resource: 'healthchecks', type: 'custom-dockerfile', dockerfilePath: 'docker/Dockerfile' }],
      serviceEnvironment: [
        { resource: 'healthchecks', name: 'DB', value: 'postgres' },
        { resource: 'healthchecks', name: 'DB_HOST', value: "$ResourceParam('mainDatabase', 'host')" },
        { resource: 'healthchecks', name: 'DB_PORT', value: "$ResourceParam('mainDatabase', 'port')" },
        { resource: 'healthchecks', name: 'DB_NAME', value: "$ResourceParam('mainDatabase', 'dbName')" },
        { resource: 'healthchecks', name: 'DB_USER', value: 'stacktape' },
        { resource: 'healthchecks', name: 'DB_PASSWORD', value: "$Secret('eval-mainDatabase.password')" },
        { resource: 'healthchecks', name: 'DEBUG', value: 'False' },
        { resource: 'healthchecks', name: 'SECRET_KEY', value: "$Secret('eval-healthchecks.generatedSecretKey')" },
        { resource: 'healthchecks', name: 'SITE_ROOT', value: "$ResourceParam('healthchecks', 'url')" }
      ],
      absentServiceEnvironment: [
        { resource: 'healthchecks', name: 'S3_SECRET_KEY' },
        { resource: 'healthchecks', name: 'GITHUB_CLIENT_ID' },
        { resource: 'healthchecks', name: 'GITHUB_CLIENT_SECRET' },
        { resource: 'healthchecks', name: 'METRICS_KEY' },
        { resource: 'healthchecks', name: 'EMAIL_HOST' }
      ],
      requiredGapPatterns: ['SMTP.*host.*port.*username.*password', 'keeps it at one instance'],
      forbiddenGapPatterns: ['does not read a configurable address', 'EMAIL_HOST points at'],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Procfile web and worker sharing one application Dockerfile',
    files: {
      'package.json': JSON.stringify({
        name: 'support',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^5.0.0' }
      }),
      Procfile: ['web: node server.js', 'worker: node worker.js'].join('\n'),
      Dockerfile: [
        'FROM node:24-alpine',
        'RUN apk add --no-cache imagemagick',
        'COPY . /app',
        'WORKDIR /app',
        'CMD ["node", "server.js"]'
      ].join('\n'),
      'server.js': 'require("express")().listen(process.env.PORT || 3000);',
      'worker.js': 'setInterval(() => undefined, 1000);'
    },
    expect: {
      resources: { support: 'web-service', worker: 'worker-service' },
      resourcePackaging: [
        { resource: 'support', type: 'custom-dockerfile', command: ['/bin/sh', '-c', 'node server.js'] },
        { resource: 'worker', type: 'custom-dockerfile', command: ['/bin/sh', '-c', 'node worker.js'] }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Compose root context with a nested ASP.NET Dockerfile',
    files: {
      'Directory.Build.props': '<Project></Project>\n',
      'src/Orders.Api/Orders.Api.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>\n',
      'src/Orders.Api/Dockerfile': [
        'FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build',
        'WORKDIR /src',
        'COPY ["Directory.Build.props", "./"]',
        'COPY ["src/Orders.Api/Orders.Api.csproj", "src/Orders.Api/"]',
        'RUN dotnet publish "src/Orders.Api/Orders.Api.csproj" -o /app/publish',
        ''
      ].join('\n'),
      'compose.yaml': [
        'services:',
        '  api:',
        '    build:',
        '      context: .',
        '      dockerfile: src/Orders.Api/Dockerfile',
        '    ports: ["8080:8080"]',
        '    environment:',
        '      ASPNETCORE_ENVIRONMENT: Production',
        '      Api__DefaultPort: 8080',
        '      Storage__ForcePathStyle: true',
        '      Storage__AccessKey: local-development-key',
        ''
      ].join('\n')
    },
    expect: {
      resources: { OrdersApi: 'web-service' },
      resourcePackaging: [
        {
          resource: 'OrdersApi',
          type: 'custom-dockerfile',
          buildContextPath: '.',
          dockerfilePath: 'src/Orders.Api/Dockerfile'
        }
      ],
      serviceEnvironment: [
        { resource: 'OrdersApi', name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' },
        { resource: 'OrdersApi', name: 'Api__DefaultPort', value: '8080' },
        { resource: 'OrdersApi', name: 'Storage__ForcePathStyle', value: 'true' },
        { resource: 'OrdersApi', name: 'Storage__AccessKey', value: "$Secret('storage__accesskey')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Render web app plus key-value service',
    files: {
      'package.json': JSON.stringify({
        name: 'status-page',
        scripts: { start: 'node build' },
        dependencies: { express: '^5.0.0', ioredis: '^5.0.0' }
      }),
      'render.yaml': [
        'services:',
        '  - type: web',
        '    name: status-page',
        '    env: node',
        '    startCommand: node build',
        '    envVars:',
        '      - key: REDIS_URL',
        '        fromService:',
        '          name: status-cache',
        '          type: keyvalue',
        '          property: connectionString',
        '  - type: keyvalue',
        '    name: status-cache',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['redis'],
      resources: { statusPage: 'web-service', cache: 'redis-cluster' },
      serviceEnvironment: [
        { resource: 'statusPage', name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'Next.js build with a separated Prisma deploy step',
    files: {
      'package.json': JSON.stringify(
        {
          name: 'storefront',
          scripts: {
            build: 'prisma generate && prisma db push && next build',
            'build-ci': 'next build',
            start: 'next start'
          },
          dependencies: { next: '^15.0.0', '@prisma/client': '^6.0.0', prisma: '^6.0.0' }
        },
        null,
        2
      ),
      'package-lock.json': '{}',
      'prisma/schema.prisma': ['datasource db {', '  provider = "postgresql"', '  url = env("DATABASE_URL")', '}'].join(
        '\n'
      )
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { storefront: 'nextjs-web', mainDatabase: 'relational-database' },
      scriptNames: ['migrateDatabase'],
      serviceEnvironment: [
        { resource: 'storefront', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
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
