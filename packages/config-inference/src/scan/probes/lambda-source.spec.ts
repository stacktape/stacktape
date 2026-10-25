/**
 * The lambda-source probe: handler-shaped files, and only handler-shaped files.
 *
 * The false-positive half is the one that bites: an Express project keeping route modules under
 * `src/handlers/` must not sprout a phantom Lambda function beside its web service.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { createProbeContext } from '../assemble';
import { UNROUTED_HTTP_SOURCE } from '../../facts/service';
import { lambdaSourceProbe } from './lambda-source';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<{ root: string; files: string[] }> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-lambda-src-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return { root: directory, files: Object.keys(files) };
};

describe('the lambda-source probe', () => {
  it('recognizes named handler exports', async () => {
    const repo = await makeRepo({
      'functions/thumbnail.js': 'exports.handler = async (event) => ({ statusCode: 200 });',
      'functions/resize.ts': 'export const handler = async (event: unknown) => ({ statusCode: 200 });',
      'functions/ingest.py': 'def lambda_handler(event, context):\n    return {"statusCode": 200}\n'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const entrypoints = (output.services ?? []).map((service) => service.functionEntrypoint).toSorted();

    expect(entrypoints).toEqual(['functions/ingest.py', 'functions/resize.ts', 'functions/thumbnail.js']);
  });

  it('recognizes a top-level entry file that wraps an HTTP app for Lambda, and only then', async () => {
    const repo = await makeRepo({
      'src/index.ts': [
        "import { Hono } from 'hono';",
        "import { handle } from '@hono/aws-lambda';",
        'const app = new Hono();',
        'export const handler = handle(app);',
        ''
      ].join('\n'),
      // A plain module exporting `handler` at the top level is not a function.
      'api/src/index.ts': 'export const handler = (request: unknown) => request;\n'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect((output.services ?? []).map((service) => service.functionEntrypoint)).toEqual(['src/index.ts']);
  });

  it('defers to a Terraform configuration that declares the functions', async () => {
    const repo = await makeRepo({
      'main.tf': 'resource "aws_lambda_function" "api" { handler = "app.lambda_handler" }\n',
      'src/app.py': 'def lambda_handler(event, context):\n    return {"statusCode": 200}\n'
    });
    root = repo.root;

    expect(await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files))).toEqual({});
  });

  it('leaves ordinary modules under a handlers directory alone', async () => {
    const repo = await makeRepo({
      // A standard Express layout: route modules exporting a router, not a Lambda handler.
      'src/handlers/userHandler.js': [
        "const router = require('express').Router();",
        "router.get('/users', (req, res) => res.json([]));",
        'module.exports = router;',
        ''
      ].join('\n'),
      'src/handlers/orders.js': 'module.exports = { listOrders: () => [] };'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services ?? []).toEqual([]);
  });

  it('reads the trigger from the aws-lambda event type of a handler anywhere in the source tree', async () => {
    const repo = await makeRepo({
      'src/api.ts': [
        "import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';",
        'export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => ({ statusCode: 200 });',
        ''
      ].join('\n'),
      'src/legacy.ts': [
        "import type { APIGatewayProxyEvent } from 'aws-lambda';",
        'export async function handler(event: APIGatewayProxyEvent) { return { statusCode: 200 }; }',
        ''
      ].join('\n'),
      'src/worker.ts': [
        "import type { SQSEvent } from 'aws-lambda';",
        'export default async ({ Records }: SQSEvent) => { void Records; };',
        ''
      ].join('\n'),
      'src/thumbnails.ts': [
        "import type { S3Handler } from 'aws-lambda';",
        'export const handler: S3Handler = async () => {};',
        ''
      ].join('\n'),
      'src/report.ts': [
        "import type { Handler, ScheduledEvent } from 'aws-lambda';",
        "// Deployed with schedule 'rate(2 hours)'.",
        'export const handler: Handler<ScheduledEvent> = async () => {};',
        ''
      ].join('\n'),
      'src/stream.ts': [
        "import type { DynamoDBStreamHandler } from 'aws-lambda';",
        'export const handler: DynamoDBStreamHandler = async () => {};',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const triggers = Object.fromEntries(
      (output.services ?? []).map((service) => [service.functionEntrypoint, service.functionTriggers])
    );

    // Two HTTP handlers cannot both take the catch-all route on one API, so neither gets it.
    expect(triggers).toEqual({
      'src/api.ts': [{ type: 'unmapped', sourceType: UNROUTED_HTTP_SOURCE }],
      'src/legacy.ts': [{ type: 'unmapped', sourceType: UNROUTED_HTTP_SOURCE }],
      'src/worker.ts': [{ type: 'queue', dependencyName: 'jobQueue' }],
      'src/thumbnails.ts': [{ type: 'object-storage', dependencyName: 'storageBucket' }],
      'src/report.ts': [{ type: 'schedule', rate: 'rate(2 hours)' }],
      'src/stream.ts': [{ type: 'unmapped', sourceType: 'a DynamoDB stream' }]
    });
    // A trigger names a queue and a bucket, so both exist for the merge to fold into.
    expect((output.dependencies ?? []).map((dependency) => dependency.kind).toSorted()).toEqual([
      'object-storage',
      'queue'
    ]);
  });

  it('asks how often a scheduled handler runs when the code states no rate', async () => {
    const repo = await makeRepo({
      'src/prune.ts': [
        "import type { ScheduledHandler } from 'aws-lambda';",
        'export const handler: ScheduledHandler = async () => {};',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services?.[0]?.functionTriggers).toEqual([]);
    expect(output.uncertainties?.map((uncertainty) => uncertainty.kind)).toEqual(['schedule-unknown']);
  });

  it('ignores aws-lambda types outside a handler export, and tests', async () => {
    const repo = await makeRepo({
      // An adapter that only mentions the type is not a function.
      'src/server.ts': [
        "import express from 'express';",
        "import type { APIGatewayProxyEventV2 } from 'aws-lambda';",
        'export const toRequest = (event: APIGatewayProxyEventV2) => event.rawPath;',
        'export default express();',
        ''
      ].join('\n'),
      'src/api.test.ts': [
        "import type { SQSEvent } from 'aws-lambda';",
        'export default async (event: SQSEvent) => event;',
        ''
      ].join('\n'),
      // Same type name, but not the aws-lambda one.
      'src/events.ts': 'type SQSEvent = { id: string };\nexport default (event: SQSEvent) => event.id;\n'
    });
    root = repo.root;

    expect(await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files))).toEqual({});
  });

  it.each([
    ['APIGatewayProxyEventV2', '2.0'],
    ['APIGatewayProxyEvent', '1.0']
  ] as const)(
    'gives a lone %s handler the catch-all route with payload format %s',
    async (eventType, payloadFormat) => {
      const repo = await makeRepo({
        'src/api.ts': [
          `import type { ${eventType} } from 'aws-lambda';`,
          `export default async (event: ${eventType}) => ({ statusCode: 200 });`,
          ''
        ].join('\n')
      });
      root = repo.root;

      const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

      expect(output.services?.[0]?.functionTriggers).toEqual([
        { type: 'http', method: '*', path: '/{proxy+}', payloadFormat }
      ]);
    }
  );

  it('ignores handler wrappers and generated or library directories', async () => {
    const typed = [
      "import type { SQSEvent } from 'aws-lambda';",
      'export default async (event: SQSEvent) => event;',
      ''
    ].join('\n');
    const repo = await makeRepo({
      // Takes a handler and returns one: middleware, not a function.
      'src/with-auth.ts': [
        "import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';",
        'export default (handler: APIGatewayProxyHandlerV2): APIGatewayProxyHandlerV2 => async (event, context) => handler(event, context);',
        ''
      ].join('\n'),
      'lib/worker.ts': typed,
      '.sst/artifacts/worker.ts': typed,
      'cdk.out/asset/worker.ts': typed,
      '.aws-sam/build/worker.ts': typed
    });
    root = repo.root;

    expect(await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files))).toEqual({});
  });

  // Untyped handlers, which include every Python handler, have only the fields they read to say what invokes them.
  it.each([
    [
      'api/main.py',
      "def handler(event, context):\n    method = event['requestContext']['http']['method']\n",
      { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }
    ],
    [
      'api/main.py',
      "def handler(event, context):\n    http = event.get('requestContext', {}).get('http', {})\n",
      { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }
    ],
    [
      'src/api.js',
      'export const handler = async (event) => ({ statusCode: 200, body: event.rawPath });\n',
      { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }
    ],
    [
      'legacy/app.py',
      "def lambda_handler(event, context):\n    if event['httpMethod'] == 'GET':\n        return {}\n",
      { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '1.0' }
    ],
    [
      'notify/main.py',
      "def handler(event, context):\n    for record in event['Records']:\n        print(record['Sns']['Message'])\n",
      { type: 'topic', dependencyName: 'notificationsTopic' }
    ],
    [
      'resize/main.py',
      "def handler(event, context):\n    key = event['Records'][0]['s3']['object']['key']\n",
      { type: 'object-storage', dependencyName: 'storageBucket' }
    ],
    [
      'jobs/main.py',
      "import json\n\ndef handler(event, context):\n    for record in event['Records']:\n        job = json.loads(record['body'])\n",
      { type: 'queue', dependencyName: 'jobQueue' }
    ],
    // An S3 notification delivered through a queue: the queue invokes the function.
    [
      'src/ingest.ts',
      'export const handler = async (event: any) => {\n  for (const record of event.Records) {\n    const { Records } = JSON.parse(record.body);\n    console.log(Records[0].s3.object.key);\n  }\n};\n',
      { type: 'queue', dependencyName: 'jobQueue' }
    ],
    [
      'cleanup/main.py',
      "SCHEDULE = 'rate(5 minutes)'\n\ndef handler(event, context):\n    pass\n",
      { type: 'schedule', rate: 'rate(5 minutes)' }
    ]
  ] as const)('infers the trigger of an untyped %s', async (path, contents, trigger) => {
    const repo = await makeRepo({ [path]: contents });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services?.map((service) => [service.functionEntrypoint, service.functionTriggers])).toEqual([
      [path, [trigger]]
    ]);
  });

  it('names a Python function after its directory and keeps an AWS-style handler name', async () => {
    const repo = await makeRepo({
      'api/main.py': "def lambda_handler(event, context):\n    return event['rawPath']\n"
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services?.[0]).toMatchObject({ name: 'api', language: 'python', functionHandler: 'lambda_handler' });
  });

  it('takes an untyped export outside a handlers directory only with an event signature or event fields', async () => {
    const repo = await makeRepo({
      // `(event, context)` is the Lambda signature even when the code reads no event field.
      'worker/run.py': 'def handler(event, context):\n    return None\n',
      // Not functions: a request handler, an export reading nothing an event source sends, a schedule literal on a
      // plain module, and a wrapper.
      'src/routes.ts': 'export const handler = (req: any, res: any) => res.json(req.httpMethod);\n',
      'src/format.ts': 'export const handler = async (event: { id: string }) => event.id;\n',
      'src/jobs.ts': "export const schedule = 'rate(1 day)';\nexport default async (event: unknown) => event;\n",
      'src/with-logging.ts':
        'export default (handler: any) => async (event: any, context: any) => handler(event, context);\n',
      'web/server.py': 'def handler(request):\n    return request\n'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services?.map((service) => [service.functionEntrypoint, service.functionTriggers])).toEqual([
      ['worker/run.py', []]
    ]);
  });
});
