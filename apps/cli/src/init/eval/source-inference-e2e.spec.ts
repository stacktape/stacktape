/**
 * Source code that init reads, through the complete pipeline: the r2ss adversarial audit (F08–F15, F18) and the
 * eighth dogfood's init gaps. Each case is a reduced repro of a repository where init produced a confident wrong
 * configuration, paired with a control where the old behavior is right.
 */

import { describe, expect, it } from 'bun:test';
import { DEV_RUNNABLE_FIXTURES } from './dev-runnable-fixtures';
import { runEvalCase, type EvalCase } from './harness';

const lines = (...entries: string[]) => `${entries.join('\n')}\n`;
const packageJson = (fields: Record<string, unknown>) =>
  JSON.stringify({ name: 'fixture-app', private: true, type: 'module', ...fields });

const CASES: EvalCase[] = [
  {
    name: 'F11: a commented-out listen call leaves a heartbeat process a worker',
    files: {
      'package.json': packageJson({ scripts: { start: 'node worker.js' } }),
      'worker.js': lines(
        '// app.listen(3000);',
        '// export async function handler(event) {return event.Records;}',
        "setInterval(() => console.log('heartbeat'), 60000);"
      )
    },
    expect: { resources: { fixtureApp: 'worker-service' } }
  },
  {
    name: 'F11 control: a real listen call is a web service',
    files: {
      'package.json': packageJson({ dependencies: { express: '^4.21.0' }, scripts: { start: 'node server.js' } }),
      'server.js': lines(
        "import express from 'express';",
        'const app = express();',
        '// Tests pass a port: app.listen(4000)',
        'app.listen(3000);'
      )
    },
    expect: {
      resources: { fixtureApp: 'web-service' },
      resourceProperties: [{ resource: 'fixtureApp', path: 'port', value: undefined }]
    }
  },
  {
    name: 'F12: example code inside a string is not a Lambda handler',
    files: {
      'package.json': packageJson({ dependencies: { express: '^4.21.0' }, scripts: { start: 'node server.js' } }),
      'example.js':
        'export const tutorial = "export const handler = async (event) => ({statusCode:200,body:event.requestContext.http.method})";\n',
      'server.js': lines(
        "import express from 'express';",
        'const app = express();',
        "app.get('/health', (_, res) => res.json({ ok: true }));",
        "app.listen(3000, '0.0.0.0');"
      )
    },
    expect: {
      resources: { fixtureApp: 'web-service' },
      resourceProperties: [
        { resource: 'example', path: 'packaging', value: undefined },
        { resource: 'httpApiGateway', path: 'type', value: undefined }
      ]
    }
  },
  {
    name: 'F08: a Serverless MySQL RDS instance stays MySQL',
    files: {
      'package.json': packageJson({}),
      'handler.js': 'export async function handler(event) { return { statusCode: 200, body: "ok" }; }\n',
      'serverless.yml': lines(
        'service: fixture',
        'provider:',
        '  name: aws',
        '  runtime: nodejs22.x',
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - httpApi: GET /hello',
        'resources:',
        '  Resources:',
        '    Database:',
        '      Type: AWS::RDS::DBInstance',
        '      Properties:',
        '        Engine: mysql',
        '        EngineVersion: "8.0"'
      )
    },
    expect: {
      dependencyKinds: ['mysql'],
      absentDependencyKinds: ['postgres'],
      resources: { mainDatabase: 'relational-database', api: 'function' },
      resourceProperties: [{ resource: 'mainDatabase', path: 'engine.type', value: 'mysql' }]
    }
  },
  {
    name: 'F08: an RDS engine the manifest does not state is no database claim',
    files: {
      'package.json': packageJson({}),
      'handler.js': 'export async function handler(event) { return { statusCode: 200, body: "ok" }; }\n',
      'serverless.yml': lines(
        'service: fixture',
        'functions:',
        '  api:',
        '    handler: handler.handler',
        'resources:',
        '  Resources:',
        '    Database:',
        '      Type: AWS::RDS::DBCluster',
        '      Properties:',
        '        Engine: ${param:engine}'
      )
    },
    expect: { absentDependencyKinds: ['postgres', 'mysql'] }
  },
  {
    name: 'F09: a Procfile uvicorn --port routes to that port',
    files: {
      'api/requirements.txt': lines('fastapi==0.115.0', 'uvicorn==0.32.0'),
      'api/main.py': lines('from fastapi import FastAPI', 'app = FastAPI()'),
      'api/Procfile': 'web: uvicorn main:app --host 0.0.0.0 --port 8000\n'
    },
    expect: { resources: { api: 'web-service' }, servicePorts: [{ resource: 'api', port: 8000 }] }
  },
  {
    name: 'F09: a Procfile gunicorn --bind routes to that port',
    files: {
      'api/requirements.txt': lines('Flask==3.1.0', 'gunicorn==23.0.0'),
      'api/app.py': lines('from flask import Flask', 'app = Flask(__name__)'),
      'api/Procfile': 'web: gunicorn app:app --bind 0.0.0.0:5000\n'
    },
    expect: { resources: { api: 'web-service' }, servicePorts: [{ resource: 'api', port: 5000 }] }
  },
  {
    name: 'F09 control: a Procfile that follows $PORT keeps the default port',
    files: {
      'api/requirements.txt': lines('fastapi==0.115.0', 'uvicorn==0.32.0'),
      'api/main.py': lines('from fastapi import FastAPI', 'app = FastAPI()'),
      'api/Procfile': 'web: uvicorn main:app --host 0.0.0.0 --port $PORT\n'
    },
    expect: {
      resources: { api: 'web-service' },
      resourceProperties: [{ resource: 'api', path: 'port', value: undefined }]
    }
  },
  {
    name: "F09: Hono's serve({ port }) routes to that port",
    files: {
      'package.json': packageJson({
        dependencies: { hono: '^4.0.0', '@hono/node-server': '^1.0.0' },
        scripts: { start: 'node index.js' }
      }),
      'index.js': lines(
        "import { Hono } from 'hono';",
        "import { serve } from '@hono/node-server';",
        'const app = new Hono();',
        "app.get('/', (c) => c.text('ok'));",
        'serve({ fetch: app.fetch, port: 4000 });'
      )
    },
    expect: { resources: { fixtureApp: 'web-service' }, servicePorts: [{ resource: 'fixtureApp', port: 4000 }] }
  },
  {
    name: 'F10: a ws WebSocket server gets an Application Load Balancer',
    files: {
      'package.json': packageJson({
        dependencies: { express: '^4.21.0', ws: '^8.0.0' },
        scripts: { start: 'node server.js' }
      }),
      'server.js': lines(
        "import express from 'express';",
        "import { createServer } from 'node:http';",
        "import { WebSocketServer } from 'ws';",
        'const server = createServer(express());',
        'const wss = new WebSocketServer({ server });',
        "wss.on('connection', (ws) => ws.send('hello'));",
        'server.listen(3000);'
      )
    },
    expect: {
      resources: { fixtureApp: 'web-service' },
      resourceProperties: [
        { resource: 'fixtureApp', path: 'loadBalancing.type', value: 'application-load-balancer' },
        { resource: 'fixtureApp', path: 'alarms.0.trigger.type', value: 'application-load-balancer-error-rate' }
      ]
    }
  },
  {
    name: 'F10: a socket.io server gets an Application Load Balancer',
    files: {
      'package.json': packageJson({
        dependencies: { 'socket.io': '^4.8.0' },
        scripts: { start: 'node server.js' }
      }),
      'server.js': lines(
        "import { createServer } from 'node:http';",
        "import { Server } from 'socket.io';",
        'const httpServer = createServer();',
        'const io = new Server(httpServer);',
        "io.on('connection', (socket) => socket.emit('hello'));",
        'httpServer.listen(3000);'
      )
    },
    expect: {
      resourceProperties: [{ resource: 'fixtureApp', path: 'loadBalancing.type', value: 'application-load-balancer' }]
    }
  },
  {
    name: 'F10: a FastAPI websocket route gets an Application Load Balancer',
    files: {
      'api/requirements.txt': lines('fastapi==0.115.0', 'uvicorn==0.32.0'),
      'api/main.py': lines(
        'from fastapi import FastAPI, WebSocket',
        'app = FastAPI()',
        "@app.websocket('/ws')",
        'async def socket(ws: WebSocket):',
        '    await ws.accept()'
      ),
      'api/Procfile': 'web: uvicorn main:app --host 0.0.0.0 --port $PORT\n'
    },
    expect: {
      resourceProperties: [{ resource: 'api', path: 'loadBalancing.type', value: 'application-load-balancer' }]
    }
  },
  {
    name: 'F10 control: a WebSocket client keeps the HTTP API',
    files: {
      'package.json': packageJson({
        dependencies: { express: '^4.21.0', ws: '^8.0.0' },
        scripts: { start: 'node server.js' }
      }),
      'server.js': lines(
        "import express from 'express';",
        "import WebSocket from 'ws';",
        "const feed = new WebSocket('wss://example.com/feed');",
        'const app = express();',
        'app.listen(3000);'
      )
    },
    expect: { resourceProperties: [{ resource: 'fixtureApp', path: 'loadBalancing', value: undefined }] }
  },
  {
    name: 'F13: a fallback that throws keeps an imported secret required',
    files: {
      'package.json': packageJson({ dependencies: { express: '^4.21.0' }, scripts: { start: 'node server.js' } }),
      'config.js': lines(
        "function required(name) { throw new Error(name + ' required'); }",
        "export const token = process.env.API_TOKEN || required('API_TOKEN');"
      ),
      'server.js': lines("import './config.js';", "import express from 'express';", 'express().listen(3000);')
    },
    expect: {
      serviceEnvironment: [{ resource: 'fixtureApp', name: 'API_TOKEN', value: "$Secret('api_token')" }]
    }
  },
  {
    name: 'F13: a throwing helper with any name keeps an inline secret required',
    files: {
      'package.json': packageJson({ dependencies: { express: '^4.21.0' }, scripts: { start: 'node server.js' } }),
      'server.js': lines(
        'const env = (name) => { throw new Error(`${name} is not set`); };',
        "const token = process.env.API_TOKEN ?? env('API_TOKEN');",
        "import express from 'express';",
        'express().listen(3000);'
      )
    },
    expect: {
      serviceEnvironment: [{ resource: 'fixtureApp', name: 'API_TOKEN', value: "$Secret('api_token')" }]
    }
  },
  {
    name: 'F13 control: a literal fallback is a default',
    files: {
      'package.json': packageJson({ dependencies: { express: '^4.21.0' }, scripts: { start: 'node server.js' } }),
      'server.js': lines(
        "const token = process.env.API_TOKEN || 'development-token';",
        "import express from 'express';",
        'express().listen(3000);'
      )
    },
    expect: { resourceProperties: [{ resource: 'fixtureApp', path: 'environment', value: undefined }] }
  },
  {
    name: 'F14: a Java Lambda in package com.example is application code',
    files: {
      'pom.xml':
        '<project><modelVersion>4.0.0</modelVersion><groupId>com.example</groupId><artifactId>app</artifactId><version>1.0</version><dependencies><dependency><groupId>com.amazonaws</groupId><artifactId>aws-lambda-java-core</artifactId><version>1.2.3</version></dependency></dependencies></project>\n',
      'src/main/java/com/example/Handler.java': lines(
        'package com.example;',
        'import com.amazonaws.services.lambda.runtime.Context;',
        'import com.amazonaws.services.lambda.runtime.RequestHandler;',
        'public class Handler implements RequestHandler<String, String> {',
        '  public String handleRequest(String input, Context context) { return input; }',
        '}'
      )
    },
    expect: {
      resources: { example: 'function' },
      resourceProperties: [
        { resource: 'example', path: 'packaging.properties.handlerFunction', value: 'Handler::handleRequest' }
      ]
    }
  },
  {
    name: 'F14: a Spring app in package com.example keeps its configured port',
    files: {
      'api/pom.xml':
        '<project><modelVersion>4.0.0</modelVersion><groupId>com.example</groupId><artifactId>app</artifactId><version>1.0</version><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId><version>3.3.0</version></dependency></dependencies></project>\n',
      'api/src/main/resources/application.properties': 'server.port=8088\n',
      'api/src/main/java/com/example/App.java': lines(
        'package com.example;',
        'import org.springframework.boot.SpringApplication;',
        'import org.springframework.boot.autoconfigure.SpringBootApplication;',
        '@SpringBootApplication public class App { public static void main(String[] args) { SpringApplication.run(App.class, args); } }'
      )
    },
    expect: { resources: { api: 'web-service' }, servicePorts: [{ resource: 'api', port: 8088 }] }
  },
  {
    name: 'F14 control: an examples directory is still sample code',
    files: {
      'package.json': packageJson({ dependencies: { express: '^4.21.0' }, scripts: { start: 'node server.js' } }),
      'server.js': lines("import express from 'express';", 'express().listen(3000);'),
      'examples/consumer.ts': lines(
        "import type { SQSEvent } from 'aws-lambda';",
        'export const handler = async (event: SQSEvent) => event.Records.length;'
      )
    },
    expect: {
      resources: { fixtureApp: 'web-service' },
      absentDependencyKinds: ['queue'],
      resourceProperties: [{ resource: 'consumer', path: 'packaging', value: undefined }]
    }
  },
  {
    name: 'F15: a literal Vite build.outDir is the upload directory',
    files: {
      'package.json': packageJson({
        dependencies: { vite: '^6.0.0', react: '^19.0.0' },
        scripts: { build: 'vite build' }
      }),
      'index.html': '<div id="root"></div><script type="module" src="/src/main.js"></script>\n',
      'vite.config.js': "export default { build: { outDir: 'public-build' } };\n",
      'src/main.js': "document.getElementById('root').textContent = 'Hello';\n"
    },
    expect: {
      resources: { fixtureApp: 'hosting-bucket' },
      resourceProperties: [{ resource: 'fixtureApp', path: 'uploadDirectoryPath', value: 'public-build' }]
    }
  },
  {
    name: 'F15: a Vite outDir is relative to a literal root',
    files: {
      'package.json': packageJson({ dependencies: { vite: '^6.0.0' }, scripts: { build: 'vite build' } }),
      'src/index.html': '<div id="root"></div>\n',
      'vite.config.js': "export default { root: './src', build: { outDir: '../site' } };\n"
    },
    expect: {
      resources: { fixtureApp: 'hosting-bucket' },
      resourceProperties: [{ resource: 'fixtureApp', path: 'uploadDirectoryPath', value: 'site' }]
    }
  },
  {
    name: 'F15: a computed Vite outDir is reported, not guessed',
    files: {
      'package.json': packageJson({
        dependencies: { vite: '^6.0.0', react: '^19.0.0' },
        scripts: { build: 'vite build' }
      }),
      'index.html': '<div id="root"></div>\n',
      'vite.config.js': lines(
        "const target = process.env.TARGET ?? 'web';",
        'export default { build: { outDir: `out/${target}` } };'
      )
    },
    expect: {
      resources: { fixtureApp: 'hosting-bucket' },
      gapsInclude: ['vite.config.js decides where the build writes']
    }
  },
  {
    name: "F18: one package's serverless.yml leaves a sibling package's handler to the source scan",
    files: {
      'package.json': packageJson({ workspaces: ['apps/*'] }),
      'apps/worker/package.json': JSON.stringify({ name: 'worker', private: true }),
      'apps/worker/handler.ts': lines(
        "import type { SQSEvent } from 'aws-lambda';",
        'export async function handler(event: SQSEvent) { for (const r of event.Records) console.log(r.body); }'
      ),
      'apps/api/package.json': JSON.stringify({ name: 'api', private: true }),
      'apps/api/handler.js': 'export async function handler(event) { return { statusCode: 200, body: "ok" }; }\n',
      'apps/api/serverless.yml': lines(
        'service: fixture',
        'functions:',
        '  api:',
        '    handler: handler.handler',
        '    events:',
        '      - httpApi: GET /hello'
      )
    },
    expect: {
      resources: { api: 'function', worker: 'function', jobQueue: 'sqs-queue' },
      resourceProperties: [{ resource: 'worker', path: 'events.0.properties.sqsQueueName', value: 'jobQueue' }]
    }
  },
  {
    name: 'review: a regular expression after if (...) does not hide the code after it',
    files: {
      'package.json': packageJson({ scripts: { start: 'node server.js' } }),
      'server.js': lines(
        "import http from 'node:http';",
        "if (process.env.DEBUG) /`/.test('markdown');",
        "http.createServer((req, res) => res.end('ok')).listen(8080);"
      )
    },
    expect: { resources: { fixtureApp: 'web-service' }, servicePorts: [{ resource: 'fixtureApp', port: 8080 }] }
  },
  {
    name: 'review: a computed Hono port is not its first number',
    files: {
      'package.json': packageJson({
        dependencies: { hono: '4.0.0', '@hono/node-server': '1.0.0' },
        scripts: { start: 'node server.js' }
      }),
      'server.js':
        "import { Hono } from 'hono'; import { serve } from '@hono/node-server'; const app = new Hono(); serve({ fetch: app.fetch, port: 8000 + 1 });\n"
    },
    expect: { resourceProperties: [{ resource: 'fixtureApp', path: 'port', value: undefined }] }
  },
  {
    name: 'review: a Serverless MariaDB instance stays MariaDB',
    files: {
      'package.json': packageJson({}),
      'handler.js': 'export async function handler(event) { return { statusCode: 200, body: "ok" }; }\n',
      'serverless.yml': lines(
        'service: db-app',
        'functions:',
        '  api:',
        '    handler: handler.handler',
        'resources:',
        '  Resources:',
        '    Database:',
        '      Type: AWS::RDS::DBInstance',
        '      Properties:',
        '        Engine: mariadb'
      )
    },
    expect: {
      dependencyKinds: ['mysql'],
      absentDependencyKinds: ['postgres'],
      resourceProperties: [{ resource: 'mainDatabase', path: 'engine.type', value: 'mariadb' }]
    }
  },
  {
    name: 'review: a root key under resolve.alias is no Vite root',
    files: {
      'package.json': packageJson({ dependencies: { vite: '6.0.0' }, scripts: { build: 'vite build' } }),
      'index.html': '<!doctype html><html>App</html>\n',
      'vite.config.js': "export default { resolve: { alias: { root: 'src' } } };\n"
    },
    expect: { resourceProperties: [{ resource: 'fixtureApp', path: 'uploadDirectoryPath', value: 'dist' }] }
  },
  {
    name: 'review: a README about template test fixtures publishes no static site',
    files: {
      'package.json': packageJson({ dependencies: { express: '4.21.0' }, scripts: { start: 'node server.js' } }),
      'server.js': "import express from 'express'; express().listen(3000);\n",
      'README.md':
        'The templates directory contains test fixtures for the static site generator, not a deployable website.\n',
      'templates/index.html': '<!doctype html><html>Test fixture</html>\n'
    },
    expect: { resourceProperties: [{ resource: 'templates', path: 'uploadDirectoryPath', value: undefined }] }
  }
];

