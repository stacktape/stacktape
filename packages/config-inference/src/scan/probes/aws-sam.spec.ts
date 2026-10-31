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

/** A SAM template with one user pool and an app client declaring `client`. */
const userPoolTemplate = (client: string[]) =>
  [
    'Transform: AWS::Serverless-2016-10-31',
    'Resources:',
    '  Staff:',
    '    Type: AWS::Cognito::UserPool',
    '    Properties:',
    '      AdminCreateUserConfig:',
    '        AllowAdminCreateUserOnly: true',
    '  Client:',
    '    Type: AWS::Cognito::UserPoolClient',
    '    Properties:',
    '      UserPoolId: !Ref Staff',
    ...client.map((line) => `      ${line}`),
    '  Login:',
    '    Type: AWS::Serverless::Function',
    '    Properties:',
    '      Runtime: nodejs22.x',
    '      Handler: handler.handler',
    '      Environment:',
    '        Variables:',
    '          AUTH_CLIENT_ID: !Ref Client'
  ].join('\n');

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
        '      Policies: [{ DynamoDBCrudPolicy: { TableName: !Ref UsersTable } }]',
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
        '      Policies: [{ DynamoDBReadPolicy: { TableName: !Ref OrdersTable } }]',
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
        '      Policies: [{ DynamoDBCrudPolicy: { TableName: !Ref TicketsTable } }]',
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

  it('reads inherited authorizers, disabled events, every S3 event type and declared sizing', async () => {
    const repositoryRoot = await makeRepo({
      'app.py': 'def main(event, context):\n    return None\n',
      'template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Globals:',
        '  Function:',
        '    Runtime: python3.13',
        '    MemorySize: 1769',
        '  HttpApi:',
        '    Auth:',
        '      DefaultAuthorizer: AWS_IAM',
        'Resources:',
        '  Jobs:',
        '    Type: AWS::SQS::Queue',
        '    Properties:',
        '      FifoQueue: true',
        '      VisibilityTimeout: 120',
        '  Files:',
        '    Type: AWS::S3::Bucket',
        '  WorkerFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Handler: app.main',
        '      Timeout: 90',
        '      Events:',
        '        Internal:',
        '          Type: HttpApi',
        '          Properties:',
        '            Path: /internal',
        '            Method: get',
        '        Public:',
        '          Type: HttpApi',
        '          Properties:',
        '            Path: /health',
        '            Method: get',
        '            Auth:',
        '              Authorizer: NONE',
        '        Paused:',
        '          Type: SQS',
        '          Properties:',
        '            Queue: !GetAtt Jobs.Arn',
        '            Enabled: false',
        '        Cleanup:',
        '          Type: Schedule',
        '          Properties:',
        '            Schedule: rate(1 day)',
        '            State: DISABLED',
        '            Input: \'{"mode":"full"}\'',
        '        Changed:',
        '          Type: S3',
        '          Properties:',
        '            Bucket: !Ref Files',
        '            Events: [s3:ObjectCreated:*, s3:ObjectRemoved:*]'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [awsSamProbe] });
    const worker = facts.services.find((entry) => entry.name === 'worker');
    expect(worker).toMatchObject({ functionHandler: 'main', functionTimeoutSeconds: 90, functionMemoryMb: 1769 });
    expect(worker?.functionTriggers).toEqual([
      { type: 'http', method: 'get', path: '/internal', authorization: 'aws-iam' },
      { type: 'http', method: 'get', path: '/health' },
      { type: 'unmapped', reason: 'disabled', sourceType: 'the event from the jobs queue' },
      { type: 'schedule', rate: 'rate(1 day)', enabled: false, input: '{"mode":"full"}' },
      { type: 'object-storage', dependencyName: 'files', eventType: 's3:ObjectCreated:*' },
      { type: 'object-storage', dependencyName: 'files', eventType: 's3:ObjectRemoved:*' }
    ]);
    expect(facts.dependencies.find((entry) => entry.name === 'jobs')?.queueSettings).toEqual({
      fifo: true,
      visibilityTimeoutSeconds: 120
    });
  });

  it('merges API Auth with its Globals and resolves or refuses intrinsic filter values', async () => {
    const repositoryRoot = await makeRepo({
      'handler.js': 'export async function handler() {}\n',
      'template.yaml': [
        'Transform: AWS::Serverless-2016-10-31',
        'Parameters:',
        '  Prefix:',
        '    Type: String',
        '    Default: incoming/',
        '  Kind:',
        '    Type: String',
        '    Default: paid',
        '  Stage:',
        '    Type: String',
        'Globals:',
        '  Api:',
        '    Auth:',
        '      DefaultAuthorizer: AWS_IAM',
        'Resources:',
        '  Gateway:',
        '    Type: AWS::Serverless::Api',
        '    Properties:',
        '      StageName: prod',
        '      Auth:',
        '        AddDefaultAuthorizerToCorsPreflight: false',
        '  Files:',
        '    Type: AWS::S3::Bucket',
        '  Orders:',
        '    Type: AWS::SNS::Topic',
        '  WorkerFunction:',
        '    Type: AWS::Serverless::Function',
        '    Properties:',
        '      Runtime: nodejs22.x',
        '      Handler: handler.handler',
        '      Events:',
        '        Admin:',
        '          Type: Api',
        '          Properties:',
        '            RestApiId: !Ref Gateway',
        '            Path: /admin',
        '            Method: get',
        '        LongForm:',
        '          Type: S3',
        '          Properties:',
        '            Bucket: !Ref Files',
        '            Events: s3:ObjectCreated:*',
        '            Filter:',
        '              S3Key:',
        '                Rules:',
        '                  - Name: prefix',
        '                    Value:',
        '                      Ref: Prefix',
        '                  - Name: suffix',
        '                    Value: !Ref Stage',
        '        ShortForm:',
        '          Type: S3',
        '          Properties:',
        '            Bucket: !Ref Files',
        '            Events: s3:ObjectRemoved:*',
        '            Filter:',
        '              S3Key:',
        '                Rules:',
        '                  - Name: prefix',
        '                    Value: !Ref Prefix',
        '        Paid:',
        '          Type: SNS',
        '          Properties:',
        '            Topic: !Ref Orders',
        '            FilterPolicy:',
        '              kind: [!Ref Kind]',
        '        Computed:',
        '          Type: SNS',
        '          Properties:',
        '            Topic: !Ref Orders',
        '            FilterPolicy:',
        '              stage: [!Sub "${Stage}-orders"]'
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [awsSamProbe] });
    expect(facts.services[0]?.functionTriggers).toEqual([
      // The API's own Auth adds a key; the global DefaultAuthorizer still applies.
      { type: 'http', method: 'get', path: '/admin', authorization: 'aws-iam' },
      // A parameter without a default could be anything, so the subscription is not created unfiltered.
      { type: 'unmapped', sourceType: 'objects in the files bucket that match a key filter init cannot resolve' },
      {
        type: 'object-storage',
        dependencyName: 'files',
        eventType: 's3:ObjectRemoved:*',
        keyPrefix: 'incoming/'
      },
      { type: 'topic', dependencyName: 'orders', filterPolicy: { kind: ['paid'] } },
      { type: 'unmapped', sourceType: 'messages from the orders topic that match a FilterPolicy init cannot resolve' }
    ]);
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
  describe("carries an app client's token lifetimes in Stacktape's units", () => {
    const importPool = async (client: string[]) => {
      const repositoryRoot = await makeRepo({
        'handler.js': 'exports.handler = async () => ({ statusCode: 200 });\n',
        'template.yaml': userPoolTemplate(client)
      });
      const { facts } = await assembleCandidateFacts({ root: repositoryRoot, probes: [awsSamProbe] });
      const pool = facts.dependencies.find((dependency) => dependency.kind === 'user-pool');
      const composition = composeConfig({ facts });
      const resource = Object.values(composition.config.resources).find(
        (candidate) => (candidate as { type: string }).type === 'user-auth-pool'
      ) as { properties: Record<string, unknown> } | undefined;
      return { pool, properties: resource?.properties, gaps: composition.gaps.map((gap) => gap.message) };
    };

    it.each([
      [
        "Cognito's default units: hours for access and ID tokens, days for refresh tokens",
        ['AccessTokenValidity: 2', 'IdTokenValidity: 24', 'RefreshTokenValidity: 7'],
        { accessTokenValiditySeconds: 7200, idTokenValiditySeconds: 86_400, refreshTokenValidityDays: 7 }
      ],
      [
        'declared units',
        [
          'AccessTokenValidity: 5',
          'IdTokenValidity: 3600',
          'RefreshTokenValidity: 72',
          'TokenValidityUnits:',
          '  AccessToken: minutes',
          '  IdToken: seconds',
          '  RefreshToken: hours'
        ],
        { accessTokenValiditySeconds: 300, idTokenValiditySeconds: 3600, refreshTokenValidityDays: 3 }
      ]
    ])('%s', async (_, client, lifetimes) => {
      const { pool, properties } = await importPool(client);
      expect(pool?.userPoolSettings).toMatchObject(lifetimes);
      expect(properties).toMatchObject(lifetimes);
    });

    it('shortens a refresh lifetime of part of a day to whole days and says so', async () => {
      const { properties, gaps } = await importPool([
        'RefreshTokenValidity: 36',
        'TokenValidityUnits:',
        '  RefreshToken: hours'
      ]);
      expect(properties).toMatchObject({ refreshTokenValidityDays: 1 });
      expect(gaps.some((gap) => gap.includes('`RefreshTokenValidity`'))).toBe(true);
    });

    it('leaves the pool out when its refresh tokens expire within a day', async () => {
      const { properties, gaps } = await importPool([
        'RefreshTokenValidity: 12',
        'TokenValidityUnits:',
        '  RefreshToken: hours'
      ]);
      expect(properties).toBeUndefined();
      expect(gaps.some((gap) => gap.includes('`RefreshTokenValidity`'))).toBe(true);
    });
  });
});
