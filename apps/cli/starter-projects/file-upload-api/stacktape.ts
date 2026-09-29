import {
  Bucket,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const filesBucket = new Bucket({
    cors: {
      enabled: true
    }
  });
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 512,
    connectTo: [filesBucket],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/',
        method: '*'
      }),
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/{proxy+}',
        method: '*'
      })
    ]
  });

  return {
    resources: { apiGateway, filesBucket, api }
  };
});
