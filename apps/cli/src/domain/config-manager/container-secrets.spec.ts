import { describe, expect, test } from 'bun:test';
import { parseContainerSecretReference } from './container-secrets';

describe('container secrets', () => {
  test('accepts only one exact SSM or Secrets Manager directive', () => {
    expect(parseContainerSecretReference("$SsmParam('/app/prod/token')")).toEqual({
      service: 'ssm',
      reference: '/app/prod/token',
      parameterName: '/app/prod/token'
    });
    expect(parseContainerSecretReference("$Secret('app-secret.token')")).toEqual({
      service: 'secretsmanager',
      reference: 'app-secret.token',
      secretName: 'app-secret',
      jsonKey: 'token'
    });
    expect(parseContainerSecretReference("prefix-$SsmParam('/app/token')")).toBeNull();
    expect(parseContainerSecretReference("$ResourceParam('db','connectionString')")).toBeNull();
    expect(parseContainerSecretReference("$Secret('app-secret').token")).toBeNull();
  });
});
