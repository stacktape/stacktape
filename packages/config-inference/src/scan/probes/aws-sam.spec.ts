import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { awsSamProbe } from './aws-sam';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'stp-sam-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(root, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return root;
};

describe('the AWS SAM probe', () => {
  it('keeps separate handlers and tables and records their exact HTTP routes', async () => {
    const repositoryRoot = await makeRepo({
      'src/handlers/users/create.ts': 'export const handler = async () => ({ statusCode: 201 });',
      'src/handlers/orders/list.ts': 'export const handler = async () => ({ statusCode: 200 });',
      'template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Resources:',
        '  UsersTable:',
        '    Type: AWS::DynamoDB::Table',
        '  OrdersTable:',
        '    Type: AWS::DynamoDB::Table',
        '  CreateUserFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      CodeUri: dist/handlers/users/',
        '      Handler: create.handler',
        '      Policies: [{ DynamoDBCrudPolicy: { TableName: UsersTable } }]',
        '      Events:',
        '        Api:',
        '          Type: Api',
        '          Properties:',
        '            Path: /users',
        '            Method: POST',
        '  ListOrdersFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      CodeUri: dist/handlers/orders/',
        '      Handler: list.handler',
        '      Policies: [{ DynamoDBReadPolicy: { TableName: OrdersTable } }]',
        '      Events:',
        '        Api:',
        '          Type: Api',
        '          Properties:',
        '            Path: /orders',
        '            Method: GET'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [awsSamProbe]
    });

    expect(facts.services.map((service) => service.functionEntrypoint)).toEqual([
      'src/handlers/users/create.ts',
      'src/handlers/orders/list.ts'
    ]);
    expect(facts.services.map((service) => service.functionTriggers[0])).toEqual([
      { type: 'http', method: 'POST', path: '/users' },
      { type: 'http', method: 'GET', path: '/orders' }
    ]);
    expect(facts.dependencies.map((dependency) => dependency.name)).toEqual(['usersTable', 'ordersTable']);
    expect(facts.dependencies.map((dependency) => dependency.consumedBy)).toEqual([['createUser'], ['listOrders']]);
  });

  it('reads a nested monorepo template, Globals CodeUri, and short intrinsic event references', async () => {
    const repositoryRoot = await makeRepo({
      'apps/jobs/src/worker.py': 'def handler(event, context):\n    return None\n',
      'apps/jobs/template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Globals:',
        '  Function:',
        '    Runtime: python3.13',
        '    CodeUri: src/',
        '    Environment:',
        '      Variables:',
        '        LOG_LEVEL: info',
        'Resources:',
        '  JobsQueue:',
        '    Type: AWS::SQS::Queue',
        '  WorkerFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Handler: worker.handler',
        '      Environment:',
        '        Variables:',
        '          QUEUE_URL: !Ref JobsQueue',
        '          STRIPE_SECRET_KEY: hidden-value-that-must-not-travel',
        '      Events:',
        '        Jobs:',
        '          Type: SQS',
        '          Properties:',
        '            Queue: !GetAtt JobsQueue.Arn',
        '            BatchSize: 10',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [awsSamProbe]
    });

    expect(facts.services[0]).toMatchObject({
      name: 'worker',
      functionEntrypoint: 'apps/jobs/src/worker.py',
      language: 'python',
      functionTriggers: [{ type: 'queue', dependencyName: 'jobsQueue', batchSize: 10 }],
      environmentVariables: [
        expect.objectContaining({
          name: 'LOG_LEVEL',
          role: 'runtime-config',
          safeLiteralValue: 'info'
        }),
        expect.objectContaining({
          name: 'QUEUE_URL',
          role: 'infra-dependency',
          dependencyName: 'jobsQueue'
        }),
        expect.objectContaining({
          name: 'STRIPE_SECRET_KEY',
          role: 'third-party-secret'
        })
      ]
    });
    expect(facts.dependencies[0]).toMatchObject({
      name: 'jobsQueue',
      consumedBy: ['worker'],
      addressedBy: ['QUEUE_URL'],
      hostingEvidence: 'deployment-manifest'
    });
    expect(JSON.stringify(facts)).not.toContain('hidden-value-that-must-not-travel');
  });

  it('resolves a .NET handler to the class file that carries it', async () => {
    const repositoryRoot = await makeRepo({
      'HttpApi/HttpApi.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web" />',
      'HttpApi/LambdaEntryPoint.cs': 'public class LambdaEntryPoint {}\n',
      'template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Resources:',
        '  HttpApiFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Handler: HttpApi::HttpApi.LambdaEntryPoint::FunctionHandlerAsync',
        '      Runtime: dotnet8',
        '      CodeUri: HttpApi/',
        '      Events:',
        '        Root:',
        '          Type: HttpApi',
        '          Properties:',
        '            Path: /{proxy+}',
        '            Method: ANY',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [awsSamProbe] });

    expect(facts.services[0]).toMatchObject({
      language: 'dotnet',
      functionEntrypoint: 'HttpApi/LambdaEntryPoint.cs',
      functionHandler: 'HttpApi::HttpApi.LambdaEntryPoint::FunctionHandlerAsync'
    });
    // `ANY` is the catch-all; the generated HTTP API event spells it `*`.
    expect(composeConfig({ facts }).config.resources.httpApi).toMatchObject({
      properties: {
        packaging: { properties: { handlerFunction: 'HttpApi::HttpApi.LambdaEntryPoint::FunctionHandlerAsync' } },
        events: [{ properties: { method: '*', path: '/{proxy+}' } }]
      }
    });
  });

  it('finds a Rust function whose bootstrap handler comes from Globals', async () => {
    const repositoryRoot = await makeRepo({
      'Cargo.toml': '[package]\nname = "handler"\nversion = "0.1.0"\nedition = "2021"\n',
      'src/bin/handler.rs': 'fn main() {}\n',
      'template.yml': [
        "Transform: 'AWS::Serverless-2016-10-31'",
        'Globals:',
        '  Function:',
        '    Handler: bootstrap',
        '    Runtime: provided.al2023',
        'Resources:',
        '  LambdaFunction:',
        "    Type: 'AWS::Serverless::Function'",
        '    Properties:',
        '      CodeUri: .',
        '      Events:',
        '        Api:',
        '          Type: HttpApi',
        '          Properties:',
        '            Path: /',
        '            Method: GET',
        '    Metadata:',
        '      BuildMethod: rust-cargolambda',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [awsSamProbe] });

    expect(facts.services[0]).toMatchObject({ language: 'rust', functionEntrypoint: 'src/bin/handler.rs' });
  });

  it('resolves a Java class handler even when CodeUri points at a build artifact', async () => {
    const repositoryRoot = await makeRepo({
      'src/main/java/com/example/TicketFunction.java': [
        'package com.example;',
        'public class TicketFunction {',
        '  public Object handleRequest(Object event, Object context) { return null; }',
        '}',
        ''
      ].join('\n'),
      'template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Resources:',
        '  TicketsTable:',
        '    Type: AWS::DynamoDB::Table',
        '  TicketFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Runtime: java21',
        '      CodeUri: target/ticketPublisher.zip',
        '      Handler: com.example.TicketFunction::handleRequest',
        '      Policies: [{ DynamoDBCrudPolicy: { TableName: TicketsTable } }]',
        '      Events:',
        '        Api:',
        '          Type: Api',
        '          Properties:',
        '            Path: /tickets',
        '            Method: POST',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [awsSamProbe]
    });

    expect(facts.services[0]).toMatchObject({
      name: 'ticket',
      language: 'java',
      functionEntrypoint: 'src/main/java/com/example/TicketFunction.java',
      functionTriggers: [{ type: 'http', method: 'POST', path: '/tickets' }]
    });
    expect(facts.dependencies[0]).toMatchObject({
      kind: 'dynamodb',
      consumedBy: ['ticket']
    });
  });

  it('imports EventBridge Scheduler ScheduleV2 events', async () => {
    const repositoryRoot = await makeRepo({
      'src/main.go': 'package main\nfunc main() {}\n',
      'template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Resources:',
        '  SchedulerFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      CodeUri: src/',
        '      Handler: main',
        '      Runtime: go1.x',
        '      Events:',
        '        Tick:',
        '          Type: ScheduleV2',
        '          Properties:',
        "            ScheduleExpression: 'rate(5 minute)'"
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({
      root: repositoryRoot,
      probes: [awsSamProbe]
    });

    expect(facts.services[0]?.functionTriggers).toEqual([{ type: 'schedule', rate: 'rate(5 minute)' }]);
  });
});
