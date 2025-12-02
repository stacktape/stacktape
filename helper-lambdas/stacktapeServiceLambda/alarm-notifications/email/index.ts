import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { getCauseString } from '../utils';

const sesClient = new SESv2Client({});

export const sendAlarmEmail = ({
  notificationDetail,
  alarmDetail
}: {
  alarmDetail: AlarmNotificationEventRuleInput;
  notificationDetail: EmailIntegration;
}) => {
  return sesClient.send(
    new SendEmailCommand({
      Content: {
        Simple: {
          Subject: { Data: getEmailSubject({ alarmDetail }), Charset: 'UTF-8' },
          Body: { Text: { Data: getTextEmailContent({ alarmDetail }), Charset: 'UTF-8' } }
        }
      },
      Destination: {
        ToAddresses: [notificationDetail.properties.recipient]
      },
      FromEmailAddress: notificationDetail.properties.sender
    })
  );
};

const getEmailSubject = ({ alarmDetail }: { alarmDetail: AlarmNotificationEventRuleInput }) => {
  return `Alarm ${alarmDetail.alarmConfig.name} (stack ${alarmDetail.stackName})`;
};

const getTextEmailContent = ({ alarmDetail }: { alarmDetail: AlarmNotificationEventRuleInput }) => {
  return `Alarm ${alarmDetail.alarmConfig.name} was fired in stack ${alarmDetail.stackName}.\n\n`
    .concat(` - Alarm link: ${alarmDetail.alarmLink}\n\n`)
    .concat(alarmDetail.alarmConfig.description ? ` - Description: ${alarmDetail.description}\n\n` : '')
    .concat(
      ` - Affected resource: ${alarmDetail.affectedResource.displayName} (${alarmDetail.affectedResource.link})\n\n`
    )
    .concat(` - Cause: ${getCauseString({ alarmDetail })}`);
};
