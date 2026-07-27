import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_MONITORS_TABLE_NAME!;

const app = new Hono();

// Add a URL to monitor
app.post('/monitors', async (c) => {
  const body = await c.req.json();
  if (!body.url) return c.json({ error: '"url" field required' }, 400);

  const monitor = {
    id: randomUUID(),
    url: body.url,
    name: body.name || body.url,
    createdAt: new Date().toISOString(),
    lastCheck: null,
    checks: []
  };

  await ddb.send(new PutCommand({ TableName: tableName, Item: monitor }));
  return c.json(monitor, 201);
});

// List all monitors with latest status
app.get('/monitors', async (c) => {
  const result = await ddb.send(new ScanCommand({ TableName: tableName }));
  const monitors = (result.Items || []).map((item) => ({
    id: item.id,
    url: item.url,
    name: item.name,
    createdAt: item.createdAt,
    lastCheck: item.lastCheck
  }));
  return c.json({ monitors });
});

// Get monitor detail with recent check history
app.get('/monitors/:id', async (c) => {
  const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { id: c.req.param('id') } }));
  if (!result.Item) return c.json({ error: 'Monitor not found' }, 404);
  return c.json(result.Item);
});

// Delete a monitor
app.delete('/monitors/:id', async (c) => {
  await ddb.send(new DeleteCommand({ TableName: tableName, Key: { id: c.req.param('id') } }));
  return c.json({ deleted: true });
});

app.get('/', (c) =>
  c.json({
    service: 'scheduled-health-checker',
    endpoints: ['POST /monitors', 'GET /monitors', 'GET /monitors/:id', 'DELETE /monitors/:id'],
    note: 'Health checks run automatically every 5 minutes'
  })
);

export const handler = handle(app);
