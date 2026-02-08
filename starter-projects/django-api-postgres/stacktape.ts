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
      entryfilePath: 'postsproject/asgi.py:application',
      languageSpecificConfig: {
        packageManagerFile: 'pyproject.toml',
        runAppAs: 'ASGI'
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

  const installUv = new LocalScript({
    executeCommand: 'curl -LsSf https://astral.sh/uv/install.sh | sh'
  });
  const installDependencies = new LocalScript({
    executeCommand: 'uv sync'
  });
  const migrateDb = new LocalScript({
    executeCommands: ['uv run python manage.py makemigrations', 'uv run python manage.py migrate'],
    connectTo: [mainDatabase]
  });

  return {
    resources: { mainDatabase, webService },
    scripts: { installUv, installDependencies, migrateDb },
    hooks: {
      beforeDeploy: [
        {
          scriptName: 'installUv',
          skipOnLocal: true
        },
        {
          scriptName: 'installDependencies'
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
