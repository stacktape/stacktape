import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
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
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: 'packages/lambda/src/index.ts'
    })
  });
  const myServer = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
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
