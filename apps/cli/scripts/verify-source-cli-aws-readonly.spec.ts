import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertSynthesizedTemplate,
  buildCliEnvironment,
  parseCliJsonl,
  resolveSmokeOptions
} from './verify-source-cli-aws-readonly';

const validEnvironment = {
  STP_SOURCE_CLI_AWS_READONLY: '1',
  STP_SOURCE_CLI_AWS_PROFILE: 'development',
  STP_SOURCE_CLI_EXPECTED_ACCOUNT_ID: '123456789012'
};

describe('source CLI AWS read-only smoke guardrails', () => {
  test('refuses Windows before considering opt-in', () => {
    expect(() => resolveSmokeOptions({ platform: 'win32', env: validEnvironment })).toThrow('cannot run from Windows');
  });

  test('requires explicit opt-in, profile, and expected account', () => {
    expect(() => resolveSmokeOptions({ platform: 'linux', env: {} })).toThrow('explicit opt-in');
    expect(() =>
      resolveSmokeOptions({
        platform: 'linux',
        env: { STP_SOURCE_CLI_AWS_READONLY: '1', STP_SOURCE_CLI_EXPECTED_ACCOUNT_ID: '123456789012' }
      })
    ).toThrow('AWS_PROFILE');
    expect(() =>
      resolveSmokeOptions({
        platform: 'linux',
        env: { STP_SOURCE_CLI_AWS_READONLY: '1', STP_SOURCE_CLI_AWS_PROFILE: 'development' }
      })
    ).toThrow('EXPECTED_ACCOUNT_ID');
  });

  test('uses safe defaults and validates user-selected targets', () => {
    expect(
      resolveSmokeOptions({ platform: 'linux', env: validEnvironment, makeProjectName: () => 'v4src-safe-123' })
    ).toEqual({
      profile: 'development',
      expectedAccountId: '123456789012',
      projectName: 'v4src-safe-123',
      stage: 'dev',
      region: 'eu-west-1'
    });

    expect(() =>
      resolveSmokeOptions({
        platform: 'linux',
        env: { ...validEnvironment, STP_SOURCE_CLI_PROJECT_NAME: 'unsafe project' }
      })
    ).toThrow('lowercase letters');
    expect(() =>
      resolveSmokeOptions({
        platform: 'linux',
        env: { ...validEnvironment, STP_SOURCE_CLI_REGION: 'not-a-region' }
      })
    ).toThrow('explicit AWS region');
  });

  test('requires a well-formed, terminal, singular JSONL result', () => {
    const success = JSON.stringify({ type: 'result', ts: 'now', ok: true, code: 'OK', message: 'done' });
    expect(parseCliJsonl(success, 'package').result.ok).toBe(true);
    expect(() => parseCliJsonl('not-json', 'package')).toThrow('invalid JSONL');
    expect(() => parseCliJsonl(`${success}\n${success}`, 'package')).toThrow('exactly one result');
    expect(() =>
      parseCliJsonl(`${success}\n${JSON.stringify({ type: 'log', message: 'too late' })}`, 'package')
    ).toThrow('after its result');
  });

  test('replaces inherited credentials, endpoints, and invocation state', () => {
    const env = buildCliEnvironment({
      profile: 'development',
      invocationId: 'source-cli-readonly-safe-123',
      inheritedEnvironment: {
        AWS_ACCESS_KEY_ID: 'ambient-access-key',
        AWS_SECRET_ACCESS_KEY: 'ambient-secret-key',
        AWS_SESSION_TOKEN: 'ambient-session-token',
        AWS_ENDPOINT_URL: 'http://global.invalid',
        AWS_ENDPOINT_URL_STS: 'http://sts.invalid',
        AWS_ENDPOINT_URL_S3: 'http://s3.invalid',
        AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'false',
        STP_INVOCATION_ID: '../../outside-the-worktree',
        PRESERVED_INPUT: 'preserved'
      }
    });

    expect(env).toMatchObject({
      AWS_PROFILE: 'development',
      AWS_DEFAULT_PROFILE: 'development',
      AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
      STP_INVOCATION_ID: 'source-cli-readonly-safe-123',
      PRESERVED_INPUT: 'preserved'
    });
    expect(
      Object.keys(env).filter((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_'))
    ).toEqual([]);
    expect(env.AWS_ACCESS_KEY_ID).toBeUndefined();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.AWS_SESSION_TOKEN).toBeUndefined();
  });

  test('requires one shared LayerVersion referenced by both validated functions', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-readonly-smoke-test-'));
    const templatePath = join(directory, 'template.json');
    const lambda = (name: string) => ({
      Type: 'AWS::Lambda::Function',
      Properties: {
        FunctionName: `example-dev-${name}`,
        Layers: [{ 'Fn::GetAtt': ['SharedLayer', 'LayerVersionArn'] }]
      }
    });
    const template = {
      Resources: {
        SharedLayer: { Type: 'AWS::Lambda::LayerVersion', Properties: {} },
        RetryAdvisor: lambda('retryAdvisor'),
        CatalogReport: lambda('catalogReport')
      }
    };

    try {
      await writeFile(templatePath, JSON.stringify(template));
      await expect(
        assertSynthesizedTemplate({
          templatePath,
          projectName: 'example',
          stage: 'dev',
          requireSharedLayer: true
        })
      ).resolves.toBeUndefined();

      delete template.Resources.SharedLayer;
      await writeFile(templatePath, JSON.stringify(template));
      await expect(
        assertSynthesizedTemplate({
          templatePath,
          projectName: 'example',
          stage: 'dev',
          requireSharedLayer: true
        })
      ).rejects.toThrow('Expected one shared Lambda layer');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
