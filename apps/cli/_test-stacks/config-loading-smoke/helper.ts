import pkgA from 'pkg-a';
import {
  Bucket,
  defineConfig,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from '@stacktape/config-authoring';

export default defineConfig(({ projectName, region, stage }) => {
  const api = new HttpApiGateway({});
  const uploads = new Bucket({});
  const lambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [uploads],
    environment: {
      CONFIG_LOADING_BUCKET: uploads.name,
      CONFIG_LOADING_SUFFIX: `config-loading${pkgA.getSuffix()}`,
      CONFIG_LOADING_PROJECT: projectName ?? '<unset>',
      CONFIG_LOADING_REGION: region,
      CONFIG_LOADING_STAGE: stage
    },
    events: [new HttpApiIntegration({ httpApiGatewayName: api, method: 'GET', path: '/smoke' })]
  });

  return {
    resources: { api, lambda, uploads }
  };
});
