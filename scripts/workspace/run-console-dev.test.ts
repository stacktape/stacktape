import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractConsoleDevDataPlane, parseStacktapeJsonlResult } from './run-console-dev.ts';

const stackInfoMap = {
  resources: {
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
      databaseHost: 'database.example.com',
      databaseName: 'console_dev',
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