/** The eighth dogfood's app, reduced: a Next.js frontend, a Prisma API, Cognito sign-in, an image Lambda and docs. */
const ledger = (overrides: Record<string, string | undefined> = {}): Record<string, string> => {
  const files: Record<string, string | undefined> = {
    'package.json': packageJson({ name: 'ledger', dependencies: { '@aws-sdk/client-lambda': '^3.900.0' } }),
    'pnpm-workspace.yaml': lines('packages:', '- api', '- web'),
    'README.md': lines(
      '# Ledger',
      'Login uses Cognito USER_PASSWORD_AUTH, then calls GET /me behind a JWT authorizer.',
      'docs/ is a static site served by a hosting-bucket with CDN.'
    ),
    'docs/index.html': '<!doctype html><html><body>Docs</body></html>\n',
    'web/package.json': JSON.stringify({
      name: 'ledger-web',
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: { next: '15.5.7', react: '19.1.0', '@aws-sdk/client-cognito-identity-provider': '^3.900.0' }
    }),
    'web/app/actions.js': lines(
      '"use server";',
      "import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';",
      'export async function login(form) {',
      '  const out = await new CognitoIdentityProviderClient({}).send(new InitiateAuthCommand({',
      "    ClientId: process.env.AUTH_CLIENT_ID, AuthFlow: 'USER_PASSWORD_AUTH',",
      "    AuthParameters: { USERNAME: form.get('email'), PASSWORD: form.get('password') }",
      '  }));',
      '  return out.AuthenticationResult.IdToken;',
      '}',
      'export async function create(token, name) {',
      "  const me = await fetch(process.env.ME_URL + '/me', { headers: { authorization: 'Bearer ' + token } });",
      "  await fetch(process.env.API_URL + '/experiments', { method: 'POST', body: JSON.stringify({ name }) });",
      '  return me.ok;',
      '}'
    ),
    'api/package.json': JSON.stringify({ name: 'ledger-api', type: 'module', scripts: { start: 'node server.mjs' } }),
    'api/server.mjs': lines(
      "import http from 'node:http';",
      "http.createServer((req, res) => res.end('[]')).listen(Number(process.env.PORT || 3000), '0.0.0.0');"
    ),
    'functions/me.ts':
      'export const handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ subject: event.requestContext.authorizer.jwt.claims.sub }) });\n',
    'functions/image/index.cjs': "exports.handler = async () => ({ shape: 'container-image', ok: true });\n",
    'functions/image/Dockerfile': lines(
      'FROM public.ecr.aws/lambda/nodejs:22',
      'COPY index.cjs ${LAMBDA_TASK_ROOT}/index.cjs',
      'CMD ["index.handler"]'
    ),
    ...overrides
  };
  return Object.fromEntries(Object.entries(files).filter((entry): entry is [string, string] => entry[1] !== undefined));
};

