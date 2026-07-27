import {
  $ResourceParam,
  $Secret,
  PrebuiltImagePackaging,
  RdsEnginePostgres,
  RelationalDatabase,
  WebService,
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
  const n8n = new WebService({
    packaging: new PrebuiltImagePackaging({
      image: 'docker.n8n.io/n8nio/n8n:latest'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    connectTo: [database],
    environment: {
      DB_TYPE: 'postgresdb',
      DB_POSTGRESDB_HOST: $ResourceParam('database', 'host'),
      DB_POSTGRESDB_PORT: $ResourceParam('database', 'port'),
      DB_POSTGRESDB_DATABASE: $ResourceParam('database', 'dbName'),
      DB_POSTGRESDB_USER: 'db_master_user',
      DB_POSTGRESDB_PASSWORD: $Secret('database.password'),
      N8N_PORT: '3000',
      N8N_SECURE_COOKIE: 'false'
    }
  });

  return {
    resources: { database, n8n }
  };
});
