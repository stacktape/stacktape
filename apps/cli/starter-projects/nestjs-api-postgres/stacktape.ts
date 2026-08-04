import {
  $Secret,
  LocalScript,
  RdsEnginePostgres,
  RelationalDatabase,
  StacktapeImageBuildpackPackaging,
  WebService,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: $Secret('mainDatabase.password')
    },
    engine: new RdsEnginePostgres({
      version: '18.1',
      primaryInstance: {
        instanceSize: 'db.t3.micro'
      }
    })
  });
  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts',
      excludeDependencies: [
        '@nestjs/websockets',
        'cache-manager',
        'class-validator',
        'class-transformer',
        '@nestjs/microservices'
      ],
      languageSpecificConfig: {
        emitTsDecoratorMetadata: true
      }
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    connectTo: [mainDatabase],
    cors: {
      enabled: true
    }
  });

  const generatePrismaClient = new LocalScript({
    executeCommand: 'npx prisma generate'
  });
  const migrateDb = new LocalScript({
    executeCommand: 'npx prisma db push --skip-generate',
    connectTo: [mainDatabase]
  });

  return {
    resources: { mainDatabase, webService },
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
