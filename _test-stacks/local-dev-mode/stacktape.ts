import {
  defineConfig,
  DynamoDbTable,
  LambdaFunction,
  PrivateService,
  RedisCluster,
  RelationalDatabase,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  // Databases for testing local emulation
  const postgresDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testpassword123'
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

  const mysqlDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testpassword123'
    },
    engine: {
      type: 'mysql',
      properties: {
        version: '8.0',
        primaryInstance: {
          instanceSize: 'db.t3.micro'
        }
      }
    }
  });

  const mariaDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testpassword123'
    },
    engine: {
      type: 'mariadb',
      properties: {
        version: '10.11',
        primaryInstance: {
          instanceSize: 'db.t3.micro'
        }
      }
    }
  });

  const redis = new RedisCluster({
    instanceSize: 'cache.t3.micro',
    defaultUserPassword: 'redistestpassword1234'
  });

  // DynamoDB table for testing local emulation
  const usersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'userId', type: 'string' },
      sortKey: { name: 'createdAt', type: 'number' }
    }
  });

  // Private service for inter-service communication testing
  const privateService = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/private-service.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    port: 8080,
    connectTo: [postgresDb]
  });

  // Web service that connects to all databases and DynamoDB
  // Uses $ResourceParam directive to reference privateService (instead of connectTo)
  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/web-service.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    connectTo: [postgresDb, mysqlDb, mariaDb, redis, usersTable],
    environment: {
      PRIVATE_SERVICE_ADDR: "$ResourceParam('privateService', 'address')"
    }
  });

  // Lambda function for parallel runner testing
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambda.ts'
    }),
    connectTo: [postgresDb],
    url: {
      enabled: true
    }
  });

  return {
    serviceName: 'local-dev-mode-test',
    scripts: {
      seedDatabase: {
        type: 'local-script',
        properties: {
          executeScript: './src/seed.ts'
        }
      }
    },
    hooks: {
      beforeDev: [{ scriptName: 'seedDatabase' }]
    },
    resources: {
      postgresDb,
      mysqlDb,
      mariaDb,
      redis,
      usersTable,
      webService,
      privateService,
      apiFunction
    }
  };
});
