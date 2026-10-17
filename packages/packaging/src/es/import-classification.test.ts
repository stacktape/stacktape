/*
 * The runtime-provided SDK rule as the artifact scenarios cannot see it: every Lambda Node runtime on the list, the
 * spellings the version arrives in, and the SDK families the rule must not widen to. `bundler-parity.test.ts`
 * executes the decision itself on Node 24, 16 and a container.
 */
import { describe, expect, test } from 'bun:test';
import { isRuntimeProvidedLambdaModule } from './import-classification';

describe('modules a Lambda runtime provides', () => {
  test.each([24, 22, 20, 18])('Node %i ships the AWS SDK v3 clients', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(true);
  });

  test.each(['24', 'nodejs24.x'])('the runtime version may be written as %s', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(true);
  });

  test('the clients and the lib helpers built on them are provided; the rest of the SDK is not assumed', () => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/lib-dynamodb', nodeTarget: 24 })).toBe(
      true
    );
    expect(
      isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/util-dynamodb', nodeTarget: 24 })
    ).toBe(false);
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: 'aws-sdk', nodeTarget: 24 })).toBe(false);
  });
});
