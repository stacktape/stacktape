import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import { expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  ENDPOINT_API_KEY_EXPIRES_AT,
  ENDPOINT_CUSTOM_CERTIFICATE_ARN,
  ENDPOINT_CUSTOM_DOMAIN,
  synthesizeAppSyncEndpoint
} from './endpoint-fixture';

test('an authored GraphQL field invokes its Lambda through a scoped data source after its schema exists', async () => {
  const template = await synthesizeAppSyncEndpoint();
  const output = process.env.STACKTAPE_SYNTHESIS_FAMILY_TEMPLATE_OUTPUT_DIR;
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'appsync-endpoint.json'), JSON.stringify(template));
  }
  const resources = template.Resources;
  const api = resources.GraphqlAppSyncGraphQlApi;
  const dataSource =
    resources.GraphqlHandlerAppSyncDataSource as KnownCloudFormationResource<'AWS::AppSync::DataSource'>;
  const resolver = resources.GraphqlQueryUserAppSyncResolver as KnownCloudFormationResource<'AWS::AppSync::Resolver'>;
  const role = resources.GraphqlHandlerAppSyncDataSourceRole;
  const logRoleLogicalId = cfLogicalNames.appsyncApiLogRole('graphql');
  expect(api).toMatchObject({
    Type: 'AWS::AppSync::GraphQLApi',
    Properties: {
      AuthenticationType: 'AWS_IAM',
      LogConfig: { CloudWatchLogsRoleArn: { 'Fn::GetAtt': [logRoleLogicalId, 'Arn'] } }
    }
  });
  // Field logs land under /aws/appsync/apis/<apiId>; the log role must be allowed to write exactly there.
  expect(resources[logRoleLogicalId]).toMatchObject({
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [{ Effect: 'Allow', Principal: { Service: 'appsync.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      },
      Policies: [
        {
          PolicyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                Resource: ['arn:aws:logs:eu-west-1:123456789999:log-group:/aws/appsync/apis/*']
              }
            ]
          }
        }
      ]
    }
  });
  expect(dataSource).toMatchObject({
    Type: 'AWS::AppSync::DataSource',
    Properties: {
      ApiId: { 'Fn::GetAtt': ['GraphqlAppSyncGraphQlApi', 'ApiId'] },
      LambdaConfig: { LambdaFunctionArn: { 'Fn::GetAtt': ['HandlerFunction', 'Arn'] } },
      ServiceRoleArn: { 'Fn::GetAtt': ['GraphqlHandlerAppSyncDataSourceRole', 'Arn'] }
    }
  });
  expect(role).toMatchObject({
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [{ Effect: 'Allow', Principal: { Service: 'appsync.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      },
      Policies: [
        {
          PolicyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Action: ['lambda:InvokeFunction'],
                Resource: [{ 'Fn::GetAtt': ['HandlerFunction', 'Arn'] }]
              }
            ]
          }
        }
      ]
    }
  });
  expect(resolver).toMatchObject({
    Type: 'AWS::AppSync::Resolver',
    DependsOn: ['GraphqlAppSyncGraphQlSchema', 'GraphqlHandlerAppSyncDataSource'],
    Properties: { FieldName: 'user', TypeName: 'Query' }
  });
  if (dataSource.Type !== 'AWS::AppSync::DataSource' || resolver.Type !== 'AWS::AppSync::Resolver')
    throw new Error('Missing resolver graph');
  expect(resolver.Properties.DataSourceName).toEqual(dataSource.Properties.Name);
  const schema = resources.GraphqlAppSyncGraphQlSchema as KnownCloudFormationResource<'AWS::AppSync::GraphQLSchema'>;
  if (schema.Type !== 'AWS::AppSync::GraphQLSchema') throw new Error('Missing schema');
  expect(schema.Properties.Definition).toContain('user(id: ID!): User');
  // Without a custom domain the published URLs are the AppSync defaults and no domain resources exist.
  const params = calculatedStackOverviewManager.stackInfoMap.resources.graphql.referencableParams;
  expect(params.url.value).toEqual({ 'Fn::GetAtt': ['GraphqlAppSyncGraphQlApi', 'GraphQLUrl'] });
  expect(params.realtimeUrl.value).toEqual({ 'Fn::GetAtt': ['GraphqlAppSyncGraphQlApi', 'RealtimeUrl'] });
  expect(resources[cfLogicalNames.appsyncApiDomain(ENDPOINT_CUSTOM_DOMAIN)]).toBeUndefined();
});

