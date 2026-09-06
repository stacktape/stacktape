import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import {
  assertConsoleDevSupportResources,
  extractConsoleDevDataPlane,
  parseStacktapeJsonlResult,
  terminateChild
} from './run-console-dev.ts';

test('cleanup waits for an interrupted child to exit, even when a signal was already sent', async () => {
  const child = spawn(
    process.execPath,
    ['-e', "process.on('SIGINT', () => {}); process.stdout.write('ready'); setInterval(() => {}, 1000)"],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
  );
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });
  try {
    await once(child.stdout!, 'data');
    child.kill('SIGINT');
    await terminateChild(child, exited);
    assert.ok(
      child.exitCode !== null || child.signalCode !== null,
      'cleanup must wait for exit, not just signal delivery'
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
  }
});

test('local startup refuses to remove legacy devlocal data but permits minimal support infrastructure', () => {
  assert.doesNotThrow(() =>
    assertConsoleDevSupportResources([
      { LogicalResourceId: 'StpDeploymentBucket', ResourceType: 'AWS::S3::Bucket' },
      { LogicalResourceId: 'ApiServerRole', ResourceType: 'AWS::IAM::Role' }
    ])
  );
  for (const ResourceType of [
    'AWS::RDS::DBInstance',
    'AWS::EFS::FileSystem',
    'AWS::Cognito::UserPool',
    'AWS::S3::Bucket',
    'AWS::DynamoDB::Table',
    'AWS::SQS::Queue'
  ]) {
    assert.throws(
      () => assertConsoleDevSupportResources([{ LogicalResourceId: 'LegacyData', ResourceType }]),
      /LegacyData/
    );
  }
});

const stackInfoMap = {
  resources: {
    pricingTable: {
      resourceType: 'dynamo-db-table',
      referencableParams: { name: { value: 'shared-prices' }, arn: { value: 'shared-prices-arn' } }
    },
    remoteOperationQueue: {
      resourceType: 'sqs-queue',
      referencableParams: { url: { value: 'shared-jobs-url' }, arn: { value: 'shared-jobs-arn' } }
    },
    budgetNotificationsTopic: {
      resourceType: 'sns-topic',
      referencableParams: { arn: { value: 'shared-budget-arn' } }
    },
    mainDatabase: {
      resourceType: 'relational-database',
      referencableParams: {
        host: { value: 'database.example.com' },
        dbName: { value: 'console_dev' }
      }
    },
    mainUserPool: {
      resourceType: 'user-auth-pool',
      referencableParams: {
        id: { value: 'eu-west-1_example' },
        clientId: { value: 'client-id' },
        domain: { value: 'dev-login.example.com' }
      }
    }
  }
};

test('parses the final Stacktape JSONL result without depending on log events', () => {
  assert.deepEqual(
    parseStacktapeJsonlResult(
      [
        'not json',
        JSON.stringify({ type: 'log', message: 'starting' }),
        JSON.stringify({ type: 'result', ok: true })
      ].join('\n')
    ),
    { type: 'result', ok: true }
  );
});

test('extracts the shared Console data plane from the deployed dev stack', () => {
  assert.deepEqual(
    extractConsoleDevDataPlane({
      Stacks: [
        {
          StackStatus: 'UPDATE_COMPLETE',
          Outputs: [{ OutputKey: 'StpStackInfoMap', OutputValue: JSON.stringify(stackInfoMap) }]
        }
      ]
    }),
    {
      budgetNotificationsTopicArn: 'shared-budget-arn',
      databaseHost: 'database.example.com',
      databaseName: 'console_dev',
      pricingTableName: 'shared-prices',
      pricingTableArn: 'shared-prices-arn',
      remoteOperationQueueArn: 'shared-jobs-arn',
      remoteOperationQueueUrl: 'shared-jobs-url',
      userPoolClientId: 'client-id',
      userPoolDomain: 'dev-login.example.com',
      userPoolId: 'eu-west-1_example'
    }
  );
});

test('fails closed when the shared dev stack is not ready', () => {
  assert.throws(
    () =>
      extractConsoleDevDataPlane({
        Stacks: [
          {
            StackStatus: 'UPDATE_IN_PROGRESS',
            Outputs: [{ OutputKey: 'StpStackInfoMap', OutputValue: JSON.stringify(stackInfoMap) }]
          }
        ]
      }),
    /not ready/
  );
});

test('fails closed when required data-plane resources are missing', () => {
  assert.throws(
    () =>
      extractConsoleDevDataPlane({
        Stacks: [
          {
            StackStatus: 'UPDATE_COMPLETE',
            Outputs: [{ OutputKey: 'StpStackInfoMap', OutputValue: JSON.stringify({ resources: {} }) }]
          }
        ]
      }),
    /mainDatabase/
  );
});
