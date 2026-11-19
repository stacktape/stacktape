import type { AlarmNotificationEventRuleInput } from '@domain-services/config-manager/resolved-types/alarms';
import { afterAll, beforeAll, beforeEach, expect, mock, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { reportAlarmEventInputSchema } from '@stacktape/console-api/aws-identity';

// Every provider, AWS service and the Console run on loopback. Anything else is a request leaving the test, and fails it.
const assertLoopback = (target: unknown) => {
  const host =
    typeof target === 'string' || target instanceof URL
      ? new URL(String(target)).hostname
      : ((target as { hostname?: string; host?: string })?.hostname ?? (target as { host?: string })?.host);
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`Blocked a request to ${host}`);
};
for (const module of [http, https]) {
  for (const name of ['request', 'get'] as const) {
    const original = module[name];
    module[name] = function (this: unknown, ...args: unknown[]) {
      assertLoopback(args[0]);
      return original.apply(this, args as never);
    } as never;
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = Object.assign(
  (input: string | URL | Request, init?: RequestInit) => {
    assertLoopback(input instanceof Request ? input.url : input);
    return originalFetch(input, init);
  },
  { preconnect: originalFetch.preconnect }
);

// Synthetic values. Each one is a credential: none may reach the Console.
const SLACK_TOKEN = 'synthetic-slack-bot-placeholder';
const TEAMS_PATH = '/teams/synthetic-teams-webhook-key';
const DISCORD_PATH = '/discord/synthetic-discord-webhook-key';
const WEBHOOK_PATH = '/webhook/synthetic-webhook-path-key';
const WEBHOOK_SECRET = 'synthetic-webhook-signing-secret';
const WEBHOOK_HEADER = 'synthetic-webhook-header-value';

type ProviderRequest = { path: string; headers: Headers; body: string };
let endpoint: string;
let server: ReturnType<typeof Bun.serve>;
let providerRequests: ProviderRequest[] = [];
let consoleReports: Array<Record<string, unknown>> = [];
let markers = new Map<string, string>();
let markerEtags = new Map<string, string>();
let etagCounter = 0;
let refuseConsole = false;
let failTeamsTimes = 0;
let failWebhookTimes = 0;
let rateLimitSlackTimes = 0;

beforeAll(async () => {
  const slackModule = await import('@slack/web-api');
  mock.module('@slack/web-api', () => ({
    ...slackModule,
    WebClient: class extends slackModule.WebClient {
      constructor(token?: string, options?: ConstructorParameters<typeof slackModule.WebClient>[1]) {
        // Only the endpoint differs: the retry and rate-limit options are the production ones.
        super(token, { ...options, slackApiUrl: `${endpoint}/slack/` });
      }
    }
  }));
  // The real S3 SDK against a local bucket; only path-style addressing differs from AWS.
  const s3Module = await import('@aws-sdk/client-s3');
  mock.module('@aws-sdk/client-s3', () => ({
    ...s3Module,
    S3Client: class extends s3Module.S3Client {
      constructor() {
        super({ endpoint: `${endpoint}/s3`, forcePathStyle: true });
      }
    }
  }));

  for (const key of Object.keys(process.env)) if (key.startsWith('AWS_')) delete process.env[key];
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;
      if (path.startsWith('/s3/')) {
        const key = decodeURIComponent(path.slice('/s3/'.length));
        if (request.method === 'PUT') {
          // Read first, then check and write without yielding: S3 applies a conditional write atomically.
          const body = await request.text();
          const ifNoneMatch = request.headers.get('if-none-match');
          const ifMatch = request.headers.get('if-match');
          if ((ifNoneMatch === '*' && markers.has(key)) || (ifMatch && markerEtags.get(key) !== ifMatch)) {
            return new Response(
              '<?xml version="1.0"?><Error><Code>PreconditionFailed</Code><Message>condition</Message></Error>',
              { status: 412, headers: { 'Content-Type': 'application/xml' } }
            );
          }
          const etag = `"etag-${++etagCounter}"`;
          markers.set(key, body);
          markerEtags.set(key, etag);
          return new Response(null, { status: 200, headers: { ETag: etag } });
        }
        if (!markers.has(key)) {
          return new Response('<?xml version="1.0"?><Error><Code>NoSuchKey</Code><Message>none</Message></Error>', {
            status: 404,
            headers: { 'Content-Type': 'application/xml' }
          });
        }
        return new Response(markers.get(key), {
          headers: { 'Content-Type': 'application/json', ETag: markerEtags.get(key)! }
        });
      }
      if (path.startsWith('/secrets')) {
        return Response.json({ SecretString: JSON.stringify({ token: SLACK_TOKEN }), VersionId: 'v1' });
      }
      if (path === '/reportAlarmEvent') {
        if (refuseConsole) {
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
        }
        const raw = await request.text();
        consoleReports.push({ raw, ...(reportAlarmEventInputSchema.parse(JSON.parse(raw)['0']) as object) });
        return Response.json([{ result: { data: 'alert-event-1' } }]);
      }
      const body = await request.text();
      providerRequests.push({ path, headers: request.headers, body });
      if (path === '/slack/chat.postMessage' && rateLimitSlackTimes > 0) {
        rateLimitSlackTimes--;
        // Longer than the delivery claim's two-minute lease.
        return new Response('', { status: 429, headers: { 'Retry-After': '123' } });
      }
      if (path === '/slack/chat.postMessage') return Response.json({ ok: true, channel: 'C_ONCALL', ts: '1.1' });
      if (path === '/v2/email/outbound-emails') return Response.json({ MessageId: 'ses-message-1' });
      if (path === WEBHOOK_PATH && failWebhookTimes > 0) {
        failWebhookTimes--;
        return new Response('webhook is down', { status: 503 });
      }
      if (path === TEAMS_PATH && failTeamsTimes > 0) {
        failTeamsTimes--;
        return new Response('teams is down', { status: 503 });
      }
      return new Response('ok');
    }
  });
  endpoint = server.url.origin;
  Object.assign(process.env, {
    AWS_ACCESS_KEY_ID: '000000000000',
    AWS_SECRET_ACCESS_KEY: 'synthetic-local-only',
    AWS_REGION: 'eu-west-1',
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_CONFIG_FILE: '/nonexistent',
    AWS_SHARED_CREDENTIALS_FILE: '/nonexistent',
    AWS_ENDPOINT_URL_SECRETS_MANAGER: `${endpoint}/secrets`,
    AWS_ENDPOINT_URL_SESV2: endpoint,
    STACKTAPE_TRPC_API_ENDPOINT: endpoint,
    GLOBALLY_UNIQUE_STACK_HASH: 'abc123',
    PROJECT_NAME: 'shop',
    STAGE: 'production'
  });
});
afterAll(() => server?.stop(true));
beforeEach(() => {
  providerRequests = [];
  consoleReports = [];
  markers = new Map();
  markerEtags = new Map();
  refuseConsole = false;
  failTeamsTimes = 0;
  failWebhookTimes = 0;
  rateLimitSlackTimes = 0;
});

