import pkgA from 'pkg-a';
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '@stacktape/config-authoring';

export default defineConfig(() => {
  const lambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    environment: {
      CONFIG_LOADING_SUFFIX: `config-loading${pkgA.getSuffix()}`
    }
  });

  return {
    resources: { lambda }
  };
});
