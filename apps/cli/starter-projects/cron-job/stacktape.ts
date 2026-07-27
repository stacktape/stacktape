import {
  LambdaFunction,
  ScheduleIntegration,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const scheduledTask = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 512,
    timeout: 300,
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(1 hour)'
      })
    ]
  });

  return {
    resources: { scheduledTask }
  };
});
