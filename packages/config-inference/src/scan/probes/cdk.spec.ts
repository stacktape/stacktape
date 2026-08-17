/**
 * The CDK importer: constructs read as text, never synthesized.
 *
 * Properties under protection: concepts arrive with their declared sizes and engine versions;
 * declarations are not mistaken for live AWS resources; Lambda entry files resolve against the
 * real file list; event-source wiring names its consumer; and outside a
 * `cdk.json` project — or outside a file importing `aws-cdk-lib` — nothing is read at all.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { cdkProbe, readCdkConstructs } from './cdk';
import { lambdaSourceProbe } from './lambda-source';

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-cdk-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('readCdkConstructs', () => {
  it('reads scope-and-id constructor calls with their literal bodies', () => {
    const constructs = readCdkConstructs(
      'lib/stack.ts',
      [
        'const db = new rds.DatabaseInstance(this, "Database", {',
        '  engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_3 }),',
        '  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL)',
        '});',
        'new sqs.Queue(this, "Jobs");',
        ''
      ].join('\n')
    );

    expect(constructs.map((entry) => `${entry.construct}:${entry.name}`)).toEqual([
      'DatabaseInstance:Database',
      'Queue:Jobs'
    ]);
    expect(constructs[0]?.body).toContain('VER_16_3');
  });

  it('does not end a construct at braces inside strings or comments', () => {
    const constructs = readCdkConstructs(
      'lib/stack.ts',
      [
        'new lambda.Function(this, "Api", {',
        '  handler: "index.handler",',
        '  description: "closing } brace", // another }',
        '  environment: { TEMPLATE: `value ${flag ? { ok: true } : {}}` }',
        '});',
        'new sqs.Queue(this, "Jobs");'
      ].join('\n')
    );

    expect(constructs).toHaveLength(2);
    expect(constructs[0]?.body).toContain('environment');
    expect(constructs[0]?.body).not.toContain('Jobs');
  });
});

describe('the cdk probe, end to end', () => {
  let root: string;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  const STACK = [
    "import * as cdk from 'aws-cdk-lib';",
    "import * as rds from 'aws-cdk-lib/aws-rds';",
    "import * as sqs from 'aws-cdk-lib/aws-sqs';",
    "import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';",
    "import * as apigw from 'aws-cdk-lib/aws-apigateway';",
    "import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';",
    '',
    'export class AppStack extends cdk.Stack {',
    '  constructor(scope, id, props) {',
    '    super(scope, id, props);',
    '    const db = new rds.DatabaseInstance(this, "Database", {',
    '      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_3 }),',
    '      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL),',
    '      allocatedStorage: 50',
    '    });',
    '    const jobs = new sqs.Queue(this, "Jobs");',
    '    const api = new lambdaNodejs.NodejsFunction(this, "Api", { entry: "src/api.ts" });',
    '    new apigw.LambdaRestApi(this, "Gateway", { handler: api });',
    '    const worker = new lambdaNodejs.NodejsFunction(this, "Worker", { entry: "src/worker.ts" });',
    '    worker.addEventSource(new SqsEventSource(jobs));',
    '  }',
    '}',
    ''
  ].join('\n');

  it('imports concepts with sizes, cautious hosting semantics, resolved entries, and event wiring', async () => {
    root = await makeRepo({
      'cdk.json': '{ "app": "npx ts-node bin/app.ts" }',
      'lib/stack.ts': STACK,
      'src/api.ts': 'export const handler = async () => ({ statusCode: 200 });',
      'src/worker.ts': 'export const handler = async () => undefined;'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [cdkProbe] });

    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');
    expect(database).toMatchObject({
      engineVersion: '16.3',
      sizeHint: { instance: 'db.t4g.small', storageGb: 50 },
      hostingEvidence: 'deployment-manifest'
    });
    expect(database?.currentlyHostedOn).toBeUndefined();

    const api = facts.services.find((entry) => entry.name === 'api');
    expect(api).toMatchObject({ functionEntrypoint: 'src/api.ts', executionModel: 'per-request' });
    expect(api?.functionTriggers).toEqual([{ type: 'http', method: '*', path: '/{proxy+}' }]);

    const worker = facts.services.find((entry) => entry.name === 'worker');
    // The event source names its consumer: the queue trigger arrives wired to the queue fact.
    expect(worker?.functionTriggers).toEqual([{ type: 'queue', dependencyName: 'jobQueue' }]);
  });

  it('reads nothing without cdk.json, and nothing from files that never import aws-cdk-lib', async () => {
    root = await makeRepo({
      // No cdk.json: `new Queue(this, ...)` is somebody's own class.
      'lib/stack.ts': STACK
    });
    const withoutMarker = await assembleCandidateFacts({ root, probes: [cdkProbe] });
    expect(withoutMarker.facts.dependencies).toEqual([]);
    await rm(root, { recursive: true, force: true });

    root = await makeRepo({
      'cdk.json': '{}',
      // Imports nothing from aws-cdk-lib, so its constructor calls are not infrastructure.
      'lib/queue.ts': 'export class Q {}\nconst q = new Queue(this, "Jobs");'
    });
    const withoutImport = await assembleCandidateFacts({ root, probes: [cdkProbe] });
    expect(withoutImport.facts.dependencies).toEqual([]);
  });

  it('quiets the handler pattern-matcher, like every other declaring tool', async () => {
    root = await makeRepo({
      'cdk.json': '{}',
      'lib/stack.ts': [
        "import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';",
        'new lambdaNodejs.NodejsFunction(this, "Handler", { entry: "functions/create.ts", environment: { API_TOKEN: "inline-secret-must-not-travel" } });',
        ''
      ].join('\n'),
      'functions/create.ts': 'export const handler = async () => ({ statusCode: 200 });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [cdkProbe, lambdaSourceProbe] });
    const handlers = facts.services.filter((entry) => entry.functionEntrypoint === 'functions/create.ts');
    expect(handlers).toHaveLength(1);
    expect(JSON.stringify(facts)).not.toContain('inline-secret-must-not-travel');
  });

  it('resolves path.join entries, HTTP API v2 routes, non-SQS events, and environment wiring', async () => {
    root = await makeRepo({
      'cdk.json': '{}',
      'lib/stack.ts': [
        "import * as cdk from 'aws-cdk-lib';",
        "import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';",
        "import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';",
        "import * as sns from 'aws-cdk-lib/aws-sns';",
        "import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';",
        "import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';",
        "import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';",
        "import * as path from 'node:path';",
        'const table = new dynamodb.Table(this, "Orders");',
        'const topic = new sns.Topic(this, "Events");',
        'const handler = new lambdaNodejs.NodejsFunction(this, "Handler", {',
        '  entry: path.join(__dirname, "../src/handler.ts"),',
        '  environment: { TABLE_NAME: table.tableName }',
        '});',
        'handler.addEventSource(new SnsEventSource(topic));',
        'const integration = new HttpLambdaIntegration("HandlerIntegration", handler);',
        'const api = new HttpApi(this, "Api");',
        'api.addRoutes({ path: "/orders", methods: [HttpMethod.GET, HttpMethod.POST], integration });',
        ''
      ].join('\n'),
      'src/handler.ts': 'export const handler = async () => ({ statusCode: 200 });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [cdkProbe] });
    const handler = facts.services.find((entry) => entry.name === 'handler');
    const byKind = Object.fromEntries(facts.dependencies.map((entry) => [entry.kind, entry]));

    expect(handler?.functionEntrypoint).toBe('src/handler.ts');
    expect(handler?.functionTriggers).toEqual([
      { type: 'topic', dependencyName: 'notificationsTopic' },
      { type: 'http', method: 'GET', path: '/orders' },
      { type: 'http', method: 'POST', path: '/orders' }
    ]);
    expect(handler?.environmentVariables).toContainEqual(
      expect.objectContaining({ name: 'TABLE_NAME', role: 'infra-dependency', dependencyName: 'mainTable' })
    );
    expect(byKind.dynamodb).toMatchObject({ consumedBy: ['handler'], addressedBy: ['TABLE_NAME'] });
    expect(byKind.topic?.consumedBy).toEqual(['handler']);
  });

  it('reads shared function props and exact API Gateway v1 CRUD routes from the official CDK shape', async () => {
    root = await makeRepo({
      'cdk.json': '{}',
      'index.ts': [
        "import { join } from 'node:path';",
        "import { Table } from 'aws-cdk-lib/aws-dynamodb';",
        "import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';",
        "import { LambdaIntegration, MockIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';",
        'const table = new Table(this, "Items");',
        'const nodeJsFunctionProps = { environment: { PRIMARY_KEY: "itemId", TABLE_NAME: table.tableName } };',
        'const getOne = new NodejsFunction(this, "GetOne", {',
        "  entry: join(__dirname, 'lambdas', 'get-one.ts'),",
        '  ...nodeJsFunctionProps',
        '});',
        'const createOne = new NodejsFunction(this, "CreateOne", {',
        "  entry: join(__dirname, 'lambdas', 'create-one.ts'),",
        '  ...nodeJsFunctionProps',
        '});',
        'const getOneIntegration = new LambdaIntegration(getOne);',
        'const createOneIntegration = new LambdaIntegration(createOne);',
        'const api = new RestApi(this, "Api");',
        "const items = api.root.addResource('items');",
        "items.addMethod('POST', createOneIntegration);",
        "const singleItem = items.addResource('{id}');",
        "singleItem.addMethod('GET', getOneIntegration);",
        "singleItem.addMethod('OPTIONS', new MockIntegration());",
        ''
      ].join('\n'),
      'lambdas/get-one.ts': 'export const handler = async () => ({ statusCode: 200 });',
      'lambdas/create-one.ts': 'export const handler = async () => ({ statusCode: 201 });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [cdkProbe] });
    const getOne = facts.services.find((entry) => entry.name === 'getOne');
    const createOne = facts.services.find((entry) => entry.name === 'createOne');
    const table = facts.dependencies.find((entry) => entry.kind === 'dynamodb');

    expect(getOne).toMatchObject({
      functionEntrypoint: 'lambdas/get-one.ts',
      functionTriggers: [{ type: 'http', method: 'GET', path: '/items/{id}' }]
    });
    expect(createOne).toMatchObject({
      functionEntrypoint: 'lambdas/create-one.ts',
      functionTriggers: [{ type: 'http', method: 'POST', path: '/items' }]
    });
    for (const service of [getOne, createOne]) {
      expect(service?.environmentVariables).toContainEqual(
        expect.objectContaining({ name: 'TABLE_NAME', role: 'infra-dependency', dependencyName: 'mainTable' })
      );
    }
    expect(table).toMatchObject({
      hostingEvidence: 'deployment-manifest',
      consumedBy: ['getOne', 'createOne'],
      addressedBy: ['TABLE_NAME']
    });
    expect(table?.currentlyHostedOn).toBeUndefined();
    expect(facts.services.flatMap((entry) => entry.functionTriggers ?? [])).not.toContainEqual(
      expect.objectContaining({ method: 'OPTIONS' })
    );
  });
});
