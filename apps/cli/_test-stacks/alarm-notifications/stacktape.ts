/**
 * Disposable real-AWS fixture for `scripts/real-aws/alarm-notifications-canary.ts`.
 *
 * `faulty` throws when asked to; its `lambda-error-rate` alarm notifies three inline channels, a Microsoft Teams
 * webhook, a Discord webhook and a signed generic webhook with a header. All three point at `receiver`, a function URL
 * that stores every request it gets in `requests`, so the canary can see what each provider would have received. The
 * canary also points the stack's service Lambda at the receiver as its Console API, to see exactly what the Console
 * would have been sent.
 *
 * Each path segment, the header value and the signing secret are random per run: the canary treats them as credentials
 * and checks that none reaches the Console report. The canary sets the environment variables below; the defaults only
 * keep the file loadable on its own.
 */
import {
  $CfFormat,
  $ResourceParam,
  $Secret,
  Bucket,
  defineConfig,
  JsBundleLambdaPackaging,
  LambdaFunction
} from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_ALARM_CANARY_OWNER ?? 'local';
  const secretName = process.env.STP_AWS_ALARM_CANARY_SECRET_NAME ?? 'alarm-canary-local';
  const teamsKey = process.env.STP_AWS_ALARM_CANARY_TEAMS_KEY ?? 'teams-local';
  const discordKey = process.env.STP_AWS_ALARM_CANARY_DISCORD_KEY ?? 'discord-local';
  const webhookKey = process.env.STP_AWS_ALARM_CANARY_WEBHOOK_KEY ?? 'webhook-local';
  const headerValue = process.env.STP_AWS_ALARM_CANARY_HEADER_VALUE ?? 'header-local';

  const requests = new Bucket({});
  const receiver = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/receiver.ts' }),
    url: { enabled: true, authMode: 'NONE' },
    environment: { REQUESTS_BUCKET: $ResourceParam('requests', 'name') },
    connectTo: [requests],
    memory: 128,
    timeout: 10
  });
  const receiverUrl = (path: string) => $CfFormat(`{}${path}`, $ResourceParam('receiver', 'url'));
  const faulty = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/faulty.ts' }),
    memory: 128,
    timeout: 10,
    alarms: [
      {
        description: 'The alarm canary made its function fail',
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
        evaluation: { period: 60, evaluationPeriods: 1, breachedPeriods: 1 },
        notificationChannels: [
          { type: 'ms-teams', properties: { webhookUrl: receiverUrl(`teams/${teamsKey}`) } },
          { type: 'discord', properties: { webhookUrl: receiverUrl(`discord/${discordKey}`) } },
          {
            type: 'webhook',
            properties: {
              url: receiverUrl(`webhook/${webhookKey}`),
              secret: $Secret(`${secretName}.signing`),
              headers: { 'X-Canary-Key': headerValue }
            }
          }
        ]
      }
    ]
  });

  return {
    resources: { requests, receiver, faulty },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }] }
  };
});