const allChannels = () => [
  {
    type: 'slack',
    properties: {
      conversationId: 'C_ONCALL',
      // What the deploy leaves for `$Secret('slack-bot.token')`: resolved in the account, at delivery.
      accessToken: '#stp-sec#resolve:secretsmanager:slack-bot:SecretString:token::v1#!stp-sec#'
    }
  },
  { type: 'ms-teams', properties: { webhookUrl: `${endpoint}${TEAMS_PATH}` } },
  { type: 'discord', properties: { webhookUrl: `${endpoint}${DISCORD_PATH}` } },
  { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } },
  {
    type: 'webhook',
    properties: {
      url: `${endpoint}${WEBHOOK_PATH}`,
      secret: WEBHOOK_SECRET,
      headers: { 'X-Receiver-Key': WEBHOOK_HEADER }
    }
  },
  { type: 'console-channel', properties: { channelName: 'on-call' } },
  { type: 'slack-app', properties: { channel: '#ops', connectionId: 'conn-1', channelId: 'C_OPS', channelName: 'ops' } }
];

const event = ({
  includeInHistory,
  stateValue = 'ALARM',
  previousStateValue = stateValue === 'OK' ? 'ALARM' : 'OK',
  sourceEventId = 'eventbridge-event-1',
  channels = allChannels(),
  time = '2026-10-13T00:00:00.000Z'
}: {
  includeInHistory?: boolean;
  stateValue?: 'ALARM' | 'OK';
  previousStateValue?: string;
  sourceEventId?: string;
  channels?: Array<Record<string, unknown>>;
  time?: string;
} = {}): AlarmNotificationEventRuleInput =>
  ({
    sourceEventId,
    description: 'threshold exceeded',
    time,
    stateValue,
    previousStateValue,
    alarmAwsResourceName: 'shop-production-errors',
    stackName: 'shop-production',
    alarmConfig: {
      name: 'errors',
      ...(includeInHistory === undefined ? {} : { includeInHistory }),
      trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
      notificationChannels: channels
    },
    affectedResource: { displayName: 'api', link: 'https://example.invalid' },
    comparisonOperator: 'GreaterThanThreshold',
    measuringUnit: '%',
    alarmLink: 'https://example.invalid/alarm',
    statFunction: 'avg'
  }) as unknown as AlarmNotificationEventRuleInput;

