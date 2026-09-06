import { expect, test } from 'bun:test';
import { assertExistingDevStack } from './dev-stack-safety';

test('only an explicit dev-stack marker permits local startup to reuse an existing stack', () => {
  for (const stackName of ['customer-production', 'customer-dev', 'customer-local', 'console-app-devlocal']) {
    for (const isDevStack of [undefined, null, false, 'true', 1]) {
      expect(() => assertExistingDevStack({ stackName, isDevStack })).toThrow('not marked as a dev stack');
    }
    expect(() => assertExistingDevStack({ stackName, isDevStack: true })).not.toThrow();
  }
});
