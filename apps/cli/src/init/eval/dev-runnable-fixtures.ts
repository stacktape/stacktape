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

/**
 * Functions that write to a resource of the same kind as the one that invokes them. A plain repository has one bucket,
 * queue and topic, so binding these variables by name would point each function's output at its own trigger and invoke
 * it forever. The SNS handler also reads a fetch response's `.body`, which is not an SQS record's.
 */
const triggerLoops: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'media',
      private: true,
      type: 'module',
      dependencies: {
        '@aws-sdk/client-s3': '^3.700.0',
        '@aws-sdk/client-sns': '^3.700.0',
        '@aws-sdk/client-sqs': '^3.700.0'
      }
    },
    null,
    2
  ),
  'functions/thumbnail.ts': `import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

export const handler = async (event: any) => {
  for (const record of event.Records) {
    const source = await s3.send(new GetObjectCommand({ Bucket: record.s3.bucket.name, Key: record.s3.object.key }));
    const bytes = await source.Body!.transformToByteArray();
    await s3.send(new PutObjectCommand({ Bucket: process.env.THUMBNAILS_BUCKET, Key: record.s3.object.key, Body: bytes }));
  }
};
`,
  'functions/worker.ts': `import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

export const handler = async (event: any) => {
  for (const record of event.Records) {
    const job = JSON.parse(record.body);
    await sqs.send(new SendMessageCommand({ QueueUrl: process.env.RESULTS_QUEUE_URL, MessageBody: JSON.stringify({ id: job.id }) }));
  }
};
`,
  'functions/notify.ts': `import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const sns = new SNSClient({});

export const handler = async (event: any) => {
  for (const record of event.Records) {
    const res = await fetch('https://hooks.example.com/notify', { method: 'POST', body: record.Sns.Message });
    console.log(res.status, res.body);
    await sns.send(new PublishCommand({ TopicArn: process.env.ALERTS_TOPIC_ARN, Message: record.Sns.Message }));
  }
};
`
};

