import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.STP_POSTGRES_DB_CONNECTION_STRING });
const prisma = new PrismaClient({ adapter });

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient as any);
const dynamoTableName = process.env.STP_DYNAMO_DB_NAME || '';

type LambdaEvent = {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  body?: string;
};

type LambdaResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const jsonResponse = (data: unknown, statusCode = 200): LambdaResponse => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data)
});

// ============ POSTGRES HANDLERS ============

const listPosts = async () => {
  const posts = await prisma.post.findMany({
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  return jsonResponse(posts);
};

const getPost = async (id: string) => {
  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  if (!post) return jsonResponse({ error: 'Post not found' }, 404);
  return jsonResponse(post);
};

const createPost = async (body: string) => {
  const { title, content, authorId, published } = JSON.parse(body) as {
    title: string;
    content?: string;
    authorId: string;
    published?: boolean;
  };
  const post = await prisma.post.create({
    data: { title, content, authorId, published: published ?? false },
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  return jsonResponse(post, 201);
};

const updatePost = async (id: string, body: string) => {
  const { title, content, published } = JSON.parse(body) as {
    title?: string;
    content?: string;
    published?: boolean;
  };
  const post = await prisma.post.update({
    where: { id },
    data: { title, content, published },
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  return jsonResponse(post);
};

const deletePost = async (id: string) => {
  await prisma.post.delete({ where: { id } });
  return jsonResponse({ success: true });
};

const listUsers = async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  return jsonResponse(users);
};

// ============ DYNAMO HANDLERS ============

const listDynamoItems = async () => {
  if (!dynamoTableName) return jsonResponse({ error: 'DynamoDB not configured' }, 500);
  const result = await docClient.send(new ScanCommand({ TableName: dynamoTableName }));
  return jsonResponse(result.Items || []);
};

const getDynamoItem = async (pk: string, sk: string) => {
  if (!dynamoTableName) return jsonResponse({ error: 'DynamoDB not configured' }, 500);
  const result = await docClient.send(new GetCommand({ TableName: dynamoTableName, Key: { pk, sk } }));
  if (!result.Item) return jsonResponse({ error: 'Item not found' }, 404);
  return jsonResponse(result.Item);
};

const createDynamoItem = async (body: string) => {
  if (!dynamoTableName) return jsonResponse({ error: 'DynamoDB not configured' }, 500);
  const item = JSON.parse(body) as Record<string, unknown>;
  await docClient.send(new PutCommand({ TableName: dynamoTableName, Item: item }));
  return jsonResponse(item, 201);
};

const updateDynamoItem = async (pk: string, sk: string, body: string) => {
  if (!dynamoTableName) return jsonResponse({ error: 'DynamoDB not configured' }, 500);
  const updates = JSON.parse(body) as Record<string, unknown>;
  const item = { pk, sk, ...updates };
  await docClient.send(new PutCommand({ TableName: dynamoTableName, Item: item }));
  return jsonResponse(item);
};

const deleteDynamoItem = async (pk: string, sk: string) => {
  if (!dynamoTableName) return jsonResponse({ error: 'DynamoDB not configured' }, 500);
  await docClient.send(new DeleteCommand({ TableName: dynamoTableName, Key: { pk, sk } }));
  return jsonResponse({ success: true });
};

// ============ ROUTER ============

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const { httpMethod, path, pathParameters, body } = event;

  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Health check
    if (path === '/' && httpMethod === 'GET') {
      return jsonResponse({ status: 'ok', service: 'api-lambda' });
    }

    // Postgres endpoints
    if (path === '/postgres/posts' && httpMethod === 'GET') {
      return listPosts();
    }
    if (path.startsWith('/postgres/posts/') && httpMethod === 'GET') {
      const id = pathParameters?.id || path.split('/').pop()!;
      return getPost(id);
    }
    if (path === '/postgres/posts' && httpMethod === 'POST') {
      return createPost(body || '{}');
    }
    if (path.startsWith('/postgres/posts/') && httpMethod === 'PUT') {
      const id = pathParameters?.id || path.split('/').pop()!;
      return updatePost(id, body || '{}');
    }
    if (path.startsWith('/postgres/posts/') && httpMethod === 'DELETE') {
      const id = pathParameters?.id || path.split('/').pop()!;
      return deletePost(id);
    }
    if (path === '/postgres/users' && httpMethod === 'GET') {
      return listUsers();
    }

    // DynamoDB endpoints
    if (path === '/dynamo/items' && httpMethod === 'GET') {
      return listDynamoItems();
    }
    if (path.match(/^\/dynamo\/items\/[^/]+\/[^/]+$/) && httpMethod === 'GET') {
      const pk = pathParameters?.pk || path.split('/')[3];
      const sk = pathParameters?.sk || path.split('/')[4];
      return getDynamoItem(pk, sk);
    }
    if (path === '/dynamo/items' && httpMethod === 'POST') {
      return createDynamoItem(body || '{}');
    }
    if (path.match(/^\/dynamo\/items\/[^/]+\/[^/]+$/) && httpMethod === 'PUT') {
      const pk = pathParameters?.pk || path.split('/')[3];
      const sk = pathParameters?.sk || path.split('/')[4];
      return updateDynamoItem(pk, sk, body || '{}');
    }
    if (path.match(/^\/dynamo\/items\/[^/]+\/[^/]+$/) && httpMethod === 'DELETE') {
      const pk = pathParameters?.pk || path.split('/')[3];
      const sk = pathParameters?.sk || path.split('/')[4];
      return deleteDynamoItem(pk, sk);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
};
