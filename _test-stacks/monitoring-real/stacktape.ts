import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  const monitoredLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    },
    alarms: [
      {
        description: 'Monitoring real alarm smoke test',
        includeInHistory: true,
        notificationTargets: [
          {
            type: 'webhook',
            properties: {
              url: 'https://httpbin.org/post',
              headers: {
                'X-Stacktape-Monitoring-Test': 'real-alarm'
              }
            }
          }
        ],
        evaluation: {
          period: 60,
          evaluationPeriods: 1,
          breachedPeriods: 1
        },
        trigger: {
          type: 'lambda-error-rate',
          properties: {
            comparisonOperator: 'GreaterThanThreshold',
            thresholdPercent: 0
          }
        }
      }
    ]
  });

  return {
    resources: { monitoredLambda }
  };
});
