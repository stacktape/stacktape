import {
  defineConfig,
  HostingBucket,
  LocalScript,
  NextjsWeb,
  PrivateService,
  RedisCluster,
  RelationalDatabase,
  StacktapeImageBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  const postgresDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testPassword123'
    },
    engine: {
      type: 'postgres',
      properties: {
        version: '16',
        primaryInstance: {
          instanceSize: 'db.t3.micro'
        }
      }
    }
  });

  const redis = new RedisCluster({
    instanceSize: 'cache.t3.micro',
    defaultUserPassword: 'redisTestPassword1234'
  });

  const privateService = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './packages/private-service/src/index.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    port: 8080,
    connectTo: [postgresDb, redis]
  });

  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './packages/web-service/src/index.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    connectTo: [privateService],
    environment: {
      PRIVATE_SERVICE_ADDR: privateService.address
    }
  });

  const spaFrontend = new HostingBucket({
    uploadDirectoryPath: './packages/spa-frontend/dist',
    hostingContentType: 'single-page-app',
    build: {
      command: 'bun run build',
      workingDirectory: './packages/spa-frontend'
    },
    dev: {
      command: 'bun run dev',
      workingDirectory: './packages/spa-frontend'
    },
    injectEnvironment: {
      API_URL: webService.url
    }
  });

  const nextjsFrontend = new NextjsWeb({
    appDirectory: './packages/nextjs-frontend',
    connectTo: [webService],
    dev: {
      command: 'bun run dev'
    },
    environment: {
      API_URL: webService.url,
      NEXT_PUBLIC_API_URL: webService.url
    }
  });

  const scriptMigrate = new LocalScript({
    executeScript: './scripts/migrate.ts',
    connectTo: [postgresDb]
  });

  const scriptSeed = new LocalScript({
    executeScript: './scripts/seed.ts',
    connectTo: [postgresDb]
  });

  return {
    serviceName: 'local-dev-mode-test',
    scripts: {
      migrate: scriptMigrate,
      seed: scriptSeed
    },
    hooks: {
      beforeDev: [{ scriptName: 'migrate' }, { scriptName: 'seed' }]
    },
    resources: {
      postgresDb,
      redis,
      privateService,
      webService,
      spaFrontend,
      nextjsFrontend
    }
  };
});
