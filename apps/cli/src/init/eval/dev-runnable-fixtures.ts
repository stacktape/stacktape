/**
 * Small applications whose generated config `stacktape dev` must be able to run as is.
 *
 * The first ones are written the way a Stacktape user writes code: handlers typed with `aws-lambda` events and
 * resources read through `connectTo`'s `STP_<RESOURCE>_<PARAM>` variables. The last two are written the way everyone
 * else does: untyped handlers, Python, and variables named by the application. `dev-runnable.spec.ts` runs init's pipeline on them;
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

/**
 * The r2p dogfood app: a Python HTTP API that stores uploads in Postgres, hands out presigned S3 PUT URLs and publishes
 * to SNS; an SNS-triggered TypeScript Lambda; a job whose code states its schedule; a SvelteKit frontend reading
 * `PUBLIC_API_URL`; and `npm run seed`. Nothing is typed with `aws-lambda` events except the SNS handler, and every
 * variable has the application's own name. Init's output for it needed eight hand edits before `stacktape dev` ran it.
 */
const r2pFiles: Record<string, string> = {
  'package.json': `{
  "name": "r2p-files",
  "private": true,
  "type": "module",
  "scripts": {
    "seed": "node scripts/seed.mjs",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.700.0",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.0",
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^22.10.0",
    "@types/pg": "^8.11.10",
    "typescript": "^5.7.2"
  }
}
`,
  'api/main.py': `"""HTTP API for file uploads. Runs as an AWS Lambda behind an HTTP API (payload format 2.0)."""
import json
import os
import re
import uuid

import boto3
import psycopg
from botocore.config import Config
from psycopg.rows import dict_row

SCHEMA = """
create table if not exists uploads (
  id uuid primary key,
  filename text not null,
  content_type text not null,
  object_key text not null,
  status text not null default 'pending',
  size_bytes bigint,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create table if not exists job_runs (
  id serial primary key,
  job text not null,
  affected int not null,
  ran_at timestamptz not null default now()
);
"""

REGION = os.environ.get('AWS_REGION')
# A regional endpoint: a new bucket answers presigned requests on the global endpoint with a 307 redirect.
s3 = boto3.client('s3', region_name=REGION, endpoint_url=f'https://s3.{REGION}.amazonaws.com',
                  config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'}))
sns = boto3.client('sns')
_conn = None

CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
}


def db():
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg.connect(os.environ['DATABASE_URL'], autocommit=True, row_factory=dict_row, connect_timeout=5)
        _conn.execute(SCHEMA)
    return _conn


def respond(status, body):
    return {'statusCode': status, 'headers': {'content-type': 'application/json', **CORS},
            'body': json.dumps(body, default=str)}


def list_uploads():
    rows = db().execute('select id, filename, status, size_bytes, created_at from uploads order by created_at desc limit 50').fetchall()
    return respond(200, {'uploads': rows})


def create_upload(body):
    filename = (body.get('filename') or '').strip()
    content_type = body.get('contentType') or 'application/octet-stream'
    if not filename:
        return respond(400, {'error': 'filename is required'})
    upload_id = str(uuid.uuid4())
    key = f'uploads/{upload_id}/{filename}'
    db().execute('insert into uploads (id, filename, content_type, object_key) values (%s, %s, %s, %s)',
                 (upload_id, filename, content_type, key))
    url = s3.generate_presigned_url('put_object', Params={'Bucket': os.environ['UPLOAD_BUCKET'], 'Key': key,
                                                          'ContentType': content_type}, ExpiresIn=600)
    return respond(201, {'id': upload_id, 'uploadUrl': url})


def complete_upload(upload_id):
    row = db().execute("update uploads set status = 'uploaded' where id = %s returning object_key", (upload_id,)).fetchone()
    if row is None:
        return respond(404, {'error': 'upload not found'})
    sns.publish(TopicArn=os.environ['UPLOAD_EVENTS_TOPIC_ARN'],
                Message=json.dumps({'type': 'upload.completed', 'id': upload_id, 'key': row['object_key']}))
    return respond(202, {'id': upload_id, 'status': 'uploaded'})


def handler(event, context):
    method = event['requestContext']['http']['method']
    path = event.get('rawPath', '/')
    if method == 'OPTIONS':
        return respond(204, {})
    if path == '/health':
        return respond(200, {'ok': True, 'version': 2})
    if path == '/uploads' and method == 'GET':
        return list_uploads()
    if path == '/uploads' and method == 'POST':
        return create_upload(json.loads(event.get('body') or '{}'))
    match = re.fullmatch(r'/uploads/([0-9a-f-]{36})/complete', path)
    if match and method == 'POST':
        return complete_upload(match.group(1))
    return respond(404, {'error': f'no route for {method} {path}'})
`,
  'api/requirements.txt': `psycopg[binary]==3.2.3
`,
  'functions/expire-uploads.ts': `// Scheduled job: marks uploads that were never completed as expired.
// It must run every 2 minutes.
import pg from 'pg';

export const schedule = 'rate(2 minutes)';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

export const handler = async () => {
  const result = await pool.query(
    \`update uploads set status = 'expired' where status = 'pending' and created_at < now() - interval '10 minutes'\`
  );
  await pool.query(\`insert into job_runs (job, affected) values ('expire-uploads', $1)\`, [result.rowCount ?? 0]);
  console.log(\`expired \${result.rowCount} uploads\`);
};
`,
  'functions/process-upload.ts': `// Runs when the API publishes \`upload.completed\` to the upload events SNS topic.
// Reads the uploaded object's size from S3 and marks the upload as processed.
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { SNSEvent } from 'aws-lambda';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const s3 = new S3Client({});

export const handler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message) as { type: string; id: string; key: string };
    if (message.type !== 'upload.completed') continue;
    const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.UPLOAD_BUCKET, Key: message.key }));
    await pool.query(
      \`update uploads set status = 'processed', size_bytes = $2, processed_at = now() where id = $1\`,
      [message.id, head.ContentLength ?? 0]
    );
    console.log(\`processed upload \${message.id} (\${head.ContentLength} bytes)\`);
  }
};
`,
  'scripts/seed.mjs': `// Seeds the database with two processed demo uploads. Uses DATABASE_URL.
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(\`create table if not exists uploads (
  id uuid primary key, filename text not null, content_type text not null, object_key text not null,
  status text not null default 'pending', size_bytes bigint, created_at timestamptz not null default now(),
  processed_at timestamptz)\`);
const result = await client.query(\`insert into uploads (id, filename, content_type, object_key, status, size_bytes, processed_at)
  values (gen_random_uuid(), 'seed-a.txt', 'text/plain', 'seed/a', 'processed', 10, now()),
         (gen_random_uuid(), 'seed-b.txt', 'text/plain', 'seed/b', 'processed', 20, now())\`);
console.log(\`seeded \${result.rowCount} uploads\`);
await client.end();
`,
  'web/package.json': `{
  "name": "r2p-files-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.6",
    "@sveltejs/kit": "^2.9.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.1",
    "svelte": "^5.10.0",
    "vite": "^6.0.3"
  }
}
`,
  'web/svelte.config.js': `import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({ fallback: 'index.html' })
  }
};
`,
  'web/vite.config.js': `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [sveltekit()] });
`,
  'web/src/routes/+layout.js': `export const ssr = false;
export const prerender = false;
`,
  'web/src/routes/+page.svelte': `<script>
  import { env } from '$env/dynamic/public';
  import { onMount } from 'svelte';

  const api = env.PUBLIC_API_URL;
  let uploads = $state([]);
  let error = $state('');
  let busy = $state(false);
  let fileInput;

  async function refresh() {
    const res = await fetch(\`\${api}/uploads\`);
    if (!res.ok) {
      error = \`Loading uploads failed: \${res.status}\`;
      return;
    }
    uploads = (await res.json()).uploads;
  }

  async function upload() {
    const file = fileInput.files[0];
    if (!file) return;
    busy = true;
    error = '';
    try {
      const created = await fetch(\`\${api}/uploads\`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' })
      });
      if (!created.ok) throw new Error(\`create failed: \${created.status}\`);
      const { id, uploadUrl } = await created.json();
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!put.ok) throw new Error(\`S3 upload failed: \${put.status}\`);
      const done = await fetch(\`\${api}/uploads/\${id}/complete\`, { method: 'POST' });
      if (!done.ok) throw new Error(\`complete failed: \${done.status}\`);
      await refresh();
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  });
</script>

<h1>Files</h1>
<input type="file" bind:this={fileInput} data-testid="file" />
<button onclick={upload} disabled={busy}>Upload</button>
{#if error}<p role="alert">{error}</p>{/if}
<table>
  <tbody>
    {#each uploads as u (u.id)}
      <tr data-testid="upload-row">
        <td>{u.filename}</td>
        <td data-testid="status">{u.status}</td>
        <td>{u.size_bytes ?? ''}</td>
      </tr>
    {/each}
  </tbody>
</table>
`
};

