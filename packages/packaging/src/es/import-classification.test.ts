/*
 * The rules both ES bundlers share. They used to be two hand-maintained copies that drifted; these
 * pin each rule once, where it now lives.
 */
import { describe, expect, test } from 'bun:test';
import { classifyBeforeResolution, getModuleName, isRuntimeProvidedLambdaModule } from './import-classification';

describe('naming the package a specifier belongs to', () => {
  test.each([
    ['lodash', 'lodash'],
    ['lodash/merge', 'lodash'],
    ['@scope/pkg', '@scope/pkg'],
    ['@scope/pkg/deep/path', '@scope/pkg'],
    ['trailing/', 'trailing']
  ])('%s belongs to %s', (specifier, expected) => {
    expect(getModuleName(specifier)).toBe(expected);
  });
});

describe('modules a Lambda runtime provides', () => {
  test.each([24, 22, 20, 18])('Node %i ships the AWS SDK v3 clients', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(true);
  });

  test.each(['24', 'nodejs24.x'])('the runtime version may be written as %s', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(true);
  });

  test('a container is not a Lambda runtime, however new its Node version', () => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: false, moduleName: '@aws-sdk/client-s3', nodeTarget: 24 })).toBe(
      false
    );
  });

  test.each([16, 14, undefined, 'unknown'])('Node %s is not assumed to ship it', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(false);
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

  test('`bundleAwsSdk` keeps the SDK in the bundle, for code that needs a newer one than the runtime ships', () => {
    const sdkClient = { isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget: 24 };
    expect(isRuntimeProvidedLambdaModule({ ...sdkClient, bundleAwsSdk: true })).toBe(false);
    expect(
      classifyBeforeResolution({ ...sdkClient, aliases: {}, bundleAwsSdk: true, specifier: '@aws-sdk/client-s3' })
    ).toEqual({ outcome: 'continue' });
  });
});
