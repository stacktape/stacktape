/**
 * Small applications whose generated config `stacktape dev` must be able to run as is.
 *
 * Each one is written the way a Stacktape user writes code: handlers typed with `aws-lambda` events and resources
 * read through `connectTo`'s `STP_<RESOURCE>_<PARAM>` variables. `dev-runnable.spec.ts` runs init's pipeline on them;
 * the live check writes the same files to a directory and runs `stacktape init`, `validate` and `dev --agent`.
 */

/** A Lambda HTTP API and an SQS worker sharing Postgres and Redis, with a Vite frontend (the r2d dogfood app). */
const lambdaTodos: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'todos',
      private: true,
      type: 'module',
      dependencies: { '@aws-sdk/client-sqs': '^3.700.0', ioredis: '^5.4.1', pg: '^8.13.1' },
      devDependencies: { '@types/aws-lambda': '^8.10.145', '@types/pg': '^8.11.10', typescript: '^5.6.3' }
    },
    null,
    2
  ),
  'src/db.ts': `import pg from 'pg';
import Redis from 'ioredis';

let pool: pg.Pool | undefined;
export const getPool = () => {
  pool ??= new pg.Pool({ connectionString: process.env.STP_DB_CONNECTION_STRING, max: 2 });
  return pool;
};

let redis: Redis | undefined;
export const getRedis = () => {
  redis ??= new Redis(process.env.STP_CACHE_CONNECTION_STRING!, { maxRetriesPerRequest: 2 });
  return redis;
};

export const migrate = async () => {
  await getPool().query(
    'CREATE TABLE IF NOT EXISTS todos (id serial PRIMARY KEY, title text NOT NULL, processed_at timestamptz)'
  );
};
`,
  'src/api.ts': `import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getPool, getRedis, migrate } from './db';

const sqs = new SQSClient({});
const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  body: JSON.stringify(body)
});

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  await migrate();
  const method = event.requestContext.http.method;
  if (method === 'GET' && event.rawPath === '/todos') {
    const { rows } = await getPool().query('SELECT * FROM todos ORDER BY id');
    return json(200, rows);
  }
  if (method === 'POST' && event.rawPath === '/todos') {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString() : event.body;
    const { title } = JSON.parse(raw || '{}');
    const { rows } = await getPool().query('INSERT INTO todos (title) VALUES ($1) RETURNING *', [title]);
    await getRedis().incr('todos:created');
    await sqs.send(new SendMessageCommand({ QueueUrl: process.env.STP_JOBS_URL, MessageBody: JSON.stringify({ id: rows[0].id }) }));
    return json(201, rows[0]);
  }
  if (method === 'GET' && event.rawPath === '/stats') {
    const [created, processed] = await getRedis().mget('todos:created', 'todos:processed');
    return json(200, { created: Number(created ?? 0), processed: Number(processed ?? 0) });
  }
  return json(404, { error: 'not found' });
};
`,
  'src/worker.ts': `import type { SQSEvent } from 'aws-lambda';
import { getPool, getRedis, migrate } from './db';

export default async (event: SQSEvent) => {
  await migrate();
  for (const record of event.Records) {
    const { id } = JSON.parse(record.body);
    await getPool().query('UPDATE todos SET processed_at = now() WHERE id = $1', [id]);
    await getRedis().incr('todos:processed');
  }
};
`,
  'web/package.json': JSON.stringify(
    {
      name: 'todos-web',
      private: true,
      type: 'module',
      scripts: { dev: 'vite --port 5173', build: 'vite build' },
      devDependencies: { vite: '^6.0.0', typescript: '^5.6.3' }
    },
    null,
    2
  ),
  'web/index.html': `<!doctype html>
<html>
  <body>
    <form id="add"><input id="title" /><button>Add</button></form>
    <ul id="list"></ul>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
  'web/src/main.ts': `const api = (import.meta.env.VITE_API_URL as string).replace(/\\/$/, '');
// Someone else's API: not this project's backend.
const stripeApi = import.meta.env.VITE_STRIPE_API_URL as string | undefined;
void stripeApi;
const list = document.querySelector<HTMLUListElement>('#list')!;