/** The r2w dogfood app: Go API on DynamoDB and Redis, a DynamoDB stream to EventBridge to WebSocket push, and Next.js. */
const r2wShop: Record<string, string> = {
  'package.json': `{
  "name": "r2w-shop",
  "private": true,
  "type": "module",
  "scripts": {
    "test:e2e": "playwright test",
    "seed": "node scripts/seed.mjs"
  },
  "dependencies": {
    "@aws-sdk/client-apigatewaymanagementapi": "^3.700.0",
    "@aws-sdk/client-dynamodb": "^3.700.0",
    "@aws-sdk/client-eventbridge": "^3.700.0",
    "@aws-sdk/lib-dynamodb": "^3.700.0",
    "@aws-sdk/util-dynamodb": "^3.700.0",
    "ioredis": "^5.4.1"
  },
  "devDependencies": {
    "@playwright/test": "1.64.1",
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
`,
  'functions/redis.ts': `import Redis from 'ioredis';

let client: Redis | undefined;

export const redis = () => {
  client ??= new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 2, connectTimeout: 5000 });
  return client;
};
`,
  'functions/ws.ts': `// WebSocket API handler for $connect, $disconnect and $default. Connection IDs live in a Redis set.
import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { redis } from './redis';

export default async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, connectionId } = event.requestContext;
  if (routeKey === '$connect') await redis().sadd('ws:connections', connectionId);
  else if (routeKey === '$disconnect') await redis().srem('ws:connections', connectionId);
  else console.log(\`message from \${connectionId}: \${event.body}\`);
  return { statusCode: 200, body: '' };
};
`,
  'functions/order-stream.ts': `// Reads new orders from the orders table stream and announces each one on the shop event bus.
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';

const eventBridge = new EventBridgeClient({});

export default async (event: DynamoDBStreamEvent) => {
  const created = event.Records.filter((record) => record.eventName === 'INSERT' && record.dynamodb?.NewImage).map(
    (record) => unmarshall(record.dynamodb!.NewImage as any)
  );
  if (created.length === 0) return;
  await eventBridge.send(
    new PutEventsCommand({
      Entries: created.map((order) => ({
        EventBusName: process.env.EVENT_BUS_NAME,
        Source: 'shop.orders',
        DetailType: 'OrderCreated',
        Detail: JSON.stringify({ orderId: order.id, item: order.item, quantity: order.quantity })
      }))
    })
  );
  console.log(\`published OrderCreated for \${created.map((order) => order.id).join(', ')}\`);
};
`,
  'functions/order-notify.ts': `// Handles OrderCreated events: marks the order as notified and pushes the change to every connected browser.
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { EventBridgeEvent } from 'aws-lambda';
import { redis } from './redis';

type OrderCreated = { orderId: string; item: string; quantity: number };

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sockets = new ApiGatewayManagementApiClient({ endpoint: process.env.WS_MANAGEMENT_URL });

export default async (event: EventBridgeEvent<'OrderCreated', OrderCreated>) => {
  const { orderId, item } = event.detail;
  await db.send(
    new UpdateCommand({
      TableName: process.env.ORDERS_TABLE,
      Key: { id: orderId },
      UpdateExpression: 'SET #status = :notified',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':notified': 'notified' }
    })
  );
  await redis().incr('orders:notified');
  const connections = await redis().smembers('ws:connections');
  const message = JSON.stringify({ type: 'order-notified', orderId, item });
  await Promise.all(
    connections.map(async (connectionId) => {
      try {
        await sockets.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: message }));
      } catch (error) {
        if ((error as { name?: string }).name === 'GoneException') await redis().srem('ws:connections', connectionId);
        else throw error;
      }
    })
  );
  console.log(\`order \${orderId} notified to \${connections.length} connections\`);
};
`,
  'services/orders-api/go.mod': `module github.com/r2w/orders-api

go 1.26.0

require (
	github.com/aws/aws-sdk-go-v2 v1.47.4
	github.com/aws/aws-sdk-go-v2/config v1.33.11
	github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue v1.21.15
	github.com/aws/aws-sdk-go-v2/service/dynamodb v1.72.1
	github.com/google/uuid v1.6.0
	github.com/redis/go-redis/v9 v9.23.0
)
`,
  'services/orders-api/main.go': `// orders-api: HTTP API for orders. Port 8080 serves the public API, port 9090 serves health and metrics for operators.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Order struct {
	ID        string \`json:"id" dynamodbav:"id"\`
	Item      string \`json:"item" dynamodbav:"item"\`
	Quantity  int    \`json:"quantity" dynamodbav:"quantity"\`
	Status    string \`json:"status" dynamodbav:"status"\`
	CreatedAt string \`json:"createdAt" dynamodbav:"createdAt"\`
}

type server struct {
	db    *dynamodb.Client
	rdb   *redis.Client
	table string
}

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func (s *server) listOrders(w http.ResponseWriter, r *http.Request) {
	out, err := s.db.Scan(r.Context(), &dynamodb.ScanInput{TableName: aws.String(s.table)})
	if err != nil {
		log.Printf("ERROR scan orders: %v", err)
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	orders := []Order{}
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &orders); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	sort.Slice(orders, func(i, j int) bool { return orders[i].CreatedAt > orders[j].CreatedAt })
	writeJSON(w, 200, orders)
}

func (s *server) createOrder(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Item     string \`json:"item"\`
		Quantity int    \`json:"quantity"\`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Item == "" {
		writeJSON(w, 400, map[string]string{"error": "item is required"})
		return
	}
	if input.Quantity <= 0 {
		input.Quantity = 1
	}
	order := Order{ID: uuid.NewString(), Item: input.Item, Quantity: input.Quantity, Status: "created",
		CreatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	item, err := attributevalue.MarshalMap(order)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	if _, err := s.db.PutItem(r.Context(), &dynamodb.PutItemInput{TableName: aws.String(s.table), Item: item}); err != nil {
		log.Printf("ERROR put order: %v", err)
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	if err := s.rdb.Incr(r.Context(), "orders:created").Err(); err != nil {
		log.Printf("WARN redis incr: %v", err)
	}
	log.Printf("order created id=%s item=%s", order.ID, order.Item)
	writeJSON(w, 201, order)
}

func (s *server) stats(w http.ResponseWriter, r *http.Request) {
	created, _ := s.rdb.Get(r.Context(), "orders:created").Int()
	notified, _ := s.rdb.Get(r.Context(), "orders:notified").Int()
	writeJSON(w, 200, map[string]int{"created": created, "notified": notified})
}

func main() {
	if delay, _ := strconv.Atoi(os.Getenv("STARTUP_DELAY_SECONDS")); delay > 0 {
		log.Printf("warming up for %d s before listening", delay)
		time.Sleep(time.Duration(delay) * time.Second)
	}
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("aws config: %v", err)
	}
	redisOpts, err := redis.ParseURL(env("REDIS_URL", "redis://localhost:6379"))
	if err != nil {
		log.Fatalf("REDIS_URL: %v", err)
	}
	s := &server{db: dynamodb.NewFromConfig(cfg), rdb: redis.NewClient(redisOpts), table: env("ORDERS_TABLE", "orders")}

	api := http.NewServeMux()
	api.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]bool{"ok": true}) })
	api.HandleFunc("GET /orders", s.listOrders)
	api.HandleFunc("POST /orders", s.createOrder)
	api.HandleFunc("GET /stats", s.stats)

	admin := http.NewServeMux()
	admin.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := s.rdb.Ping(r.Context()).Err(); err != nil {
			writeJSON(w, 503, map[string]string{"redis": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"redis": "ok"})
	})
	admin.HandleFunc("GET /metrics", func(w http.ResponseWriter, r *http.Request) {
		created, _ := s.rdb.Get(r.Context(), "orders:created").Int()
		fmt.Fprintf(w, "orders_created_total %d\\n", created)
	})

	port, adminPort := env("PORT", "8080"), env("ADMIN_PORT", "9090")
	go func() {
		log.Printf("admin listening on :%s", adminPort)
		log.Fatal(http.ListenAndServe(":"+adminPort, admin))
	}()
	log.Printf("orders-api listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, api))
}
`,
  'web/package.json': `{
  "name": "r2w-shop-web",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": { "next": "16.4.3", "react": "^19.2.0", "react-dom": "^19.2.0" },
  "devDependencies": { "@types/node": "^22.0.0", "@types/react": "^19.0.0", "typescript": "^5.6.0" }
}
`,
  'web/next.config.mjs': `/** @type {import('next').NextConfig} */
export default {};
`,
  'web/app/api.ts': `// Server-side client for the Go orders API. ORDERS_API_URL is only read on the server.
export type Order = { id: string; item: string; quantity: number; status: string; createdAt: string };

const base = () => {
  const url = process.env.ORDERS_API_URL;
  if (!url) throw new Error('ORDERS_API_URL is not set');
  return url.replace(/\\/$/, '');
};

export const listOrders = async (): Promise<Order[]> => {
  const res = await fetch(\`\${base()}/orders\`, { cache: 'no-store' });
  if (!res.ok) throw new Error(\`GET /orders failed: \${res.status} \${await res.text()}\`);
  return res.json();
};

export const getStats = async (): Promise<{ created: number; notified: number }> => {
  const res = await fetch(\`\${base()}/stats\`, { cache: 'no-store' });
  if (!res.ok) throw new Error(\`GET /stats failed: \${res.status}\`);
  return res.json();
};

export const createOrder = async (item: string, quantity: number) => {
  const res = await fetch(\`\${base()}/orders\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ item, quantity })
  });
  if (!res.ok) throw new Error(\`POST /orders failed: \${res.status} \${await res.text()}\`);
};
`,
  'web/app/actions.ts': `'use server';

import { revalidatePath } from 'next/cache';
import { createOrder } from './api';

export async function placeOrder(formData: FormData) {
  await createOrder(String(formData.get('item') ?? ''), Number(formData.get('quantity') ?? 1));
  revalidatePath('/');
}
`,
  'web/app/page.tsx': `import { placeOrder } from './actions';
import { getStats, listOrders } from './api';
import { LiveFeed } from './live-feed';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [orders, stats] = await Promise.all([listOrders(), getStats()]);
  return (
    <main>
      <h1>r2w shop</h1>
      <p data-testid="stats">
        created {stats.created}, notified {stats.notified}
      </p>
      <form action={placeOrder}>
        <label>
          Item <input name="item" required />
        </label>{' '}
        <input name="quantity" type="number" defaultValue={1} min={1} style={{ width: '4rem' }} />{' '}
        <button type="submit">Place order</button>
      </form>
      <LiveFeed />
      <table>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} data-testid={\`order-\${order.item}\`}>
              <td>{order.item}</td>
              <td>{order.quantity}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
`,
  'web/app/live-feed.tsx': `'use client';

import { useEffect, useState } from 'react';

export function LiveFeed() {
  const [state, setState] = useState('connecting');
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL;
    if (!url) {
      setState('NEXT_PUBLIC_WS_URL is not set');
      return;
    }
    const socket = new WebSocket(url);
    socket.onopen = () => setState('connected');
    socket.onclose = () => setState('closed');
    socket.onerror = () => setState('error');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'order-notified') setMessages((current) => [\`notified \${data.item}\`, ...current]);
    };
    return () => socket.close();
  }, []);

  return (
    <section>
      <p>
        Live updates: <span data-testid="ws-state">{state}</span>
      </p>
      <ul data-testid="live-feed">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </section>
  );
}
`,
  'web/app/layout.tsx': `export const metadata = { title: 'r2w shop' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', margin: '2rem' }}>{children}</body>
    </html>
  );
}
`,
  'scripts/seed.mjs': `// Seeds two orders through the orders API so the page has something to show.
const api = process.env.ORDERS_API_URL ?? 'http://localhost:8080';
for (const item of ['seed-keyboard', 'seed-mouse']) {
  const res = await fetch(\`\${api}/orders\`, { method: 'POST', body: JSON.stringify({ item, quantity: 1 }) });
  console.log(item, res.status);
}
`,
  'playwright.config.ts': `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: { baseURL: process.env.WEB_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  reporter: [['list']]
});
`,
  'e2e/orders.spec.ts': `import { expect, test } from '@playwright/test';

test('an order placed in the browser is created, announced and pushed back over the WebSocket', async ({ page }) => {
  const item = \`e2e-\${Date.now()}\`;
  await page.goto('/');
  await expect(page.getByTestId('ws-state')).toHaveText('connected', { timeout: 30_000 });

  await page.getByLabel('Item').fill(item);
  await page.getByRole('button', { name: 'Place order' }).click();

  const row = page.getByTestId(\`order-\${item}\`);
  await expect(row).toContainText('created', { timeout: 15_000 });

  // DynamoDB stream -> order-stream Lambda -> EventBridge -> order-notify Lambda -> WebSocket push
  await expect(page.getByTestId('live-feed')).toContainText(\`notified \${item}\`, { timeout: 60_000 });

  await page.reload();
  await expect(page.getByTestId(\`order-\${item}\`)).toContainText('notified');
  await expect(page.getByTestId('stats')).toContainText(/notified \\d+/);
});
`
};

