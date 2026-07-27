import { WebClient } from '@slack/web-api';
import { getCauseString } from '../utils';

export const sendAlarmSlackMessage = ({
  notificationDetail,
  alarmDetail
}: {
  alarmDetail: AlarmNotificationEventRuleInput;
  notificationDetail: SlackIntegration;
}) => {
  const slackClient = new WebClient(notificationDetail.properties.accessToken);

  return slackClient.chat.postMessage({
    channel: notificationDetail.properties.conversationId,
    text: getMarkdownFormattedMessage({ alarmDetail })
  });
};

const getMarkdownFormattedMessage = ({ alarmDetail }: { alarmDetail: AlarmNotificationEventRuleInput }) => {
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
