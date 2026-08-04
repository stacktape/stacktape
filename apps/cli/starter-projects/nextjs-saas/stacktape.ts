import {
  $Secret,
  LocalScript,
  NextjsWeb,
  RdsEnginePostgres,
  RelationalDatabase,
  UserAuthPool,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    credentials: {
      masterUserPassword: $Secret('database.password')
    },
    engine: new RdsEnginePostgres({
      version: '16.6',
      primaryInstance: {
        instanceSize: 'db.t3.micro'
      }
    })
  });
  const authPool = new UserAuthPool({
    allowEmailAsUserName: true,
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false
    }
  });
  const web = new NextjsWeb({
    appDirectory: './',
    connectTo: [database, authPool]
  });

  const generatePrismaClient = new LocalScript({
    executeCommand: 'npx prisma generate'
  });
  const migrateDb = new LocalScript({
    executeCommand: 'npx prisma db push --skip-generate',
    connectTo: [database]
  });

  return {
    resources: { database, authPool, web },
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