/**
 * Untyped JavaScript and TypeScript handlers: no `aws-lambda` types, so only the event fields each one reads say what
 * invokes it. A REST-style API (payload format 1.0), an SQS worker, an S3 thumbnailer and a nightly job whose schedule
 * is a constant, with resources read under the application's own names.
 */
const untypedHandlers: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'orders',
      private: true,
      type: 'module',
      dependencies: {
        '@aws-sdk/client-dynamodb': '^3.700.0',
        '@aws-sdk/client-s3': '^3.700.0',
        '@aws-sdk/client-sqs': '^3.700.0'
      }
    },
    null,
    2
  ),
  'src/api.js': `import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});

export const handler = async (event) => {
  if (event.httpMethod === 'POST' && event.path === '/orders') {
    await sqs.send(new SendMessageCommand({ QueueUrl: process.env.ORDER_JOBS_QUEUE_URL, MessageBody: event.body ?? '{}' }));
    return { statusCode: 202, body: '' };
  }
  const id = event.pathParameters?.id;
  const { Item } = await dynamo.send(new GetItemCommand({ TableName: process.env.ORDERS_TABLE, Key: { pk: { S: id } } }));
  return { statusCode: Item ? 200 : 404, body: JSON.stringify(Item ?? {}) };
};
`,
  'src/worker.ts': `import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamo = new DynamoDBClient({});

export const handler = async (event: { Records: Array<{ messageId: string; body: string }> }) => {
  const failures: Array<{ itemIdentifier: string }> = [];
  for (const record of event.Records) {
    try {
      const order = JSON.parse(record.body);
      await dynamo.send(new PutItemCommand({ TableName: process.env.ORDERS_TABLE, Item: { pk: { S: order.id } } }));
    } catch {
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
};
`,
  'src/thumbnails.ts': `import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

export async function handler(event: any) {
  for (const record of event.Records) {
    const object = await s3.send(new GetObjectCommand({ Bucket: record.s3.bucket.name, Key: record.s3.object.key }));
    console.log('thumbnail for', record.s3.object.key, object.ContentLength);
  }
}
`,
  'src/functions/nightly-report.ts': `import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

// Runs every night at 03:00 UTC.
export const schedule = 'cron(0 3 * * ? *)';

const dynamo = new DynamoDBClient({});

export const handler = async () => {
  const { Count } = await dynamo.send(new ScanCommand({ TableName: process.env.ORDERS_TABLE, Select: 'COUNT' }));
  console.log(JSON.stringify({ msg: 'orders', count: Count }));
};
`
};

export const DEV_RUNNABLE_FIXTURES = {
  'lambda-todos': lambdaTodos,
  'container-api-nextjs': containerApiNextjs,
  'scheduled-dynamodb': scheduledDynamodb,
  'two-http-handlers': twoHttpHandlers,
  'monorepo-apis': monorepoApis,
  'r2p-files': r2pFiles,
  'untyped-handlers': untypedHandlers
} as const;