/**
 * The r2w app's functions ported to Python, in one directory: siblings share its modules, but the stream handler's table
 * is not a trigger loop for the API that reads the same table (#355 review).
 */
const r2wPython: Record<string, string> = {
  'requirements.txt': 'boto3==1.35.0\n',
  'functions/api.py': `import json
import os
import uuid

import boto3

table = boto3.resource('dynamodb').Table(os.environ['ORDERS_TABLE'])


def handler(event, context):
    if event['requestContext']['http']['method'] == 'POST':
        order = {'id': str(uuid.uuid4()), 'status': 'created', **json.loads(event['body'])}
        table.put_item(Item=order)
        return {'statusCode': 201, 'body': json.dumps(order)}
    return {'statusCode': 200, 'body': json.dumps(table.scan()['Items'])}
`,
  'functions/order_stream.py': `import json
import os

import boto3

events = boto3.client('events')


def handler(event, context):
    for record in event['Records']:
        if record['eventName'] != 'INSERT':
            continue
        image = record['dynamodb']['NewImage']
        events.put_events(Entries=[{
            'EventBusName': os.environ['EVENT_BUS_NAME'],
            'Source': 'shop.orders',
            'DetailType': 'OrderCreated',
            'Detail': json.dumps({'orderId': image['id']['S']}),
        }])
`,
  'functions/order_notify.py': `import os

import boto3

table = boto3.resource('dynamodb').Table(os.environ['ORDERS_TABLE'])


def handler(event, context):
    if event['detail-type'] == 'OrderCreated':
        table.update_item(
            Key={'id': event['detail']['orderId']},
            UpdateExpression='SET #s = :n',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':n': 'notified'},
        )
`
};

/**
 * The r2cc dogfood app (part B): a FastAPI container whose Procfile migrates with Alembic before it starts, an S3
 * trigger feeding an SQS worker, a Step Functions approval workflow started by the API, a function URL read by a
 * SvelteKit server, and a Python job whose docstring states its schedule. Init's output needed seven config edits.
 */
