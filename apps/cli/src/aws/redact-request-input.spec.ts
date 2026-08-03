import { describe, expect, test } from 'bun:test';
import { RegisterTaskDefinitionRequestFilterSensitiveLog } from '@aws-sdk/client-ecs';
import { PutSecretValueRequestFilterSensitiveLog } from '@aws-sdk/client-secrets-manager';
import { PutParameterRequestFilterSensitiveLog } from '@aws-sdk/client-ssm';
import { redactAwsRequestInput } from './redact-request-input';

const sentinel = 'SENTINEL-sensitive-aws-value';

describe('AWS request debug redaction', () => {
  test('uses the generated service filter for modeled secret values without mutating the request', () => {
    const input = { SecretBinary: new Uint8Array([1, 2, 3]), SecretId: 'customer-secret', SecretString: sentinel };
    const redacted = redactAwsRequestInput({
      commandName: 'PutSecretValueCommand',
      filterSensitiveLog: PutSecretValueRequestFilterSensitiveLog,
      input
    });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted.SecretId).toBe('customer-secret');
    expect(redacted.SecretString).toBe('***SensitiveInformation***');
    expect(input.SecretString).toBe(sentinel);
    expect(input.SecretBinary).toBeInstanceOf(Uint8Array);
  });

  test('uses the generated service filter for SSM parameter values', () => {
    const input = { Name: '/customer/token', Type: 'SecureString' as const, Value: sentinel };
    const redacted = redactAwsRequestInput({
      commandName: 'PutParameterCommand',
      filterSensitiveLog: PutParameterRequestFilterSensitiveLog,
      input
    });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted).toMatchObject({ Name: '/customer/token', Type: 'SecureString' });
    expect(input.Value).toBe(sentinel);
  });

  test('covers modeled secret and SSM fields even when a command supplies no filter', () => {
    const secret = redactAwsRequestInput({
      commandName: 'PutSecretValueCommand',
      input: { SecretId: 'customer-secret', SecretString: sentinel }
    });
    const parameter = redactAwsRequestInput({
      commandName: 'PutParameterCommand',
      input: { Name: '/customer/token', Value: sentinel }
    });

    expect(JSON.stringify({ parameter, secret })).not.toContain(sentinel);
  });

  test('redacts CodeBuild project and build-override environment values while preserving their names', () => {
    const input = {
      environment: {
        computeType: 'BUILD_GENERAL1_SMALL',
        environmentVariables: [{ name: 'DATABASE_PASSWORD', type: 'PLAINTEXT', value: sentinel }],
        image: 'public.ecr.aws/docker/library/node:24',
        type: 'LINUX_CONTAINER'
      },
      environmentVariablesOverride: [{ name: 'API_TOKEN', type: 'PLAINTEXT', value: sentinel }],
      projectName: 'stacktape-build'
    };
    const redacted = redactAwsRequestInput({ commandName: 'StartBuildCommand', input });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted).toMatchObject({
      environment: { environmentVariables: [{ name: 'DATABASE_PASSWORD', type: 'PLAINTEXT' }] },
      environmentVariablesOverride: [{ name: 'API_TOKEN', type: 'PLAINTEXT' }],
      projectName: 'stacktape-build'
    });
    expect(input.environment.environmentVariables[0].value).toBe(sentinel);
    expect(input.environmentVariablesOverride[0].value).toBe(sentinel);
  });

  test('redacts ECS task and run overrides that the generated service filter leaves intact', () => {
    const input = {
      containerDefinitions: [
        { environment: [{ name: 'DATABASE_PASSWORD', value: sentinel }], image: 'example/image', name: 'web' }
      ],
      family: 'stacktape-service',
      overrides: {
        containerOverrides: [{ environment: [{ name: 'API_TOKEN', value: sentinel }], name: 'worker' }]
      }
    };
    const redacted = redactAwsRequestInput({
      commandName: 'RegisterTaskDefinitionCommand',
      filterSensitiveLog: RegisterTaskDefinitionRequestFilterSensitiveLog,
      input
    });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted).toMatchObject({
      containerDefinitions: [{ environment: [{ name: 'DATABASE_PASSWORD' }], name: 'web' }],
      overrides: { containerOverrides: [{ environment: [{ name: 'API_TOKEN' }], name: 'worker' }] }
    });
    expect(input.containerDefinitions[0].environment[0].value).toBe(sentinel);
  });

  test('hides CloudFormation templates and parameter values while preserving parameter names', () => {
    const input = {
      Parameters: [{ ParameterKey: 'DatabasePassword', ParameterValue: sentinel }],
      StackName: 'customer-stack',
      TemplateBody: `Resources: ${sentinel}`
    };
    const redacted = redactAwsRequestInput({ commandName: 'CreateChangeSetCommand', input });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted).toMatchObject({
      Parameters: [{ ParameterKey: 'DatabasePassword' }],
      StackName: 'customer-stack'
    });
    expect(input.Parameters[0].ParameterValue).toBe(sentinel);
    expect(input.TemplateBody).toContain(sentinel);
  });

  test('hides request bodies, binary values and log batches', () => {
    const redacted = redactAwsRequestInput({
      commandName: 'PutObjectCommand',
      input: {
        Body: sentinel,
        Checksum: new Uint8Array([1, 2, 3]),
        Key: 'artifact.zip',
        logEvents: [{ message: sentinel, timestamp: 1 }]
      }
    });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted.Key).toBe('artifact.zip');
  });
});
