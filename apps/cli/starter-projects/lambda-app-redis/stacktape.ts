import {
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction,
  Redis,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainApiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const redis = new Redis({
    defaultUserPassword: "$Secret('redis.password')",
    engine: { type: 'valkey-serverless' }
  });
  const storeKeyValuePair = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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