const r2ccReceipts: Record<string, string> = {
  'package.json': `{
  "name": "receipts",
  "private": true,
  "type": "module",
  "scripts": {
    "test:e2e": "playwright test",
    "seed": ".venv/bin/python scripts/seed.py"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/client-sqs": "^3.700.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@playwright/test": "1.64.1",
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "typescript": "^5.6.0"
  }
}
`,
  'api/.python-version': `3.13
`,
  'api/Procfile': `web: alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port \${PORT:-8000}
`,
  'api/requirements.txt': `fastapi==0.115.6
uvicorn[standard]==0.32.1
psycopg[binary]==3.2.3
SQLAlchemy==2.0.36
alembic==1.14.0
boto3==1.35.80
python-multipart==0.0.19
`,
  'api/alembic.ini': `[alembic]
script_location = migrations
`,
  'api/main.py': `import json
import os
import time
import uuid

import boto3
import psycopg
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from psycopg.rows import dict_row

app = FastAPI(title="receipts-api")
s3 = boto3.client("s3")
stepfunctions = boto3.client("stepfunctions")

COLUMNS = "id, vendor, amount, status, line_count, size_bytes, decision_note, created_at"


def db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, autocommit=True)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/receipts")
def list_receipts():
    with db() as conn:
        return conn.execute(f"select {COLUMNS} from receipts order by created_at desc limit 50").fetchall()


@app.get("/receipts/{receipt_id}")
def get_receipt(receipt_id: uuid.UUID):
    with db() as conn:
        row = conn.execute(f"select {COLUMNS} from receipts where id = %s", (receipt_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="receipt not found")
    return row


@app.post("/receipts", status_code=201)
async def create_receipt(vendor: str = Form(...), amount: float = Form(...), file: UploadFile = File(...)):
    receipt_id = uuid.uuid4()
    body = await file.read()
    with db() as conn:
        conn.execute(
            "insert into receipts (id, vendor, amount, status) values (%s, %s, %s, 'uploaded')",
            (receipt_id, vendor, amount),
        )
    s3.put_object(Bucket=os.environ["UPLOAD_BUCKET"], Key=f"receipts/{receipt_id}.txt", Body=body, ContentType="text/plain")
    print(f"receipt {receipt_id} uploaded ({len(body)} bytes)", flush=True)
    return {"id": str(receipt_id)}


@app.post("/receipts/{receipt_id}/approve", status_code=202)
def approve_receipt(receipt_id: uuid.UUID):
    receipt = get_receipt(receipt_id)
    execution = stepfunctions.start_execution(
        stateMachineArn=os.environ["APPROVAL_WORKFLOW_ARN"],
        name=f"receipt-{receipt_id}-{int(time.time())}",
        input=json.dumps({"receiptId": str(receipt_id), "amount": float(receipt["amount"])}),
    )
    with db() as conn:
        conn.execute("update receipts set status = 'reviewing', updated_at = now() where id = %s", (receipt_id,))
    print(f"receipt {receipt_id} approval started", flush=True)
    return {"executionArn": execution["executionArn"]}
`,
  'api/migrations/env.py': `import os

from alembic import context
from sqlalchemy import create_engine

url = os.environ["DATABASE_URL"]
for prefix in ("postgresql://", "postgres://"):
    if url.startswith(prefix):
        url = "postgresql+psycopg://" + url[len(prefix):]

engine = create_engine(url)
with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=None)
    with context.begin_transaction():
        context.run_migrations()
`,
  'api/migrations/versions/0001_receipts.py': `revision = "0001"
down_revision = None

from alembic import op


def upgrade():
    op.execute(
        """
        create table receipts (
            id uuid primary key,
            vendor text not null,
            amount numeric(10, 2) not null,
            status text not null,
            line_count integer,
            size_bytes integer,
            decision_note text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        )
        """
    )


def downgrade():
    op.execute("drop table receipts")
`,
  'functions/on-upload.ts': `// Runs for every receipt file created in the upload bucket and queues it for processing.
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { S3Event } from 'aws-lambda';

const s3 = new S3Client({});
const sqs = new SQSClient({});

export default async (event: S3Event) => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\\+/g, ' '));
    if (!key.startsWith('receipts/')) continue;
    const object = await s3.send(new GetObjectCommand({ Bucket: record.s3.bucket.name, Key: key }));
    const text = await object.Body!.transformToString();
    const receiptId = key.slice('receipts/'.length).replace(/\\.txt$/, '');
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.RECEIPTS_QUEUE_URL,
        MessageBody: JSON.stringify({
          receiptId,
          sizeBytes: record.s3.object.size,
          lineCount: text.split('\\n').filter((line) => line.trim()).length
        })
      })
    );
    console.log(\`queued receipt \${receiptId}\`);
  }
};
`,
  'functions/score.ts': `// First step of the approval workflow: small receipts are approved automatically.
type ScoreInput = { receiptId: string; amount: number };

export default async (input: ScoreInput) => {
  const approved = input.amount <= 500;
  console.log(\`scored receipt \${input.receiptId}: \${approved ? 'approved' : 'rejected'}\`);
  return { ...input, approved, note: approved ? 'auto-approved under 500' : 'over 500, needs a manager' };
};
`,
  'functions/stats.ts': `// Public HTTPS endpoint (function URL) with receipt counts per status.
import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

export default async (_event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
  const { rows } = await pool.query('select status, count(*)::int as count from receipts group by status');
  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row.count]));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ total, byStatus }) };
};
`,
  'workers/requirements.txt': `psycopg[binary]==3.2.3
`,
  'workers/process_receipt.py': `"""Consumes the receipts queue: stores the line count and size and marks the receipt processed."""
import json
import os

import psycopg


def handler(event, context):
    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
        for record in event["Records"]:
            message = json.loads(record["body"])
            conn.execute(
                "update receipts set status = 'processed', line_count = %s, size_bytes = %s, updated_at = now() where id = %s",
                (message["lineCount"], message["sizeBytes"], message["receiptId"]),
            )
            print(f"processed receipt {message['receiptId']} ({message['lineCount']} lines)")
`,
  'workers/mark_decision.py': `"""Last step of the approval workflow: records the decision on the receipt."""
import os

import psycopg


def handler(event, context):
    status = "approved" if event["approved"] else "rejected"
    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
        conn.execute(
            "update receipts set status = %s, decision_note = %s, updated_at = now() where id = %s",
            (status, event["note"], event["receiptId"]),
        )
    print(f"receipt {event['receiptId']} {status}")
    return {"receiptId": event["receiptId"], "status": status}
`,
  'workers/cleanup.py': `"""Scheduled job, every minute: expires receipts stuck in \`uploaded\` for more than 10 minutes.

Schedule: rate(1 minute)
"""
import os

import psycopg


def handler(event, context):
    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
        expired = conn.execute(
            "update receipts set status = 'expired', updated_at = now() "
            "where status = 'uploaded' and created_at < now() - interval '10 minutes'"
        ).rowcount
    print(f"cleanup ran: {expired} receipts expired")
`,
  'web/package.json': `{
  "name": "receipts-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.2.0",
    "@sveltejs/kit": "^2.15.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.16.0",
    "vite": "^6.0.0"
  }
}
`,
  'web/svelte.config.js': `import adapter from '@sveltejs/adapter-node';

export default {
  kit: { adapter: adapter() }
};
`,
  'web/vite.config.js': `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [sveltekit()] });
`,
  'web/src/routes/+page.server.js': `import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const api = (path, init) => fetch(\`\${env.API_URL}\${path}\`, init);

export async function load() {
  const [receipts, stats] = await Promise.all([
    api('/receipts').then((res) => res.json()),
    fetch(env.STATS_URL)
      .then((res) => res.json())
      .catch(() => ({ total: null, byStatus: {} }))
  ]);
  return { receipts, stats };
}

export const actions = {
  upload: async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Choose a receipt file' });
    const body = new FormData();
    body.set('vendor', String(form.get('vendor')));
    body.set('amount', String(form.get('amount')));
    body.set('file', file, file.name);
    const res = await api('/receipts', { method: 'POST', body });
    if (!res.ok) return fail(res.status, { error: await res.text() });
    return { uploaded: (await res.json()).id };
  },
  approve: async ({ request }) => {
    const id = (await request.formData()).get('id');
    const res = await api(\`/receipts/\${id}/approve\`, { method: 'POST' });
    if (!res.ok) return fail(res.status, { error: await res.text() });
    return { approving: id };
  }
};
`,
  'scripts/seed.py': `"""Inserts three sample receipts into the database named by DATABASE_URL."""
import os
import uuid

import psycopg

SAMPLES = [("seed-coffee", 4.5, "processed", 2), ("seed-laptop", 1299, "processed", 14), ("seed-taxi", 31.2, "approved", 3)]

with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
    for vendor, amount, status, lines in SAMPLES:
        conn.execute(
            "insert into receipts (id, vendor, amount, status, line_count) values (%s, %s, %s, %s, %s)",
            (uuid.uuid4(), vendor, amount, status, lines),
        )
        print(f"seeded {vendor}")
`
};

/** The r2gg part B monorepo (28 Oct 2026): pnpm + Turborepo, a shared TypeScript package, Hono on Bun, a gunicorn
 * service only the API calls, a Java function, a TypeScript function behind the HTTP API, MySQL, SQS, a job per queue
 * message and Astro SSR. Its lockfile is a stub: init only reads that it exists. */
