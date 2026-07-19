import { $Secret, defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => ({
  resources: {
    smokeFunction: new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
      url: { enabled: true },
      alarms: [
        {
          description: 'Real Slack alarm delivery architecture E2E',
          includeInHistory: true,
          notificationTargets: [
            {
              type: 'slack',
              properties: {
                conversationId: 'C07BL51JBJP',
                accessToken: $Secret('slack-access-token')
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
    })
  }
}));
