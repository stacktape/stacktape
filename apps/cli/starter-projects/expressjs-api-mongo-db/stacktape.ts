import { JsBundleImagePackaging, MongoDbAtlasCluster, WebService, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const mongoDbCluster = new MongoDbAtlasCluster({
    clusterTier: 'M2'
  });
  const webService = new WebService({
    packaging: new JsBundleImagePackaging({
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