const r2ggShelf: Record<string, string> = {
  'README.md': `# Shelf

Inventory app in a pnpm + Turborepo monorepo. Every TypeScript workload imports the shared rules in \`packages/shared\`.

- \`apps/api\`: Hono API on Bun (\`bun src/index.ts\`). Items and reports live in MySQL (\`DATABASE_URL\`); the API applies
  its schema on start, then warms its price cache for a few seconds before it listens. Creating an item invokes the tax
  function (\`TAX_FUNCTION_NAME\`) and asks the recommendations service for tags (\`RECS_URL\`). \`POST /reports\` puts a
  message on the report queue (\`REPORT_QUEUE_URL\`).
- \`apps/recs\`: internal Flask service under gunicorn that suggests tags for an item name. Only the API calls it.
- \`functions/quote\`: HTTP endpoint \`GET /quote/{sku}?quantity=N\` with the bulk discount from the shared package. Reads
  MySQL (\`DATABASE_URL\`).
- \`functions/tax\`: Java 21 (Maven) function with the tax rate per category.
- \`jobs/report\`: batch job that runs for each report-queue message. It writes the report to the reports bucket
  (\`REPORTS_BUCKET\`) and records it in MySQL.
- \`apps/web\`: Astro SSR app. The server calls the API (\`API_URL\`) and the quote endpoint (\`QUOTE_URL\`).
- \`pnpm seed\`: inserts three sample items. \`pnpm test:e2e\`: Playwright test with \`WEB_URL\`.
`,
  'apps/api/package.json': `{
  "name": "@shelf/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "typecheck": "tsc -p ."
  },
  "dependencies": {
    "@aws-sdk/client-lambda": "^3.700.0",
    "@aws-sdk/client-sqs": "^3.700.0",
    "@shelf/shared": "workspace:*",
    "hono": "^4.6.0",
    "mysql2": "^3.11.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.0"
  }
}
`,
  'apps/api/src/db.ts': `import mysql from 'mysql2/promise';

export const pool = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 5 });

// Schema migrations, applied in order when the API starts.
const MIGRATIONS = [
  \`create table if not exists items (
     id varchar(36) primary key,
     sku varchar(32) not null unique,
     name varchar(200) not null,
     category varchar(20) not null,
     price_cents int not null,
     tax_cents int not null,
     tags varchar(255) not null default '',
     created_at timestamp not null default current_timestamp
   )\`,
  \`create table if not exists reports (
     id varchar(36) primary key,
     item_count int not null,
     total_cents bigint not null,
     s3_key varchar(255) not null,
     shared_version varchar(40) not null,
     created_at timestamp not null default current_timestamp
   )\`
];

export async function migrate() {
  for (const sql of MIGRATIONS) await pool.query(sql);
}
`,
  'apps/api/src/index.ts': `import { Hono } from 'hono';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { SHARED_VERSION, formatPrice, validateItem } from '@shelf/shared';
import { migrate, pool } from './db';

const lambda = new LambdaClient({});
const sqs = new SQSClient({});
const app = new Hono();

// The tax rules live in the Java function \`tax\` (functions/tax).
async function taxFor(category: string, priceCents: number): Promise<number> {
  const out = await lambda.send(
    new InvokeCommand({
      FunctionName: process.env.TAX_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify({ category, priceCents }))
    })
  );
  const body = JSON.parse(Buffer.from(out.Payload ?? []).toString() || 'null');
  if (out.FunctionError) throw new Error(\`tax function failed: \${out.FunctionError}\`);
  return body.taxCents;
}

// Tag suggestions come from the recommendations service (apps/recs).
async function tagsFor(name: string): Promise<string[]> {
  const res = await fetch(\`\${process.env.RECS_URL}/tags?name=\${encodeURIComponent(name)}\`);
  if (!res.ok) throw new Error(\`recs answered \${res.status}\`);
  return ((await res.json()) as { tags: string[] }).tags;
}

app.get('/health', (c) => c.json({ ok: true, shared: SHARED_VERSION }));

app.get('/items', async (c) => {
  const [rows] = await pool.query('select * from items order by created_at desc, sku limit 100');
  return c.json(
    (rows as any[]).map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      category: r.category,
      priceCents: r.price_cents,
      taxCents: r.tax_cents,
      price: formatPrice(r.price_cents),
      tax: formatPrice(r.tax_cents),
      tags: r.tags ? r.tags.split(',') : []
    }))
  );
});

app.post('/items', async (c) => {
  const parsed = validateItem(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sku, name, category, priceCents } = parsed.item;
  try {
    const [taxCents, tags] = await Promise.all([taxFor(category, priceCents), tagsFor(name)]);
    const id = crypto.randomUUID();
    await pool.query(
      'insert into items (id, sku, name, category, price_cents, tax_cents, tags) values (?, ?, ?, ?, ?, ?, ?)',
      [id, sku, name, category, priceCents, taxCents, tags.join(',')]
    );
    return c.json({ id, sku, taxCents, tags }, 201);
  } catch (error) {
    console.error('could not create item', sku, error);
    return c.json({ error: 'internal error' }, 500);
  }
});

// Reports are built by the batch job in jobs/report, which reads the report queue.
app.post('/reports', async (c) => {
  const requestId = crypto.randomUUID();
  await sqs.send(
    new SendMessageCommand({ QueueUrl: process.env.REPORT_QUEUE_URL, MessageBody: JSON.stringify({ requestId }) })
  );
  return c.json({ requestId }, 202);
});

app.get('/reports', async (c) => {
  const [rows] = await pool.query('select * from reports order by created_at desc limit 20');
  return c.json(rows);
});

// Warming the price cache takes a few seconds; the API listens only after it.
const warmupMs = Number(process.env.WARMUP_MS ?? 5000);
await migrate();
console.log(\`warming the price cache for \${warmupMs} ms\`);
await Bun.sleep(warmupMs);

const port = Number(process.env.PORT ?? 3000);
Bun.serve({ port, fetch: app.fetch });
console.log(\`shelf api listening on \${port} (\${SHARED_VERSION})\`);
`,
  'apps/recs/Procfile': `web: gunicorn app:app --bind 0.0.0.0:\${PORT:-5000} --workers 2 --timeout 30
`,
  'apps/recs/app.py': `"""Tag suggestions for new items. Internal service: only the API calls it."""
import re

from flask import Flask, jsonify, request

app = Flask(__name__)

KEYWORDS = {
    "guide": "reference",
    "atlas": "reference",
    "chess": "strategy",
    "puzzle": "puzzle",
    "hammer": "hardware",
    "drill": "hardware",
    "vinyl": "collector",
}


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.get("/tags")
def tags():
    words = re.findall(r"[a-z]+", request.args.get("name", "").lower())
    found = sorted({KEYWORDS[w] for w in words if w in KEYWORDS})
    return jsonify(tags=found or ["general"])
`,
  'apps/recs/requirements.txt': `flask==3.1.0
gunicorn==23.0.0
`,
  'apps/web/astro.config.mjs': `import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' })
});
`,
  'apps/web/package.json': `{
  "name": "@shelf/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check"
  },
  "dependencies": {
    "@astrojs/node": "^9.1.0",
    "@shelf/shared": "workspace:*",
    "astro": "^5.2.0"
  }
}
`,
  'apps/web/src/env.ts': `// Server-side configuration: the Shelf API and the quote endpoint (HTTP API in front of the quote function).
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';
export const QUOTE_URL = process.env.QUOTE_URL ?? '';
`,
  'apps/web/src/pages/index.astro': `---
import { CATEGORIES, SHARED_VERSION, formatPrice } from '@shelf/shared';
import { API_URL, QUOTE_URL } from '../env';

type Item = { sku: string; name: string; category: string; priceCents: number; tax: string; tags: string[] };

const [health, items, reports] = await Promise.all([
  fetch(\`\${API_URL}/health\`).then((r) => r.json()),
  fetch(\`\${API_URL}/items\`).then((r) => {
    if (!r.ok) throw new Error(\`API /items answered \${r.status}\`);
    return r.json() as Promise<Item[]>;
  }),
  fetch(\`\${API_URL}/reports\`).then((r) => r.json() as Promise<any[]>)
]);

let quoteShared = 'n/a';
const quotes = await Promise.all(
  items.slice(0, 10).map(async (item) => {
    const res = await fetch(\`\${QUOTE_URL}/quote/\${item.sku}?quantity=10\`);
    if (!res.ok) {
      console.error(\`quote for \${item.sku} failed with \${res.status}\`);
      return [item.sku, 'unavailable'];
    }
    const quote = await res.json();
    quoteShared = quote.shared;
    return [item.sku, quote.total];
  })
);
const quoteBySku = Object.fromEntries(quotes);
const error = Astro.url.searchParams.get('error');
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Shelf</title></head>
  <body>
    <h1>Shelf inventory</h1>
    {error && <p role="alert" data-testid="error">{error}</p>}
    <form method="post" action="/items/new">
      <input name="sku" placeholder="SKU" required />
      <input name="name" placeholder="Name" required />
      <select name="category">{CATEGORIES.map((c) => <option value={c}>{c}</option>)}</select>
      <input name="price" placeholder="Price (USD)" required />
      <button type="submit">Add item</button>
    </form>
    <table>
      <thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Tax</th><th>10 units</th><th>Tags</th></tr></thead>
      <tbody>
        {items.map((item) => (
          <tr data-sku={item.sku}>
            <td>{item.sku}</td><td>{item.name}</td><td class="price">{formatPrice(item.priceCents)}</td>
            <td class="tax">{item.tax}</td><td class="quote">{quoteBySku[item.sku] ?? '-'}</td><td class="tags">{item.tags.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <h2>Reports</h2>
    <form method="post" action="/reports/new"><button type="submit">Request report</button></form>
    <ul data-testid="reports">
      {reports.map((r) => <li>{r.item_count} items, {formatPrice(Number(r.total_cents))} ({r.shared_version})</li>)}
    </ul>
    <footer data-testid="versions">web: {SHARED_VERSION}; api: {health.shared}; quote: {quoteShared}</footer>
  </body>
</html>
`,
  'apps/web/src/pages/items/new.ts': `import type { APIRoute } from 'astro';
import { API_URL } from '../../env';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const res = await fetch(\`\${API_URL}/items\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sku: form.get('sku'),
      name: form.get('name'),
      category: form.get('category'),
      priceCents: Math.round(Number(form.get('price')) * 100)
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(\`creating an item failed: \${res.status} \${JSON.stringify(body)}\`);
    return redirect(\`/?error=\${encodeURIComponent(body.error ?? \`API answered \${res.status}\`)}\`, 303);
  }
  return redirect('/', 303);
};
`,
  'apps/web/src/pages/reports/new.ts': `import type { APIRoute } from 'astro';
import { API_URL } from '../../env';

export const POST: APIRoute = async ({ redirect }) => {
  const res = await fetch(\`\${API_URL}/reports\`, { method: 'POST' });
  if (!res.ok) return redirect(\`/?error=report request failed (\${res.status})\`, 303);
  return redirect('/', 303);
};
`,
  'functions/quote/package.json': `{
  "name": "@shelf/quote",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "typecheck": "tsc -p ." },
  "dependencies": { "@shelf/shared": "workspace:*", "mysql2": "^3.11.0" },
  "devDependencies": { "@types/aws-lambda": "^8.10.145" }
}
`,
  'functions/quote/src/handler.ts': `import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import mysql from 'mysql2/promise';
import { SHARED_VERSION, normalizeSku, quoteFor } from '@shelf/shared';

let pool: mysql.Pool | undefined;

// GET /quote/{sku}?quantity=12 -> price for that many units, with the bulk discount.
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  pool ??= mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 2 });
  const sku = normalizeSku(event.pathParameters?.sku ?? '');
  const quantity = Number(event.queryStringParameters?.quantity ?? 1);
  const delayMs = Number(event.queryStringParameters?.delayMs ?? 0);
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 25000)));
  const [rows] = await pool.query('select price_cents from items where sku = ?', [sku]);
  const item = (rows as any[])[0];
  if (!item) return { statusCode: 404, body: JSON.stringify({ error: \`no item \${sku}\` }) };
  console.log(\`quote \${sku} x\${quantity}\`);
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku, ...quoteFor(item.price_cents, quantity), shared: SHARED_VERSION })
  };
};
`,
  'functions/tax/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>shelf</groupId>
  <artifactId>tax</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>com.amazonaws</groupId>
      <artifactId>aws-lambda-java-core</artifactId>
      <version>1.2.3</version>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.6.0</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
`,
  'functions/tax/src/main/java/shelf/TaxHandler.java': `package shelf;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import java.util.Map;

/** Sales tax per category, in basis points. The API invokes this function directly when an item is created. */
public class TaxHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
  private static final Map<String, Integer> RATES_BP = Map.of("books", 0, "games", 2000, "tools", 1500, "music", 1000);

  @Override
  public Map<String, Object> handleRequest(Map<String, Object> input, Context context) {
    String category = String.valueOf(input.get("category"));
    int priceCents = ((Number) input.get("priceCents")).intValue();
    int rateBp = RATES_BP.getOrDefault(category, 1000);
    int taxCents = Math.round(priceCents * rateBp / 10000f);
    context.getLogger().log("tax " + category + " " + priceCents + " -> " + taxCents);
    return Map.of("taxCents", taxCents, "rateBp", rateBp);
  }
}
`,
  'jobs/report/package.json': `{
  "name": "@shelf/report",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "start": "node --experimental-strip-types src/report.ts", "typecheck": "tsc -p ." },
  "dependencies": { "@aws-sdk/client-s3": "^3.700.0", "@shelf/shared": "workspace:*", "mysql2": "^3.11.0" }
}
`,
  'jobs/report/src/report.ts': `// Batch job: builds an inventory report from MySQL, stores it in the reports bucket (REPORTS_BUCKET) and records it in
