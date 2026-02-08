import { $Secret, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const bot = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 512,
    timeout: 30,
    environment: { BOT_TOKEN: $Secret('telegram-bot-token') },
    url: {
      enabled: true
    }
  });

  return {
    resources: { bot }
  };
});
