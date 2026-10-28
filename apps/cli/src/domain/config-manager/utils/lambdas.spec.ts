import { describe, expect, test } from 'bun:test';
import { getLambdaHandler } from './lambdas';

const customArtifactHandler = (handler?: string) =>
  getLambdaHandler({
    name: 'processor',
    workingDir: '/project',
    packaging: { type: 'custom-artifact', properties: { packagePath: 'dist', handler: handler! } }
  });

describe('custom-artifact Lambda handler', () => {
  test.each([
    ['index.js:handler', 'index.handler'],
    ['index.mjs:default', 'index.default'],
    ['handlers/process.js:main', 'handlers/process.main'],
    ['./handlers/process.js:main', 'handlers/process.main'],
    ['handlers\\process.js:main', 'handlers/process.main'],
    ['src/app/main.py:handler', 'src/app/main.handler'],
    ['bootstrap:handler', 'bootstrap.handler'],
    ['com.example.Handler::handleRequest', 'com.example.Handler::handleRequest'],
    ['Orders::Orders.Api.Function::FunctionHandler', 'Orders::Orders.Api.Function::FunctionHandler']
  ])('%s is %s', (handler, expected) => {
    expect(customArtifactHandler(handler)).toBe(expected);
  });

  test.each(['index.js', 'index.js:', ':handler', 'a:b:c', 'com.example.Handler::', '::handleRequest'])(
    '%s is rejected with the expected format',
    (handler) => {
      expect(() => customArtifactHandler(handler)).toThrow(
        expect.objectContaining({ code: 'CONFIG_LAMBDA_HANDLER_FORMAT_INVALID' })
      );
    }
  );

  test('a missing handler is rejected', () => {
    expect(() => customArtifactHandler(undefined)).toThrow(
      expect.objectContaining({ code: 'CONFIG_LAMBDA_CUSTOM_ARTIFACT_HANDLER_REQUIRED' })
    );
  });
});
