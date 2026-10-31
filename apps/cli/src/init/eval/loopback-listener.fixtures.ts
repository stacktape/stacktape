/**
 * Repositories for the loopback-listener differential (r2ba and the #425 review). Each has a real API in
 * `packages/api`, which must stay. `omitted` names the listener file init leaves out; without it, init must produce
 * exactly main's workloads. `loopback-listener.main.json` records main's resources for each fixture.
 */

const json = (value: unknown) => JSON.stringify(value);
const lines = (...entries: string[]) => `${entries.join('\n')}\n`;

const workspace = (files: Record<string, string>): Record<string, string> => ({
  'package.json': json({ name: 'demo', private: true, workspaces: ['packages/*', 'tools/*'] }),
  'packages/api/package.json': json({
    name: 'api',
    scripts: { start: 'node server.js' },
    dependencies: { express: '5.0.0' }
  }),
  'packages/api/server.js':
    "const http = require('node:http'); http.createServer((req,res)=>res.end('ok')).listen(3000);\n",
  ...files
});

const server = (port: number, host?: string) =>
  `const http = require('node:http'); http.createServer((req,res)=>res.end('ok')).listen(${port}${host === undefined ? '' : `, '${host}'`});\n`;
const callbackServer = lines(
  "import { createServer } from 'node:http';",
  'export const waitForCallback = () =>',
  '  new Promise((resolve) => {',
  '    const server = createServer((req, res) => { res.end(); resolve(req.url); server.close(); });',
  "    server.listen(0, '127.0.0.1');",
  '  });'
);
const k8sDeployment = (command: string) =>
  lines(
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: workload',
    'spec:',
    '  template:',
    '    spec:',
    '      containers:',
    '        - name: web',
    '          image: workload:latest',
    `          command: ${command}`
  );

export type LoopbackListenerFixture = { name: string; files: Record<string, string>; omitted?: string };

