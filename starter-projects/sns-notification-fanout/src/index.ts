import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const sns = new SNSClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const topicArn = process.env.STP_NOTIFICATION_TOPIC_ARN!;
const tableName = process.env.STP_NOTIFICATIONS_TABLE_NAME!;

const app = new Hono();

// Publish a notification to the SNS topic (fans out to all subscribers)
app.post('/notify', async (c) => {
  const body = await c.req.json();
  const { subject, message, channel } = body;

  if (!message) return c.json({ error: '"message" field required' }, 400);

  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: subject || 'Notification',
      Message: JSON.stringify({ subject: subject || 'Notification', message, channel: channel || 'default', sentAt: new Date().toISOString() })
    })
  );

  return c.json({ message: 'Notification published to all subscribers' });
});

// List stored notifications
app.get('/notifications', async (c) => {
  const result = await ddb.send(new ScanCommand({ TableName: tableName, Limit: 50 }));
  return c.json({ notifications: result.Items || [] });
});

app.get('/', (c) =>
  c.json({ service: 'sns-notification-fanout', endpoints: ['POST /notify', 'GET /notifications'] })
);

export const handler = handle(app);
