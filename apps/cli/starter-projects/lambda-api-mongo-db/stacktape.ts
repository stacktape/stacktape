import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  MongoDbAtlasCluster,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainApiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const mongoDbCluster = new MongoDbAtlasCluster({
    clusterTier: 'M2'
  });
  const savePost = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambdas/save-post.ts'
    }),
    memory: 512,
    connectTo: [mongoDbCluster],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/posts',
        method: 'POST'
      })
    ]
  });
  const getPosts = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambdas/get-posts.ts'
    }),
    memory: 512,
    connectTo: [mongoDbCluster],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/posts',
        method: 'GET'
      })
    ]
  });

  return {
    resources: { mainApiGateway, mongoDbCluster, savePost, getPosts },
    providerConfig: {
      mongoDbAtlas: {
        publicKey: '<<your-mongodb-public-key>>',
        privateKey: '<<your-mongodb-private-key>>',
        organizationId: '<<your-mongodb-organization-id>>'
      }
    }
  };
});
