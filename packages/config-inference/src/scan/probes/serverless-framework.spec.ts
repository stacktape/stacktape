/**
 * The serverless.yml importer: declared functions arrive with their declared triggers.
 *
 * The property under protection is the trigger gap: a handler the framework invokes over HTTP must
 * not compose into a function nothing can call. And the reverse discipline — a handler whose file
 * does not exist, or an event kind whose wiring belongs to another stack, is an honest non-claim.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { lambdaSourceProbe } from './lambda-source';
import { serverlessFrameworkProbe } from './serverless-framework';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-sls-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the serverless framework probe', () => {
  it('reads functions with their HTTP routes and schedules', async () => {
    root = await makeRepo({
      'serverless.yml': [
        'service: orders',
        'provider:',
        '  name: aws',
        '  runtime: nodejs20.x',
        'functions:',
        '  createOrder:',
        '    handler: src/handlers/create.main',
        '    events:',
        '      - httpApi: POST /orders',
        '  nightlyReport:',
        '    handler: src/handlers/report.main',
        '    events:',
        '      - schedule: rate(1 day)',
        ''
      ].join('\n'),
      'src/handlers/create.ts': 'export const main = async () => ({ statusCode: 201 });',
      'src/handlers/report.ts': 'export const main = async () => undefined;'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [serverlessFrameworkProbe] });

    const create = facts.services.find((entry) => entry.name === 'createOrder');
    expect(create).toMatchObject({
      functionEntrypoint: 'src/handlers/create.ts',
      executionModel: 'per-request',
      language: 'typescript'
    });
    expect(create?.functionTriggers).toEqual([{ type: 'http', method: 'POST', path: '/orders' }]);

    const report = facts.services.find((entry) => entry.name === 'nightlyReport');
    expect(report?.functionTriggers).toEqual([{ type: 'schedule', rate: 'rate(1 day)' }]);
  });

  it('skips a function whose handler file does not exist, rather than fabricating a path', async () => {
    root = await makeRepo({
      'serverless.yml': ['service: orders', 'functions:', '  ghost:', '    handler: src/missing.main', ''].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [serverlessFrameworkProbe] });
    expect(facts.services).toEqual([]);
  });

  it('quiets the pattern-matcher so declared handlers are not minted twice', async () => {
    root = await makeRepo({
      'serverless.yml': ['service: orders', 'functions:', '  create:', '    handler: handlers/create.handler', ''].join(
        '\n'
      ),
      'handlers/create.js': 'exports.handler = async () => ({ statusCode: 200 });'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [serverlessFrameworkProbe, lambdaSourceProbe]
    });

    // One function, from the manifest that names its events — not a second from the file pattern.
    expect(facts.services.length).toBe(1);
    expect(facts.services[0]?.name).toBe('create');
  });

  it('imports local CloudFormation resources, trigger wiring, and environment names without values', async () => {
    root = await makeRepo({
      'serverless.yml': [
        'service: orders',
        'provider:',
        '  name: aws',
        '  environment:',
        '    TABLE_NAME: !Ref OrdersTable',
        '    STRIPE_SECRET_KEY: ${ssm:/orders/stripe}',
        'functions:',
        '  worker:',
        '    handler: src/worker.handler',
        '    events:',
        '      - sqs:',
        '          arn: !GetAtt JobsQueue.Arn',
        '          batchSize: 5',
        'resources:',
        '  Resources:',
        '    JobsQueue:',
        '      Type: AWS::SQS::Queue',
        '    OrdersTable:',
        '      Type: AWS::DynamoDB::Table',
        ''
      ].join('\n'),
      'src/worker.ts': 'export const handler = async () => undefined;'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [serverlessFrameworkProbe] });
    const worker = facts.services.find((entry) => entry.name === 'worker');
    const byKind = Object.fromEntries(facts.dependencies.map((entry) => [entry.kind, entry]));

    expect(worker?.functionTriggers).toEqual([{ type: 'queue', dependencyName: 'jobQueue', batchSize: 5 }]);
    expect(worker?.environmentVariables.find((entry) => entry.name === 'TABLE_NAME')).toMatchObject({
      role: 'infra-dependency',
      dependencyName: 'mainTable'
    });
    expect(worker?.environmentVariables.find((entry) => entry.name === 'STRIPE_SECRET_KEY')?.role).toBe(
      'third-party-secret'
    );
    expect(byKind.queue).toMatchObject({
      consumedBy: ['worker'],
      hostingEvidence: 'deployment-manifest'
    });
    expect(byKind.queue?.currentlyHostedOn).toBeUndefined();
    expect(byKind.dynamodb).toMatchObject({ consumedBy: ['worker'], addressedBy: ['TABLE_NAME'] });
    expect(JSON.stringify(facts)).not.toContain('/orders/stripe');
  });

  it('resolves a provider environment name used as a local resource property', async () => {
    root = await makeRepo({
      'serverless.yml': [
        'service: todos',
        'provider:',
        '  name: aws',
        '  environment:',
        '    DYNAMODB_TABLE: ${self:service}-${sls:stage}',
        'functions:',
        '  create:',
        '    handler: todos/create.handler',
        'resources:',
        '  Resources:',
        '    TodosTable:',
        '      Type: AWS::DynamoDB::Table',
        '      Properties:',
        '        TableName: ${self:provider.environment.DYNAMODB_TABLE}',
        ''
      ].join('\n'),
      'todos/create.js': 'exports.handler = async () => ({ statusCode: 201 });'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [serverlessFrameworkProbe] });
    const create = facts.services.find((entry) => entry.name === 'create');
    const table = facts.dependencies.find((entry) => entry.kind === 'dynamodb');

    expect(create?.environmentVariables).toContainEqual(
      expect.objectContaining({
        name: 'DYNAMODB_TABLE',
        role: 'infra-dependency',
        dependencyName: 'mainTable'
      })
    );
    expect(table).toMatchObject({ consumedBy: ['create'], addressedBy: ['DYNAMODB_TABLE'] });
  });
});
