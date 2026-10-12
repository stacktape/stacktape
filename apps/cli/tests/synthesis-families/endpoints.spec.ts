import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import { expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { synthesizeAppSyncEndpoint } from './endpoint-fixture';

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
  expect(api).toMatchObject({ Type: 'AWS::AppSync::GraphQLApi', Properties: { AuthenticationType: 'AWS_IAM' } });
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
});
