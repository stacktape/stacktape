import {
  BuildpackLambdaPackaging,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const api = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/main.rs'
    }),
    memory: 256,
    runtime: 'provided.al2023',
    architecture: 'x86_64',
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
