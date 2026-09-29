import { JsBundleLambdaPackaging, LambdaFunction, ScheduleIntegration, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const scheduledTask = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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
