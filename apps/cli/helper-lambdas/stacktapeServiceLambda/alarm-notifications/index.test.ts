import type { AlarmNotificationEventRuleInput } from '@domain-services/config-manager/resolved-types/alarms';
import { afterAll, beforeAll, expect, mock, test } from 'bun:test';

let endpoint: string;
let refuseConsole = false;
const alarms: Array<Record<string, unknown>> = [];
const slackMessages: Array<Record<string, string>> = [];
let server: ReturnType<typeof Bun.serve>;
beforeAll(async () => {
  const slackModule = await import('@slack/web-api');
  // Actual SDK against a local Slack HTTP provider. No reporting client, credential provider or AWS SDK is stubbed.
  mock.module('@slack/web-api', () => ({
    ...slackModule,
    WebClient: class extends slackModule.WebClient {
      constructor(token?: string) {
        super(token, { slackApiUrl: `${endpoint}/slack/`, retryConfig: { retries: 0 } });
      }
    }
  }));

  for (const key of Object.keys(process.env)) if (key.startsWith('AWS_')) delete process.env[key];
  Object.assign(process.env, {
    AWS_ACCESS_KEY_ID: '000000000000',
    AWS_SECRET_ACCESS_KEY: 'synthetic-local-only',
    AWS_REGION: 'eu-west-1',
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_CONFIG_FILE: '/nonexistent',
    AWS_SHARED_CREDENTIALS_FILE: '/nonexistent',
    PROJECT_NAME: 'shop',
    STAGE: 'production'
  });
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/slack/chat.postMessage') {
        slackMessages.push(Object.fromEntries(new URLSearchParams(await request.text())));
        return Response.json({ ok: true, channel: 'C_ONCALL', ts: '1700000000.1' });
      }
      expect(url.pathname).toBe('/reportAlarmEvent');
      const identity = JSON.parse(Buffer.from(request.headers.get('aws_identity')!, 'base64').toString()) as {
        headers: { Authorization: string };
      };
      expect(JSON.stringify(identity)).toContain('Credential=000000000000/');
      if (refuseConsole)
        return Response.json(
          {
            error: {
              message: 'console unavailable',
              code: -32603,
              data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 }
            }
          },
          { status: 500 }
        );
      alarms.push(((await request.json()) as Record<string, Record<string, unknown>>)['0']!);
      return Response.json([{ result: { data: 'event-1' } }]);
    }
  });
  endpoint = server.url.origin;
  process.env.STACKTAPE_TRPC_API_ENDPOINT = endpoint;
});
afterAll(() => server?.stop(true));

const event = (includeInHistory: boolean, stateValue: 'ALARM' | 'OK' = 'ALARM'): AlarmNotificationEventRuleInput =>
  ({
    sourceEventId: 'eventbridge-delivery-1',
    description: 'threshold exceeded',
    time: '2026-10-13T00:00:00.000Z',
    stateValue,
    alarmAwsResourceName: 'shop-production-errors',
    stackName: 'shop-production',
    alarmConfig: {
      name: 'errors',
      includeInHistory,
      trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
      notificationChannels: [
        { type: 'slack', properties: { conversationId: 'C_ONCALL', accessToken: 'local-slack-placeholder' } }
      ]
    },
    affectedResource: { displayName: 'api', link: 'https://example.invalid' },
    comparisonOperator: 'GreaterThanThreshold',
    measuringUnit: 'percent',
    alarmLink: 'https://example.invalid/alarm',
    statFunction: 'avg'
  }) as AlarmNotificationEventRuleInput;

test('the handler delivers without history, reports firing and recovery with signed identity, and propagates Console refusal for retry', async () => {
  const { default: handle } = await import('./index');
  await handle(event(false));
  await handle(event(false, 'OK'));
  expect(slackMessages).toHaveLength(1);
  expect(slackMessages[0]).toMatchObject({ channel: 'C_ONCALL' });
  expect(slackMessages[0]!.text).toContain('ALARM fired');
  await handle(event(true));
  await handle(event(true, 'OK'));
  expect(alarms).toHaveLength(2);
  expect(alarms[0]).toMatchObject({
    sourceEventId: 'eventbridge-delivery-1',
    type: 'ALARM_TRIGGERED',
    project: 'shop',
    stage: 'production',
    alarmName: 'errors',
    triggerType: 'lambda-error-rate',
    details: { alarmArn: 'shop-production-errors', time: '2026-10-13T00:00:00.000Z' }
  });
  expect(alarms[1]).toMatchObject({ type: 'ALARM_RESOLVED' });
  refuseConsole = true;
  await expect(handle(event(true))).rejects.toThrow('console unavailable');
  expect(alarms).toHaveLength(2);
});
