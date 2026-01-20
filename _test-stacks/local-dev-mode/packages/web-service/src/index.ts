import cors from '@fastify/cors';
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.register(cors, { origin: true });

const getPrivateServiceAddr = () => {
  return process.env.PRIVATE_SERVICE_ADDR || process.env.STP_PRIVATE_SERVICE_ADDRESS || 'localhost:8080';
};

// Health check
fastify.get('/', async () => {
  return { status: 'ok', service: 'web-service' };
});

// ============ PROXY TO PRIVATE SERVICE - POSTGRES ENDPOINTS ============

// List all posts
fastify.get('/postgres/posts', async () => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/postgres/posts`);
  return response.json();
});

// Get single post
fastify.get('/postgres/posts/:id', async (request) => {
  const { id } = request.params as { id: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/postgres/posts/${id}`);
  return response.json();
});

// Create post
fastify.post('/postgres/posts', async (request) => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/postgres/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body)
  });
  return response.json();
});

// Update post
fastify.put('/postgres/posts/:id', async (request) => {
  const { id } = request.params as { id: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/postgres/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body)
  });
  return response.json();
});

// Delete post
fastify.delete('/postgres/posts/:id', async (request) => {
  const { id } = request.params as { id: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/postgres/posts/${id}`, {
    method: 'DELETE'
  });
  return response.json();
});

// List users
fastify.get('/postgres/users', async () => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/postgres/users`);
  return response.json();
});

// ============ PROXY TO PRIVATE SERVICE - REDIS ENDPOINTS ============

// Get cache value
fastify.get('/redis/cache/:key', async (request) => {
  const { key } = request.params as { key: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/redis/cache/${key}`);
  return response.json();
});

// Set cache value
fastify.post('/redis/cache', async (request) => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/redis/cache`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body)
  });
  return response.json();
});

// Delete cache value
fastify.delete('/redis/cache/:key', async (request) => {
  const { key } = request.params as { key: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/redis/cache/${key}`, {
    method: 'DELETE'
  });
  return response.json();
});

// List all cache entries
fastify.get('/redis/cache', async () => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/redis/cache`);
  return response.json();
});

// ============ PROXY TO PRIVATE SERVICE - DYNAMODB ENDPOINTS ============

// List all items
fastify.get('/dynamo/items', async () => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/dynamo/items`);
  return response.json();
});

// Get single item
fastify.get('/dynamo/items/:pk/:sk', async (request) => {
  const { pk, sk } = request.params as { pk: string; sk: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/dynamo/items/${pk}/${sk}`);
  return response.json();
});

// Create item
fastify.post('/dynamo/items', async (request) => {
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/dynamo/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body)
  });
  return response.json();
});

// Update item
fastify.put('/dynamo/items/:pk/:sk', async (request) => {
  const { pk, sk } = request.params as { pk: string; sk: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/dynamo/items/${pk}/${sk}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body)
  });
  return response.json();
});

// Delete item
fastify.delete('/dynamo/items/:pk/:sk', async (request) => {
  const { pk, sk } = request.params as { pk: string; sk: string };
  const addr = getPrivateServiceAddr();
  const response = await fetch(`http://${addr}/dynamo/items/${pk}/${sk}`, {
    method: 'DELETE'
  });
  return response.json();
});

const start = async () => {
  try {
    const port = Number.parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.info(`Web service running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
