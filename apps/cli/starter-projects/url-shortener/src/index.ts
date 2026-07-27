import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_LINKS_TABLE_NAME!;

const generateCode = () => randomBytes(4).toString('base64url');

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'URL Shortener',
    endpoints: {
      'POST /shorten': 'Create a short URL (body: { "url": "https://..." })',
      'GET /links': 'List all shortened URLs',
      'GET /:code': 'Redirect to the original URL'
    }
  });
});

app.post('/shorten', async (c) => {
  const body = await c.req.json();
  if (!body.url) {
    return c.json({ error: 'Missing url field' }, 400);
  }

  const code = generateCode();
  const item = {
    code,
    url: body.url,
    clicks: 0,
    createdAt: new Date().toISOString()
  };

  await client.send(new PutCommand({ TableName: tableName, Item: item }));
  return c.json({ data: item }, 201);
});

app.get('/links', async (c) => {
  const result = await client.send(new ScanCommand({ TableName: tableName }));
  return c.json({ data: result.Items || [] });
});

app.get('/:code', async (c) => {
  const code = c.req.param('code');
  const result = await client.send(new GetCommand({ TableName: tableName, Key: { code } }));

  if (!result.Item) {
    return c.json({ error: 'Link not found' }, 404);
  }

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { code },
      UpdateExpression: 'SET clicks = clicks + :inc',
      ExpressionAttributeValues: { ':inc': 1 }
    })
  );

  return c.redirect(result.Item.url, 301);
});

export const handler = handle(app);