// the reports table. It runs for every message on the report queue, which the API fills on POST /reports.
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mysql from 'mysql2/promise';
import { SHARED_VERSION, formatPrice } from '@shelf/shared';

const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL! });
const [rows] = await conn.query('select sku, name, category, price_cents from items order by sku');
const items = rows as { sku: string; name: string; category: string; price_cents: number }[];
const totalCents = items.reduce((sum, item) => sum + item.price_cents, 0);
const id = randomUUID();
const key = \`reports/\${new Date().toISOString().slice(0, 10)}/\${id}.json\`;
const report = { id, generatedAt: new Date().toISOString(), itemCount: items.length, total: formatPrice(totalCents), items };

await new S3Client({}).send(
  new PutObjectCommand({ Bucket: process.env.REPORTS_BUCKET, Key: key, Body: JSON.stringify(report, null, 2), ContentType: 'application/json' })
);
await conn.query('insert into reports (id, item_count, total_cents, s3_key, shared_version) values (?, ?, ?, ?, ?)', [
  id,
  items.length,
  totalCents,
  key,
  SHARED_VERSION
]);
console.log(\`report \${id}: \${items.length} items, \${formatPrice(totalCents)} -> s3://\${process.env.REPORTS_BUCKET}/\${key}\`);
await conn.end();
`,
  'package.json': `{
  "name": "shelf",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.17.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck",
    "seed": "bun scripts/seed.ts",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.64.1",
    "@types/node": "^22.10.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  },
  "dependencies": {
    "mysql2": "^3.11.0"
  }
}
`,
  'packages/shared/package.json': `{
  "name": "@shelf/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc -p ." }
}
`,
  'packages/shared/src/index.ts': `// Shared rules for every Shelf workload: the API, the quote function, the report job and the web app all import
// this package, so a change here must reach all of them.

export const SHARED_VERSION = 'shelf-shared 1';

export const CATEGORIES = ['books', 'games', 'tools', 'music'] as const;
export type Category = (typeof CATEGORIES)[number];

export type NewItem = { sku: string; name: string; category: Category; priceCents: number };

export function normalizeSku(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function formatPrice(cents: number): string {
  return \`$\${(cents / 100).toFixed(2)}\`;
}

export function validateItem(input: unknown): { ok: true; item: NewItem } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'body must be an object' };
  const { sku, name, category, priceCents } = input as Record<string, unknown>;
  if (typeof sku !== 'string' || normalizeSku(sku).length < 3) return { ok: false, error: 'sku needs 3+ characters' };
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: 'name is required' };
  if (typeof category !== 'string' || !CATEGORIES.includes(category as Category)) {
    return { ok: false, error: \`category must be one of \${CATEGORIES.join(', ')}\` };
  }
  const price = Number(priceCents);
  if (!Number.isInteger(price) || price <= 0) return { ok: false, error: 'priceCents must be a positive integer' };
  return { ok: true, item: { sku: normalizeSku(sku), name: name.trim(), category: category as Category, priceCents: price } };
}

// Bulk discount: 5% from 10 units, 10% from 50 units.
export function quoteFor(unitCents: number, quantity: number) {
  const discountPct = quantity >= 50 ? 10 : quantity >= 10 ? 5 : 0;
  const totalCents = Math.round(unitCents * quantity * (1 - discountPct / 100));
  return { unitCents, quantity, discountPct, totalCents, total: formatPrice(totalCents) };
}
`,
  'pnpm-workspace.yaml': `packages:
  - apps/*
  - packages/*
  - functions/*
  - jobs/*
allowBuilds:
  esbuild: true
  sharp: true
`,
  'scripts/seed.ts': `// Inserts sample items into the database named by DATABASE_URL (run: pnpm seed).
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL! });
const samples = [
  ['SEED-ATLAS', 'World atlas', 'books', 4500, 0, 'reference'],
  ['SEED-CHESS', 'Travel chess set', 'games', 2999, 600, 'strategy'],
  ['SEED-DRILL', 'Cordless drill', 'tools', 8900, 1335, 'hardware']
];
for (const [sku, name, category, price, tax, tags] of samples) {
  await conn.query(
    'insert into items (id, sku, name, category, price_cents, tax_cents, tags) values (uuid(), ?, ?, ?, ?, ?, ?) on duplicate key update name = values(name)',
    [sku, name, category, price, tax, tags]
  );
  console.log(\`seeded \${sku}\`);
}
await conn.end();
`,
  'turbo.json': `{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "dev": { "cache": false, "persistent": true }
  }
}
`,
  'pnpm-lock.yaml': `lockfileVersion: '9.0'
`
};

