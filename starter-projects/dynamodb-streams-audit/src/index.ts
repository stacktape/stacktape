import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const productsTable = process.env.STP_PRODUCTS_TABLE_NAME!;
const auditTable = process.env.STP_AUDIT_TABLE_NAME!;

const app = new Hono();

// --- Products CRUD ---

app.get('/products', async (c) => {
  const result = await ddb.send(new ScanCommand({ TableName: productsTable }));
  return c.json({ products: result.Items || [] });
});

app.get('/products/:id', async (c) => {
  const result = await ddb.send(new GetCommand({ TableName: productsTable, Key: { id: c.req.param('id') } }));
  if (!result.Item) return c.json({ error: 'Product not found' }, 404);
  return c.json(result.Item);
});

app.post('/products', async (c) => {
  const body = await c.req.json();
  const product = { id: randomUUID(), name: body.name, price: body.price, category: body.category || 'general', createdAt: new Date().toISOString() };

  await ddb.send(new PutCommand({ TableName: productsTable, Item: product }));
  return c.json(product, 201);
});

app.put('/products/:id', async (c) => {
  const body = await c.req.json();
  const result = await ddb.send(
    new UpdateCommand({
      TableName: productsTable,
      Key: { id: c.req.param('id') },
      UpdateExpression: 'SET #n = :name, price = :price, category = :category, updatedAt = :now',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': body.name, ':price': body.price, ':category': body.category || 'general', ':now': new Date().toISOString() },
      ReturnValues: 'ALL_NEW'
    })
  );
  return c.json(result.Attributes);
});

app.delete('/products/:id', async (c) => {
  await ddb.send(new DeleteCommand({ TableName: productsTable, Key: { id: c.req.param('id') } }));
  return c.json({ deleted: true });
});

// --- Audit Log ---

app.get('/audit', async (c) => {
  const result = await ddb.send(new ScanCommand({ TableName: auditTable, Limit: 50 }));
  const items = (result.Items || []).sort((a, b) => (b.timestamp as string).localeCompare(a.timestamp as string));
  return c.json({ auditLog: items });
});

app.get('/audit/:productId', async (c) => {
  const result = await ddb.send(
    new QueryCommand({
      TableName: auditTable,
      KeyConditionExpression: 'entityId = :id',
      ExpressionAttributeValues: { ':id': c.req.param('productId') },
      ScanIndexForward: false
    })
  );
  return c.json({ auditLog: result.Items || [] });
});

app.get('/', (c) =>
  c.json({
    service: 'dynamodb-streams-audit',
    endpoints: [
      'GET /products',
      'POST /products',
      'PUT /products/:id',
      'DELETE /products/:id',
      'GET /audit',
      'GET /audit/:productId'
    ]
  })
);

export const handler = handle(app);