test('a custom domain uses its us-east-1 certificate and publishes both endpoint URLs under that domain', async () => {
  const template = await synthesizeAppSyncEndpoint({ customDomain: true });
  const resources = template.Resources;
  const domainLogicalId = cfLogicalNames.appsyncApiDomain(ENDPOINT_CUSTOM_DOMAIN);
  expect(resources[domainLogicalId]).toMatchObject({
    Type: 'AWS::AppSync::DomainName',
    Properties: { DomainName: ENDPOINT_CUSTOM_DOMAIN, CertificateArn: ENDPOINT_CUSTOM_CERTIFICATE_ARN }
  });
  expect(resources[cfLogicalNames.appsyncApiDomainAssociation(ENDPOINT_CUSTOM_DOMAIN)]).toMatchObject({
    Type: 'AWS::AppSync::DomainNameApiAssociation',
    Properties: {
      ApiId: { 'Fn::GetAtt': ['GraphqlAppSyncGraphQlApi', 'ApiId'] },
      DomainName: { Ref: domainLogicalId }
    }
  });
  // DNS record creation was disabled, so the customer keeps managing the record.
  expect(resources[cfLogicalNames.appsyncApiDnsRecord(ENDPOINT_CUSTOM_DOMAIN)]).toBeUndefined();
  // Connected workloads and the stack overview receive the custom-domain URLs, including the realtime path AppSync
  // serves subscriptions on.
  const params = calculatedStackOverviewManager.stackInfoMap.resources.graphql.referencableParams;
  expect(params.url.value).toBe(`https://${ENDPOINT_CUSTOM_DOMAIN}/graphql`);
  expect(params.customDomainUrl.value).toBe(`https://${ENDPOINT_CUSTOM_DOMAIN}/graphql`);
  expect(params.realtimeUrl.value).toBe(`wss://${ENDPOINT_CUSTOM_DOMAIN}/graphql/realtime`);
});

test('an API-key endpoint publishes the key value, not its identifier, with an hour-rounded expiry', async () => {
  const template = await synthesizeAppSyncEndpoint({ authentication: 'api-key' });
  const resources = template.Resources;
  expect(resources.GraphqlAppSyncGraphQlApi).toMatchObject({ Properties: { AuthenticationType: 'API_KEY' } });
  const apiKeyLogicalId = cfLogicalNames.appsyncApiKey('graphql');
  expect(resources[apiKeyLogicalId]).toMatchObject({
    Type: 'AWS::AppSync::ApiKey',
    Properties: {
      ApiId: { 'Fn::GetAtt': ['GraphqlAppSyncGraphQlApi', 'ApiId'] },
      Expires: Math.floor(Date.parse(ENDPOINT_API_KEY_EXPIRES_AT) / 3600000) * 3600
    }
  });
  // Connected workloads read the secret key value (`ApiKey`) through SSM; the resource's Ref is only its identifier.
  const params = calculatedStackOverviewManager.stackInfoMap.resources.graphql.referencableParams;
  expect(params.apiKey).toMatchObject({
    value: { 'Fn::GetAtt': [apiKeyLogicalId, 'ApiKey'] },
    ssmParameterName: expect.stringMatching(/\/graphql\/apiKey$/),
    showDuringPrint: false
  });
});