/** The r2ll part B app (28 Oct 2026): a Rails API in `api/` (Gemfile, Procfile and Dockerfile) on PostgreSQL that
 * publishes to SNS, which the README says fans out to one queue per TypeScript consumer; the audit consumer writes
 * DynamoDB items without naming the table's key; a Go `lambda.Start` handler behind the HTTP API; SvelteKit SSR. Lockfiles
 * and go.sum are stubs: init only reads that they exist. */
const r2llParcel: Record<string, string> = {
  'README.md': `# Parcel
Rails API stores parcels in PostgreSQL. Its startup runs Rails migrations. Creating a parcel publishes its id to PARCEL_TOPIC_ARN (SNS), which fans out to billingQueue and auditQueue. Each queue invokes its own TypeScript SQS handler. Billing marks the parcel billed in PostgreSQL; audit writes an expiring DynamoDB record with TTL attribute expiresAt. A Go Lambda exposes GET /ping through an HTTP API. SvelteKit SSR calls API_URL and PING_URL; browser tests create a parcel and wait until both consumers finish. All workloads are public only when an HTTP client needs them.
`,
  'api/Dockerfile': `FROM ruby:3.4-slim
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Gemfile ./
RUN bundle install
COPY . .
ENV RAILS_ENV=development PORT=3000
CMD ["sh", "-c", "bundle exec rails db:migrate && bundle exec rails server -b 0.0.0.0 -p $PORT"]
`,
  'api/Gemfile': `source "https://rubygems.org"
gem "rails", "~> 8.0.0"
gem "pg", "~> 1.5"
gem "puma", "~> 6.6"
gem "aws-sdk-sns", "~> 1"
`,
  'api/Gemfile.lock': `GEM
  remote: https://rubygems.org/
`,
  'api/Procfile': `web: bundle exec rails db:migrate && bundle exec rails server -b 0.0.0.0 -p $PORT
`,
  'api/Rakefile': `require_relative 'config/application'
Rails.application.load_tasks
`,
  'api/app/controllers/application_controller.rb': `class ApplicationController < ActionController::API
end
`,
  'api/app/controllers/parcels_controller.rb': `class ParcelsController < ApplicationController
 def health
  render json: {ok: true}
 end
 def index
  render json: Parcel.order(id: :desc).limit(20)
 end
 def create
  parcel = Parcel.create!(name: params.require(:name), billed: false)
  Aws::SNS::Client.new.publish(topic_arn: ENV.fetch('PARCEL_TOPIC_ARN'), message: {parcelId: parcel.id}.to_json)
  render json: parcel, status: :created
 end
end
`,
  'api/app/models/application_record.rb': `class ApplicationRecord < ActiveRecord::Base
 self.abstract_class = true
end
`,
  'api/app/models/parcel.rb': `class Parcel < ApplicationRecord
end
`,
  'api/bin/rails': `#!/usr/bin/env ruby
APP_PATH = File.expand_path('../config/application', __dir__)
require_relative '../config/boot'
require 'rails/commands'
`,
  'api/config.ru': `require_relative 'config/environment'
run Rails.application
Rails.application.load_server
`,
  'api/config/application.rb': `require_relative 'boot'
require 'rails'
require 'active_record/railtie'
require 'action_controller/railtie'
Bundler.require(*Rails.groups)
module ParcelApp
 class Application < Rails::Application
  config.load_defaults 8.0
  config.api_only = true
  config.eager_load = false
  config.secret_key_base = 'development-only-r2ll'
  config.hosts.clear
  config.logger = Logger.new($stdout)
 end
end
`,
  'api/config/boot.rb': `ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)
require 'bundler/setup'
`,
  'api/config/database.yml': `development:
  adapter: postgresql
  url: <%= ENV.fetch('DATABASE_URL') %>
`,
  'api/config/environment.rb': `require_relative 'application'
Rails.application.initialize!
`,
  'api/config/routes.rb': `Rails.application.routes.draw do
 get '/health', to: 'parcels#health'
 get '/parcels', to: 'parcels#index'
 post '/parcels', to: 'parcels#create'
end
`,
  'api/db/migrate/20261028000001_create_parcels.rb': `class CreateParcels < ActiveRecord::Migration[8.0]
 def change
  create_table :parcels do |t|
   t.string :name, null: false
   t.boolean :billed, default: false
   t.timestamps
  end
 end
end
`,
  'functions/audit.ts': `import type { SQSEvent } from 'aws-lambda';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, PutCommand} from '@aws-sdk/lib-dynamodb';
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const handler=async(event: SQSEvent)=>{for(const r of event.Records){const msg=JSON.parse(r.body);console.log('audit parcel',msg.parcelId);await db.send(new PutCommand({TableName:process.env.AUDIT_TABLE,Item:{id:String(msg.parcelId),expiresAt:Math.floor(Date.now()/1000)+3600}}));}};
`,
  'functions/billing.ts': `import type { SQSEvent } from 'aws-lambda';
import pg from 'pg';
export const handler = async (event: SQSEvent) => {
 const client = new pg.Client({connectionString: process.env.DATABASE_URL}); await client.connect();
 try { for (const record of event.Records) { const msg = JSON.parse(record.body); console.log('billing parcel', msg.parcelId); await client.query('update parcels set billed=true where id=$1',[msg.parcelId]); }} finally {await client.end();}
};
`,
  'functions/ping/go.mod': `module r2ll/ping

go 1.24

require github.com/aws/aws-lambda-go v1.49.0
`,
  'functions/ping/go.sum': ``,
  'functions/ping/main.go': `package main
import("context";"github.com/aws/aws-lambda-go/events";"github.com/aws/aws-lambda-go/lambda")
func handler(ctx context.Context,event events.APIGatewayV2HTTPRequest)(events.APIGatewayV2HTTPResponse,error){return events.APIGatewayV2HTTPResponse{StatusCode:200,Body:\`{"message":"pong-r2ll"}\`,Headers:map[string]string{"content-type":"application/json"}},nil}
func main(){lambda.Start(handler)}
`,
  'package-lock.json': `{ "lockfileVersion": 3 }
`,
  'package.json': `{
  "name": "r2ll-parcel",
  "private": true,
  "type": "module",
  "scripts": {
    "seed": "node scripts/seed.mjs",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "pg": "^8.16.0",
    "@aws-sdk/client-dynamodb": "^3.900.0",
    "@aws-sdk/lib-dynamodb": "^3.900.0"
  },
  "devDependencies": {
    "@playwright/test": "1.64.1",
    "@types/aws-lambda": "^8.10.0"
  }
}`,
  'scripts/seed.mjs': `import pg from 'pg';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query("insert into parcels(name,billed,created_at,updated_at) values('seed-r2ll',false,now(),now())");console.log('seeded one parcel');await c.end();
`,
  'web/package-lock.json': `{ "lockfileVersion": 3 }
`,
  'web/package.json': `{
  "name": "parcel-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.2.0",
    "@sveltejs/kit": "^2.15.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.16.0",
    "vite": "^6.0.0"
  }
}`,
  'web/src/app.html': `<!doctype html><html><head>%sveltekit.head%</head><body><div>%sveltekit.body%</div></body></html>`,
  'web/src/routes/+page.server.js': `import {redirect} from '@sveltejs/kit';
import {env} from '$env/dynamic/private';
export async function load(){const [p,g]=await Promise.all([fetch(env.API_URL+'/parcels'),fetch(env.PING_URL+'/go-status')]);if(!p.ok||!g.ok){console.error('Parcel SSR upstream failed',p.status,g.status);throw new Error('upstream failed');}return {parcels:await p.json(),ping:await g.json()};}
export const actions={default:async({request})=>{const form=await request.formData();const res=await fetch(env.API_URL+'/parcels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:form.get('name')})});if(!res.ok){console.error('parcel create failed',await res.text());throw new Error('create failed');}return redirect(303,'/');}};
`,
  'web/src/routes/+page.svelte': `<script>export let data;</script>
<h1>Parcel</h1><p data-testid="ping">{data.ping.message}</p>
<form method="POST"><input name="name" aria-label="Name"/><button>Create parcel</button></form>
<ul>{#each data.parcels as parcel}<li data-testid="parcel">{parcel.name}: {parcel.billed?'billed':'pending'}</li>{/each}</ul>
`,
  'web/svelte.config.js': `import adapter from '@sveltejs/adapter-node';
export default {kit:{adapter:adapter()}};
`,
  'web/vite.config.js': `import {sveltekit} from '@sveltejs/kit/vite';
import {defineConfig} from 'vite';
export default defineConfig({plugins:[sveltekit()]});
`
};

export const DEV_RUNNABLE_FIXTURES = {
  'lambda-todos': lambdaTodos,
  'container-api-nextjs': containerApiNextjs,
  'scheduled-dynamodb': scheduledDynamodb,
  'two-http-handlers': twoHttpHandlers,
  'monorepo-apis': monorepoApis,
  'r2p-files': r2pFiles,
  'untyped-handlers': untypedHandlers,
  'trigger-loops': triggerLoops,
  'r2w-shop': r2wShop,
  'r2w-python': r2wPython,
  'r2cc-receipts': r2ccReceipts,
  'r2gg-shelf': r2ggShelf,
  'r2ll-parcel': r2llParcel
} as const;
