import {
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleImagePackaging,
  JsBundleLambdaPackaging,
  LambdaFunction,
  WebService,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const myApiGateway = new HttpApiGateway({});
  const myLambda = new LambdaFunction({
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'myApiGateway',
        method: '*',
        path: '/{proxy+}'
      })
    ],
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: 'packages/lambda/src/index.ts'
    })
  });
  const myServer = new WebService({
    packaging: new JsBundleImagePackaging({
      entryfilePath: 'packages/server/src/index.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { myApiGateway, myLambda, myServer }
  };
});
