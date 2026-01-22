import {
  defineConfig,
  DynamoDbTable,
  HostingBucket,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  LocalScript,
  NextjsWeb,
  OpenSearchDomain,
  PrivateService,
  RedisCluster,
  RelationalDatabase,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
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
        version: '16.9',
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

  const dynamoDb = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'pk', type: 'string' },
      sortKey: { name: 'sk', type: 'string' }
    }
  });

  const openSearch = new OpenSearchDomain({
    clusterConfig: { instanceType: 't3.small.search', instanceCount: 1 },
    storage: { size: 10 }
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
    connectTo: [postgresDb, redis, dynamoDb, openSearch]
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

  const apiGateway = new HttpApiGateway({
    cors: { enabled: true }
  });

  const apiLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './packages/api-lambda/api-lambda.ts'
    }),
    connectTo: [postgresDb, dynamoDb],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        method: '*',
        path: '/{proxy+}'
      })
    ]
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
      API_URL: webService.url,
      LAMBDA_API_URL: apiGateway.url
    }
  });

  const nextjsFrontend = new NextjsWeb({
    appDirectory: './packages/nextjs-frontend',
    connectTo: [webService],
    dev: {
      command: 'bun run dev'
    },
    environment: {
      NEXT_PUBLIC_API_URL: webService.url,
      NEXT_PUBLIC_LAMBDA_API_URL: apiGateway.url
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
      dynamoDb,
      openSearch,
      privateService,
      webService,
      spaFrontend,
      nextjsFrontend,
      apiGateway,
      apiLambda
    }
  };
});
