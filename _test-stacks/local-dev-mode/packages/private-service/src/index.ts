import { PrismaPg } from '@prisma/adapter-pg';
import Fastify from 'fastify';
import Redis from 'ioredis';
import { PrismaClient } from '../../../prisma/generated/prisma';

const adapter = new PrismaPg({ connectionString: process.env.STP_POSTGRES_DB_CONNECTION_STRING });
const prisma = new PrismaClient({ adapter });

const getRedis = () => {
  const connectionString = process.env.STP_REDIS_CONNECTION_STRING;
  if (!connectionString) return null;
  return new Redis(connectionString);
};

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

  try {
    const value = await redis.get(key);
    redis.disconnect();
    return { key, value };
  } catch (err) {
    redis.disconnect();
    return { error: (err as Error).message };
  }
});

// Set cache value
fastify.post('/redis/cache', async (request) => {
  const { key, value, ttl } = request.body as { key: string; value: string; ttl?: number };
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };

  try {
    if (ttl) {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
    redis.disconnect();
    return { success: true, key, value };
  } catch (err) {
    redis.disconnect();
    return { error: (err as Error).message };
  }
});

// Delete cache value
fastify.delete('/redis/cache/:key', async (request) => {
  const { key } = request.params as { key: string };
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };

  try {
    await redis.del(key);
    redis.disconnect();
    return { success: true, key };
  } catch (err) {
    redis.disconnect();
    return { error: (err as Error).message };
  }
});

// List all cache keys
fastify.get('/redis/cache', async () => {
  const redis = getRedis();
  if (!redis) return { error: 'Redis not configured' };

  try {
    const keys = await redis.keys('*');
    const entries: { key: string; value: string | null }[] = [];
    for (const key of keys) {
      const value = await redis.get(key);
      entries.push({ key, value });
    }
    redis.disconnect();
    return entries;
  } catch (err) {
    redis.disconnect();
    return { error: (err as Error).message };
  }
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
