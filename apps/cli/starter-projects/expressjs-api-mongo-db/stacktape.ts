import { MongoDbAtlasCluster, StacktapeImageBuildpackPackaging, WebService, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const mongoDbCluster = new MongoDbAtlasCluster({
    clusterTier: 'M2'
  });
  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    connectTo: [mongoDbCluster],
    cors: {
      enabled: true
    }
  });

  return {
    resources: { mongoDbCluster, webService }
  };
});
