import assert from 'node:assert/strict';
import test from 'node:test';
import { recordStackOperationInputSchema } from './api-key.js';

/**
 * `commandArgs` is the CLI's whole parsed flag object. The CLI's argument parser decides the value types,
 * not the Console, so these checks pin the v4 wire contract.
 */

const operation = (commandArgs: unknown) => ({
  invocationId: 'inv-1',
  command: 'deploy',
  projectName: 'my-project',
  commandArgs
});

test('commandArgs accepts a CLI flag object whatever the parser made of the values', () => {
  const parsed = recordStackOperationInputSchema.parse(
    operation({
      // `--stage 2024` reaches the Console as a number, `--hotSwap` as a boolean, and the invocation
      // context the CLI attaches is a nested object.
      stage: 2024,
      region: 'eu-west-1',
      hotSwap: true,
      resourcesToSkip: ['bucket', 'lambda'],
      stacktapeOperationInvocationContext: { initiator: 'user', interface: 'cli' }
    })
  );

  assert.deepEqual(parsed.commandArgs, {
    stage: 2024,
    region: 'eu-west-1',
    hotSwap: true,
    resourcesToSkip: ['bucket', 'lambda'],
    stacktapeOperationInvocationContext: { initiator: 'user', interface: 'cli' }
  });
});

test('commandArgs may be absent, null, or empty', () => {
  assert.equal(recordStackOperationInputSchema.parse(operation(undefined)).commandArgs, undefined);
  assert.equal(recordStackOperationInputSchema.parse(operation(null)).commandArgs, null);
  assert.deepEqual(recordStackOperationInputSchema.parse(operation({})).commandArgs, {});
});

test('commandArgs is an object, not any value at all', () => {
  // The point of describing it as a record rather than `any`: a caller cannot hand the Console a scalar
  // or a list and have it stored as the operation's arguments.
  for (const notAnObject of ['--stage dev', 42, true, ['--stage', 'dev']]) {
    assert.equal(
      recordStackOperationInputSchema.safeParse(operation(notAnObject)).success,
      false,
      `commandArgs accepted ${JSON.stringify(notAnObject)}`
    );
  }
});

test('the minimal v4 operation requires only its invocation identity', () => {
  const minimal = recordStackOperationInputSchema.parse({ invocationId: 'inv-2' });

  assert.equal(minimal.invocationId, 'inv-2');
  assert.equal(minimal.commandArgs, undefined);
});