const OWNS_POOL = lines(
  '# Ledger',
  'Login uses Cognito USER_PASSWORD_AUTH, then calls GET /me behind a JWT authorizer.',
  'The stack creates its own Cognito user pool for these accounts.',
  'docs/ is a static site served by a hosting-bucket with CDN.'
);

/** The reviewer's existing-pool repro: sign-in and token verification against a pool another repository owns. */
const existingPoolServer = lines(
  "import express from 'express';",
  "import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';",
  "import { CognitoJwtVerifier } from 'aws-jwt-verify';",
  'const app = express();',
  'const cognito = new CognitoIdentityProviderClient({});',
  "const verifier = CognitoJwtVerifier.create({ userPoolId: process.env.AUTH_POOL_ID, clientId: process.env.AUTH_CLIENT_ID, tokenUse: 'access' });",
  "app.post('/login', async (req, res) => res.json(await cognito.send(new InitiateAuthCommand({ ClientId: process.env.AUTH_CLIENT_ID, AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: req.body }))));",
  "app.get('/me', async (req, res) => res.json(await verifier.verify(req.headers.authorization)));",
  'app.listen(3000);'
);

const DOGFOOD_CASES: EvalCase[] = [
  {
    name: 'r2qq: a project whose README says it creates its user pool gets one',
    files: ledger({ 'README.md': OWNS_POOL }),
    expect: {
      dependencyKinds: ['user-pool'],
      resources: {
        userPool: 'user-auth-pool',
        ledgerWeb: 'nextjs-web',
        ledgerApi: 'web-service',
        me: 'function',
        image: 'function',
        docs: 'hosting-bucket'
      },
      serviceEnvironment: [
        { resource: 'ledgerWeb', name: 'AUTH_CLIENT_ID', value: "$ResourceParam('userPool', 'clientId')" },
        { resource: 'ledgerWeb', name: 'ME_URL', value: "$ResourceParam('httpApiGateway', 'url')" }
      ],
      resourceProperties: [
        // No SignUp call: users are created by an administrator, not by anyone with the client ID.
        { resource: 'userPool', path: 'allowOnlyAdminsToCreateAccount', value: true },
        {
          resource: 'me',
          path: 'events.0.properties.authorizer',
          value: { type: 'cognito', properties: { userPoolName: 'userPool' } }
        },
        { resource: 'docs', path: 'uploadDirectoryPath', value: 'docs' },
        // The Lambda image's Dockerfile is no always-running worker.
        { resource: 'ledger', path: 'packaging', value: undefined }
      ],
      gapsInclude: [
        'functions/image/Dockerfile builds a container-image Lambda function',
        // Two backends, the me function and the API: which one API_URL means is the user's call.
        'reads API_URL, an address nothing in the configuration sets'
      ]
    }
  },
  {
    name: 'r2qq: a script that creates users proves the pool is the project’s',
    files: ledger({
      'scripts/seed-users.mjs': lines(
        "import { CognitoIdentityProviderClient, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';",
        "await new CognitoIdentityProviderClient({}).send(new AdminCreateUserCommand({ UserPoolId: process.env.AUTH_POOL_ID, Username: 'admin' }));"
      )
    }),
    expect: { resources: { userPool: 'user-auth-pool' } }
  },
  {
    name: 'r2qq review: sign-in and token checks against an existing pool create no pool',
    files: {
      'package.json': packageJson({
        name: 'review-app',
        scripts: { start: 'node server.js' },
        dependencies: {
          express: '4.21.0',
          '@aws-sdk/client-cognito-identity-provider': '3.0.0',
          'aws-jwt-verify': '5.0.0'
        }
      }),
      'README.md':
        'Uses the existing company Cognito pool, maintained in a separate infrastructure repository. Set AUTH_CLIENT_ID and AUTH_POOL_ID.\n',
      'server.js': existingPoolServer
    },
    expect: {
      resourceProperties: [
        { resource: 'userPool', path: 'allowOnlyAdminsToCreateAccount', value: undefined },
        // Neither ID is rewired to a new pool, and neither becomes a secret.
        { resource: 'reviewApp', path: 'environment', value: undefined }
      ],
      gapsInclude: ['Nothing in the repository creates that pool', 'set AUTH_CLIENT_ID and AUTH_POOL_ID']
    }
  },
  {
    name: 'r2qq: a handler reading JWT claims without a pool of the project keeps its route, with a gap',
    files: ledger(),
    expect: {
      resourceProperties: [
        { resource: 'userPool', path: 'allowOnlyAdminsToCreateAccount', value: undefined },
        { resource: 'me', path: 'events.0.properties.path', value: '/{proxy+}' },
        { resource: 'me', path: 'events.0.properties.authorizer', value: undefined }
      ],
      gapsInclude: ['me reads the claims of a JWT authorizer']
    }
  },
  {
    name: 'r2qq review: a comment about JWT claims leaves a public route public',
    files: {
      'package.json': packageJson({ name: 'review-app' }),
      'README.md': 'The stack creates its own Cognito user pool.\n',
      'handler.ts': lines(
        "import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';",
        '// Public endpoint: unlike private handlers, do not read event.requestContext.authorizer.jwt.claims.',
        'export const handler: APIGatewayProxyHandlerV2 = async (event) => ({ statusCode: 200, body: event.rawPath });'
      ),
      'login.ts': lines(
        "import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';",
        "export const login = () => new CognitoIdentityProviderClient({}).send(new InitiateAuthCommand({ ClientId: process.env.AUTH_CLIENT_ID, AuthFlow: 'USER_PASSWORD_AUTH' }));"
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'handler', path: 'events.0.properties.path', value: '/{proxy+}' },
        { resource: 'handler', path: 'events.0.properties.authorizer', value: undefined }
      ]
    }
  },
  {
    name: 'r2qq review: claims read optionally are a public route',
    files: {
      'package.json': packageJson({ name: 'review-app' }),
      'handler.ts': lines(
        "import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';",
        "export const handler: APIGatewayProxyHandlerV2 = async (event) => ({ statusCode: 200, body: event.requestContext.authorizer?.jwt?.claims?.sub ?? 'guest' });"
      )
    },
    expect: {
      resourceProperties: [
        { resource: 'handler', path: 'events.0.properties.path', value: '/{proxy+}' },
        { resource: 'handler', path: 'events.0.properties.authorizer', value: undefined }
      ]
    }
  },
  {
    name: 'r2qq review: API_URL with two backends stays unset, with a gap',
    files: {
      'package.json': packageJson({ name: 'multi-app', workspaces: ['apps/*'] }),
      'apps/accounts/package.json': JSON.stringify({
        name: 'accounts',
        scripts: { start: 'node server.js' },
        dependencies: { express: '4.21.0' }
      }),
      'apps/accounts/server.js': "import express from 'express'; const app = express(); app.listen(3000);\n",
      'apps/metrics/package.json': JSON.stringify({
        name: 'metrics',
        scripts: { start: 'node server.js' },
        dependencies: { express: '4.21.0' }
      }),
      'apps/metrics/server.js': "import express from 'express'; const app = express(); app.listen(3000);\n",
      'apps/web/package.json': JSON.stringify({
        name: 'web',
        scripts: { start: 'next start', build: 'next build' },
        dependencies: { next: '15.0.0', react: '19.0.0' }
      }),
      'apps/web/app/page.tsx': lines(
        'export default async function Page() {',
        "  await fetch(process.env.ACCOUNTS_URL + '/health');",
        "  const users = await fetch(process.env.API_URL + '/users');",
        '  return <p>{await users.text()}</p>;',
        '}'
      )
    },
    expect: {
      serviceEnvironment: [{ resource: 'web', name: 'ACCOUNTS_URL', value: "$ResourceParam('accounts', 'url')" }],
      resourceProperties: [{ resource: 'web', path: 'environment.1', value: undefined }],
      gapsInclude: ['web reads API_URL, an address nothing in the configuration sets']
    }
  },
  {
    name: 'r2qq: a Lambda Dockerfile with no handler source gets one gap and no worker',
    files: {
      'package.json': packageJson({ name: 'imaging' }),
      'lambda/Dockerfile': lines('FROM public.ecr.aws/lambda/python:3.12', 'COPY app.py ./', 'CMD ["app.handler"]'),
      'lambda/requirements.txt': 'pillow\n'
    },
    expect: {
      resourceProperties: [{ resource: 'lambda', path: 'packaging', value: undefined }],
      gapsInclude: ['lambda/Dockerfile builds a container-image Lambda function', 'init created nothing for it']
    }
  },
  {
    name: 'r2qq: an address the frontend reads that matches no service is a gap',
    files: {
      'package.json': packageJson({
        dependencies: { next: '15.5.7', react: '19.1.0' },
        scripts: { build: 'next build' }
      }),
      'app/actions.js': lines(
        '"use server";',
        "export async function load() { return fetch(process.env.BILLING_URL + '/invoices'); }"
      )
    },
    expect: { gapsInclude: ['reads BILLING_URL, an address nothing in the configuration sets'] }
  },
  {
    name: "r2au O09: API_URL binds to the project's one backend when no other variable names it",
    files: {
      'web/package.json': packageJson({
        name: 'shop-web',
        dependencies: { next: '15.5.7', react: '19.1.0' },
        scripts: { build: 'next build', start: 'next start' }
      }),
      'web/app/actions.js': lines(
        '"use server";',
        "export async function load() { return fetch(process.env.API_URL + '/orders'); }"
      ),
      'api/package.json': packageJson({ name: 'shop-api', scripts: { start: 'node server.mjs' } }),
      'api/server.mjs': lines(
        "import http from 'node:http';",
        "http.createServer((req, res) => res.end('[]')).listen(Number(process.env.PORT || 3000), '0.0.0.0');"
      )
    },
    expect: {
      serviceEnvironment: [{ resource: 'shopWeb', name: 'API_URL', value: "$ResourceParam('shopApi', 'url')" }]
    }
  },
  {
    name: 'r2au O09 control: API_URL stays a gap when two backends remain',
    files: {
      'web/package.json': packageJson({
        name: 'ledger-web',
        dependencies: { next: '15.5.7', react: '19.1.0' },
        scripts: { build: 'next build', start: 'next start' }
      }),
      'web/app/actions.js': lines(
        '"use server";',
        "export async function load() { return fetch(process.env.API_URL + '/experiments'); }"
      ),
      'orders/package.json': packageJson({ name: 'orders', scripts: { start: 'node server.mjs' } }),
      'orders/server.mjs': "import http from 'node:http';\nhttp.createServer((q, r) => r.end()).listen(3000);\n",
      'billing/package.json': packageJson({ name: 'billing', scripts: { start: 'node server.mjs' } }),
      'billing/server.mjs': "import http from 'node:http';\nhttp.createServer((q, r) => r.end()).listen(3001);\n"
    },
    expect: { gapsInclude: ['reads API_URL, an address nothing in the configuration sets'] }
  },
  {
    name: 'r2au O11: Amplify sign-in with a defineAuth pool creates no pool and says why and what to add',
    files: {
      'package.json': packageJson({
        name: 'audit-app',
        type: undefined,
        scripts: { start: 'node server.js' },
        dependencies: { express: '5.0.0', 'aws-amplify': '6.0.0', '@aws-amplify/backend': '1.0.0' }
      }),
      'server.js':
        "const express=require('express');const {signIn}=require('aws-amplify/auth');const app=express();app.use(express.json());app.post('/login',async(req,res)=>res.json(await signIn({username:req.body.username,password:req.body.password})));app.listen(4100);\n",
      'amplify/auth/resource.ts':
        "import {defineAuth} from '@aws-amplify/backend';export const auth=defineAuth({loginWith:{email:true}});\n"
    },
    expect: {
      resources: { auditApp: 'web-service' },
      onlyResources: true,
      gapsInclude: [
        'amplify/auth/resource.ts line 1 declares a pool with defineAuth',
        'Stacktape does not reuse a pool Amplify deployed and does not move its users to a new one',
        "add userPool: { type: user-auth-pool, properties: { allowEmailAsUserName: true } } and pass $ResourceParam('userPool', 'id')"
      ]
    }
  },
  {
    name: 'r2au O11 control: Amplify sign-in with no pool in the repository creates none and says so',
    files: {
      'package.json': packageJson({
        name: 'audit-app',
        scripts: { start: 'node server.js' },
        dependencies: { express: '5.0.0', 'aws-amplify': '6.0.0' }
      }),
      'server.js': lines(
        "import express from 'express';",
        "import { signIn } from 'aws-amplify/auth';",
        'const app = express();',
        "app.post('/login', async (req, res) => res.json(await signIn({ username: 'a', password: 'b' })));",
        'app.listen(4100);'
      )
    },
    expect: {
      resources: { auditApp: 'web-service' },
      onlyResources: true,
      gapsInclude: ['Nothing in the repository creates that pool, so it is probably an existing one']
    }
  },
  {
    name: 'r2au O12: a Go main that blocks forever and prints listener text is a worker',
    files: {
      'go.mod': 'module example.org/audit\ngo 1.24\n',
      'main.go': 'package main\nimport "fmt"\nfunc main(){fmt.Println(`http.ListenAndServe(":9876", nil)`);select{}}\n'
    },
    expect: {
      resources: { audit: 'worker-service' },
      resourceProperties: [
        { resource: 'audit', path: 'packaging', value: { type: 'buildpack', properties: { sourceDirectoryPath: '.' } } }
      ]
    }
  },
  {
    name: 'r2au O12: each go.work member gets a resource, the server and its worker sibling',
    files: {
      'go.work': 'go 1.24\nuse (\n ./api\n ./worker\n)\n',
      'api/go.mod': 'module example.org/api\ngo 1.24\n',
      'api/main.go': 'package main\nimport "net/http"\nfunc main(){http.ListenAndServe(":4321",nil)}\n',
      'worker/go.mod': 'module example.org/worker\ngo 1.24\n',
      'worker/main.go': lines(
        'package main',
        'func main() {',
        ' jobs := make(chan string)',
        ' for {',
        '  job := <-jobs',
        '  println(job)',
        ' }',
        '}'
      )
    },
    expect: {
      resources: { api: 'web-service', worker: 'worker-service' },
      onlyResources: true,
      servicePorts: [{ resource: 'api', port: 4321 }]
    }
  },
  {
    name: 'r2au O12 control: a run-once Go program, a signal-cancelled one and a library module are no services',
    files: {
      'go.work': 'go 1.24\nuse (\n ./tool\n ./cancel\n ./lib\n)\n',
      'tool/go.mod': 'module example.org/tool\ngo 1.24\n',
      'tool/main.go': 'package main\nimport "fmt"\nfunc main(){fmt.Println("done")}\n',
      'cancel/go.mod': 'module example.org/cancel\ngo 1.24\n',
      'cancel/main.go': lines(
        'package main',
        'import ("context"; "os"; "os/signal")',
        'func main() {',
        ' ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)',
        ' defer stop()',
        ' <-ctx.Done()',
        '}'
      ),
      'lib/go.mod': 'module example.org/lib\ngo 1.24\n',
      'lib/lib.go': 'package lib\nfunc Loop(){for {}}\n'
    },
    expect: {
      resourceProperties: [
        { resource: 'tool', path: 'packaging', value: undefined },
        { resource: 'cancel', path: 'packaging', value: undefined },
        { resource: 'lib', path: 'packaging', value: undefined }
      ]
    }
  },
  {
    name: 'r2au O13: a Nuxt app built with nuxt generate and a top-level ssr:false is a single-page static site',
    files: {
      'package.json': packageJson({
        name: 'audit-app',
        scripts: { build: 'nuxt generate', start: 'npx serve .output/public' },
        dependencies: { nuxt: '3.16.0' }
      }),
      'nuxt.config.ts': 'export default defineNuxtConfig({ssr:false});\n',
      'app.vue': '<template><main>ok</main></template>\n'
    },
    expect: {
      resources: { auditApp: 'hosting-bucket' },
      resourceProperties: [
        { resource: 'auditApp', path: 'uploadDirectoryPath', value: '.output/public' },
        { resource: 'auditApp', path: 'hostingContentType', value: 'single-page-app' },
        { resource: 'auditApp', path: 'build', value: { command: 'npm run build' } }
      ]
    }
  },
  {
    name: 'r2au O13: a generated Nuxt app that renders on the server is a static website',
    files: {
      'package.json': packageJson({
        name: 'audit-app',
        scripts: { build: 'nuxt generate' },
        dependencies: { nuxt: '3.16.0' }
      }),
      'nuxt.config.ts': 'export default defineNuxtConfig({});\n',
      'app.vue': '<template><main>ok</main></template>\n'
    },
    expect: {
      resources: { auditApp: 'hosting-bucket' },
      resourceProperties: [{ resource: 'auditApp', path: 'hostingContentType', value: 'static-website' }]
    }
  },
  {
    name: 'r2au O13 control: a generated Nuxt app with server routes keeps its server',
    files: {
      'package.json': packageJson({
        name: 'audit-app',
        scripts: { build: 'nuxt generate' },
        dependencies: { nuxt: '3.16.0' }
      }),
      'nuxt.config.ts': 'export default defineNuxtConfig({});\n',
      'server/api/hello.ts': "export default defineEventHandler(() => 'hi');\n",
      'app.vue': '<template><main>ok</main></template>\n'
    },
    expect: { resources: { auditApp: 'nuxt-web' } }
  },
  {
    name: 'r2au O14: a channels_redis layer gets a Redis and a gap naming its fixed address',
    files: {
      'requirements.txt': 'Django==5.1\nchannels==4.2\nchannels-redis==4.2\ndaphne==4.1\n',
      'manage.py': 'import os\nos.environ.setdefault("DJANGO_SETTINGS_MODULE","project.settings")\n',
      Procfile: 'web: daphne -b 0.0.0.0 -p $PORT project.asgi:application\n',
      'project/asgi.py': lines(
        'from channels.routing import ProtocolTypeRouter, URLRouter',
        'from django.core.asgi import get_asgi_application',
        'application=ProtocolTypeRouter({"http":get_asgi_application(),"websocket":URLRouter([])})'
      ),
      'project/settings.py': lines(
        'ASGI_APPLICATION="project.asgi.application"',
        'CHANNEL_LAYERS={"default":{"BACKEND":"channels_redis.core.RedisChannelLayer","CONFIG":{"hosts":[("redis",6379)]}}}'
      )
    },
    expect: {
      dependencyKinds: ['redis'],
      resources: { cache: 'redis' },
      gapsInclude: ['project/settings.py line 2 sets CHANNEL_LAYERS to a fixed Redis address']
    }
  },
  {
    name: 'r2au O14 control: a channels_redis layer that reads REDIS_URL needs no address gap',
    files: {
      'requirements.txt': 'Django==5.1\nchannels==4.2\nchannels-redis==4.2\ndaphne==4.1\n',
      'manage.py': 'import os\nos.environ.setdefault("DJANGO_SETTINGS_MODULE","project.settings")\n',
      Procfile: 'web: daphne -b 0.0.0.0 -p $PORT project.asgi:application\n',
      'project/asgi.py': lines(
        'from channels.routing import ProtocolTypeRouter, URLRouter',
        'from django.core.asgi import get_asgi_application',
        'application=ProtocolTypeRouter({"http":get_asgi_application(),"websocket":URLRouter([])})'
      ),
      'project/settings.py': lines(
        'import os',
        'CHANNEL_LAYERS={"default":{"BACKEND":"channels_redis.core.RedisChannelLayer","CONFIG":{"hosts":[os.environ["REDIS_URL"]]}}}'
      )
    },
    expect: {
      resources: { cache: 'redis' },
      gapsExclude: ['fixed Redis address', 'does not read a configurable address']
    }
  },
  {
    name: 'r2au O22: a one-argument handler reading pathParameters and returning statusCode is an HTTP function',
    files: {
      'package.json': packageJson({
        dependencies: { '@aws-sdk/client-dynamodb': '^3.0.0', '@aws-sdk/lib-dynamodb': '^3.0.0' }
      }),
      'handler.js': lines(
        "import {DynamoDBClient} from '@aws-sdk/client-dynamodb';",
        "import {DynamoDBDocumentClient, GetCommand} from '@aws-sdk/lib-dynamodb';",
        'const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));',
        'export async function handler(event){',
        '  const item=await client.send(new GetCommand({TableName:process.env.TABLE_NAME,Key:{tenant:event.pathParameters.tenant,id:event.pathParameters.id}}));',
        '  return {statusCode:200,body:JSON.stringify(item.Item)};',
        '}'
      )
    },
    expect: {
      resources: { handler: 'function', mainTable: 'dynamo-db-table' },
      gapsInclude: ['handler reads the path parameters tenant, id, but init could not tell its route']
    }
  },
  {
    name: 'r2au O22 control: an exported one-argument function that reads no request is not deployed',
    files: {
      'package.json': packageJson({}),
      'handler.js': 'export async function handler(event) { return { statusCode: 200, body: String(event) }; }\n'
    },
    expect: { resourceProperties: [{ resource: 'handler', path: 'packaging', value: undefined }] }
  }
];

