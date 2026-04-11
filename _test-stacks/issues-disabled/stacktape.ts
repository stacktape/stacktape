import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  const myLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  return {
    stackConfig: { disableIssues: true },
    resources: { myLambda }
  };
});
