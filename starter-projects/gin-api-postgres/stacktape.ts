import {
  $Secret,
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
      entryfilePath: './src/main.go'
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

  return {
    resources: { mainDatabase, webService }
  };
});
