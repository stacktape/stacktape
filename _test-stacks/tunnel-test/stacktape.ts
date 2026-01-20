import {
  defineConfig,
  LambdaFunction,
  RelationalDatabase,
  StacktapeLambdaBuildpackPackaging
} from '../../__release-npm';

export default defineConfig(() => {
  // Postgres database - will be run locally during dev mode
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

  // Lambda that connects to Postgres
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
    resources: {
      postgresDb,
      apiFunction
    }
  };
});
