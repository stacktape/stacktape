import {
  $Secret,
  BuildpackImagePackaging,
  LocalScript,
  RdsEnginePostgres,
  RelationalDatabase,
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
    packaging: new BuildpackImagePackaging({
      startCommand: 'uvicorn app.main:app --host 0.0.0.0 --port $PORT'
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

  const installUv = new LocalScript({
    executeCommand: 'curl -LsSf https://astral.sh/uv/install.sh | sh'
  });
  const installDependencies = new LocalScript({
    executeCommand: 'uv sync'
  });

  return {
    resources: { mainDatabase, webService },
    scripts: { installUv, installDependencies },
    hooks: {
      beforeDeploy: [
        {
          scriptName: 'installUv',
          skipOnLocal: true
        },
        {
          scriptName: 'installDependencies'
        }
      ]
    }
  };
});
