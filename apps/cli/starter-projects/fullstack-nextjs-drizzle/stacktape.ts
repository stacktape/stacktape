import {
  $Secret,
  LocalScript,
  NextjsWeb,
  RdsEnginePostgres,
  RelationalDatabase,
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
  const web = new NextjsWeb({
    appDirectory: './',
    connectTo: [database]
  });

  const migrateDb = new LocalScript({
    executeCommand: 'npx drizzle-kit push',
    connectTo: [database]
  });

  return {
    resources: { database, web },
    scripts: { migrateDb },
    hooks: {
      afterDeploy: [
        {
          scriptName: 'migrateDb'
        }
      ]
    }
  };
});