const requestsTo = (prefix: string) => providerRequests.filter(({ path }) => path.startsWith(prefix));
const credentials = [
  SLACK_TOKEN,
  TEAMS_PATH,
  DISCORD_PATH,
  WEBHOOK_PATH,
  WEBHOOK_SECRET,
  WEBHOOK_HEADER,
  'secretsmanager'
];

test('a default alarm delivers every inline channel from the account and reports only Console channel references', async () => {
  const { default: handle } = await import('./index');
  await handle(event());

  // Each inline channel received exactly one request, with the resolved credential where the provider needs it.
  const [slack] = requestsTo('/slack/');
  expect(requestsTo('/slack/')).toHaveLength(1);
  expect(slack!.headers.get('authorization')).toBe(`Bearer ${SLACK_TOKEN}`);
  expect(new URLSearchParams(slack!.body).get('text')).toContain('ALARM fired');
  expect(requestsTo(TEAMS_PATH)).toHaveLength(1);
  expect(JSON.parse(requestsTo(TEAMS_PATH)[0]!.body).text).toContain('**Alarm "errors" triggered**');
  expect(requestsTo(DISCORD_PATH)).toHaveLength(1);
  expect(JSON.parse(requestsTo(DISCORD_PATH)[0]!.body).embeds[0]).toMatchObject({ title: 'Alarm "errors" triggered' });
  expect(requestsTo('/v2/email/outbound-emails')).toHaveLength(1);
  const [webhook] = requestsTo(WEBHOOK_PATH);
  expect(requestsTo(WEBHOOK_PATH)).toHaveLength(1);
  expect(webhook!.headers.get('x-receiver-key')).toBe(WEBHOOK_HEADER);
  expect(webhook!.headers.get('x-stacktape-signature')).toBe(
    createHmac('sha256', WEBHOOK_SECRET).update(webhook!.body).digest('hex')
  );
  expect(JSON.parse(webhook!.body)).toMatchObject({
    id: 'eventbridge-event-1',
    sourceKind: 'ALARM',
    type: 'ALARM_TRIGGERED',
    severity: 'ERROR',
    project: 'shop',
    stage: 'production',
    details: { alarmName: 'errors', state: 'ALARM' }
  });

  // The Console got the alarm's facts and the two Console-managed channels by reference. No credential left.
  expect(consoleReports).toHaveLength(1);
  const report = consoleReports[0]!;
  for (const credential of credentials) expect(report.raw as string).not.toContain(credential);
  expect(report.channels).toEqual([
    { name: 'on-call', type: 'console-channel', properties: {} },
    {
      name: '#ops',
      type: 'slack_app',
      properties: { channel: '#ops', connectionId: 'conn-1', channelId: 'C_OPS', channelName: 'ops' }
    }
  ]);
  expect(report).toMatchObject({
    sourceEventId: 'eventbridge-event-1',
    type: 'ALARM_TRIGGERED',
    alarmName: 'errors',
    triggerType: 'lambda-error-rate',
    details: { alarmArn: 'shop-production-errors', time: '2026-10-13T00:00:00.000Z' }
  });
  // Only the alarm's cursor and "sent" markers stay behind: no credential, one marker per channel of this event.
  const cursorKey = 'stp-deployment-bucket-abc123/alarm-notification-deliveries/cursors/shop-production-errors';
  expect([...markers.keys()].sort()).toEqual([
    cursorKey,
    ...[0, 1, 2, 3, 4].map(
      (index) => `stp-deployment-bucket-abc123/alarm-notification-deliveries/eventbridge-event-1/${index}`
    )
  ]);
  expect(JSON.parse(markers.get(cursorKey)!)).toEqual({
    time: Date.parse('2026-10-13T00:00:00.000Z'),
    sourceEventId: 'eventbridge-event-1'
  });
  for (const [key, marker] of markers)
    if (key !== cursorKey) expect(JSON.parse(marker)).toMatchObject({ status: 'sent' });

  // A repeated delivery of the same event sends nothing again; the Console deduplicates its copy by event ID.
  const before = providerRequests.length;
  await handle(event());
  expect(providerRequests).toHaveLength(before);
  expect(consoleReports).toHaveLength(2);
});

