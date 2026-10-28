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
import { DIRECT_INVOCATION_SOURCE, UNROUTED_HTTP_SOURCE } from '../../facts/service';
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

const typedHandler = (body: string) => `import type { APIGatewayProxyEventV2 } from 'aws-lambda';\n${body}\n`;
/** A Go main package handing `handler`, which takes `event`, to the Lambda runtime. */
const goHandler = (event: string) =>
  `package main\n\nimport (\n  "context"\n  "github.com/aws/aws-lambda-go/events"\n  "github.com/aws/aws-lambda-go/lambda"\n)\n\nfunc handler(ctx context.Context, event ${event}) (string, error) { return "", nil }\n\nfunc main() { lambda.Start(handler) }\n`;

const catchAll = (pathParameters?: string[]) => ({
  method: '*',
  path: '/{proxy+}',
  ...(pathParameters === undefined ? {} : { pathParameters })
});

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
      // It reads no image, so the stream keeps both.
      'src/stream.ts': [{ type: 'dynamodb-stream', dependencyName: 'mainTable', streamType: 'NEW_AND_OLD_IMAGES' }]
    });
    // A trigger names a queue, a bucket and a table, so they exist for the merge to fold into.
    expect((output.dependencies ?? []).map((dependency) => dependency.kind).toSorted()).toEqual([
      'dynamodb',
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
    // A `.body` that is not a record's (a fetch response) does not make an SNS or S3 handler an SQS consumer.
    [
      'src/notify.ts',
      "export const handler = async (event: any) => {\n  for (const record of event.Records) {\n    const res = await fetch('https://example.com', { method: 'POST', body: record.Sns.Message });\n    console.log(res.body);\n  }\n};\n",
      { type: 'topic', dependencyName: 'notificationsTopic' }
    ],
    [
      'src/resize.js',
      'export const handler = async (event) => {\n  const res = await fetch(event.Records[0].s3.object.key);\n  return res.body;\n};\n',
      { type: 'object-storage', dependencyName: 'storageBucket' }
    ],
    [
      'src/consume.js',
      'export const handler = async (event) => event.Records.map((message) => JSON.parse(message.body));\n',
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

  it('takes an untyped export outside a handlers directory only with an event signature or event fields, and no rate it creates', async () => {
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
      'web/server.py': 'def handler(request):\n    return request\n',
      // The rate belongs to the schedules this function creates, not to the function.
      'functions/remind.ts': [
        "import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';",
        'export const handler = async () =>',
        "  new SchedulerClient({}).send(new CreateScheduleCommand({ Name: 'r', ScheduleExpression: 'rate(1 day)' } as never));",
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services?.map((service) => [service.functionEntrypoint, service.functionTriggers])).toEqual([
      ['functions/remind.ts', []],
      ['worker/run.py', []]
    ]);
  });

  it('reads typed TypeScript handlers however many Python files the repository has', async () => {
    const files: Record<string, string> = {
      'src/api.ts': [
        "import type { APIGatewayProxyEventV2 } from 'aws-lambda';",
        'export default async (event: APIGatewayProxyEventV2) => ({ statusCode: 200, body: event.rawPath });',
        ''
      ].join('\n')
    };
    // Listed before `src/`, and more than the per-language bound.
    for (let index = 0; index < 450; index += 1) files[`analysis/module_${index}.py`] = 'VALUE = 1\n';
    const repo = await makeRepo(files);
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files.toSorted()));

    expect(output.services?.map((service) => service.functionEntrypoint)).toEqual(['src/api.ts']);
  });

  it('serves the WebSocket routes a handler compares its route key against', async () => {
    const repo = await makeRepo({
      // `$default` for the branch every other message takes.
      'functions/ws.ts': [
        "import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';",
        'export default async (event: APIGatewayProxyWebsocketEventV2) => {',
        '  const { routeKey, connectionId } = event.requestContext;',
        "  if (routeKey === '$connect') await save(connectionId);",
        "  else if (routeKey === '$disconnect') await forget(connectionId);",
        '  else console.log(event.body);',
        '  return { statusCode: 200 };',
        '};',
        ''
      ].join('\n'),
      'src/chat.ts': [
        "import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';",
        'export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {',
        '  switch (event.requestContext.routeKey) {',
        "    case 'sendMessage':",
        '      return { statusCode: 200 };',
        "    case 'join':",
        '      return { statusCode: 200 };',
        '  }',
        '  return { statusCode: 400 };',
        '};',
        ''
      ].join('\n'),
      // Untyped: `connectionId` and a lifecycle route are only on a WebSocket event.
      'functions/relay.py': [
        'def handler(event, context):',
        "    route_key = event['requestContext']['routeKey']",
        "    connection = event['requestContext']['connectionId']",
        "    if route_key == '$connect':",
        '        save(connection)',
        "    return {'statusCode': 200}",
        ''
      ].join('\n'),
      'functions/presence.js': [
        'exports.handler = async (event) => {',
        '  const { eventType, connectionId } = event.requestContext;',
        "  if (eventType === 'CONNECT') await join(connectionId);",
        "  if (eventType === 'DISCONNECT') await leave(connectionId);",
        '};',
        ''
      ].join('\n'),
      // An HTTP API route that posts to WebSocket connections: `routeKey` is `POST /broadcast`, not a WebSocket route.
      'functions/broadcast.js': [
        'exports.handler = async (event) => {',
        "  if (event.requestContext.http.method !== 'POST' || event.routeKey !== 'POST /broadcast') return { statusCode: 404 };",
        '  for (const c of await connections()) await post(c.connectionId, event.body);',
        '  return { statusCode: 200 };',
        '};',
        ''
      ].join('\n'),
      // No lifecycle route and no event type: nothing says this is a WebSocket route.
      'functions/audit.py': [
        'def handler(event, context):',
        "    log(event['requestContext']['routeKey'], event['requestContext']['connectionId'])",
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const triggers = Object.fromEntries(
      (output.services ?? []).map((service) => [service.functionEntrypoint, service.functionTriggers])
    );

    expect(triggers).toEqual({
      'functions/ws.ts': [
        { type: 'websocket', dependencyName: 'websocketApi', routeKeys: ['$connect', '$disconnect', '$default'] }
      ],
      'src/chat.ts': [{ type: 'websocket', dependencyName: 'websocketApi', routeKeys: ['sendMessage', 'join'] }],
      'functions/relay.py': [{ type: 'websocket', dependencyName: 'websocketApi', routeKeys: ['$connect'] }],
      'functions/presence.js': [
        { type: 'websocket', dependencyName: 'websocketApi', routeKeys: ['$connect', '$disconnect'] }
      ],
      // The route it compares `routeKey` with is the only one it serves.
      'functions/broadcast.js': [{ type: 'http', method: 'POST', path: '/broadcast', payloadFormat: '2.0' }],
      'functions/audit.py': []
    });
    expect(output.dependencies?.map((dependency) => [dependency.name, dependency.kind])).toEqual([
      ['websocketApi', 'websocket-api']
    ]);
  });

  it('reads a DynamoDB stream handler from the records it reads, with the images it needs', async () => {
    const repo = await makeRepo({
      'functions/audit.js': [
        'exports.handler = async (event) => {',
        '  for (const record of event.Records) console.log(record.dynamodb.OldImage);',
        '};',
        ''
      ].join('\n'),
      'functions/index_orders.py': [
        'def handler(event, context):',
        "    for record in event['Records']:",
        "        index(record['dynamodb']['NewImage'])",
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services?.map((service) => [service.functionEntrypoint, service.functionTriggers])).toEqual([
      ['functions/audit.js', [{ type: 'dynamodb-stream', dependencyName: 'mainTable', streamType: 'OLD_IMAGE' }]],
      ['functions/index_orders.py', [{ type: 'dynamodb-stream', dependencyName: 'mainTable', streamType: 'NEW_IMAGE' }]]
    ]);
  });

  it('subscribes an EventBridge handler to the bus that code in the repository publishes its detail type to', async () => {
    const repo = await makeRepo({
      'functions/notify.ts': [
        "import type { EventBridgeEvent } from 'aws-lambda';",
        "export default async (event: EventBridgeEvent<'OrderCreated', { id: string }>) => event.detail.id;",
        ''
      ].join('\n'),
      // Nothing here publishes `InvoicePaid`: the events come from somewhere init cannot see.
      'functions/invoice.ts': [
        "import type { EventBridgeHandler } from 'aws-lambda';",
        "export const handler: EventBridgeHandler<'InvoicePaid', unknown, void> = async () => {};",
        ''
      ].join('\n'),
      'src/orders.ts': [
        "import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';",
        "import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';",
        // Another call's `Source` is not the events' source.
        "export const confirm = (to: string) => new SESClient({}).send(new SendEmailCommand({ Source: 'noreply@shop.test', Destination: { ToAddresses: [to] } } as never));",
        'const busName = process.env.ORDER_EVENTS;',
        'export const announce = (id: string) =>',
        '  new EventBridgeClient({}).send(',
        "    new PutEventsCommand({ Entries: [{ EventBusName: busName, Source: 'shop.orders', DetailType: 'OrderCreated', Detail: id }] })",
        '  );',
        ''
      ].join('\n'),
      // A source the code computes is unknown, so the rule matches the detail type alone.
      'functions/refund.ts': [
        "import type { EventBridgeEvent } from 'aws-lambda';",
        "export default async (event: EventBridgeEvent<'OrderRefunded', { id: string }>) => event.detail.id;",
        ''
      ].join('\n'),
      'src/refunds.ts': [
        "import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';",
        'const SOURCE = `shop.${process.env.STAGE}`;',
        'export const refund = (id: string) =>',
        "  new EventBridgeClient({}).send(new PutEventsCommand({ Entries: [{ EventBusName: process.env.ORDER_EVENTS, Source: SOURCE, DetailType: 'OrderRefunded', Detail: id }] }));",
        ''
      ].join('\n'),
      // Python on both sides, through `event['detail-type']`.
      'functions/ship.py': [
        'def handler(event, context):',
        "    if event['detail-type'] == 'OrderPaid':",
        "        ship(event['detail'])",
        ''
      ].join('\n'),
      'billing/pay.py': [
        'import os, boto3',
        'def pay(order):',
        "    boto3.client('events').put_events(Entries=[{",
        "        'EventBusName': os.environ['ORDER_EVENTS'],",
        "        'Source': 'shop.billing',",
        "        'DetailType': 'OrderPaid',",
        "        'Detail': order,",
        '    }])',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const triggers = Object.fromEntries(
      (output.services ?? []).map((service) => [service.functionEntrypoint, service.functionTriggers])
    );

    expect(triggers).toEqual({
      'functions/notify.ts': [
        { type: 'event-bus', dependencyName: 'eventBus', detailTypes: ['OrderCreated'], sources: ['shop.orders'] }
      ],
      'functions/invoice.ts': [{ type: 'unmapped', sourceType: 'an EventBridge rule' }],
      'functions/refund.ts': [{ type: 'event-bus', dependencyName: 'eventBus', detailTypes: ['OrderRefunded'] }],
      'functions/ship.py': [
        { type: 'event-bus', dependencyName: 'eventBus', detailTypes: ['OrderPaid'], sources: ['shop.billing'] }
      ]
    });
    // The bus is the one the publishers read from `ORDER_EVENTS`, so that variable gets its address.
    expect(output.dependencies).toMatchObject([{ name: 'eventBus', kind: 'event-bus', addressedBy: ['ORDER_EVENTS'] }]);
  });

  it('gives a handler written for its own function URL that URL, not a route on an HTTP API', async () => {
    const repo = await makeRepo({
      'functions/stats.ts': [
        "import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';",
        'export default async (_event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => ({ statusCode: 200 });',
        ''
      ].join('\n'),
      'functions/report.py': [
        'from aws_lambda_powertools.utilities.data_classes import LambdaFunctionUrlEvent, event_source',
        '',
        '@event_source(data_class=LambdaFunctionUrlEvent)',
        'def handler(event, context):',
        '    return {"statusCode": 200, "body": event.raw_path}',
        ''
      ].join('\n'),
      // The one HTTP API handler still takes the catch-all route: a function URL is not a second HTTP handler.
      'functions/api.ts': [
        "import type { APIGatewayProxyEventV2 } from 'aws-lambda';",
        'export default async (event: APIGatewayProxyEventV2) => ({ statusCode: 200, body: event.rawPath });',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const triggers = Object.fromEntries(
      (output.services ?? []).map((service) => [service.functionEntrypoint, service.functionTriggers])
    );

    expect(triggers).toEqual({
      'functions/stats.ts': [{ type: 'url' }],
      'functions/report.py': [{ type: 'url' }],
      'functions/api.ts': [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }]
    });
  });

  it("reads a Python job's schedule from its module docstring", async () => {
    const repo = await makeRepo({
      'workers/cleanup.py': [
        '"""Expires receipts stuck in `uploaded`.',
        '',
        'Schedule: rate(1 minute)',
        '"""',
        'def handler(event, context):',
        '    pass',
        ''
      ].join('\n'),
      // A rate in prose is not a statement of the schedule.
      'workers/digest.py': [
        '"""Sends the digest. It ran on rate(1 hour) before the move to the queue."""',
        'def handler(event, context):',
        '    pass',
        ''
      ].join('\n'),
      // A rate in a comment further down is not the module's statement.
      'workers/report.py': [
        '"""Builds the nightly report."""',
        '# Ran as rate(5 minutes) before the move.',
        'def handler(event, context):',
        '    pass',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const triggers = Object.fromEntries(
      (output.services ?? []).map((service) => [service.functionEntrypoint, service.functionTriggers])
    );

    expect(triggers).toEqual({
      'workers/cleanup.py': [{ type: 'schedule', rate: 'rate(1 minute)' }],
      'workers/digest.py': [],
      'workers/report.py': []
    });
  });

  const approvalWorkflow = {
    'api/main.py': [
      'import json, os',
      'import boto3',
      'sfn = boto3.client("stepfunctions")',
      'def approve(receipt_id, amount):',
      '    sfn.start_execution(',
      '        stateMachineArn=os.environ["APPROVAL_WORKFLOW_ARN"],',
      '        input=json.dumps({"receiptId": receipt_id, "amount": amount}),',
      '    )',
      ''
    ].join('\n'),
    'functions/score.ts': [
      'type ScoreInput = { receiptId: string; amount: number };',
      'export default async (input: ScoreInput) => {',
      '  const approved = input.amount <= 500;',
      "  return { ...input, approved, note: approved ? 'auto' : 'manager' };",
      '};',
      ''
    ].join('\n'),
    'workers/mark_decision.py': [
      'def handler(event, context):',
      '    status = "approved" if event["approved"] else "rejected"',
      '    print(event["receiptId"], event["note"], status)',
      '    return {"receiptId": event["receiptId"], "status": status}',
      ''
    ].join('\n')
  };

  it('creates the state machine code starts, with Task states in the order the data flows', async () => {
    const repo = await makeRepo(approvalWorkflow);
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    // The default export in `functions/` has no Lambda signature; it is a function because the workflow runs it.
    expect((output.services ?? []).map((service) => [service.name, service.functionTriggers])).toEqual([
      ['mark_decision', []],
      ['score', []]
    ]);
    expect(output.dependencies).toEqual([
      expect.objectContaining({
        name: 'approvalWorkflow',
        kind: 'state-machine',
        addressedBy: ['APPROVAL_WORKFLOW_ARN'],
        // `score` reads what the execution starts with; `mark_decision` reads `approved` and `note`, which only
        // `score` returns.
        workflowSteps: ['score', 'mark_decision']
      })
    ]);
  });

  it('leaves the states to the user when the data flow does not order the functions', async () => {
    const repo = await makeRepo({
      ...approvalWorkflow,
      // Reads only what the execution starts with, like `score`: either could run first.
      'functions/audit.ts': [
        'export default async (input: { receiptId: string }) => {',
        '  console.log(input.receiptId);',
        '  return { audited: true };',
        '};',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.dependencies).toEqual([
      expect.objectContaining({
        name: 'approvalWorkflow',
        kind: 'state-machine',
        addressedBy: ['APPROVAL_WORKFLOW_ARN']
      })
    ]);
    expect(output.dependencies![0]!.workflowSteps).toBeUndefined();
    // Neither default export has a Lambda signature, and no workflow runs them, so neither is a function.
    expect((output.services ?? []).map((service) => service.name)).toEqual(['mark_decision']);
  });

  // #368 review: an async default export in a functions directory is not a Lambda handler by itself.
  it('takes no frontend helper or Netlify function under a functions directory for a Lambda handler', async () => {
    const repo = await makeRepo({
      'package.json': JSON.stringify({ name: 'shop', dependencies: { react: '^19.0.0' } }),
      'src/functions/fetchUser.ts': [
        'export default async (id: string) => {',
        '  const response = await fetch(`/api/users/${id}`);',
        '  return response.json();',
        '};',
        ''
      ].join('\n'),
      'netlify/functions/hello.mts': [
        "import type { Context } from '@netlify/functions';",
        'export default async (req: Request, context: Context) => new Response(`hello ${context.geo.city}`);',
        ''
      ].join('\n'),
      // Even beside a workflow whose input it would accept, a Netlify function is never one of its steps.
      'api/start.ts': [
        "import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';",
        'const sfn = new SFNClient({});',
        'export const start = (id: string) =>',
        '  sfn.send(new StartExecutionCommand({ stateMachineArn: process.env.USER_WORKFLOW_ARN, input: JSON.stringify({ id }) }));',
        ''
      ].join('\n'),
      'functions/greet.ts': [
        "import type { Context } from '@netlify/functions';",
        'export default async (req: Request, context: Context) => new Response(String(req.url));',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services ?? []).toEqual([]);
    expect(output.dependencies).toEqual([expect.objectContaining({ name: 'userWorkflow', kind: 'state-machine' })]);
    expect(output.dependencies![0]!.workflowSteps).toBeUndefined();
  });

  it('never makes a function the code invokes directly a step of the workflow it starts', async () => {
    const repo = await makeRepo({
      'api/orders.ts': [
        "import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';",
        "import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';",
        'const sfn = new SFNClient({});',
        'const lambda = new LambdaClient({});',
        'export const placeOrder = async (orderId: string) => {',
        '  await sfn.send(new StartExecutionCommand({ stateMachineArn: process.env.ORDER_WORKFLOW_ARN, input: JSON.stringify({ orderId }) }));',
        '  await lambda.send(new InvokeCommand({ FunctionName: process.env.SEND_EMAIL_FUNCTION_NAME, Payload: JSON.stringify({ orderId }) }));',
        '};',
        ''
      ].join('\n'),
      // Reads exactly what the execution starts with, so the data flow alone would make it the workflow's only state.
      'functions/send-email.ts': [
        'export default async (input: { orderId: string }) => {',
        '  console.log(`emailing about ${input.orderId}`);',
        '  return { sent: true };',
        '};',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect((output.services ?? []).map((service) => [service.name, service.functionTriggers])).toEqual([
      ['send-email', [{ type: 'unmapped', sourceType: DIRECT_INVOCATION_SOURCE }]]
    ]);
    expect(output.dependencies).toEqual([expect.objectContaining({ name: 'orderWorkflow', kind: 'state-machine' })]);
    expect(output.dependencies![0]!.workflowSteps).toBeUndefined();
  });

  it('trusts no step order when the code invokes a function it does not name', async () => {
    const repo = await makeRepo({
      ...approvalWorkflow,
      'api/notify.py': [
        'import boto3',
        'client = boto3.client("lambda")',
        'def notify(target):',
        '    client.invoke(FunctionName=target, InvocationType="Event")',
        ''
      ].join('\n')
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.dependencies).toEqual([expect.objectContaining({ name: 'approvalWorkflow', kind: 'state-machine' })]);
    expect(output.dependencies![0]!.workflowSteps).toBeUndefined();
  });

  // The r2gg dogfood (28 Oct 2026): a Maven function with no Lambda config got no resource and no warning.
  it('reads Java and .NET handlers with the handler name the runtime calls, and reports the ones it cannot map', async () => {
    const repo = await makeRepo({
      'functions/tax/pom.xml':
        '<project><properties><maven.compiler.release>21</maven.compiler.release></properties></project>\n',
      'functions/tax/src/main/java/shelf/TaxHandler.java': [
        'package shelf;',
        'import com.amazonaws.services.lambda.runtime.RequestHandler;',
        'public class TaxHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {',
        '  public Map<String, Object> handleRequest(Map<String, Object> input, Context context) { return input; }',
        '}',
        ''
      ].join('\n'),
      'workers/build.gradle.kts': 'java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }\n',
      'workers/src/main/java/com/acme/Resize.java': [
        'package com.acme;',
        'public class Resize implements RequestHandler<SQSEvent, Void> {',
        '  public Void handleRequest(SQSEvent event, Context context) { return null; }',
        '}',
        ''
      ].join('\n'),
      'dotnet/Orders/Orders.csproj':
        '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework><AssemblyName>OrdersFn</AssemblyName></PropertyGroup></Project>\n',
      'dotnet/Orders/Function.cs': [
        'using Amazon.Lambda.Core;',
        'namespace Acme.Orders;',
        'public class Function',
        '{',
        '    public async Task<APIGatewayHttpApiV2ProxyResponse> FunctionHandler(APIGatewayHttpApiV2ProxyRequest request, ILambdaContext context)',
        '    {',
        '        var id = request.PathParameters["id"];',
        '        return new APIGatewayHttpApiV2ProxyResponse { StatusCode = 200 };',
        '    }',
        '}',
        ''
      ].join('\n'),
      // No Maven or Gradle build to compile it, and languages init does not package.
      'loose/Handler.java': 'public class Handler implements RequestStreamHandler { }\n',
      'go/main.go': 'package main\nfunc main() { lambda.Start(handle) }\n',
      'ruby/app.rb': 'def handler(event:, context:)\n  { statusCode: 200 }\nend\n'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(
      (output.services ?? []).map((service) => ({
        name: service.name,
        path: service.path,
        language: service.language,
        runtimeVersion: service.runtimeVersion,
        functionHandler: service.functionHandler,
        functionTriggers: service.functionTriggers
      }))
    ).toEqual([
      {
        name: 'tax',
        path: 'functions/tax',
        language: 'java',
        runtimeVersion: '21',
        functionHandler: 'TaxHandler::handleRequest',
        functionTriggers: []
      },
      {
        name: 'workers',
        path: 'workers',
        language: 'java',
        runtimeVersion: '17',
        functionHandler: 'Resize::handleRequest',
        functionTriggers: [{ type: 'queue', dependencyName: 'jobQueue' }]
      },
      {
        name: 'Orders',
        path: 'dotnet/Orders',
        language: 'dotnet',
        runtimeVersion: '8',
        functionHandler: 'OrdersFn::Acme.Orders.Function::FunctionHandler',
        // The only HTTP handler, with no stated route: the catch-all, and the parameter it reads for the gap.
        functionTriggers: [
          { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0', pathParameters: ['id'] }
        ]
      }
    ]);
    expect(output.handlerFindings).toEqual([
      // Stacktape would load `acme.Resize::handleRequest` for a class in `com.acme`.
      {
        path: 'workers/src/main/java/com/acme/Resize.java',
        language: 'Java',
        reason: 'java-package',
        packageName: 'com.acme'
      },
      { path: 'loose/Handler.java', language: 'Java', reason: 'no-build-file' },
      // The Go buildpack builds a module; without a go.mod there is nothing to build.
      { path: 'go/main.go', language: 'Go', reason: 'no-build-file' },
      { path: 'ruby/app.rb', language: 'Ruby', reason: 'unsupported-language' }
    ]);
  });

  it('turns a Go main package calling lambda.Start into a function, triggered by the event type it takes', async () => {
    const repo = await makeRepo({
      'functions/ping/go.mod': 'module r2/ping\n\ngo 1.24\n',
      'functions/ping/main.go': goHandler('events.APIGatewayV2HTTPRequest'),
      // One module at the root with two commands: each main package is its own function.
      'go.mod': 'module r2\n\ngo 1.24\n',
      'cmd/resize/main.go': goHandler('events.SQSEvent'),
      'cmd/cleanup/main.go': goHandler('events.CloudWatchEvent'),
      // A wrapped handler says nothing about its event.
      'cmd/wrapped/main.go':
        'package main\n\nfunc main() { lambda.Start(otelaws.WrapHandler(handler)) }\nfunc handler(ctx context.Context, event events.SQSEvent) error { return nil }\n',
      // A library calling lambda.Start in a package other than main is not a program, and vendored code and tests do
      // not deploy.
      'internal/runner/runner.go': 'package runner\n\nfunc Run() { lambda.Start(handle) }\n',
      'vendor/example.com/tool/main.go': goHandler('events.SQSEvent'),
      'cmd/resize/main_test.go': goHandler('events.SQSEvent'),
      // Named after its file, like any handler outside a module of its own.
      'lambdas/thumbnail.go': goHandler('events.S3Event'),
      // A command whose docs show a Lambda example in comments is not a Lambda handler.
      'cmd/server/main.go':
        'package main\n\n// To run this on Lambda instead:\n//   lambda.Start(handler)\n/* or lambda.StartWithOptions(func(ctx context.Context, e events.APIGatewayV2HTTPRequest) {}) */\nfunc main() { fmt.Println("// lambda.Start(x) is only text") ; http.ListenAndServe(":8080", nil) }\n'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(
      (output.services ?? [])
        .map((service) => ({
          name: service.name,
          path: service.path,
          language: service.language,
          functionEntrypoint: service.functionEntrypoint,
          functionHandler: service.functionHandler,
          functionTriggers: service.functionTriggers
        }))
        .toSorted((left, right) => left.name.localeCompare(right.name))
    ).toEqual([
      {
        name: 'cleanup',
        path: 'cmd/cleanup',
        language: 'go',
        functionEntrypoint: 'cmd/cleanup/main.go',
        functionHandler: undefined,
        // A CloudWatch event is a schedule or an EventBridge rule; composition asks for the trigger.
        functionTriggers: []
      },
      {
        name: 'ping',
        path: 'functions/ping',
        language: 'go',
        functionEntrypoint: 'functions/ping/main.go',
        functionHandler: undefined,
        // The only HTTP handler, and it does not route: every request reaches it.
        functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }]
      },
      {
        name: 'resize',
        path: 'cmd/resize',
        language: 'go',
        functionEntrypoint: 'cmd/resize/main.go',
        functionHandler: undefined,
        functionTriggers: [{ type: 'queue', dependencyName: 'jobQueue' }]
      },
      {
        name: 'thumbnail',
        path: 'lambdas',
        language: 'go',
        functionEntrypoint: 'lambdas/thumbnail.go',
        functionHandler: undefined,
        functionTriggers: [{ type: 'object-storage', dependencyName: 'storageBucket' }]
      },
      {
        name: 'wrapped',
        path: 'cmd/wrapped',
        language: 'go',
        functionEntrypoint: 'cmd/wrapped/main.go',
        functionHandler: undefined,
        functionTriggers: []
      }
    ]);
    expect(output.handlerFindings).toBeUndefined();
  });

  it('routes an HTTP handler only where its code or comment leaves no doubt, and falls back to the catch-all', async () => {
    const cases: Array<{ name: string; file: string; source: string; route: Record<string, unknown> }> = [
      {
        name: 'a comment route holding the parameter it reads; no guard, so every method',
        file: 'functions/quote/src/handler.ts',
        source: typedHandler(
          '// GET /quote/{sku}?quantity=12 -> price\nexport const handler = async (event: APIGatewayProxyEventV2) => event.pathParameters?.sku;'
        ),
        route: { method: '*', path: '/quote/{sku}' }
      },
      {
        name: 'a guard that turns other methods away pins the method',
        file: 'functions/users.ts',
        source: typedHandler(
          "// GET /users/{id}\nexport const handler = async (event: APIGatewayProxyEventV2) => {\n  if (event.requestContext.http.method !== 'GET') {\n    return { statusCode: 405 };\n  }\n  const { id } = event.pathParameters ?? {};\n  return id;\n};"
        ),
        route: { method: 'GET', path: '/users/{id}' }
      },
      {
        name: 'a CORS branch is one method of several',
        file: 'functions/quote.ts',
        source: typedHandler(
          "// GET /quote/{sku}\nexport const handler = async (event: APIGatewayProxyEventV2) => {\n  if (event.requestContext.http.method === 'OPTIONS') return { statusCode: 204 };\n  return event.pathParameters?.sku;\n};"
        ),
        route: { method: '*', path: '/quote/{sku}' }
      },
      {
        name: 'a POST branch with an else serves both',
        file: 'functions/items.ts',
        source: typedHandler(
          "// /items/{id}: GET /items/{id} loads, POST /items/{id} saves\nexport const handler = async (event: APIGatewayProxyEventV2) => {\n  if (event.requestContext.http.method === 'POST') save(event.pathParameters?.id); else load(event.pathParameters?.id);\n};"
        ),
        route: { method: '*', path: '/items/{id}' }
      },
      {
        name: 'a router on rawPath keeps the catch-all whatever its comments say',
        file: 'functions/api.ts',
        source: typedHandler(
          "// GET /health is used by the uptime check\nexport const handler = async (event: APIGatewayProxyEventV2) => {\n  if (event.rawPath === '/health') return { statusCode: 200 };\n  return order(event.pathParameters?.id);\n};"
        ),
        route: catchAll(['id'])
      },
      {
        name: 'a curl example in a comment states nothing about a handler that reads no parameter',
        file: 'functions/orders.ts',
        source: typedHandler(
          '// Try it: curl -X POST /orders\nexport const handler = async (event: APIGatewayProxyEventV2) => ({ statusCode: 201, body: event.body });'
        ),
        route: catchAll()
      },
      {
        name: 'a file name is no route',
        file: 'functions/getUser.ts',
        source: typedHandler(
          'export const handler = async (event: APIGatewayProxyEventV2) => event.pathParameters?.id;'
        ),
        route: catchAll(['id'])
      },
      {
        name: 'a proxy parameter routes on its own',
        file: 'functions/api.ts',
        source: typedHandler(
          'export const handler = async (event: APIGatewayProxyEventV2) => route(event.pathParameters?.proxy);'
        ),
        route: catchAll()
      },
      {
        name: 'a Python guard and a docstring route',
        file: 'functions/orders.py',
        source:
          "\"\"\"DELETE /orders/{orderId}\"\"\"\ndef handler(event, context):\n    if event['httpMethod'] != 'DELETE':\n        return {'statusCode': 405}\n    order_id = event['pathParameters']['orderId']\n    return {'statusCode': 200, 'body': order_id}\n",
        route: { method: 'DELETE', path: '/orders/{orderId}' }
      },
      {
        name: 'a handler comparing the request path routes on its own',
        file: 'src/api.js',
        source:
          "export const handler = async (event, context) => {\n  if (event.httpMethod === 'POST' && event.path === '/orders') return create(event);\n  return get(event.pathParameters?.id);\n};\n",
        route: catchAll(['id'])
      }
    ];
    for (const { name, file, source, route } of cases) {
      // oxlint-disable-next-line no-await-in-loop -- one repository per case.
      const repo = await makeRepo({ [file]: source });
      // oxlint-disable-next-line no-await-in-loop -- one repository per case.
      const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
      // oxlint-disable-next-line no-await-in-loop -- one repository per case.
      await rm(repo.root, { recursive: true, force: true });
      const [trigger] = output.services?.[0]?.functionTriggers ?? [];
      const { payloadFormat: _payloadFormat, ...observed } = (trigger ?? {}) as Record<string, unknown>;
      expect([name, observed]).toEqual([name, { type: 'http', ...route }]);
    }
  });

  it('routes one of several HTTP handlers only from the route its source states', async () => {
    const repo = await makeRepo({
      'functions/quote.ts':
        "import type { APIGatewayProxyEventV2 } from 'aws-lambda';\n// GET /quote/{sku}\nexport const handler = async (event: APIGatewayProxyEventV2) => event.pathParameters?.sku;\n",
      'functions/getUser.ts':
        "import type { APIGatewayProxyEventV2 } from 'aws-lambda';\nexport const handler = async (event: APIGatewayProxyEventV2) => event.pathParameters?.id;\n"
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(
      Object.fromEntries((output.services ?? []).map((service) => [service.name, service.functionTriggers]))
    ).toEqual({
      quote: [{ type: 'http', method: '*', path: '/quote/{sku}', payloadFormat: '2.0' }],
      getUser: [{ type: 'unmapped', sourceType: UNROUTED_HTTP_SOURCE }]
    });
  });
});
