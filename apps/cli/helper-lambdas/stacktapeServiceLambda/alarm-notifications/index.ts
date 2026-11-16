import type { AlarmNotificationEventRuleInput } from '@domain-services/config-manager/resolved-types/alarms';
import type { ReportAlarmEventParams } from '@stacktape/console-api/aws-identity';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsIdentityProtectedClient } from '@stacktape-api/aws-identity-protected';
import { deliverInlineChannels, getAlarmDetails, getAlarmTitle } from './inline-channels';

/**
 * Handles one alarm state change. Inline channels (Slack, Microsoft Teams, Discord, email, webhooks) are delivered from
 * this function, in the customer's account, whether or not the alarm is in the Console history. The Console receives
 * the alarm's facts and the names of Console-managed channels only, never an inline channel's properties.
 *
 * Both parts run even when one fails, and either failure fails the invocation so Lambda retries it. A retry does not
 * repeat what already succeeded: sent notifications are recorded per event and channel, and the Console treats the
 * EventBridge event ID as the event's identity.
 */
export default async (event: AlarmNotificationEventRuleInput) => {
  const results = await Promise.allSettled([
    deliverInlineChannels(event),
    event.alarmConfig?.includeInHistory === false ? Promise.resolve() : reportToConsoleApi(event)
  ]);
  const failures = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as Error] : []));
  if (failures.length === 1) throw failures[0];
  if (failures.length) throw new Error(failures.map((error) => error?.message ?? String(error)).join('\n'));
};

/** Only the channels the Console delivers itself, by reference. Inline channels never leave the account. */
export const getConsoleChannelReferences = (
  event: AlarmNotificationEventRuleInput
): ReportAlarmEventParams['channels'] =>
  (event.alarmConfig?.notificationChannels || []).flatMap((channel): ReportAlarmEventParams['channels'] => {
    if (channel.type === 'console-channel') {
      return [{ name: channel.properties.channelName, type: 'console-channel', properties: {} }];
    }
    if (channel.type === 'slack-app') {
      // The deploy resolved the channel name into the connection and channel IDs; neither is a credential.
      return [
        {
          name: `#${channel.properties.channel.replace(/^#/u, '')}`,
          type: 'slack_app' as const,
          properties: channel.properties
        }
      ];
    }
    return [];
  });

const reportToConsoleApi = async (event: AlarmNotificationEventRuleInput) => {
  const apiUrl = process.env.STACKTAPE_TRPC_API_ENDPOINT;
  const region = process.env.AWS_REGION;
  const project = process.env.PROJECT_NAME;
  const stage = process.env.STAGE;

  if (!apiUrl || !region || !project || !stage) {
    throw new Error('Alarm notification routing is missing required Stacktape environment configuration.');
  }

  const client = new AwsIdentityProtectedClient();
  await client.init({ credentials: await defaultProvider()(), region, apiUrl });

  const { alarmName, triggerType, ...details } = getAlarmDetails(event);
  await client.reportAlarmEvent.mutate({
    sourceEventId: event.sourceEventId,
    type: event.stateValue === 'OK' ? 'ALARM_RESOLVED' : 'ALARM_TRIGGERED',
    alarmName,
    sourceConfigName: event.alarmConfig?.name,
    // The config-side trigger type: the Console uses it to classify the signal (a canary's
    // SuccessPercent alarm becomes the synthetic test's own signal, not a generic alarm).
    triggerType,
    project,
    stage,
    region,
    title: getAlarmTitle(event),
    channels: getConsoleChannelReferences(event),
    details
  });
};
