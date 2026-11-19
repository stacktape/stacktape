import type { AlarmNotificationEventRuleInput } from '@domain-services/config-manager/resolved-types/alarms';
import { WebClient } from '@slack/web-api';
import { getCauseString } from '../utils';
import type { SlackIntegration } from '@stacktape/config/user-integrations';

export const sendAlarmSlackMessage = ({
  notificationDetail,
  alarmDetail
}: {
  alarmDetail: AlarmNotificationEventRuleInput;
  notificationDetail: SlackIntegration;
}) => {
  // Bounded well inside the delivery claim's lease (the client's default retries for about half an hour). A rate-limited
  // call fails at once instead of sleeping for Slack's Retry-After, which can outlast the lease; the claim is given up
  // and Lambda retries the event a minute or more later.
  const slackClient = new WebClient(notificationDetail.properties.accessToken, {
    timeout: 10_000,
    retryConfig: { retries: 2, minTimeout: 1000, maxTimeout: 5000 },
    rejectRateLimitedCalls: true
  });

  // The client throws on a refusal (`ok: false`), so a returned response is an accepted message.
  return slackClient.chat.postMessage({
    channel: notificationDetail.properties.conversationId,
    text: getMarkdownFormattedMessage({ alarmDetail })
  });
};

const getMarkdownFormattedMessage = ({ alarmDetail }: { alarmDetail: AlarmNotificationEventRuleInput }) => {
  if (alarmDetail.stateValue === 'OK') {
    return `:large_green_circle: *ALARM resolved: <${alarmDetail.alarmLink}|${alarmDetail.alarmConfig.name}>*\n\n`
      .concat(`*[ \`${alarmDetail.stackName}\`* stack *]*\n\n`)
      .concat(`:o: *Resource:* <${alarmDetail.affectedResource.link}|${alarmDetail.affectedResource.displayName}>\n\n`)
      .concat(`:hourglass: *Time:* ${alarmDetail.time}`);
  }
  return `:red_circle: *ALARM fired: <${alarmDetail.alarmLink}|${alarmDetail.alarmConfig.name}>*\n\n`
    .concat(`*[ \`${alarmDetail.stackName}\`* stack *]*\n\n`)
    .concat('------------------------------------------------\n\n')
    .concat(
      alarmDetail.alarmConfig.description
        ? `:information_source: *Description:* \`${alarmDetail.description}\`\n\n`
        : ''
    )
    .concat(`:o: *Resource:* <${alarmDetail.affectedResource.link}|${alarmDetail.affectedResource.displayName}>\n\n`)
    .concat(`:question: *Cause:* \`${getCauseString({ alarmDetail })}\`\n\n`)
    .concat(`:hourglass: *Time:* ${alarmDetail.time}`);
};
