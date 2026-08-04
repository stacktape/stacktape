import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const kinesis = new KinesisClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const streamName = process.env.STP_EVENT_STREAM_NAME!;
const tableName = process.env.STP_ANALYTICS_TABLE_NAME!;

const app = new Hono();

// Ingest an event into the Kinesis stream
app.post('/events', async (c) => {
  const body = await c.req.json();
  const { type, page } = body;

  if (!type) return c.json({ error: '"type" field required' }, 400);

  const event = { type, page: page || '/', timestamp: new Date().toISOString() };

  await kinesis.send(
    new PutRecordCommand({
      StreamName: streamName,
      Data: Buffer.from(JSON.stringify(event)),
      PartitionKey: type
    })
  );

  return c.json({ message: 'Event ingested', event });
});

// Query aggregated analytics
app.get('/analytics', async (c) => {
  const result = await ddb.send(new ScanCommand({ TableName: tableName }));
  const analytics = (result.Items || []).map((item) => ({
    eventType: item.pk,
    hourBucket: item.sk,
    count: item.eventCount,
    lastUpdated: item.lastUpdated
  }));

  return c.json({ analytics });
});

app.get('/', (c) =>
  c.json({ service: 'kinesis-realtime-analytics', endpoints: ['POST /events', 'GET /analytics'] })
);

export const handler = handle(app);
