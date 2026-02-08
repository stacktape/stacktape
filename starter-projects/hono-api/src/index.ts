import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono on AWS Lambda!' });
});

app.get('/posts', (c) => {
  return c.json({
    data: [
      { id: 1, title: 'Getting started with Hono', content: 'Hono is an ultrafast web framework.' },
      { id: 2, title: 'Deploy to AWS with Stacktape', content: 'Stacktape makes AWS deployments simple.' }
    ]
  });
});

app.post('/posts', async (c) => {
  const body = await c.req.json();
  return c.json({ message: 'Post created', data: body }, 201);
});

export const handler = handle(app);
