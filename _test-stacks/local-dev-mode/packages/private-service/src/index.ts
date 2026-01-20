import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PrismaPg } from '@prisma/adapter-pg';
import Fastify from 'fastify';
import Redis from 'ioredis';
import { PrismaClient } from '../../../prisma/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.STP_POSTGRES_DB_CONNECTION_STRING });
const prisma = new PrismaClient({ adapter });

let redisClient: Redis | null = null;
const getRedis = () => {
  if (redisClient) return redisClient;
  const connectionString = process.env.STP_REDIS_CONNECTION_STRING;
  if (!connectionString) return null;
  redisClient = new Redis(connectionString);
  return redisClient;
};

// Configure DynamoDB client - use endpoint for local development
const dynamoConfig: {
  endpoint?: string;
  region?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
} = {};
if (process.env.STP_DYNAMO_DB_ENDPOINT) {
  dynamoConfig.endpoint = process.env.STP_DYNAMO_DB_ENDPOINT;
  dynamoConfig.region = 'local';
  dynamoConfig.credentials = { accessKeyId: 'local', secretAccessKey: 'local' };
}
const dynamoClient = new DynamoDBClient(dynamoConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient as any);
const dynamoTableName = process.env.STP_DYNAMO_DB_NAME || '';

// Configure OpenSearch client
let openSearchClient: OpenSearchClient | null = null;
const getOpenSearch = () => {
  if (openSearchClient) return openSearchClient;
  const endpoint = process.env.STP_OPEN_SEARCH_DOMAIN_ENDPOINT;
  if (!endpoint) return null;
  openSearchClient = new OpenSearchClient({ node: endpoint });
  return openSearchClient;
};
const openSearchIndex = 'test-index';

const fastify = Fastify({ logger: true });

// Health check
fastify.get('/', async () => {
  return { status: 'ok', service: 'private-service' };
});

// ============ POSTGRES ENDPOINTS (/postgres/*) ============

// List all posts
fastify.get('/postgres/posts', async () => {
  const posts = await prisma.post.findMany({
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  return posts;
});

// Get single post
fastify.get('/postgres/posts/:id', async (request) => {
  const { id } = request.params as { id: string };
  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  if (!post) return { error: 'Post not found' };
  return post;
});

// Create post
fastify.post('/postgres/posts', async (request) => {
  const { title, content, authorId, published } = request.body as {
    title: string;
    content?: string;
    authorId: string;
    published?: boolean;
  };
  const post = await prisma.post.create({
    data: { title, content, authorId, published: published ?? false },
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  return post;
});

// Update post
fastify.put('/postgres/posts/:id', async (request) => {
  const { id } = request.params as { id: string };
  const { title, content, published } = request.body as {
    title?: string;
    content?: string;
    published?: boolean;
  };
  const post = await prisma.post.update({
    where: { id },
    data: { title, content, published },
    include: { author: { select: { id: true, name: true, email: true } } }
  });
  return post;
});

// Delete post
fastify.delete('/postgres/posts/:id', async (request) => {
  const { id } = request.params as { id: string };
  await prisma.post.delete({ where: { id } });
  return { success: true };
});

// List users (for selecting author)
fastify.get('/postgres/users', async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  return users;
});

// ============ REDIS ENDPOINTS (/redis/*) ============

// Get cache value
fastify.get('/redis/cache/:key', async (request) => {
  const { key } = request.params as { key: string };
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };
  const value = await redis.get(key);
  return { key, value };
});

// Set cache value
fastify.post('/redis/cache', async (request) => {
  const { key, value, ttl } = request.body as { key: string; value: string; ttl?: number };
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };
  if (ttl) {
    await redis.set(key, value, 'EX', ttl);
  } else {
    await redis.set(key, value);
  }
  return { success: true, key, value };
});

// Delete cache value
fastify.delete('/redis/cache/:key', async (request) => {
  const { key } = request.params as { key: string };
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };
  await redis.del(key);
  return { success: true, key };
});

// List all cache keys
fastify.get('/redis/cache', async () => {
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };
  const keys = await redis.keys('*');
  const entries: { key: string; value: string | null }[] = [];
  for (const key of keys) {
    const value = await redis.get(key);
    entries.push({ key, value });
  }
  return entries;
});

// ============ DYNAMODB ENDPOINTS (/dynamo/*) ============

