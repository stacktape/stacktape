import { expect, test } from 'bun:test';
import { assertExistingDevStack } from './dev-stack-safety';

const stage = 'dev';

test('only an explicit dev-stack marker permits local startup to reuse an existing stack', () => {
  for (const stackName of ['customer-production', 'customer-dev', 'customer-local', 'console-app-devlocal']) {
    for (const isDevStack of [undefined, null, false, 'true', 1]) {
      expect(() => assertExistingDevStack({ stackName, stage, isDevStack })).toThrow('did not create it');
    }
    expect(() => assertExistingDevStack({ stackName, stage, isDevStack: true })).not.toThrow();
  }
});

// A first start that fails or is interrupted rolls the stack back to the bootstrap template, which has no dev-stack
// output. The stack tag set from the create on still identifies it, so the next start updates it again.
test('a dev stack rolled back to its bootstrap template is recognized by its stack tag', () => {
  const tagged = [
    { Key: 'stp:stage', Value: stage },
    { Key: 'stp:dev-stack', Value: 'true' }
  ];
  expect(() =>
    assertExistingDevStack({
      stackName: 'app-dev',
      stage,
      isDevStack: undefined,
      tags: tagged,
      stackStatus: 'UPDATE_ROLLBACK_COMPLETE'
    })
  ).not.toThrow();
  for (const tags of [[], [{ Key: 'stp:dev-stack', Value: 'false' }], [{ Key: 'stp:dev', Value: 'true' }], undefined]) {
    expect(() => assertExistingDevStack({ stackName: 'app-dev', stage, isDevStack: undefined, tags })).toThrow(
      'did not create it'
    );
  }
});

test('a dev stack whose create rolled back points to delete instead of a failing update', () => {
  expect(() =>
    assertExistingDevStack({ stackName: 'app-dev', stage, isDevStack: true, stackStatus: 'ROLLBACK_COMPLETE' })
  ).toThrow('cannot update it');
});

test('the conflict error names the stage to delete and never suggests that dev mode deletes it', () => {
  try {
    assertExistingDevStack({ stackName: 'app-prod', stage: 'prod', isDevStack: undefined });
    throw new Error('expected a conflict');
  } catch (error) {
    expect((error as { code?: string }).code).toBe('CLI_DEV_STACK_CONFLICT');
    expect((error as { hints: string[] }).hints.join(' ')).toContain('stacktape delete --stage prod');
  }
});
