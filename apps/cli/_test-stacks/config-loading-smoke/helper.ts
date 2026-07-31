import pkgA from 'pkg-a';
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '@stacktape/config-authoring';

export default defineConfig(({ projectName, region, stage }) => {
  const lambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    environment: {
      CONFIG_LOADING_SUFFIX: `config-loading${pkgA.getSuffix()}`,
      CONFIG_LOADING_PROJECT: projectName ?? '<unset>',
      CONFIG_LOADING_REGION: region,
      CONFIG_LOADING_STAGE: stage
    }
  });

  return {
    resources: { lambda }
  };
});