test('with history off every inline channel type is still delivered and nothing goes to the Console', async () => {
  const { default: handle } = await import('./index');
  await handle(event({ includeInHistory: false, channels: allChannels().slice(0, 5) }));
  for (const prefix of ['/slack/', TEAMS_PATH, DISCORD_PATH, '/v2/email/outbound-emails', WEBHOOK_PATH]) {
    expect(requestsTo(prefix)).toHaveLength(1);
  }
  expect(consoleReports).toHaveLength(0);
});

test('a failed channel fails the invocation, and its retry sends only that channel', async () => {
  const { default: handle } = await import('./index');
  failTeamsTimes = 1;
  await expect(handle(event())).rejects.toThrow('ms-teams channel #2: Microsoft Teams answered HTTP 503');
  expect(requestsTo('/slack/')).toHaveLength(1);
  expect(requestsTo(TEAMS_PATH)).toHaveLength(1);

  await handle(event());
  expect(requestsTo(TEAMS_PATH)).toHaveLength(2);
  for (const prefix of ['/slack/', DISCORD_PATH, '/v2/email/outbound-emails', WEBHOOK_PATH]) {
    expect(requestsTo(prefix)).toHaveLength(1);
  }
});

test('a Console refusal fails the invocation for retry without holding back or repeating the alerts', async () => {
  const { default: handle } = await import('./index');
  refuseConsole = true;
  await expect(handle(event())).rejects.toThrow('console unavailable');
  expect(requestsTo(TEAMS_PATH)).toHaveLength(1);
  refuseConsole = false;
  await handle(event());
  expect(consoleReports).toHaveLength(1);
  expect(requestsTo(TEAMS_PATH)).toHaveLength(1);
});

test('a recovery from a real firing is announced; an alarm first evaluating to OK is not', async () => {
  const { default: handle } = await import('./index');
  await handle(event({ stateValue: 'OK', previousStateValue: 'INSUFFICIENT_DATA', sourceEventId: 'first-ok' }));
  expect(providerRequests).toHaveLength(0);
  expect(consoleReports).toHaveLength(1);

  await handle(event({ stateValue: 'OK', previousStateValue: 'ALARM', sourceEventId: 'recovery' }));
  expect(new URLSearchParams(requestsTo('/slack/')[0]!.body).get('text')).toContain('ALARM resolved');
  expect(JSON.parse(requestsTo(WEBHOOK_PATH)[0]!.body)).toMatchObject({ type: 'ALARM_RESOLVED', severity: 'INFO' });
  expect(consoleReports[1]).toMatchObject({ type: 'ALARM_RESOLVED' });
});

