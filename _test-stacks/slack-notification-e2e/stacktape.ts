import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => ({
  resources: {
    smokeFunction: new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' })
    })
  }
}));
