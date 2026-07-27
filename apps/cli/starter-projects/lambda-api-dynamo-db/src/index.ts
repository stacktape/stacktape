import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_POSTS_TABLE_NAME!;

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'Lambda API with DynamoDB',
    endpoints: { 'GET /posts': 'List all posts', 'POST /posts': 'Create a post' }
  });
});

app.get('/posts', async (c) => {
  const result = await client.send(new ScanCommand({ TableName: tableName }));
  return c.json({ data: result.Items || [] });
});

app.post('/posts', async (c) => {
  const body = await c.req.json();

  if (!body.title || !body.content) {
    return c.json({ error: 'Missing title or content' }, 400);
  }

  const post = {
    id: randomUUID(),
    title: body.title,
    content: body.content,
    createdAt: new Date().toISOString()
  };

  await client.send(new PutCommand({ TableName: tableName, Item: post }));
  return c.json({ data: post }, 201);
});

export const handler = handle(app);