const render = async () => {
  const todos: Array<{ id: number; title: string }> = await (await fetch(\`\${api}/todos\`)).json();
  list.innerHTML = todos.map((todo) => \`<li>\${todo.title}</li>\`).join('');
};

document.querySelector<HTMLFormElement>('#add')!.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector<HTMLInputElement>('#title')!;
  await fetch(\`\${api}/todos\`, { method: 'POST', body: JSON.stringify({ title: input.value }) });
  await render();
});

void render();
`
};

/** An Express API in a container with Postgres, and a Next.js frontend that renders what the API returns. */
const containerApiNextjs: Record<string, string> = {
  'api/package.json': JSON.stringify(
    {
      name: 'notes-api',
      private: true,
      type: 'module',
      scripts: { start: 'node server.js' },
      dependencies: { express: '^5.1.0', pg: '^8.13.1' }
    },
    null,
    2
  ),
  'api/server.js': `import express from 'express';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.STP_DB_CONNECTION_STRING, max: 2 });
const app = express();
app.use(express.json());

app.get('/notes', async (_request, response) => {
  await pool.query('CREATE TABLE IF NOT EXISTS notes (id serial PRIMARY KEY, text text NOT NULL)');
  const { rows } = await pool.query('SELECT * FROM notes ORDER BY id');
  response.json(rows);
});

app.post('/notes', async (request, response) => {
  await pool.query('CREATE TABLE IF NOT EXISTS notes (id serial PRIMARY KEY, text text NOT NULL)');
  const { rows } = await pool.query('INSERT INTO notes (text) VALUES ($1) RETURNING *', [request.body.text]);
  response.status(201).json(rows[0]);
});

app.listen(Number(process.env.PORT ?? 3000));
`,
  'web/package.json': JSON.stringify(
    {
      name: 'notes-web',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: { next: '^15.5.0', react: '^19.1.0', 'react-dom': '^19.1.0' }
    },
    null,
    2
  ),
  'web/app/layout.tsx': `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  'web/app/page.tsx': `export const dynamic = 'force-dynamic';

export default async function Page() {
  const notes: Array<{ id: number; text: string }> = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/notes\`, {
    cache: 'no-store'
  }).then((response) => response.json());
  return (
    <ul data-testid="notes">
      {notes.map((note) => (
        <li key={note.id}>{note.text}</li>
      ))}
    </ul>
  );
}
`
};

/** One scheduled Lambda function that prunes a DynamoDB table. */
const scheduledDynamodb: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'pruner',
      private: true,
      type: 'module',
      dependencies: { '@aws-sdk/client-dynamodb': '^3.700.0', '@aws-sdk/lib-dynamodb': '^3.700.0' },
      devDependencies: { '@types/aws-lambda': '^8.10.145', typescript: '^5.6.3' }
    },
    null,
    2
  ),
  'src/prune.ts': `import type { ScheduledHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: ScheduledHandler = async () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const { Items = [] } = await client.send(new ScanCommand({ TableName: process.env.STP_ITEMS_NAME }));
  for (const item of Items) {
    if (Number(item.createdAt) < cutoff) {
      await client.send(new DeleteCommand({ TableName: process.env.STP_ITEMS_NAME, Key: { pk: item.pk } }));
    }
  }
  console.log(JSON.stringify({ msg: 'pruned', scanned: Items.length }));
};
`
};

/** Two HTTP handlers in one directory: neither may take the catch-all route, and neither states its own. */
const twoHttpHandlers: Record<string, string> = {
  'package.json': JSON.stringify(
    { name: 'users', private: true, type: 'module', devDependencies: { '@types/aws-lambda': '^8.10.145' } },
    null,
    2
  ),
  'src/getUser.ts': `import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => ({
  statusCode: 200,
  body: JSON.stringify({ id: event.pathParameters?.id })
});
`,
  'src/createUser.ts': `import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => ({ statusCode: 201, body: event.body ?? '' });
`
};

/** Two apps of a monorepo, each with an HTTP handler in a file of the same name. */
const monorepoApis: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'shop', private: true, workspaces: ['apps/*'] }, null, 2),
  ...Object.fromEntries(
    ['users', 'orders'].flatMap((app) => [
      [
        `apps/${app}/package.json`,
        JSON.stringify({ name: app, private: true, devDependencies: { '@types/aws-lambda': '^8.10.145' } }, null, 2)
      ],
      [
        `apps/${app}/src/api.ts`,
        `import type { APIGatewayProxyEventV2 } from 'aws-lambda';

export default async (event: APIGatewayProxyEventV2) => ({ statusCode: 200, body: '${app} ' + event.rawPath });
`
      ]
    ])
  )
};

export const DEV_RUNNABLE_FIXTURES = {
  'lambda-todos': lambdaTodos,
  'container-api-nextjs': containerApiNextjs,
  'scheduled-dynamodb': scheduledDynamodb,
  'two-http-handlers': twoHttpHandlers,
  'monorepo-apis': monorepoApis
} as const;
