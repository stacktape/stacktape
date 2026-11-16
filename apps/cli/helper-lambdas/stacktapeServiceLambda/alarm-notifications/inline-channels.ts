import type { AlarmNotificationEventRuleInput } from '@domain-services/config-manager/resolved-types/alarms';
import type { NotificationChannel } from '@stacktape/config/notification-channels';
import type {
  DiscordIntegration,
  EmailIntegration,
  MsTeamsIntegration,
  SlackIntegration,
  WebhookIntegration
} from '@stacktape/config/user-integrations';
import { createHmac } from 'node:crypto';
import { deliverOnce } from './delivery-claims';
import { resolveDynamicReferences } from './dynamic-references';
import { sendAlarmEmail } from './email';
import { sendAlarmSlackMessage } from './slack';
import { getCauseString } from './utils';

/** A channel whose destination and credentials are in the config. These are delivered from the customer's account. */
export type InlineNotificationChannel =
  | SlackIntegration
  | MsTeamsIntegration
  | DiscordIntegration
  | EmailIntegration
  | WebhookIntegration;

export const isInlineChannel = (channel: NotificationChannel): channel is InlineNotificationChannel =>
  channel.type !== 'console-channel' && channel.type !== 'slack-app';

const FETCH_TIMEOUT_MS = 15_000;

/** The error text names the provider's answer, never the request: a webhook URL or header is a credential. */
class ProviderRefusal extends Error {
  constructor(provider: string, status: number) {
    super(`${provider} answered HTTP ${status}`);
  }
}

export const isResolved = (event: AlarmNotificationEventRuleInput) => event.stateValue === 'OK';

export const getAlarmTitle = (event: AlarmNotificationEventRuleInput) => {
  const name = event.alarmConfig?.name || event.alarmAwsResourceName;
  return isResolved(event) ? `Alarm "${name}" resolved` : `Alarm "${name}" triggered`;
};

const getProject = () => process.env.PROJECT_NAME;
const getStage = () => process.env.STAGE;
const getRegion = () => process.env.AWS_REGION;

/** The facts a chat message lists, in the order a reader needs them. */
const getDisplayFields = (event: AlarmNotificationEventRuleInput) =>
  [
    ['Project', getProject()],
    ['Stage', getStage()],
    ['Region', getRegion()],
    ['Resource', event.affectedResource?.displayName],
    ['Cause', isResolved(event) ? undefined : getCauseString({ alarmDetail: event }).trim()],
    ['Description', event.alarmConfig?.description ? event.description : undefined],
    ['Time', event.time],
    ['Alarm', event.alarmLink]
  ].filter((field): field is [string, string] => Boolean(field[1]));

const postJson = async ({
  provider,
  url,
  body,
  headers = {}
}: {
  provider: string;
  url: string;
  body: string;
  headers?: Record<string, string>;
}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new ProviderRefusal(provider, response.status);
};

// Microsoft Teams, Discord and generic webhooks receive the same request shapes the Stacktape Console sends to its own
// channels, so a receiver set up for one works with the other.
const sendToMsTeams = ({ event, channel }: { event: AlarmNotificationEventRuleInput; channel: MsTeamsIntegration }) =>
  postJson({
    provider: 'Microsoft Teams',
    url: channel.properties.webhookUrl,
    body: JSON.stringify({
      text: [
        `**${getAlarmTitle(event)}**`,
        ...getDisplayFields(event).map(([name, value]) => `**${name}:** ${value}`)
      ].join('\n\n')
    })
  });

const sendToDiscord = ({ event, channel }: { event: AlarmNotificationEventRuleInput; channel: DiscordIntegration }) =>
  postJson({
    provider: 'Discord',
    url: channel.properties.webhookUrl,
    body: JSON.stringify({
      embeds: [
        {
          title: getAlarmTitle(event),
          color: isResolved(event) ? 0x3498db : 0xe74c3c,
          fields: getDisplayFields(event).map(([name, value]) => ({ name, value, inline: true })),
          timestamp: new Date().toISOString(),
          footer: { text: 'Stacktape Alerts' }
        }
      ]
    })
  });

export const getWebhookBody = (event: AlarmNotificationEventRuleInput) =>
  JSON.stringify({
    // The EventBridge event ID: a receiver can drop a repeated delivery of the same alarm event.
    id: event.sourceEventId,
    sourceKind: 'ALARM',
    type: isResolved(event) ? 'ALARM_RESOLVED' : 'ALARM_TRIGGERED',
    severity: isResolved(event) ? 'INFO' : 'ERROR',
    timestamp: new Date().toISOString(),
    project: getProject(),
    stage: getStage(),
    region: getRegion(),
    title: getAlarmTitle(event),
    details: getAlarmDetails(event)
  });

