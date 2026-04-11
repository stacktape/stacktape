import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Container OK'));

app.get('/error', () => {
  throw new Error('Container uncaught error from TypeScript');
});

app.get('/type-error', () => {
  const obj: any = null;
  obj.nonExistent();
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.info(`Container started on port ${port}`);
