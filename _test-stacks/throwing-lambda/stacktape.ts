import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  const throwingLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/throwing-lambda.ts'
    }),
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    }
  });

  return {
    resources: { throwingLambda }
  };
});
