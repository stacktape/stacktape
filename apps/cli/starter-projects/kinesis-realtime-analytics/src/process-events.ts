import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_ANALYTICS_TABLE_NAME!;

type KinesisRecord = {
  kinesis: { data: string };
  eventID: string;
};

const handler = async (event: { Records: KinesisRecord[] }) => {
  // Aggregate events by type + hour bucket
  const aggregates = new Map<string, { pk: string; sk: string; count: number }>();

  for (const record of event.Records) {
    const payload = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString('utf-8'));
    const eventType = payload.type || 'unknown';
    const hour = payload.timestamp ? payload.timestamp.slice(0, 13) + ':00' : new Date().toISOString().slice(0, 13) + ':00';
    const key = `${eventType}#${hour}`;

    const existing = aggregates.get(key);
    if (existing) {
      existing.count++;
    } else {
      aggregates.set(key, { pk: eventType, sk: hour, count: 1 });
    }
  }

  // Write aggregates to DynamoDB using atomic increment
  for (const agg of aggregates.values()) {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: agg.pk, sk: agg.sk },
        UpdateExpression: 'ADD eventCount :count SET lastUpdated = :now',
        ExpressionAttributeValues: {
          ':count': agg.count,
          ':now': new Date().toISOString()
        }
      })
    );
  }

  console.log(`Processed ${event.Records.length} records into ${aggregates.size} aggregates`);
  return { statusCode: 200 };
};

export default handler;
