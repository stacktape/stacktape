/**
 * How init reads the way a service takes traffic, through the complete pipeline: the r2ah audit's F21–F25. Each case
 * is a reduced repro of a repository where init produced a confident wrong configuration (WebSocket servers without
 * a load balancer that keeps connections open, wrong ports, non-HTTP processes as public web services, decoy Vite
 * output directories), paired with controls where the old behavior is right.
 */

import { describe, expect, it } from 'bun:test';
import { runEvalCase, type EvalCase } from './harness';

const lines = (...entries: string[]) => `${entries.join('\n')}\n`;
const packageJson = (fields: Record<string, unknown>) =>
  JSON.stringify({ name: 'audit-app', private: true, ...fields });
const expressPackage = packageJson({
  scripts: { start: 'node server.js' },
  dependencies: { express: '5.0.0', ws: '8.0.0', 'socket.io-client': '4.0.0' }
});
const ALB = { resource: 'auditApp', path: 'loadBalancing.type', value: 'application-load-balancer' };
const NO_ALB = { resource: 'auditApp', path: 'loadBalancing', value: undefined };

const WEBSOCKET_CASES: EvalCase[] = [
  {
    name: 'F21 (r2ah 59): an aliased ws WebSocketServer gets an Application Load Balancer',
    files: {
      'package.json': expressPackage,
      'server.js':
        "const express=require('express');const {WebSocketServer: WSS}=require('ws');const app=express();const server=app.listen(4100);new WSS({server});\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ALB] }
  },
  {
    name: 'F21 (r2ah 92) control: the unaliased WebSocketServer gets one too',
    files: {
      'package.json': expressPackage,
      'server.js':
        "const express=require('express');const {WebSocketServer}=require('ws');const app=express();const server=app.listen(4100);new WebSocketServer({server});\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ALB] }
  },
  {
    name: 'F21: an ESM import alias of the ws server class gets an Application Load Balancer',
    files: {
      'package.json': packageJson({
        type: 'module',
        scripts: { start: 'node server.js' },
        dependencies: { express: '5.0.0', ws: '8.0.0' }
      }),
      'server.js': lines(
        "import express from 'express';",
        "import { WebSocketServer as SocketServer } from 'ws';",
        'const server = express().listen(4100);',
        'new SocketServer({ server });'
      )
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ALB] }
  },
  {
    name: 'F21: a ws server class re-exported by a project module, started in another file, gets one',
    files: {
      'package.json': packageJson({
        type: 'module',
        scripts: { start: 'node src/server.js' },
        dependencies: { express: '5.0.0', ws: '8.0.0' }
      }),
      'src/server.js': lines(
        "import express from 'express';",
        "import { attachRealtime } from './realtime.js';",
        'const server = express().listen(4100);',
        'attachRealtime(server);'
      ),
      'src/sockets.js': "export { WebSocketServer as Hub } from 'ws';\n",
      'src/realtime.js': lines(
        "import { Hub } from './sockets.js';",
        'export const attachRealtime = (server) => new Hub({ server });'
      )
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ALB] }
  },
  {
    name: 'F21: socket.io started with require(...)(server) gets one',
    files: {
      'package.json': packageJson({
        scripts: { start: 'node server.js' },
        dependencies: { express: '5.0.0', 'socket.io': '4.0.0' }
      }),
      'server.js': lines(
        "const app = require('express')();",
        'const server = app.listen(4100);',
        "const io = require('socket.io')(server);",
        "io.on('connection', (socket) => socket.emit('ready'));"
      )
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ALB] }
  },
  {
    name: 'F21 review control: a ws server in a dev script the server never imports does not',
    files: {
      'package.json': packageJson({
        scripts: { start: 'node server.js' },
        dependencies: { express: '5.0.0', ws: '8.0.0' }
      }),
      'server.js': "require('express')().listen(3000);\n",
      'scripts/dev-socket.js': "const {WebSocketServer: WSS}=require('ws'); new WSS({port:9001});\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [NO_ALB] }
  },
  {
    name: 'F21 review control: a ws server in a test does not',
    files: {
      'package.json': packageJson({
        scripts: { start: 'node server.js' },
        dependencies: { express: '5.0.0', ws: '8.0.0' }
      }),
      'server.js': "require('express')().listen(3000);\n",
      'tests/socket.js': "const {WebSocketServer: WSS}=require('ws'); new WSS({port:9001});\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [NO_ALB] }
  },
  {
    name: 'F21 (r2ah 58) control: an outbound ws client does not',
    files: {
      'package.json': expressPackage,
      'server.js':
        "const express=require('express');const WebSocket=require('ws');const app=express();const client=new WebSocket('wss://upstream.example');app.get('/',(_,r)=>r.send('ok'));app.listen(4100);\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [NO_ALB] }
  },
  {
    name: 'F21 (r2ah 60) control: an outbound socket.io client does not',
    files: {
      'package.json': expressPackage,
      'server.js':
        "const express=require('express');const {io}=require('socket.io-client');const app=express();io('https://upstream.example');app.listen(4100);\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [NO_ALB] }
  },
  {
    name: 'F21 (r2ah 81): a Django Channels websocket router gets an Application Load Balancer',
    files: {
      'api/requirements.txt': lines('Django==5.1', 'channels==4.2', 'channels-redis==4.2', 'daphne==4.1'),
      'api/manage.py': lines('import os', 'os.environ.setdefault("DJANGO_SETTINGS_MODULE","project.settings")'),
      'api/Procfile': 'web: daphne -b 0.0.0.0 -p $PORT project.asgi:application\n',
      'api/project/asgi.py': lines(
        'from channels.routing import ProtocolTypeRouter, URLRouter',
        'from django.core.asgi import get_asgi_application',
        'application=ProtocolTypeRouter({"http":get_asgi_application(),"websocket":URLRouter([])})'
      ),
      'api/project/wsgi.py': lines(
        'from django.core.wsgi import get_wsgi_application',
        'application = get_wsgi_application()'
      ),
      'api/project/settings.py': 'ASGI_APPLICATION="project.asgi.application"\n'
    },
    expect: {
      resourceProperties: [
        { resource: 'api', path: 'loadBalancing.type', value: 'application-load-balancer' },
        {
          resource: 'api',
          path: 'packaging.properties.startCommand',
          value: 'daphne -b 0.0.0.0 -p $PORT project.asgi:application'
        }
      ]
    }
  },
  {
    name: 'F21 (r2ah 64) control: a FastAPI websocket route gets one',
    files: {
      'api/requirements.txt': lines('fastapi', 'uvicorn'),
      'api/main.py': lines(
        'from fastapi import FastAPI, WebSocket',
        'app = FastAPI()',
        "@app.websocket('/stream')",
        'async def stream(ws: WebSocket):',
        '    await ws.accept()'
      ),
      'api/Procfile': 'web: uvicorn main:app --host 0.0.0.0 --port $PORT\n'
    },
    expect: {
      resourceProperties: [{ resource: 'api', path: 'loadBalancing.type', value: 'application-load-balancer' }]
    }
  }
];

const PORT_CASES: EvalCase[] = [
  {
    name: 'F22 (r2ah 62): a computed listen port is a review item, not the first number in it',
    files: {
      'package.json': expressPackage,
      'server.js': "const express=require('express');const app=express();app.listen(4000 + 1);\n"
    },
    expect: {
      resources: { auditApp: 'web-service' },
      resourceProperties: [{ resource: 'auditApp', path: 'port', value: undefined }],
      gapsInclude: ['server.js sets the port auditApp listens on with an expression init could not read']
    }
  },
  {
    name: 'F22 (r2ah 61): a port literal with a numeric separator is read',
    files: {
      'package.json': expressPackage,
      'server.js': "const express=require('express');const app=express();app.listen(4_321);\n"
    },
    expect: { servicePorts: [{ resource: 'auditApp', port: 4321 }] }
  },
  {
    name: 'F22 (r2ah 55) control: a listen call inside a template interpolation keeps its port',
    files: {
      'package.json': expressPackage,
      'server.js': "const express=require('express');const app=express();const x=`ready: ${app.listen(4321)}`;\n"
    },
    expect: { servicePorts: [{ resource: 'auditApp', port: 4321 }] }
  },
  {
    name: 'F22 control: a listen port that follows PORT is no review item',
    files: {
      'package.json': expressPackage,
      'server.js': "const express=require('express');const app=express();app.listen(Number(process.env.PORT) + 0);\n"
    },
    expect: { resourceProperties: [{ resource: 'auditApp', path: 'port', value: undefined }] }
  },
  {
    name: 'F22 control: a helper server on listen(0), any free port, is no review item',
    files: {
      'package.json': expressPackage,
      'server.js': lines(
        "const express=require('express');const http=require('http');",
        "http.createServer().listen(0, '127.0.0.1');",
        'express().listen(4100);'
      )
    },
    expect: {
      servicePorts: [{ resource: 'auditApp', port: 4100 }]
    }
  },
  {
    name: 'F22 control: an ephemeral listen(0) callback server alone leaves the port to PORT',
    files: {
      'package.json': expressPackage,
      'server.js': lines(
        "require('http').createServer().listen(0, '127.0.0.1');",
        "require('express')().listen(process.env.PORT);"
      )
    },
    expect: { resourceProperties: [{ resource: 'auditApp', path: 'port', value: undefined }] }
  },
  {
    name: 'F22 (r2ah 66): a Go server listening on a constant address routes to its port',
    files: {
      'api/go.mod': lines('module example.org/audit', 'go 1.24'),
      'api/main.go': lines(
        'package main',
        'import "net/http"',
        'const addr=":4321"',
        'func main(){http.ListenAndServe(addr, http.NotFoundHandler())}'
      )
    },
    expect: { servicePorts: [{ resource: 'api', port: 4321 }] }
  },
  {
    name: 'F22 (r2ah 75): an ASP.NET app.Run URL fixes the port',
    files: {
      'Audit.sln': lines(
        'Microsoft Visual Studio Solution File, Format Version 12.00',
        'Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Api", "src/Api/Api.csproj", "{AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA}"',
        'EndProject'
      ),
      'src/Shared/Shared.csproj':
        '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>\n',
      'src/Shared/Value.cs': 'public class Value {}\n',
      'src/Api/Program.cs': lines(
        'var builder = WebApplication.CreateBuilder(args);',
        'var app = builder.Build();',
        'app.MapGet("/", () => "ok");',
        'app.Run("http://0.0.0.0:4321");'
      ),
      'src/Api/Api.csproj':
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup><ItemGroup><ProjectReference Include="../Shared/Shared.csproj" /></ItemGroup></Project>\n'
    },
    expect: { resources: { Api: 'web-service' }, servicePorts: [{ resource: 'Api', port: 4321 }] }
  }
];

const aspNetProject = (program: string) => ({
  'Review.csproj':
    '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>\n',
  'Program.cs': program
});

const ASPNET_CASES: EvalCase[] = [
  {
    name: 'F22 review: an app.Run URL in a block comment is no listener, and a variable URL keeps the port unset',
    files: aspNetProject(
      lines(
        'var builder = WebApplication.CreateBuilder(args);',
        'var app = builder.Build();',
        'app.MapGet("/", () => "ok");',
        '/* Previous deployment: app.Run("http://0.0.0.0:4321"); */',
        'const string url = "http://0.0.0.0:3000";',
        'app.Run(url);'
      )
    ),
    expect: {
      resources: { Review: 'web-service' },
      resourceProperties: [{ resource: 'Review', path: 'port', value: undefined }]
    }
  },
  {
    name: 'F22 review: UseUrls with several addresses routes to its first one',
    files: aspNetProject(
      lines(
        'var builder = WebApplication.CreateBuilder(args);',
        'builder.WebHost.UseUrls("http://0.0.0.0:4321", "http://0.0.0.0:5432");',
        'var app=builder.Build(); app.MapGet("/", () => "ok"); app.Run();'
      )
    ),
    expect: { servicePorts: [{ resource: 'Review', port: 4321 }] }
  },
  {
    name: 'F22 review control: a verbatim-string URL is read',
    files: aspNetProject(
      lines(
        'var app = WebApplication.CreateBuilder(args).Build();',
        '// app.Run("http://0.0.0.0:9999");',
        'app.Run(@"http://0.0.0.0:4321");'
      )
    ),
    expect: { servicePorts: [{ resource: 'Review', port: 4321 }] }
  }
];

const nestPackage = (dependencies: Record<string, string>) =>
  packageJson({
    scripts: { build: 'nest build', start: 'node dist/main.js' },
    dependencies: { '@nestjs/core': '11.0.0', '@nestjs/common': '11.0.0', rxjs: '7.0.0', ...dependencies }
  });

const PROCESS_CASES: EvalCase[] = [
  {
    name: 'F23 (r2ah 76): a TCP-only NestJS microservice is no public web service',
    files: {
      'package.json': nestPackage({ '@nestjs/microservices': '11.0.0' }),
      'src/main.ts': lines(
        "import {NestFactory} from '@nestjs/core';import {Transport} from '@nestjs/microservices';import {Module} from '@nestjs/common';@Module({}) class AppModule {}",
        "async function bootstrap(){const app=await NestFactory.createMicroservice(AppModule,{transport:Transport.TCP,options:{host:'0.0.0.0',port:4321}});await app.listen();} bootstrap();"
      )
    },
    expect: {
      resources: { auditApp: 'worker-service' },
      gapsInclude: ['src/main.ts starts auditApp as a NestJS microservice that accepts TCP or gRPC connections']
    }
  },
  {
    name: 'F23: a NestJS broker microservice stays a worker even with the Express platform installed',
    files: {
      'package.json': nestPackage({ '@nestjs/microservices': '11.0.0', '@nestjs/platform-express': '11.0.0' }),
      'src/main.ts': lines(
        "import { NestFactory } from '@nestjs/core';",
        "import { Transport } from '@nestjs/microservices';",
        "import { AppModule } from './app.module';",
        'const app = await NestFactory.createMicroservice(AppModule, { transport: Transport.NATS, options: { servers: [process.env.NATS_URL] } });',
        'await app.listen();'
      ),
      'src/app.module.ts': "import { Module } from '@nestjs/common';\n@Module({}) export class AppModule {}\n"
    },
    expect: { resources: { auditApp: 'worker-service' } }
  },
  {
    name: 'F23 review: a NestJS microservice beside an Express server in the same file stays a web service',
    files: {
      'package.json': packageJson({
        scripts: { start: 'node server.js' },
        dependencies: {
          '@nestjs/common': '11.0.0',
          '@nestjs/core': '11.0.0',
          '@nestjs/microservices': '11.0.0',
          '@nestjs/platform-express': '11.0.0',
          express: '5.0.0',
          'reflect-metadata': '0.2.2',
          rxjs: '7.8.2'
        }
      }),
      'server.js':
        "require('reflect-metadata'); const {Module}=require('@nestjs/common'); class WorkerModule{}; Module({})(WorkerModule); const {NestFactory}=require('@nestjs/core'); const {Transport}=require('@nestjs/microservices'); const express=require('express'); async function main(){const app=await NestFactory.createMicroservice(WorkerModule, {transport:Transport.TCP,options:{port:4321}}); await app.listen(); express().get('/',(q,s)=>s.send('ok')).listen(3000);} main();\n"
    },
    expect: { resources: { auditApp: 'web-service' } }
  },
  {
    name: 'F23 control: a hybrid NestJS application that also serves HTTP stays a web service',
    files: {
      'package.json': nestPackage({ '@nestjs/microservices': '11.0.0', '@nestjs/platform-express': '11.0.0' }),
      'src/main.ts': lines(
        "import { NestFactory } from '@nestjs/core';",
        "import { Transport } from '@nestjs/microservices';",
        "import { AppModule } from './app.module';",
        'const app = await NestFactory.create(AppModule);',
        'app.connectMicroservice({ transport: Transport.TCP });',
        'await app.startAllMicroservices();',
        'await app.listen(4321);'
      ),
      'src/app.module.ts': "import { Module } from '@nestjs/common';\n@Module({}) export class AppModule {}\n"
    },
    expect: { resources: { auditApp: 'web-service' }, servicePorts: [{ resource: 'auditApp', port: 4321 }] }
  },
  {
    name: 'F24 (r2ah 56): a timer worker beside an unused Express dependency is a worker with a review item',
    files: {
      'package.json': expressPackage,
      'server.js': lines('const expression=/app.listen(9876)/;', 'setInterval(()=>console.log(expression),10000);')
    },
    expect: {
      resources: { auditApp: 'worker-service' },
      gapsInclude: [
        'auditApp depends on an HTTP framework, but server.js, which its start script runs, starts no HTTP server'
      ]
    }
  },
  {
    name: 'F24 (r2ah 57): a regular expression after a block is no listener either',
    files: {
      'package.json': expressPackage,
      'server.js': lines(
        "if (process.env.DEBUG) { console.log('debug'); } /app.listen(9876)/.test('x');",
        'setInterval(()=>{},10000);'
      )
    },
    expect: { resources: { auditApp: 'worker-service' } }
  },
  {
    name: 'F24 control: a start file that hands off to a project module stays a web service',
    files: {
      'package.json': packageJson({ scripts: { start: 'node index.js' }, dependencies: { '@hapi/hapi': '21.0.0' } }),
      'index.js': "require('./src/boot');\n",
      'src/boot.js': lines(
        "const Hapi = require('@hapi/hapi');",
        'const server = Hapi.server({ port: process.env.PORT });',
        'server.start();'
      )
    },
    expect: { resources: { auditApp: 'web-service' } }
  },
  {
    name: 'F24 (r2ah 79): an invented Laravel web process binds the port Stacktape routes to',
    files: {
      'composer.json': JSON.stringify({
        name: 'audit/laravel-app',
        require: { php: '^8.3', 'laravel/framework': '^11.0', 'predis/predis': '^2.0' }
      }),
      artisan: lines('<?php', 'require __DIR__."/vendor/autoload.php";'),
      Procfile: 'worker: php artisan queue:work redis --sleep=3 --tries=3\n',
      'app/Jobs/SendMail.php': lines(
        '<?php',
        'namespace App\\Jobs; class SendMail implements \\Illuminate\\Contracts\\Queue\\ShouldQueue { public function handle() {} }'
      )
    },
    expect: {
      resourceProperties: [
        // Without a web process in the Procfile, Heroku's PHP buildpack still runs one; init keeps it.
        {
          resource: 'laravelApp',
          path: 'packaging.properties.startCommand',
          value: 'php artisan serve --host 0.0.0.0 --port $PORT'
        },
        { resource: 'laravelApp', path: 'port', value: undefined },
        {
          resource: 'worker',
          path: 'packaging.properties.startCommand',
          value: 'php artisan queue:work redis --sleep=3 --tries=3'
        }
      ]
    }
  }
];

const viteFiles = (config: string) => ({
  'package.json': JSON.stringify({
    name: 'frontend',
    scripts: { build: 'vite build' },
    dependencies: { vite: '6.0.0' }
  }),
  'index.html': '<main>ready</main>\n',
  'vite.config.js': config
});

const VITE_CASES: EvalCase[] = [
  {
    name: 'F25 (r2ah 90): an outDir inside a string is not the Vite output directory',
    files: viteFiles(
      lines(
        'const migrationNote = "old config: {outDir: \'legacy\'}";',
        "export default {build: {outDir: 'public-build'}};"
      )
    ),
    expect: {
      resources: { frontend: 'hosting-bucket' },
      resourceProperties: [{ resource: 'frontend', path: 'uploadDirectoryPath', value: 'public-build' }]
    }
  },
  {
    name: "F25 (r2ah 91): a plugin's outDir option is not the Vite output directory",
    files: viteFiles(
      lines(
        "const reporter = {name:'reporter', configResolved(config){console.log(config.build.outDir)}};",
        "export default {plugins: [{...reporter, report: {outDir:'reports'}}], build: {outDir:'public-build'}};"
      )
    ),
    expect: {
      resources: { frontend: 'hosting-bucket' },
      resourceProperties: [{ resource: 'frontend', path: 'uploadDirectoryPath', value: 'public-build' }]
    }
  },
  {
    name: 'F25: an outDir only outside a build object is a review item',
    files: viteFiles(lines("const build = { outDir: 'site' };", 'export default { build };')),
    expect: {
      resources: { frontend: 'hosting-bucket' },
      gapsInclude: ['vite.config.js decides where the build writes']
    }
  }
];

const ENTRY = (resource: string, value: string | undefined) => ({
  resource,
  path: 'packaging.properties.entryfilePath',
  value
});

/**
 * Which listener file is the service's entry (r2ap). Init changes its first-file choice only when the package's start
 * commands unambiguously run one file and that file listens itself. Reduced from the init corpus, where an end-to-end
 * test server and a queue driver were chosen because they sort first.
 */
const ENTRY_CASES: EvalCase[] = [
  {
    name: 'r2ap (Novu): a NestJS bootstrap wins over an end-to-end test server',
    files: {
      'package.json': nestPackage({ '@nestjs/platform-express': '11.0.0', express: '5.0.0' }),
      'nest-cli.json': '{ "sourceRoot": "src" }\n',
      'e2e/test-bridge-server.ts': "import express from 'express';\nexpress().listen(9999);\n",
      'src/main.ts': lines(
        "import { NestFactory } from '@nestjs/core';",
        "import { AppModule } from './app.module';",
        'const app = await NestFactory.create(AppModule);',
        'await app.listen(3000);'
      ),
      'src/app.module.ts': "import { Module } from '@nestjs/common';\n@Module({}) export class AppModule {}\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ENTRY('auditApp', 'src/main.ts')] }
  },
  {
    name: 'r2ap (Twenty): the NestJS start file is the web service, not a queue driver listed before it',
    files: {
      'package.json': packageJson({
        scripts: {
          build: 'nest build',
          start: 'nest start',
          'start:prod': 'node dist/main',
          'worker:prod': 'node dist/queue-worker/queue-worker'
        },
        dependencies: { '@nestjs/core': '11.0.0', '@nestjs/common': '11.0.0', bullmq: '5.0.0', rxjs: '7.0.0' }
      }),
      'nest-cli.json': '{ "sourceRoot": "src" }\n',
      'src/engine/drivers/bullmq.driver.ts': lines(
        "import { Worker } from 'bullmq';",
        "export class BullMqDriver { work() { return new Worker('jobs', async () => undefined); } }"
      ),
      'src/main.ts': lines(
        "import { NestFactory } from '@nestjs/core';",
        "import { AppModule } from './app.module';",
        'const app = await NestFactory.create(AppModule);',
        'await app.listen(3000);'
      ),
      'src/app.module.ts': "import { Module } from '@nestjs/common';\n@Module({}) export class AppModule {}\n",
      'src/queue-worker/queue-worker.ts': lines(
        "import { BullMqDriver } from '../engine/drivers/bullmq.driver';",
        'new BullMqDriver().work();'
      )
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ENTRY('auditApp', 'src/main.ts')] }
  },
  {
    name: 'r2ap control: a start script that runs a source file under lib/ keeps it',
    files: {
      'package.json': packageJson({ scripts: { start: 'node lib/index.js' }, dependencies: { express: '5.0.0' } }),
      'lib/index.js': "const express = require('express');\nexpress().listen(process.env.PORT || 3000);\n",
      'tools/mock-server.js': "require('http').createServer(() => undefined).listen(4999);\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ENTRY('auditApp', 'lib/index.js')] }
  },
  {
    name: 'r2ap control: without a start file the scan can read, the listener stays the entry',
    files: {
      'package.json': packageJson({ scripts: { start: 'node scripts/run.js' }, dependencies: { express: '5.0.0' } }),
      'app.js': "const express = require('express');\nexpress().listen(process.env.PORT || 3000);\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ENTRY('auditApp', 'app.js')] }
  }
];

/** The #416 reviews: a start command init cannot read, or a listener that may not run, keeps the first-file choice. */
const reviewPackage = (scripts: Record<string, string>, extra: Record<string, unknown> = {}) =>
  packageJson({ scripts, dependencies: { express: '5.0.0', bullmq: '5.0.0' }, ...extra });
const reviewServer = "require('http').createServer((req, res) => res.end('ok')).listen(4100);\n";
const reviewWorker = "import { Worker } from 'bullmq';\nnew Worker('mail', async () => undefined);\n";
const WORKER = { resource: 'worker', path: 'packaging.properties.entryfilePath', value: 'worker.js' };

const REVIEW_CASES: EvalCase[] = [
  {
    name: 'r2ap review: a worker script init cannot read (sh worker.sh) keeps its BullMQ worker',
    files: {
      'package.json': reviewPackage({ start: 'node server.js', worker: 'sh worker.sh' }),
      'server.js': reviewServer,
      'worker.sh': 'node worker.js\n',
      'worker.js': reviewWorker
    },
    expect: {
      resources: { auditApp: 'web-service', worker: 'worker-service' },
      resourceProperties: [ENTRY('auditApp', 'server.js'), WORKER]
    }
  },
  {
    name: 'r2ap review: a worker loaded through a computed import keeps its worker service',
    files: {
      'package.json': reviewPackage({ start: 'node server.js', worker: 'node launcher.js' }),
      'server.js': reviewServer,
      'launcher.js': "const file = './worker.js';\nimport(file);\n",
      'worker.js': reviewWorker
    },
    expect: {
      resources: { auditApp: 'web-service', worker: 'worker-service' },
      resourceProperties: [ENTRY('auditApp', 'server.js'), WORKER]
    }
  },
  {
    name: 'r2ap review: a web start command init cannot read keeps its listener',
    files: {
      'package.json': reviewPackage({ start: 'sh start.sh', worker: 'node worker.js' }),
      'start.sh': 'node server.js\n',
      'server.js': reviewServer,
      'worker.js': reviewWorker
    },
    expect: {
      resources: { auditApp: 'web-service', worker: 'worker-service' },
      resourceProperties: [ENTRY('auditApp', 'server.js'), WORKER]
    }
  },
  {
    name: 'r2ap review: an exported helper nobody calls does not beat the server that listens on load',
    files: {
      'package.json': reviewPackage({ start: 'node start.js' }),
      'start.js': "require('./z-helper.js');\nrequire('./a-server.js');\n",
      'z-helper.js': "exports.start = () => require('http').createServer(() => {}).listen(9200);\n",
      'a-server.js': reviewServer
    },
    expect: {
      resources: { auditApp: 'web-service' },
      resourceProperties: [ENTRY('auditApp', 'a-server.js')],
      servicePorts: [{ resource: 'auditApp', port: 4100 }]
    }
  },
  {
    name: 'r2ap review control: an exported start function the start file calls is the listener',
    files: {
      'package.json': reviewPackage({ start: 'node bootstrap.js' }),
      'bootstrap.js': "require('./server.js').start();\n",
      'server.js': "exports.start = () => require('http').createServer((req, res) => res.end('ok')).listen(4100);\n"
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ENTRY('auditApp', 'server.js')] }
  },
  {
    name: 'r2ap review: nodemon --watch src runs src/server.js, not the src directory',
    files: {
      'package.json': reviewPackage({ start: 'nodemon --watch src --ext js,json src/server.js' }),
      'src/index.js': 'exports.data = 42;\n',
      'src/server.js': reviewServer
    },
    expect: { resources: { auditApp: 'web-service' }, resourceProperties: [ENTRY('auditApp', 'src/server.js')] }
  }
];

describe('listener inference end-to-end corpus', () => {
  for (const evalCase of [
    ...WEBSOCKET_CASES,
    ...PORT_CASES,
    ...ASPNET_CASES,
    ...PROCESS_CASES,
    ...VITE_CASES,
    ...ENTRY_CASES,
    ...REVIEW_CASES
  ]) {
    it(evalCase.name, async () => {
      const score = await runEvalCase(evalCase);
      if (!score.passed) {
        throw new Error(score.failures.map((failure) => `[${failure.stage}] ${failure.detail}`).join('\n'));
      }
      expect(score.passed).toBe(true);
    });
  }
});
