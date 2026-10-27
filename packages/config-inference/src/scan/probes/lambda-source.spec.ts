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
      'functions/broadcast.js': [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }],
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

    // The default export in `functions/` is a function even without an aws-lambda type: a state machine invokes it.
    expect((output.services ?? []).map((service) => [service.name, service.functionTriggers])).toEqual([
      ['score', []],
      ['mark_decision', []]
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
  });
});