const sendToWebhook = ({ event, channel }: { event: AlarmNotificationEventRuleInput; channel: WebhookIntegration }) => {
  const body = getWebhookBody(event);
  const { url, secret, headers } = channel.properties;
  return postJson({
    provider: 'The webhook',
    url,
    body,
    headers: {
      ...(headers || {}),
      ...(secret ? { 'X-Stacktape-Signature': createHmac('sha256', secret).update(body).digest('hex') } : {})
    }
  });
};

/** The alarm facts reported to the Console and sent to webhooks. None of them is a channel property. */
export const getAlarmDetails = (event: AlarmNotificationEventRuleInput) => ({
  alarmName: event.alarmConfig?.name || event.alarmAwsResourceName,
  ...(event.alarmConfig?.trigger?.type ? { triggerType: event.alarmConfig.trigger.type } : {}),
  description: event.description,
  time: event.time,
  state: event.stateValue,
  alarmArn: event.alarmAwsResourceName,
  stackName: event.stackName,
  affectedResource: event.affectedResource,
  comparisonOperator: event.comparisonOperator,
  measuringUnit: event.measuringUnit,
  statFunction: event.statFunction,
  alarmLink: event.alarmLink
});

const sendToChannel = ({
  event,
  channel
}: {
  event: AlarmNotificationEventRuleInput;
  channel: InlineNotificationChannel;
}): Promise<unknown> => {
  switch (channel.type) {
    case 'slack':
      return sendAlarmSlackMessage({ notificationDetail: channel, alarmDetail: event });
    case 'email':
      return sendAlarmEmail({ notificationDetail: channel, alarmDetail: event });
    case 'ms-teams':
      return sendToMsTeams({ event, channel });
    case 'discord':
      return sendToDiscord({ event, channel });
    case 'webhook':
      return sendToWebhook({ event, channel });
    default: {
      const unsupported: never = channel;
      throw new Error(`Unsupported notification channel type ${(unsupported as { type: string }).type}.`);
    }
  }
};

/** A failure's code or class only: SDK and fetch errors can quote the request, which carries credentials. */
const describeFailure = (error: unknown) => {
  if (error instanceof ProviderRefusal) return error.message;
  const { code, name, data } = (error || {}) as { code?: unknown; name?: unknown; data?: { error?: unknown } };
  const slackError = typeof data?.error === 'string' ? data.error : undefined;
  return [typeof code === 'string' ? code : typeof name === 'string' ? name : 'Error', slackError]
    .filter(Boolean)
    .join(': ');
};

/**
 * A notification goes out when the alarm fires, and when it recovers from a real firing. An alarm's first evaluation
 * moves it from INSUFFICIENT_DATA to OK; that is not a recovery anyone needs to hear about.
 */
export const shouldNotify = (event: AlarmNotificationEventRuleInput) =>
  event.stateValue === 'ALARM' || (event.stateValue === 'OK' && event.previousStateValue === 'ALARM');

/**
 * Delivers the alarm event to every inline channel from the customer's own account. Each channel is sent at most once
 * per event; a failed channel fails the invocation so Lambda retries it, without resending the others.
 */
export const deliverInlineChannels = async (event: AlarmNotificationEventRuleInput) => {
  const inlineChannels = (event.alarmConfig?.notificationChannels || [])
    .map((channel, index) => ({ channel, index }))
    .filter((entry): entry is { channel: InlineNotificationChannel; index: number } => isInlineChannel(entry.channel));
  if (!inlineChannels.length || !shouldNotify(event)) return;

  const results = await Promise.allSettled(
    inlineChannels.map(async ({ channel, index }) => {
      const resolvedChannel = await resolveDynamicReferences(channel);
      return deliverOnce({
        key: `${event.sourceEventId}/${index}`,
        send: () => sendToChannel({ event, channel: resolvedChannel })
      });
    })
  );
  const failures = results.flatMap((result, position) =>
    result.status === 'rejected'
      ? [
          `${inlineChannels[position]!.channel.type} channel #${inlineChannels[position]!.index + 1}: ${describeFailure(result.reason)}`
        ]
      : []
  );
  if (failures.length) {
    throw new Error(`Failed to deliver ${failures.length} alarm notification(s): ${failures.join('; ')}`);
  }
};
