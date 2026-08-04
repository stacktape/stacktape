import {
  $Secret,
  NixpacksPackaging,
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
    packaging: new NixpacksPackaging({
      sourceDirectoryPath: './'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    connectTo: [mainDatabase],
    environment: { SECRET_KEY_BASE: $Secret('secret-key-base') },
    cors: {
      enabled: true
    }
  });

  return {
    resources: { mainDatabase, webService }
  };
});
