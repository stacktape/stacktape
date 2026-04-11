import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  const throwingTs = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/throwing-ts.ts'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  const throwingPy = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/throwing-py.py'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  return {
    resources: { throwingTs, throwingPy }
  };
});
