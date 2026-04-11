import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (c) => c.text('OK'));
app.get('/error', () => {
  process.nextTick(() => {
    throw new Error('TS container error with stack trace');
  });
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.info(`TS container started on port ${port}`);
