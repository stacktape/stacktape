import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  RedisCluster,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainApiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const redis = new RedisCluster({
    defaultUserPassword: "$Secret('redis.password')",
    instanceSize: 'cache.t3.micro',
    engineVersion: '7.1'
  });
  const storeKeyValuePair = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/store-key-value-pair.ts'
    }),
    joinDefaultVpc: true,
    connectTo: [redis],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        method: 'GET',
        path: '/save/{key}/{value}'
      })
    ]
  });

  return {
    resources: { mainApiGateway, redis, storeKeyValuePair }
  };
});
