import { describe, expect, test } from 'bun:test';
import type { StpAppSyncApi } from '@domain-services/config-manager/resolved-types/appsync-apis';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  getAppSyncApiKeyReference,
  getAppSyncCustomDomainUrls,
  getAppSyncDataSourceRole,
  getAppSyncLambdaResolver,
  getGraphqlApiAuthentication
} from './utils';

const api = {
  type: 'appsync-api',
  name: 'graphql',
  nameChain: ['graphql'],
  configParentResourceType: 'appsync-api',
  authentication: { type: 'aws-iam' },
  schemaFilePath: 'schema.graphql',
  queryDepthLimit: 10,
  resolverCountLimit: 1000,
  introspectionEnabled: true,
  xrayEnabled: false
} as StpAppSyncApi;

const lambdaFunction = { type: 'function', name: 'get-user' } as StpLambdaFunction;

describe('AppSync Lambda resolver synthesis', () => {
  test('binds Cognito authentication to the managed user-pool client', () => {
    expect(
      getGraphqlApiAuthentication({
        resource: {
          ...api,
          authentication: { type: 'user-auth-pool', properties: { userAuthPoolName: 'customers' } }
        },
        userAuthPoolName: 'customers'
      })
    ).toMatchObject({
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
      UserPoolConfig: {
        AppIdClientRegex: { Ref: cfLogicalNames.userPoolClient('customers') },
        UserPoolId: { Ref: cfLogicalNames.userPool('customers') }
      }
    });
  });

  test('uses the API key value attribute and the AppSync custom-domain realtime path', () => {
    expect(getAppSyncApiKeyReference('GraphqlApiKey')).toEqual({ 'Fn::GetAtt': ['GraphqlApiKey', 'ApiKey'] });
    expect(getAppSyncCustomDomainUrls('api.example.com')).toEqual({
      url: 'https://api.example.com/graphql',
      realtimeUrl: 'wss://api.example.com/graphql/realtime'
    });
  });

  test('makes every resolver wait for both the schema and its Lambda data source', () => {
    const resolver = getAppSyncLambdaResolver({ api, fieldName: 'user', lambdaFunction, typeName: 'Query' });
    expect(resolver.DependsOn).toEqual([
      cfLogicalNames.appsyncApiSchema(api.name),
      cfLogicalNames.appsyncApiDataSource({
        stpAppsyncApiName: api.name,
        stpLambdaFunctionName: lambdaFunction.name
      })
    ]);
    expect(resolver).toMatchObject({
      Type: 'AWS::AppSync::Resolver',
      Properties: { FieldName: 'user', TypeName: 'Query' }
    });
  });

  test('scopes the AppSync service role to the target Lambda ARN', () => {
    expect(
      getAppSyncDataSourceRole({ lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:123:function:get-user' })
    ).toMatchObject({
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['lambda:InvokeFunction'],
                  Resource: ['arn:aws:lambda:eu-west-1:123:function:get-user']
                }
              ]
            }
          }
        ]
      }
    });
  });
});