// List all items
fastify.get('/dynamo/items', async () => {
  if (!dynamoTableName) return { error: 'DynamoDB not configured' };
  const result = await docClient.send(new ScanCommand({ TableName: dynamoTableName }));
  return result.Items || [];
});

// Get single item
fastify.get('/dynamo/items/:pk/:sk', async (request) => {
  const { pk, sk } = request.params as { pk: string; sk: string };
  if (!dynamoTableName) return { error: 'DynamoDB not configured' };
  const result = await docClient.send(new GetCommand({ TableName: dynamoTableName, Key: { pk, sk } }));
  if (!result.Item) return { error: 'Item not found' };
  return result.Item;
});

// Create item
fastify.post('/dynamo/items', async (request) => {
  if (!dynamoTableName) return { error: 'DynamoDB not configured' };
  const item = request.body as Record<string, unknown>;
  await docClient.send(new PutCommand({ TableName: dynamoTableName, Item: item }));
  return item;
});

// Update item
fastify.put('/dynamo/items/:pk/:sk', async (request) => {
  const { pk, sk } = request.params as { pk: string; sk: string };
  if (!dynamoTableName) return { error: 'DynamoDB not configured' };
  const updates = request.body as Record<string, unknown>;
  const item = { pk, sk, ...updates };
  await docClient.send(new PutCommand({ TableName: dynamoTableName, Item: item }));
  return item;
});

// Delete item
fastify.delete('/dynamo/items/:pk/:sk', async (request) => {
  const { pk, sk } = request.params as { pk: string; sk: string };
  if (!dynamoTableName) return { error: 'DynamoDB not configured' };
  await docClient.send(new DeleteCommand({ TableName: dynamoTableName, Key: { pk, sk } }));
  return { success: true };
});

// ============ OPENSEARCH ENDPOINTS (/opensearch/*) ============

// Get cluster health
fastify.get('/opensearch/health', async () => {
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  const health = await client.cluster.health();
  return health.body;
});

// Ensure index exists
const ensureIndex = async (client: OpenSearchClient) => {
  const exists = await client.indices.exists({ index: openSearchIndex });
  if (!exists.body) {
    await client.indices.create({ index: openSearchIndex });
  }
};

// List all documents
fastify.get('/opensearch/docs', async () => {
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  await ensureIndex(client);
  const result = await client.search({ index: openSearchIndex, body: { query: { match_all: {} } } });
  return (
    result.body.hits?.hits?.map((hit: { _id: string; _source: unknown }) => ({
      id: hit._id,
      ...(hit._source as object)
    })) || []
  );
});

// Get single document
fastify.get('/opensearch/docs/:id', async (request) => {
  const { id } = request.params as { id: string };
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  try {
    const result = await client.get({ index: openSearchIndex, id });
    return { id: result.body._id, ...result.body._source };
  } catch (err: any) {
    if (err.meta?.statusCode === 404) return { error: 'Document not found' };
    throw err;
  }
});

// Create/update document
fastify.post('/opensearch/docs', async (request) => {
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  await ensureIndex(client);
  const doc = request.body as Record<string, unknown>;
  const id = (doc.id as string) || undefined;
  const result = await client.index({ index: openSearchIndex, id, body: doc, refresh: true });
  return { id: result.body._id, ...doc };
});

// Update document
fastify.put('/opensearch/docs/:id', async (request) => {
  const { id } = request.params as { id: string };
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  const updates = request.body as Record<string, unknown>;
  await client.update({ index: openSearchIndex, id, body: { doc: updates }, refresh: true });
  const result = await client.get({ index: openSearchIndex, id });
  return { id: result.body._id, ...result.body._source };
});

// Delete document
fastify.delete('/opensearch/docs/:id', async (request) => {
  const { id } = request.params as { id: string };
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  await client.delete({ index: openSearchIndex, id, refresh: true });
  return { success: true };
});

// Search documents
fastify.post('/opensearch/search', async (request) => {
  const client = getOpenSearch();
  if (!client) return { error: 'OpenSearch not configured' };
  const { query } = request.body as { query: string };
  const result = await client.search({
    index: openSearchIndex,
    body: { query: { multi_match: { query, fields: ['*'] } } }
  });
  return (
    result.body.hits?.hits?.map((hit: { _id: string; _source: unknown }) => ({
      id: hit._id,
      ...(hit._source as object)
    })) || []
  );
});

const start = async () => {
  try {
    const port = Number.parseInt(process.env.PORT || '8080', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.info(`Private service running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
