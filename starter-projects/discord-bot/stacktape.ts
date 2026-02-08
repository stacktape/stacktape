import { $Secret, StacktapeImageBuildpackPackaging, WorkerService, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const bot = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    environment: { DISCORD_BOT_TOKEN: $Secret('discord-bot-token') }
  });

  return {
    resources: { bot }
  };
});
