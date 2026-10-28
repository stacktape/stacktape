import { describe, expect, test } from 'bun:test';
import { getLambdaHandler } from './lambdas';

const customArtifactHandler = (handler?: string, runtime = 'nodejs22.x') =>
  getLambdaHandler({
    name: 'processor',
    workingDir: '/project',
    runtime,
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
    ['bootstrap:handler', 'bootstrap.handler']
  ])('%s is %s', (handler, expected) => {
    expect(customArtifactHandler(handler)).toBe(expected);
  });

  // Lambda's own Java and .NET format is used as written, and only for those runtimes.
  test.each([
    ['com.example.Handler::handleRequest', 'java21'],
    ['com.example.Handler::handleRequest', 'java8.al2'],
    ['Orders::Orders.Api.Function::FunctionHandler', 'dotnet8']
  ])('%s is used as written for %s', (handler, runtime) => {
    expect(customArtifactHandler(handler, runtime)).toBe(handler);
  });

  test.each([
    ['index.js', 'nodejs22.x'],
    ['index.js:', 'nodejs22.x'],
    [':handler', 'nodejs22.x'],
    ['a:b:c', 'nodejs22.x'],
    ['index.js::handler', 'nodejs22.x'],
    ['app::handler', 'python3.12'],
    ['com.example.Handler::handleRequest', 'nodejs22.x'],
    ['com.example.Handler::', 'java21'],
    ['::handleRequest', 'java21']
  ])('%s is rejected for %s', (handler, runtime) => {
    expect(() => customArtifactHandler(handler, runtime)).toThrow(
      expect.objectContaining({ code: 'CONFIG_LAMBDA_HANDLER_FORMAT_INVALID' })
    );
  });

  test('a missing handler is rejected', () => {
    expect(() => customArtifactHandler(undefined)).toThrow(
      expect.objectContaining({ code: 'CONFIG_LAMBDA_CUSTOM_ARTIFACT_HANDLER_REQUIRED' })
    );
  });
});
