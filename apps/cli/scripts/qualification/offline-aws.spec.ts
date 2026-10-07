import { afterEach, describe, expect, test } from 'bun:test';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { CloudFormationClient, DescribeStacksCommand, ListStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { BudgetsClient, DescribeBudgetsCommand } from '@aws-sdk/client-budgets';
import { CostExplorerClient, GetTagsCommand } from '@aws-sdk/client-cost-explorer';
import { GetTagKeysCommand, ResourceGroupsTaggingAPIClient } from '@aws-sdk/client-resource-groups-tagging-api';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { buildOfflineQualificationEnvironment, startOfflineAwsServer, type OfflineAwsServer } from './offline-aws';

let server: OfflineAwsServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('offline AWS qualification guard', () => {
  test('answers identity and known missing-stack reads but records every other attempted network call', async () => {
    server = await startOfflineAwsServer();
    const client = new STSClient({
      endpoint: server.endpoint,
      region: 'eu-west-1',
      credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
    });
    try {
      const identity = await client.send(new GetCallerIdentityCommand({}));
      expect(identity.Account).toBe('111122223333');
      expect(server.unexpectedRequests).toEqual([]);

      const cloudFormation = new CloudFormationClient({
        endpoint: server.endpoint,
        region: 'eu-west-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
      });
      try {
        await expect(
          cloudFormation.send(new DescribeStacksCommand({ StackName: 'qualification-project-qualification' }))
        ).rejects.toMatchObject({ name: 'ValidationError', message: expect.stringContaining('does not exist') });
        await expect(
          cloudFormation.send(new ListStackResourcesCommand({ StackName: 'qualification-project-qualification' }))
        ).rejects.toMatchObject({ name: 'ValidationError', message: expect.stringContaining('does not exist') });
        expect(server.unexpectedRequests).toEqual([]);
      } finally {
        cloudFormation.destroy();
      }

      const tagging = new ResourceGroupsTaggingAPIClient({
        endpoint: server.endpoint,
        region: 'eu-west-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
      });
      try {
        expect((await tagging.send(new GetTagKeysCommand({}))).TagKeys).toEqual([]);
        expect(server.unexpectedRequests).toEqual([]);
      } finally {
        tagging.destroy();
      }

      const costExplorer = new CostExplorerClient({
        endpoint: server.endpoint,
        region: 'eu-west-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
      });
      const budgets = new BudgetsClient({
        endpoint: server.endpoint,
        region: 'eu-west-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
      });
      try {
        expect(
          (await costExplorer.send(new GetTagsCommand({ TimePeriod: { Start: '2025-01-01', End: '2026-01-01' } }))).Tags
        ).toEqual([]);
        expect((await budgets.send(new DescribeBudgetsCommand({ AccountId: '111122223333' }))).Budgets).toEqual([]);
        expect(server.unexpectedRequests).toEqual([]);
      } finally {
        costExplorer.destroy();
        budgets.destroy();
      }

      server.registerSecretReferences(['qualification-database.password', 'qualification-database.apiKey']);
      const secrets = new SecretsManagerClient({
        endpoint: server.endpoint,
        region: 'eu-west-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
      });
      try {
        const secret = await secrets.send(new GetSecretValueCommand({ SecretId: 'qualification-database' }));
        expect(secret.Name).toBe('qualification-database');
        expect(JSON.parse(secret.SecretString ?? '')).toEqual({ password: 'offline-value', apiKey: 'offline-value' });
        expect(server.unexpectedRequests).toEqual([]);
        await expect(secrets.send(new GetSecretValueCommand({ SecretId: 'wrong-secret' }))).rejects.toThrow(
          'Unknown offline secret'
        );
        expect(server.unexpectedRequests).toEqual([expect.stringContaining('GetSecretValue:wrong-secret')]);
      } finally {
        secrets.destroy();
      }

      // A project with a MongoDB Atlas cluster checks that provider credentials exist before packaging.
      const parameters = new SSMClient({
        endpoint: server.endpoint,
        region: 'eu-west-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' }
      });
      try {
        const credentials = await parameters.send(
          new GetParameterCommand({
            Name: '/stp/third-party-provider-credentials/us-east-1/mongodb-atlas',
            WithDecryption: true
          })
        );
        expect(JSON.parse(credentials.Parameter?.Value ?? '')).toEqual({
          publicKey: 'offline-value',
          privateKey: 'offline-value'
        });
        expect(server.unexpectedRequests).toEqual([expect.stringContaining('GetSecretValue:wrong-secret')]);
        await expect(parameters.send(new GetParameterCommand({ Name: '/app/prod/token' }))).rejects.toThrow();
        // An open-search-domain validates its instance type's storage support before packaging.
        const limits = await fetch(
          `${server.endpoint}/2021-01-01/opensearch/instanceTypeLimits/OpenSearch_2.17/m4.large.search`
        );
        expect(limits.status).toBe(200);
        const limitsBody = (await limits.json()) as { LimitsByRole: { data: { StorageTypes: unknown[] } } };
        expect(limitsBody.LimitsByRole.data.StorageTypes[0]).toMatchObject({ StorageSubTypeName: 'gp3' });
        expect(server.unexpectedRequests).toEqual([
          expect.stringContaining('GetSecretValue:wrong-secret'),
          expect.stringContaining('GetParameter')
        ]);
      } finally {
        parameters.destroy();
      }

      const blocked = await fetch(`${server.endpoint}/s3-artifact-upload`, { method: 'PUT', body: 'blocked' });
      expect(blocked.status).toBe(501);
      expect(server.unexpectedRequests).toEqual([
        expect.stringContaining('GetSecretValue:wrong-secret'),
        expect.stringContaining('GetParameter'),
        'PUT /s3-artifact-upload (UnknownAction)'
      ]);
    } finally {
      client.destroy();
    }
  });

  test('removes inherited credentials and routes AWS plus Stacktape endpoints to loopback', () => {
    const environment = buildOfflineQualificationEnvironment({
      endpoint: 'http://127.0.0.1:12345',
      invocationId: 'qualification-test',
      homeDirectory: 'C:\\qualification\\home',
      inheritedEnvironment: {
        AWS_PROFILE: 'production',
        AWS_ACCESS_KEY_ID: 'inherited',
        AWS_SECRET_ACCESS_KEY: 'inherited',
        AWS_ENDPOINT_URL_S3: 'https://real.example',
        AWS_ROLE_ARN: 'arn:aws:iam::123456789012:role/production',
        AWS_WEB_IDENTITY_TOKEN_FILE: 'C:\\secrets\\token',
        Aws_Container_Credentials_Full_Uri: 'http://169.254.170.2/credentials',
        Stacktape_Api_Key: 'mixed-case-inherited',
        STACKTAPE_API_KEY: 'inherited',
        GITHUB_TOKEN: 'must-not-be-inherited',
        PATH: 'C:\\tools'
      }
    });
    expect(environment.AWS_PROFILE).toBeUndefined();
    expect(environment.AWS_ENDPOINT_URL_S3).toBeUndefined();
    expect(environment.AWS_ROLE_ARN).toBeUndefined();
    expect(environment.AWS_WEB_IDENTITY_TOKEN_FILE).toBeUndefined();
    expect(environment.Aws_Container_Credentials_Full_Uri).toBeUndefined();
    expect(environment.Stacktape_Api_Key).toBeUndefined();
    expect(environment.GITHUB_TOKEN).toBeUndefined();
    expect(environment.PATH).toBe('C:\\tools');
    expect(environment.HOME).toBe('C:\\qualification\\home');
    expect(environment.STACKTAPE_API_KEY).toBe('offline-qualification-do-not-use');
    expect(environment.AWS_ENDPOINT_URL).toBe('http://127.0.0.1:12345');
    expect(environment.AWS_ENDPOINT_URL_STS).toBe('http://127.0.0.1:12345');
    expect(environment.STP_CUSTOM_TRPC_API_ENDPOINT).toStartWith('http://127.0.0.1:12345');
  });
});
