import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_NOTIFICATIONS_TABLE_NAME!;

type SNSRecord = {
  Sns: { Subject: string; Message: string; MessageId: string; Timestamp: string };
};

// This subscriber stores every notification in DynamoDB for audit/history
const handler = async (event: { Records: SNSRecord[] }) => {
  for (const record of event.Records) {
    const notification = JSON.parse(record.Sns.Message);
    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          id: randomUUID(),
          snsMessageId: record.Sns.MessageId,
          subject: notification.subject,
          message: notification.message,
          channel: notification.channel,
          sentAt: notification.sentAt,
          storedAt: new Date().toISOString()
        }
      })
    );
  }

  return { statusCode: 200, body: 'Notifications stored' };
};

export default handler;
