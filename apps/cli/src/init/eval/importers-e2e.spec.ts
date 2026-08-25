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
    name: 'Laravel Compose web, Horizon, scheduler, MySQL, and Redis',
    directoryName: 'pixelfed',
    files: {
      'composer.json': JSON.stringify({
        name: 'acme/pixelfed',
        require: { 'laravel/framework': '^12', 'ext-pdo_mysql': '*', predis: '^3' }
      }),
      Dockerfile: 'FROM serversideup/php:8.5-frankenphp\nEXPOSE 8080\n',
      'public/index.php': '<?php require __DIR__ . "/../vendor/autoload.php";\n',
      'config/app.php': "<?php return ['key' => env('APP_KEY')];\n",
      'config/database.php': [
        '<?php return [',
        "  'default' => env('DB_CONNECTION', 'mysql'),",
        "  'host' => env('DB_HOST', '127.0.0.1'),",
        "  'port' => env('DB_PORT', '3306'),",
        "  'database' => env('DB_DATABASE', 'app'),",
        "  'username' => env('DB_USERNAME', 'app'),",
        "  'password' => env('DB_PASSWORD', ''),",
        "  'ssl_ca' => env('MYSQL_ATTR_SSL_CA'),",
        "  'redis_host' => env('REDIS_HOST', '127.0.0.1'),",
        "  'redis_password' => env('REDIS_PASSWORD'),",
        "  'redis_port' => env('REDIS_PORT', '6379'),",
        '];',
        ''
      ].join('\n'),
      'config/filesystems.php': [
        '<?php return [',
        "  'default' => env('FILESYSTEM_DISK', 'local'),",
        "  'bucket' => env('AWS_BUCKET'),",
        '];',
        ''
      ].join('\n'),
      'config/cache.php': "<?php return ['default' => env('CACHE_DRIVER', 'file')];\n",
      'config/queue.php': "<?php return ['default' => env('QUEUE_DRIVER', 'sync')];\n",
      '.env.example': [
        'APP_KEY=',
        'DB_CONNECTION=mysql',
        'DB_HOST=127.0.0.1',
        'DB_PORT=3306',
        'DB_DATABASE=pixelfed',
        'DB_USERNAME=pixelfed',
        'DB_PASSWORD=',
        'REDIS_HOST=127.0.0.1',
        'REDIS_PASSWORD=null',
        'REDIS_PORT=6379',
        'FILESYSTEM_DISK=local',
        ''
      ].join('\n'),
      '.env.docker.example': ['CACHE_DRIVER=redis', 'QUEUE_DRIVER=redis', 'ADMIN_PIN=1234', 'OTP_CODE=000000', ''].join(
        '\n'
      ),
      '.env.testing': 'DB_CONNECTION=sqlite\nDB_DATABASE=tests/database.sqlite\n',
      'docker-compose.yml': [
        'services:',
        '  pixelfed:',
        '    build: .',
        '    ports: ["8080:8080"]',
        '    depends_on: [db, redis]',
        '    environment:',
        '      PHP_OPCACHE_ENABLE: "1"',
        '      AUTORUN_ENABLED: "true"',
        '      AUTORUN_LARAVEL_MIGRATION: "true"',
        '      AUTORUN_LARAVEL_MIGRATION_ISOLATION: "true"',
        '      AUTORUN_LARAVEL_STORAGE_LINK: "true"',
        '      AUTORUN_LARAVEL_EVENT_CACHE: "true"',
        '      AUTORUN_LARAVEL_CONFIG_CACHE: "true"',
        '  horizon:',
        '    build: .',
        '    entrypoint: ["php", "artisan"]',
        '    command: ["horizon"]',
        '    depends_on: [db, redis]',
        '    environment:',
        '      AUTORUN_LARAVEL_MIGRATION: "false"',
        '      AUTORUN_LARAVEL_STORAGE_LINK: "true"',
        '  scheduler:',
        '    build: .',
        '    command: ["php", "artisan", "schedule:work"]',
        '    depends_on: [db, redis]',
        '    environment:',
        '      AUTORUN_LARAVEL_MIGRATION: "false"',
        '  db:',
        '    image: mysql:9',
        '  redis:',
        '    image: redis:7',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['mysql', 'redis'],
      absentDependencyKinds: ['object-storage'],
      resources: {
        mainDatabase: 'relational-database',
        cache: 'redis-cluster',
        pixelfed: 'web-service',
        horizon: 'worker-service',
        scheduler: 'worker-service'
      },
      resourcePackaging: [
        { resource: 'pixelfed', type: 'custom-dockerfile', dockerfilePath: 'Dockerfile' },
        {
          resource: 'horizon',
          type: 'custom-dockerfile',
          dockerfilePath: 'Dockerfile',
          command: ['/bin/sh', '-c', 'php artisan horizon']
        },
        {
          resource: 'scheduler',
          type: 'custom-dockerfile',
          dockerfilePath: 'Dockerfile',
          command: ['php', 'artisan', 'schedule:work']
        }
      ],
      serviceProperties: [
        { resource: 'pixelfed', containerPort: 8080, minInstances: 1, maxInstances: 1 },
        { resource: 'horizon', minInstances: 1, maxInstances: 3 },
        { resource: 'scheduler', minInstances: 1, maxInstances: 3 }
      ],
      serviceEnvironment: [
        { resource: 'pixelfed', name: 'APP_KEY', value: "$Secret('eval-pixelfed.generatedAppKey')" },
        { resource: 'horizon', name: 'APP_KEY', value: "$Secret('eval-pixelfed.generatedAppKey')" },
        { resource: 'pixelfed', name: 'DB_HOST', value: "$ResourceParam('mainDatabase', 'host')" },
        { resource: 'pixelfed', name: 'DB_PORT', value: "$ResourceParam('mainDatabase', 'port')" },
        { resource: 'pixelfed', name: 'DB_DATABASE', value: "$ResourceParam('mainDatabase', 'dbName')" },
        { resource: 'pixelfed', name: 'DB_USERNAME', value: 'stacktape' },
        { resource: 'pixelfed', name: 'DB_PASSWORD', value: "$Secret('eval-mainDatabase.password')" },
        { resource: 'pixelfed', name: 'REDIS_HOST', value: "$ResourceParam('cache', 'host')" },
        { resource: 'pixelfed', name: 'REDIS_PASSWORD', value: "$Secret('eval-cache.password')" },
        { resource: 'pixelfed', name: 'REDIS_PORT', value: "$ResourceParam('cache', 'port')" },
        { resource: 'pixelfed', name: 'PHP_OPCACHE_ENABLE', value: '1' },
        { resource: 'pixelfed', name: 'AUTORUN_LARAVEL_EVENT_CACHE', value: 'true' },
        { resource: 'horizon', name: 'AUTORUN_LARAVEL_MIGRATION', value: 'false' },
        { resource: 'pixelfed', name: 'CACHE_DRIVER', value: 'redis' },
        { resource: 'pixelfed', name: 'QUEUE_DRIVER', value: 'redis' },
        { resource: 'horizon', name: 'CACHE_DRIVER', value: 'redis' },
        { resource: 'horizon', name: 'QUEUE_DRIVER', value: 'redis' },
        { resource: 'scheduler', name: 'CACHE_DRIVER', value: 'redis' },
        { resource: 'scheduler', name: 'QUEUE_DRIVER', value: 'redis' }
      ],
      absentServiceEnvironment: [
        { resource: 'pixelfed', name: 'DB_CONNECTION' },
        { resource: 'pixelfed', name: 'AWS_BUCKET' },
        { resource: 'pixelfed', name: 'MYSQL_ATTR_SSL_CA' },
        { resource: 'pixelfed', name: 'ADMIN_PIN' },
        { resource: 'pixelfed', name: 'OTP_CODE' },
        { resource: 'horizon', name: 'ADMIN_PIN' },
        { resource: 'horizon', name: 'OTP_CODE' }
      ],
      requiredGapPatterns: ['database migrations during service startup', 'media.*ephemeral|ephemeral.*media'],
      forbiddenGapPatterns: ['does not read a configurable address'],
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
    name: 'Go server with a bundled Vite administration UI',
    files: {
      'go.mod': 'module example.com/notification-server\n',
      'cmd/main.go': [
        'package main',
        'import "github.com/labstack/echo/v4"',
        'var frontendDir = "frontend/dist"',
        'func main() { server := echo.New(); server.Start(":9000") }',
        ''
      ].join('\n'),
      Makefile: [
        'EDITOR_DIR = frontend/editor',
        'EDITOR_DIST = $(EDITOR_DIR)/dist',
        'EDITOR_FINAL = frontend/public/editor',
        'editor:',
        '\tcp -r $(EDITOR_DIST)/* $(EDITOR_FINAL)',
        ''
      ].join('\n'),
      'frontend/package.json': JSON.stringify({
        name: 'notification-server',
        scripts: { build: 'vite build' },
        dependencies: { vue: '^3.0.0' },
        devDependencies: { vite: '^8.0.0' }
      }),
      'frontend/index.html': '<div id="app"></div>',
      'frontend/editor/package.json': JSON.stringify({
        name: '@notification/editor',
        scripts: { build: 'vite build' },
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^8.0.0' }
      }),
      'frontend/editor/index.html': '<div id="editor"></div>'
    },
    expect: {
      resources: { notificationServer: 'web-service' },
      serviceCount: 1,
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
    name: 'Cloudflare Durable Object worker remains explicitly unsupported',
    files: {
      'package.json': JSON.stringify({
        name: 'durable-chat',
        dependencies: { react: '^19.0.0', partyserver: '^0.0.75' },
        devDependencies: { wrangler: '^4.0.0' },
        scripts: { dev: 'wrangler dev', deploy: 'wrangler deploy' }
      }),
      'wrangler.json': JSON.stringify({
        main: 'src/server/index.ts',
        assets: { directory: './public' },
        durable_objects: { bindings: [{ name: 'CHAT', class_name: 'Chat' }] }
      }),
      'src/server/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    },
    expect: {
      resources: {},
      resourceCount: 0,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['Durable Objects', 'generated no AWS resources']
    }
  },
  {
    name: 'Cloudflare React Router worker does not leave an orphan database or server',
    files: {
      'package.json': JSON.stringify({
        name: 'books',
        dependencies: { react: '^19.0.0', 'react-router': '^7.0.0' },
        devDependencies: { '@react-router/dev': '^7.0.0', postgres: '^3.4.0', wrangler: '^4.0.0' },
        scripts: { build: 'react-router build', start: 'wrangler dev' }
      }),
      'wrangler.jsonc': `{
        "main": "api/index.js",
        "services": [{ "binding": "BOOKS", "service": "books", "entrypoint": "BooksService" }]
      }`,
      'api/index.js': 'export default { fetch() { return new Response("ok"); } };'
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: {},
      resourceCount: 0,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['service bindings', 'generated no AWS resources']
    }
  },
  {
    name: 'Cloudflare Workflow frontend is not emitted without its backend',
    files: {
      'package.json': JSON.stringify({
        name: 'workflow-ui',
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^7.0.0', wrangler: '^4.0.0' },
        scripts: { build: 'vite build', dev: 'vite' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.jsonc': `{
        "main": "worker/index.ts",
        "workflows": [{ "binding": "FLOW", "name": "flow", "class_name": "Flow" }],
        "durable_objects": { "bindings": [{ "name": "STATUS", "class_name": "Status" }] }
      }`,
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };'
    },
    expect: {
      resources: {},
      resourceCount: 0,
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['Workflows', 'Durable Objects', 'generated no AWS resources']
    }
  },
  {
    name: 'Cloudflare frontend does not hide a retained sibling API database',
    files: {
      'package.json': JSON.stringify({
        name: 'dashboard',
        private: true,
        workspaces: ['apps/*'],
        dependencies: { react: '^19.0.0' },
        devDependencies: { vite: '^7.0.0', wrangler: '^4.0.0' },
        scripts: { build: 'vite build' }
      }),
      'index.html': '<!doctype html><div id="root"></div>',
      'src/main.tsx': 'document.querySelector("#root")',
      'wrangler.json': JSON.stringify({ main: 'worker/index.ts', workflows: [{ binding: 'FLOW' }] }),
      'worker/index.ts': 'export default { fetch() { return new Response("ok"); } };',
      '.env.example': 'DATABASE_URL=postgres://localhost/app\n',
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '^5.0.0' },
        scripts: { start: 'node index.js' }
      }),
      'apps/api/index.js':
        'const express = require("express"); console.log(process.env.DATABASE_URL); express().listen(3000);'
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { api: 'web-service', mainDatabase: 'relational-database' },
      serviceEnvironment: [
        { resource: 'api', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }
      ],
      deployable: false,
      maxQuestions: 0,
      requiredGapPatterns: ['only for the platform-neutral parts']
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
  },
  {
    name: 'TanStack Start SSR web app',
    files: {
      'package.json': JSON.stringify({
        name: 'tanstack-start-app',
        type: 'module',
        scripts: { build: 'vite build', start: 'node .output/server/index.mjs' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          '@tanstack/react-router': '^1.170.32',
          react: '^19.0.0',
          'react-dom': '^19.0.0'
        },
        devDependencies: {
          '@vitejs/plugin-react': '^6.0.1',
          nitro: '^3.0.260311-beta',
          vite: '^8.0.14'
        }
      }),
      'vite.config.ts': [
        "import { defineConfig } from 'vite';",
        "import { tanstackStart } from '@tanstack/react-start/plugin/vite';",
        "import viteReact from '@vitejs/plugin-react';",
        "import { nitro } from 'nitro/vite';",
        '',
        'export default defineConfig({',
        '  plugins: [tanstackStart(), viteReact(), nitro()]',
        '});'
      ].join('\n'),
      'src/routes/__root.tsx': [
        "import { Outlet, createRootRoute } from '@tanstack/react-router';",
        '',
        'export const Route = createRootRoute({',
        '  component: () => <Outlet />',
        '});'
      ].join('\n'),
      'src/routes/index.tsx': [
        "import { createFileRoute } from '@tanstack/react-router';",
        '',
        'export const Route = createFileRoute("/")({',
        '  component: () => <h1>Hello TanStack Start</h1>',
        '});'
      ].join('\n'),
      'src/router.tsx': [
        "import { createRouter } from '@tanstack/react-router';",
        "import { routeTree } from './routeTree.gen';",
        '',
        'export function getRouter() {',
        '  return createRouter({ routeTree });',
        '}'
      ].join('\n'),
      'src/routeTree.gen.ts': 'export const routeTree = {};\n'
    },
    expect: {
      resources: { tanstackStartApp: 'tanstack-web' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'TanStack Start Rsbuild SSR web app',
    files: {
      'package.json': JSON.stringify({
        name: 'tanstack-rsbuild-app',
        type: 'module',
        scripts: { build: 'rsbuild build', start: 'node ./dist/server/index.js' },
        dependencies: {
          '@tanstack/react-start': '^1.168.49',
          '@tanstack/react-router': '^1.170.32',
          react: '^19.0.0',
          'react-dom': '^19.0.0'
        },
        devDependencies: { '@rsbuild/core': '^1.5.0' }
      }),
      'rsbuild.config.ts': [
        "import * as startPlugin from '@tanstack/react-start/plugin/rsbuild';",
        'export default { plugins: [startPlugin.tanstackStart()] };'
      ].join('\n'),
      'src/routes/index.tsx': 'export const Route = {};'
    },
    expect: {
      resources: { tanstackRsbuildApp: 'tanstack-web' },
      deployable: true,
      maxQuestions: 0
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