test('duplicate invocations of one event send each notification once, and an abandoned claim is taken over once', async () => {
  const { default: handle } = await import('./index');
  const results = await Promise.allSettled([handle(event()), handle(event())]);
  for (const result of results) {
    if (result.status === 'rejected')
      expect((result.reason as Error).message).toContain('NotificationDeliveryInProgress');
  }
  for (const prefix of ['/slack/', TEAMS_PATH, DISCORD_PATH, '/v2/email/outbound-emails', WEBHOOK_PATH]) {
    expect(requestsTo(prefix)).toHaveLength(1);
  }

  // An invocation that stopped mid-send left a stale claim on the Teams notification of another event.
  const staleKey = 'stp-deployment-bucket-abc123/alarm-notification-deliveries/stale-event/1';
  markers.set(staleKey, JSON.stringify({ status: 'sending', at: 0 }));
  markerEtags.set(staleKey, '"stale"');
  await Promise.allSettled([
    handle(event({ sourceEventId: 'stale-event' })),
    handle(event({ sourceEventId: 'stale-event' }))
  ]);
  expect(requestsTo(TEAMS_PATH)).toHaveLength(2);
  expect(JSON.parse(markers.get(staleKey)!)).toMatchObject({ status: 'sent' });
});

test('an event older than one already seen for the alarm is not announced; a retry of the newest event still is', async () => {
  const { default: handle } = await import('./index');
  const channels = [allChannels()[4]!];
  const announced = () => requestsTo(WEBHOOK_PATH).map(({ body }) => JSON.parse(body).id);

  await handle(event({ channels, sourceEventId: 'firing', time: '2026-11-16T10:00:01.000Z' }));
  await handle(event({ channels, stateValue: 'OK', sourceEventId: 'recovery', time: '2026-11-16T10:00:02.000Z' }));
  // The alarm fires again. Its first attempt fails at the receiver, so Lambda retries it.
  failWebhookTimes = 1;
  const refiring = event({ channels, sourceEventId: 'refiring', time: '2026-11-16T10:00:04.000Z' });
  await expect(handle(refiring)).rejects.toThrow('The webhook answered HTTP 503');
  // A recovery from between the two firings arrives late. The alarm is still firing: it says nothing.
  await handle(
    event({ channels, stateValue: 'OK', sourceEventId: 'delayed-recovery', time: '2026-11-16T10:00:03.000Z' })
  );
  // So does a late copy of the first firing.
  await handle(event({ channels, sourceEventId: 'firing', time: '2026-11-16T10:00:01.000Z' }));
  // The retry of the newest event is delivered, once.
  await handle(refiring);
  await handle(refiring);
  expect(announced()).toEqual(['firing', 'recovery', 'refiring', 'refiring']);
  expect(requestsTo(WEBHOOK_PATH).filter(({ body }) => JSON.parse(body).id === 'refiring')).toHaveLength(2);
  // The Console orders its own copy of every event.
  expect(consoleReports.map((report) => report.sourceEventId)).toEqual([
    'firing',
    'recovery',
    'refiring',
    'delayed-recovery',
    'firing',
    'refiring',
    'refiring'
  ]);
});

test('a rate-limited Slack call fails at once and gives up its claim, so the retry sends it once', async () => {
  const { default: handle } = await import('./index');
  const input = event({
    includeInHistory: false,
    channels: [{ type: 'slack', properties: { accessToken: SLACK_TOKEN, conversationId: 'C_ONCALL' } }]
  });
  rateLimitSlackTimes = 1;
  const started = Date.now();
  await expect(handle(input)).rejects.toThrow('slack channel #1: slack_webapi_rate_limited_error');
  // Slack asked for 123 seconds. Waiting them out would outlive the claim's lease and let a retry send it twice.
  expect(Date.now() - started).toBeLessThan(10_000);
  expect(
    JSON.parse(markers.get('stp-deployment-bucket-abc123/alarm-notification-deliveries/eventbridge-event-1/0')!)
  ).toMatchObject({ status: 'failed' });

  await handle(input);
  await handle(input);
  expect(requestsTo('/slack/chat.postMessage')).toHaveLength(2);
  expect(
    JSON.parse(markers.get('stp-deployment-bucket-abc123/alarm-notification-deliveries/eventbridge-event-1/0')!)
  ).toMatchObject({ status: 'sent' });
});
