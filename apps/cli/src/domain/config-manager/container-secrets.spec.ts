import { describe, expect, test } from 'bun:test';
import {
  getContainerSecretIamResources,
  getContainerSecretValueFrom,
  getContainerSecretVersionLabels,
  parseContainerSecretReference
} from './container-secrets';

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

  test('renders runtime references without putting a sensitive value in the template', () => {
    expect(getContainerSecretValueFrom(parseContainerSecretReference("$Secret('app-secret.token')")!)).toBe(
      '$ContainerSecret("app-secret.token")'
    );
    expect(getContainerSecretValueFrom(parseContainerSecretReference("$SsmParam('/app/token')")!)).toEqual({
      'Fn::Sub': 'arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter/app/token'
    });
    expect(getContainerSecretVersionLabels(["$SsmParam('/app/token')", "$Secret('app-secret')"])).toEqual({
      'stacktape.ssm-secret-version.0': '$ContainerSsmParameterVersion("/app/token")'
    });
  });

  test('scopes runtime permissions to the referenced resources', () => {
    expect(getContainerSecretIamResources(["$SsmParam('/app/token')", "$Secret('app-secret.token')"])).toEqual({
      parameterResources: [
        { 'Fn::Sub': 'arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter/app/token' }
      ],
      secretResources: [
        {
          'Fn::Sub': [
            'arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${SecretName}-*',
            { SecretName: 'app-secret' }
          ]
        }
      ]
    });
  });
});
