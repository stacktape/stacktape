import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Hello Node.js!'));

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port });

console.info(`Container started successfully. Listening on port ${port}.`);
