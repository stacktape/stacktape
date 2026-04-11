import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('OK'));

app.get('/crash', () => {
  // Deliberately crash the process so Node.js prints a full stack trace to stderr
  process.nextTick(() => {
    throw new Error('Container process-level crash with stack trace');
  });
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.info(`Container started on port ${port}`);
