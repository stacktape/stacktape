import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  const lambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/simple.ts'
    }),
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    },
    provisionedConcurrency: 1
  });

  return {
    resources: { lambda }
  };
});
