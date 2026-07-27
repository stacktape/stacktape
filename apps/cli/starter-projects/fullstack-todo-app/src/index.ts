import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_TODOS_TABLE_NAME!;

const app = new Hono();

app.get('/todos', async (c) => {
  const result = await client.send(new ScanCommand({ TableName: tableName }));
  const todos = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return c.json({ data: todos });
});

app.post('/todos', async (c) => {
  const body = await c.req.json();
  if (!body.title) {
    return c.json({ error: 'Missing title' }, 400);
  }

  const todo = {
    id: randomUUID(),
    title: body.title,
    completed: false,
    createdAt: new Date().toISOString()
  };

  await client.send(new PutCommand({ TableName: tableName, Item: todo }));
  return c.json({ data: todo }, 201);
});

app.put('/todos/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: string[] = [];
  const values: Record<string, any> = {};
  const names: Record<string, string> = {};

  if (body.title !== undefined) {
    updates.push('#title = :title');
    values[':title'] = body.title;
    names['#title'] = 'title';
  }
  if (body.completed !== undefined) {
    updates.push('#completed = :completed');
    values[':completed'] = body.completed;
    names['#completed'] = 'completed';
  }

  if (!updates.length) {
    return c.json({ error: 'Nothing to update' }, 400);
  }

  const result = await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeValues: values,
      ExpressionAttributeNames: names,
      ReturnValues: 'ALL_NEW'
    })
  );

  return c.json({ data: result.Attributes });
});

app.delete('/todos/:id', async (c) => {
  const id = c.req.param('id');
  await client.send(new DeleteCommand({ TableName: tableName, Key: { id } }));
  return c.json({ message: 'Deleted' });
});

export const handler = handle(app);