export const LOOPBACK_LISTENER_FIXTURES: LoopbackListenerFixture[] = [
  // The #425 review: each must keep main's workloads, or lose only the loopback listener.
  {
    name: 'review: bin server run by the root Procfile',
    files: workspace({
      Procfile: 'web: node packages/my-server/server.js\n',
      'packages/my-server/package.json': json({ name: 'my-server', bin: { 'my-server': 'server.js' } }),
      'packages/my-server/server.js': server(4100)
    })
  },
  {
    name: 'review: bin server run by the root Dockerfile through npx',
    files: workspace({
      Dockerfile:
        'FROM node:22\nWORKDIR /app\nCOPY . .\nRUN npm install && npm link ./packages/my-server\nCMD ["npx", "my-server"]\n',
      'packages/my-server/package.json': json({ name: 'my-server', bin: { 'my-server': 'server.js' } }),
      'packages/my-server/server.js': `#!/usr/bin/env node\n${server(4100)}`
    })
  },
  {
    name: 'review: bin server run by a Kubernetes Deployment through npx',
    files: workspace({
      'k8s/deployment.yaml': k8sDeployment('["npx", "my-server"]'),
      'packages/my-server/package.json': json({ name: 'my-server', bin: { 'my-server': 'server.js' } }),
      'packages/my-server/server.js': `#!/usr/bin/env node\n${server(4100)}`
    })
  },
  {
    name: 'review: auth-server with a start script',
    files: workspace({
      'packages/auth-server/package.json': json({
        name: 'auth-server',
        bin: { 'auth-server': 'index.js' },
        scripts: { start: 'node index.js' }
      }),
      'packages/auth-server/index.js': "require('./server.js');\n",
      'packages/auth-server/server.js': server(4200)
    })
  },
  {
    name: 'review: aliased Gin under tools/',
    files: workspace({
      'tools/admin/go.mod': 'module example.com/admin\n\ngo 1.24\n\nrequire github.com/gin-gonic/gin v1.10.0\n',
      'tools/admin/main.go':
        'package main\nimport router "github.com/gin-gonic/gin"\nfunc main() {\n app := router.Default()\n app.GET("/", func(c *router.Context) {c.String(200,"ok")})\n app.Run(":8080")\n}\n'
    })
  },
  {
    name: 'review: a loopback callback beside a SAM function keeps the function',
    files: workspace({
      'template.yaml':
        'AWSTemplateFormatVersion: "2010-09-09"\nTransform: AWS::Serverless-2016-10-31\nResources:\n  Backend:\n    Type: AWS::Serverless::Function\n    Properties:\n      CodeUri: packages/backend/\n      Handler: handler.handler\n      Runtime: nodejs22.x\n      Events:\n        Api:\n          Type: HttpApi\n          Properties:\n            Path: /\n            Method: GET\n',
      'packages/backend/package.json': json({ name: 'backend', bin: { 'admin-tool': 'tool.js' } }),
      'packages/backend/tool.js': "require('./src/callback.js');\n",
      'packages/backend/src/callback.js': server(4500, '127.0.0.1'),
      'packages/backend/handler.js': "exports.handler = async () => ({statusCode: 200, body: 'ok'});\n"
    }),
    omitted: 'packages/backend/src/callback.js'
  },
  {
    name: 'review: a loopback callback beside a BullMQ worker file (main runs no worker for it either)',
    files: workspace({
      'packages/backend/package.json': json({
        name: 'backend',
        bin: { 'admin-tool': 'tool.js' },
        dependencies: { bullmq: '5.0.0' }
      }),
      'packages/backend/tool.js': "require('./src/callback.js');\n",
      'packages/backend/src/callback.js': server(4500, '127.0.0.1'),
      'packages/backend/src/worker.js':
        "const { Worker } = require('bullmq'); new Worker('tasks', async job => { console.log(job.id); });\n"
    }),
    omitted: 'packages/backend/src/callback.js'
  },
  {
    name: 'review: a loopback server with an Nx serve target',
    files: workspace({
      'tools/admin/package.json': json({ name: 'admin', dependencies: { express: '5.0.0' } }),
      'tools/admin/project.json': json({
        name: 'admin',
        targets: { serve: { executor: 'nx:run-commands', options: { command: 'node tools/admin/server.js' } } }
      }),
      'tools/admin/server.js': server(4300, '127.0.0.1')
    })
  },
  // r2ba repros, reduced from Twenty's SDK and ToolJet's database plugins.
  {
    name: 'r2ba (Twenty SDK): a CLI whose only listener is a loopback login callback',
    files: workspace({
      'packages/twenty-sdk/package.json': json({
        name: 'twenty-sdk',
        bin: { twenty: 'dist/cli.cjs' },
        scripts: { build: 'vite build' }
      }),
      'packages/twenty-sdk/src/cli/index.ts':
        "import { waitForCallback } from './auth/callback-server';\nvoid waitForCallback;\n",
      'packages/twenty-sdk/src/cli/auth/callback-server.ts': callbackServer
    }),
    omitted: 'packages/twenty-sdk/src/cli/auth/callback-server.ts'
  },
  {
    name: 'r2ba (ToolJet): a library that opens SSH tunnels on 127.0.0.1',
    files: workspace({
      'packages/mongodb/package.json': json({
        name: '@tooljet-plugins/mongodb',
        main: 'dist/index.js',
        scripts: { build: 'tsc -b' }
      }),
      'packages/mongodb/lib/index.ts': lines(
        "import { createServer } from 'node:net';",
        'export const tunnel = (port: number) => {',
        '  const server = createServer();',
        "  server.listen(0, '127.0.0.1');",
        "  server.listen(port, '127.0.0.1');",
        '};'
      )
    }),
    omitted: 'packages/mongodb/lib/index.ts'
  },
  // Controls: main's behavior stays.
  {
    name: 'control (Dub CLI): a login callback on a fixed port that is not loopback',
    files: workspace({
      'packages/cli/package.json': json({
        name: 'dub-cli',
        bin: { dub: './dist/index.js' },
        scripts: { build: 'tsup', start: 'node dist/index.js ' }
      }),
      'packages/cli/src/index.ts': "import { login } from './api/callback';\nvoid login;\n",
      'packages/cli/src/api/callback.ts':
        "import http from 'node:http';\nexport const login = () => http.createServer((req, res) => res.end()).listen(4587);\n"
    })
  },
  {
    name: 'control (Fleet): a Go desktop tool under tools/',
    files: workspace({
      'tools/hangar/go.mod': 'module github.com/example/hangar\n\ngo 1.24\n',
      'tools/hangar/main.go':
        'package main\n\nimport "github.com/wailsapp/wails/v3/pkg/application"\n\nfunc main() {\n\tapp := application.New(application.Options{Name: "Hangar"})\n\tif err := app.Run(); err != nil {\n\t\tpanic(err)\n\t}\n}\n'
    })
  },
  {
    name: 'control: a loopback listener whose package has a start script',
    files: workspace({
      'packages/sidecar/package.json': json({ name: 'sidecar', scripts: { start: 'node index.js' } }),
      'packages/sidecar/index.js': server(4600, '127.0.0.1')
    })
  },
  {
    name: 'control: a loopback listener whose package has a Dockerfile',
    files: workspace({
      'packages/sidecar/package.json': json({ name: 'sidecar' }),
      'packages/sidecar/Dockerfile': 'FROM node:22\nCOPY . .\nCMD ["node", "index.js"]\n',
      'packages/sidecar/index.js': server(4600, '127.0.0.1')
    })
  },
  {
    name: 'control: a loopback listener whose package a Kubernetes Deployment names',
    files: workspace({
      'deploy/sidecar.yaml': k8sDeployment('["node", "packages/sidecar/index.js"]'),
      'packages/sidecar/package.json': json({ name: 'sidecar' }),
      'packages/sidecar/index.js': server(4600, '127.0.0.1')
    })
  },
  {
    name: 'control: a file with one loopback and one public listener',
    files: workspace({
      'packages/sidecar/package.json': json({ name: 'sidecar' }),
      'packages/sidecar/index.js': `${server(4600, '127.0.0.1')}${server(4700)}`
    })
  },
  {
    name: 'control: a loopback listener at the repository root beside a Render blueprint',
    files: {
      'package.json': json({ name: 'demo', dependencies: { express: '5.0.0' } }),
      'render.yaml': 'services:\n  - type: web\n    name: demo\n    runtime: node\n    startCommand: node server.js\n',
      'server.js': server(4800, '127.0.0.1')
    }
  }
];