/**
 * The PR #424 review's fixtures (r2av): repositories where an inference rule of the first version produced a confident
 * wrong configuration. Each must compose exactly what main composed, adding at most a named gap. Resource sets are main's
 * and complete (`onlyResources`), and the wiring main emitted is asserted, so a different wired config fails.
 */
const parcel = DEV_RUNNABLE_FIXTURES['r2ll-parcel'];
const PARCEL_MAIN_RESOURCES = {
  mainDatabase: 'relational-database',
  mainTable: 'dynamo-db-table',
  jobQueue: 'sqs-queue',
  notificationsTopic: 'sns-topic',
  httpApiGateway: 'http-api-gateway',
  parcelWeb: 'sveltekit-web',
  audit: 'function',
  billing: 'function',
  ping: 'function',
  api: 'web-service'
};
const PARCEL_MAIN_WIRING = [
  { resource: 'audit', path: 'events', value: [{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }] },
  { resource: 'billing', path: 'events', value: [{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }] },
  { resource: 'jobQueue', path: 'policyStatements', value: undefined }
];
const sqsHandlerMain = (handler: string) => ({
  resources: { jobQueue: 'sqs-queue', [handler]: 'function' },
  onlyResources: true,
  resourceProperties: [
    { resource: handler, path: 'events', value: [{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }] }
  ]
});

