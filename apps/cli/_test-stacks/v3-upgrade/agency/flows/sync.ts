// A CRM sync flow: writes one item per run to the site table. `{ fail: true }` throws, to raise the error-rate alarm.
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export default async (event: { fail?: boolean; id?: string }) => {
  if (event.fail) throw new Error('Flow sync failed on purpose');
  const id = event.id ?? `run-${Date.now()}`;
  await client.send(
    new PutItemCommand({
      TableName: process.env.STP_SITE_TABLE_NAME,
      Item: { id: { S: id }, source: { S: 'flow-sync' } }
    })
  );
  return { stored: id };
};
