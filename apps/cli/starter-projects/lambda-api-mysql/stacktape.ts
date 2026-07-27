import {
  $Secret,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  LocalScript,
  RdsEngineMysql,
  RelationalDatabase,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainApiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: $Secret('mainDatabase.password')
    },
    engine: new RdsEngineMysql({
      version: '8.0.40',
      primaryInstance: {
        instanceSize: 'db.t3.micro'
      }
    })
  });
  const savePost = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambdas/save-post.ts'
    }),
    memory: 512,
    connectTo: [mainDatabase],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/posts',
        method: 'POST'
      })
    ]
  });
  const getPosts = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambdas/get-posts.ts'
    }),
    memory: 512,
    connectTo: [mainDatabase],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/posts',
        method: 'GET'
      })
    ]
  });

  const generatePrismaClient = new LocalScript({
    executeCommand: 'npx prisma generate'
  });
  const migrateDb = new LocalScript({
    executeCommand: 'npx prisma db push --skip-generate',
    connectTo: [mainDatabase]
  });

  return {
    resources: { mainApiGateway, mainDatabase, savePost, getPosts },
    scripts: { generatePrismaClient, migrateDb },
    hooks: {
      beforeDeploy: [
        {
          scriptName: 'generatePrismaClient'
        }
      ],
      afterDeploy: [
        {
          scriptName: 'migrateDb'
        }
      ]
    }
  };
});
