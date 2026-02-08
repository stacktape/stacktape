import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 512,
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
    resources: { apiGateway, api }
  };
});