const REVIEW_CASES: EvalCase[] = [
  {
    name: 'r2av review sqs-forwarded-http: an SQS handler reading a forwarded request keeps its queue',
    files: {
      'package.json': '{"name": "replay-worker"}',
      'functions/replay.js': lines(
        'export async function handler(event) {',
        ' for (const record of event.Records) {',
        '   const original = JSON.parse(record.body);',
        '   console.log(original.pathParameters.id);',
        ' }',
        ' return { statusCode: 200 };',
        '}'
      )
    },
    expect: sqsHandlerMain('replay')
  },
  {
    name: 'r2av review sqs-test-http-string: request-shaped samples beside an SQS handler change nothing',
    files: {
      'package.json': '{"name": "job-worker"}',
      'functions/handler.js': lines(
        'export async function handler(event) {',
        ' for (const record of event.Records) console.log(JSON.parse(record.body));',
        ' return { batchItemFailures: [] };',
        '}',
        'const sample = {pathParameters: {id: "123"}};',
        'const expectedResponse = {statusCode: 200};'
      )
    },
    expect: sqsHandlerMain('handler')
  },
  {
    name: 'r2av review api-url-same-backend: API_URL is a gap when ME_URL already names the one backend',
    files: {
      'README.md': '# Dashboard\nME_URL and API_URL both point to the public HTTP API Gateway.\n',
      'admin/package.json': '{"name": "admin-api", "scripts": {"start": "node server.mjs"}}',
      'admin/server.mjs':
        "import http from 'node:http';\nhttp.createServer((req,res)=>{res.end('healthy')}).listen(3000);\n",
      'functions/package.json': '{"dependencies": {"@types/aws-lambda": "^8.10.0"}}',
      'functions/me.ts': lines(
        "import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';",
        'export const handler: APIGatewayProxyHandlerV2 = async(event)=>{',
        " if(event.rawPath === '/me') return {statusCode:200,body:'{}'};",
        " return {statusCode:404,body:'not found'};",
        '};'
      ),
      'web/package.json': packageJson({
        name: 'dashboard-web',
        dependencies: { next: '15.5.7', react: '19.1.0' },
        scripts: { build: 'next build', start: 'next start' }
      }),
      'web/app/actions.js': lines(
        '"use server";',
        'export async function load(){',
        " const me = await fetch(process.env.ME_URL + '/me');",
        " const profile = await fetch(process.env.API_URL + '/profile');",
        ' return [await me.json(), await profile.json()];',
        '}'
      )
    },
    expect: {
      resources: {
        httpApiGateway: 'http-api-gateway',
        adminApi: 'web-service',
        dashboardWeb: 'nextjs-web',
        me: 'function'
      },
      onlyResources: true,
      resourceProperties: [
        {
          resource: 'dashboardWeb',
          path: 'environment',
          value: [{ name: 'ME_URL', value: "$ResourceParam('httpApiGateway', 'url')" }]
        }
      ],
      gapsInclude: ['dashboard-web reads API_URL, an address nothing in the configuration sets']
    }
  },
  {
    name: 'r2av review api-url-named-single-backend: API_URL is a gap when ME_URL names the only backend',
    files: {
      'functions/package.json': '{"dependencies": {"@types/aws-lambda": "^8.10.0"}}',
      'functions/me.ts': lines(
        "import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';",
        "export const handler: APIGatewayProxyHandlerV2 = async () => ({ statusCode: 200, body: '{}' });"
      ),
      'web/package.json': packageJson({
        name: 'dashboard-web',
        dependencies: { next: '15.5.7', react: '19.1.0' },
        scripts: { build: 'next build', start: 'next start' }
      }),
      'web/app/actions.js': lines(
        '"use server";',
        "export async function load(){ await fetch(process.env.ME_URL + '/me'); return fetch(process.env.API_URL + '/profile'); }"
      )
    },
    expect: {
      resources: { httpApiGateway: 'http-api-gateway', dashboardWeb: 'nextjs-web', me: 'function' },
      onlyResources: true,
      resourceProperties: [
        {
          resource: 'dashboardWeb',
          path: 'environment',
          value: [{ name: 'ME_URL', value: "$ResourceParam('httpApiGateway', 'url')" }]
        }
      ],
      gapsInclude: ['dashboard-web reads API_URL, an address nothing in the configuration sets']
    }
  },
  {
    name: 'r2av review finite-go-migration: a Go main that cancels one statement on a signal is no worker',
    files: {
      'go.mod': 'module example.org/migrate\ngo 1.24\nrequire github.com/lib/pq v1.10.9\n',
      'main.go': lines(
        'package main',
        'import("context";"os";"os/signal";"database/sql"; _ "github.com/lib/pq")',
        'func main() {',
        ' ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)',
        ' defer stop()',
        ' db, err := sql.Open("postgres",os.Getenv("DATABASE_URL")); if err != nil {panic(err)}',
        ' defer db.Close()',
        ' if _,err := db.ExecContext(ctx,"ALTER TABLE invoices ADD COLUMN archived BOOLEAN DEFAULT false"); err != nil {panic(err)}',
        '}'
      ),
      'README.md': '# Schema migration CLI\nRun once with `go run .` before deploying.\n'
    },
    expect: {
      resources: { mainDatabase: 'relational-database', databaseBastion: 'bastion' },
      onlyResources: true
    }
  },
  {
    name: 'r2av review amplify-external-pool: a sandbox defineAuth beside an existing pool creates no pool',
    files: {
      'README.md': lines(
        '# Login application',
        'Production signs in to the existing shared company Cognito pool with its current users.',
        'The amplify/auth/resource.ts declaration is for isolated sandbox environments only.'
      ),
      'server.js': lines(
        "import {Amplify} from 'aws-amplify';",
        "import outputs from './amplify_outputs.json';",
        'Amplify.configure(outputs);',
        "import express from 'express';",
        "import {signIn} from 'aws-amplify/auth';",
        'const app = express();',
        "app.post('/login',async(req,res)=>res.json(await signIn(req.body)));",
        'app.listen(4100);'
      ),
      'amplify_outputs.json':
        '{"auth": {"user_pool_id": "eu-west-1_existing", "user_pool_client_id": "existing-client"}}',
      'package.json':
        '{"name": "login-app", "scripts": {"start": "node server.js"}, "dependencies": {"express": "5.0.0", "aws-amplify": "6.0.0", "@aws-amplify/backend": "1.0.0"}}',
      'amplify/auth/resource.ts':
        "import {defineAuth} from '@aws-amplify/backend';\nexport const auth=defineAuth({loginWith:{email:true}});\n"
    },
    expect: {
      resources: { loginApp: 'web-service' },
      onlyResources: true,
      resourceProperties: [{ resource: 'loginApp', path: 'connectTo', value: undefined }],
      gapsInclude: ['Stacktape does not reuse a pool Amplify deployed']
    }
  },
  {
    name: 'r2av review readme-example-dlq: a tutorial dead-letter queue in the README is a gap, not a redrive policy',
    files: {
      'README.md': lines(
        '# Payment processor',
        'This worker retries failed payments until the external gateway recovers.',
        '',
        '## Related AWS example',
        "The AWS tutorial's demo queue sends messages to a dead-letter queue after two failed attempts."
      ),
      'package.json': '{"name": "job-worker"}',
      'functions/handler.js': lines(
        'export async function handler(event) {',
        ' for (const record of event.Records) {',
        '   console.log(JSON.parse(record.body));',
        ' }',
        '}'
      )
    },
    expect: {
      ...sqsHandlerMain('handler'),
      resourceProperties: [
        ...sqsHandlerMain('handler').resourceProperties,
        { resource: 'jobQueue', path: 'redrivePolicy', value: undefined }
      ],
      gapsInclude: [
        'README.md line 5 mentions a dead-letter queue after 2 failed receives. init does not add one from README text, and the line does not say which queue it means'
      ]
    }
  },
  {
    name: 'r2av review sns-intentionally-shared: historical fanout text keeps the shared queue and its gap',
    files: {
      ...parcel,
      'README.md': lines(
        '# Parcel',
        'Previously, the SNS topic fanned out to billingQueue and auditQueue.',
        'The current billing and audit functions compete for work on one shared queue; process each parcel only once.'
      )
    },
    expect: {
      resources: PARCEL_MAIN_RESOURCES,
      onlyResources: true,
      configAbsent: ['cloudformationResources'],
      resourceProperties: PARCEL_MAIN_WIRING,
      gapsInclude: ['audit and billing both consume jobQueue, so each message reaches only one of them']
    }
  },
  {
    name: 'r2av review sns-envelope-helper: consumers decoding the SNS envelope keep the shared queue and its gap',
    files: {
      ...parcel,
      'functions/decode.ts':
        'export function decodeSnsBody(body: string) { return JSON.parse(JSON.parse(body).Message); }\n',
      'functions/audit.ts': parcel['functions/audit.ts']!.replace(/JSON\.parse\(r\.body\)/, 'decodeSnsBody(r.body)'),
      'functions/billing.ts': parcel['functions/billing.ts']!.replace(
        /JSON\.parse\(record\.body\)/,
        'decodeSnsBody(record.body)'
      )
    },
    expect: {
      resources: PARCEL_MAIN_RESOURCES,
      onlyResources: true,
      configAbsent: ['cloudformationResources'],
      resourceProperties: PARCEL_MAIN_WIRING,
      gapsInclude: ['Add RawMessageDelivery: true to a subscription only if its handler parses the published message']
    }
  },
  {
    name: 'r2av review nuxt-mixed-ssr: route rules keep the Nuxt server resource',
    files: {
      'nuxt.config.ts': "export default defineNuxtConfig({\n routeRules: {'/dashboard/**': {ssr: false}}\n});\n",
      'app.vue': '<template><NuxtPage/></template>\n',
      'package.json': '{"name": "blog", "scripts": {"build": "nuxt generate"}, "dependencies": {"nuxt": "3.16.0"}}',
      'pages/index.vue': '<template><p>Home</p></template>\n'
    },
    expect: { resources: { blog: 'nuxt-web' }, onlyResources: true }
  },
  {
    name: 'r2av review nuxt-custom-output: a moved output directory keeps the Nuxt server resource',
    files: {
      'nuxt.config.ts': "export default defineNuxtConfig({nitro:{output:{publicDir:'dist'}}});\n",
      'app.vue': '<template><h1>Docs</h1></template>\n',
      'package.json': '{"name": "docs", "scripts": {"build": "nuxt generate"}, "dependencies": {"nuxt": "3.16.0"}}'
    },
    expect: { resources: { docs: 'nuxt-web' }, onlyResources: true }
  },
  {
    name: 'r2av review nuxt-wrong-preset: an image preset named static does not make a server build static',
    files: {
      'nuxt.config.ts': lines(
        'export default defineNuxtConfig({',
        " nitro: { preset: 'node-server' },",
        " image: { presets: { hero: { modifiers: { preset: 'static' } } } }",
        '});'
      ),
      'app.vue': '<template><NuxtPage/></template>\n',
      'package.json':
        '{"name": "blog", "scripts": {"build": "nuxt build"}, "dependencies": {"nuxt": "3.16.0", "@nuxt/image": "1.10.0"}}'
    },
    expect: { resources: { blog: 'nuxt-web' }, onlyResources: true }
  },
  {
    name: 'r2av review channels-memory: the in-memory channel layer needs no Redis',
    files: {
      'requirements.txt': 'Django==5.1\nchannels==4.2\nchannels-redis==4.2\ndaphne==4.1\n',
      'manage.py': 'import os\nos.environ.setdefault("DJANGO_SETTINGS_MODULE","project.settings")\n',
      Procfile: 'web: daphne -b 0.0.0.0 -p $PORT project.asgi:application\n',
      'project/asgi.py': 'from django.core.asgi import get_asgi_application\napplication=get_asgi_application()\n',
      'project/settings.py': 'CHANNEL_LAYERS={"default":{"BACKEND":"channels.layers.InMemoryChannelLayer"}}\n'
    },
    expect: {
      absentDependencyKinds: ['redis'],
      resourceProperties: [{ resource: 'cache', path: 'engine', value: undefined }],
      gapsExclude: ['Redis']
    }
  }
];

describe('source inference end-to-end corpus', () => {
  for (const evalCase of [...CASES, ...DOGFOOD_CASES, ...REVIEW_CASES]) {
    it(evalCase.name, async () => {
      const score = await runEvalCase(evalCase);
      if (!score.passed) {
        throw new Error(score.failures.map((failure) => `[${failure.stage}] ${failure.detail}`).join('\n'));
      }
      expect(score.passed).toBe(true);
    });
  }
});
