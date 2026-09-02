import { describe, expect, test } from 'bun:test';
import { redactAwsRequestInput } from './redact-request-input';

const sentinel = 'SENTINEL-sensitive-aws-value';

describe('AWS request debug redaction', () => {
  test('redacts modeled secret values without mutating the request', () => {
    const input = { SecretBinary: new Uint8Array([1, 2, 3]), SecretId: 'customer-secret', SecretString: sentinel };
    const redacted = redactAwsRequestInput({
      commandName: 'PutSecretValueCommand',
      input
    });

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted.SecretId).toBe('customer-secret');
    expect(redacted.SecretString).toBe('...hidden sensitive content...');
    expect(input.SecretString).toBe(sentinel);
    expect(input.SecretBinary).toBeInstanceOf(Uint8Array);
  });

  test('redacts SSM parameter values', () => {
    const input = { Name: '/customer/token', Type: 'SecureString' as const, Value: sentinel };
    const redacted = redactAwsRequestInput({
      commandName: 'PutParameterCommand',
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

  test('hides arbitrary ECS Exec and Systems Manager shell text', () => {
    const ecsInput = {
      cluster: 'cluster',
      command: `curl -H Authorization:${sentinel}`,
      interactive: true,
      task: 'task'
    };
    const ssmInput = {
      DocumentName: 'AWS-RunShellScript',
      InstanceIds: ['i-123'],
      Parameters: { commands: [`export TOKEN=${sentinel}`], workingDirectory: ['/'] }
    };
    const redacted = {
      ecs: redactAwsRequestInput({
        commandName: 'ExecuteCommandCommand',
        input: ecsInput
      }),
      ssm: redactAwsRequestInput({
        commandName: 'SendCommandCommand',
        input: ssmInput
      })
    };

    expect(JSON.stringify(redacted)).not.toContain(sentinel);
    expect(redacted.ecs).toMatchObject({ cluster: 'cluster', interactive: true, task: 'task' });
    expect(redacted.ssm).toMatchObject({
      DocumentName: 'AWS-RunShellScript',
      InstanceIds: ['i-123'],
      Parameters: { workingDirectory: ['/'] }
    });
    expect(ecsInput.command).toContain(sentinel);
    expect(ssmInput.Parameters.commands[0]).toContain(sentinel);
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
