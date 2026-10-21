import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'node:crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_ORDERS_TABLE_NAME!;

type Order = {
  id: string;
  items: { sku: string; quantity: number; priceCents: number }[];
  customer?: { name: string; email: string };
  createdAt: string;
};

const toOrderView = (order: Order) => ({
  id: order.id,
  items: order.items,
  totalCents: order.items.reduce((sum, item) => sum + item.quantity * item.priceCents, 0),
  customerEmail: order.customer!.email.toLowerCase(),
  createdAt: order.createdAt
});

const app = new Hono();

app.get('/', (c) => c.json({ service: 'shop-api', endpoints: ['GET /orders', 'GET /orders/:id', 'POST /orders'] }));

app.get('/orders', async (c) => {
  const result = await client.send(new ScanCommand({ TableName: tableName, Limit: 50 }));
  return c.json({ data: (result.Items || []).map((order) => ({ id: order.id, createdAt: order.createdAt })) });
});

app.get('/orders/:id', async (c) => {
  const result = await client.send(new GetCommand({ TableName: tableName, Key: { id: c.req.param('id') } }));
  if (!result.Item) return c.json({ error: 'Order not found' }, 404);
  return c.json({ data: toOrderView(result.Item as Order) });
});

app.post('/orders', async (c) => {
  const body = await c.req.json();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: 'An order needs at least one item' }, 400);
  }
  const order: Order = {
    id: `ord_${randomBytes(4).toString('hex')}`,
    items: body.items,
    // Orders from the old checkout were created without customer details.
    ...(body.customer ? { customer: body.customer } : {}),
    createdAt: new Date().toISOString()
  };
  await client.send(new PutCommand({ TableName: tableName, Item: order }));
  return c.json({ data: order }, 201);
});

app.onError((error, c) => {
  console.error('Request failed', { path: c.req.path, error });
  return c.json({ error: 'Internal server error' }, 500);
});

export const handler = handle(app);
