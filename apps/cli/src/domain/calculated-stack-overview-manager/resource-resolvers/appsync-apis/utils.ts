import type { StpAppSyncApi } from '@domain-services/config-manager/resolved-types/appsync-apis';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { getAtt, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import type { CloudWatchLogGroupOptions } from '@stacktape/config/log-forwarding';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { getCloudFormationLogGroupClassProperties } from '../_utils/log-groups';

const APPSYNC_SERVICE_PRINCIPAL = 'appsync.amazonaws.com';

const getAssumeRolePolicy = () => ({
  Version: '2012-10-17',
  Statement: [{ Effect: 'Allow', Principal: { Service: APPSYNC_SERVICE_PRINCIPAL }, Action: 'sts:AssumeRole' }]
});

export const getGraphqlApiAuthentication = ({
  resource,
  userAuthPoolName
}: {
  resource: StpAppSyncApi;
  userAuthPoolName?: string;
}) => {
  switch (resource.authentication.type) {
    case 'aws-iam':
      return { AuthenticationType: 'AWS_IAM' as const };
    case 'api-key':
      return { AuthenticationType: 'API_KEY' as const };
    case 'user-auth-pool':
      return {
        AuthenticationType: 'AMAZON_COGNITO_USER_POOLS' as const,
        UserPoolConfig: {
          AppIdClientRegex: ref(
            cfLogicalNames.userPoolClient(userAuthPoolName || resource.authentication.properties.userAuthPoolName)
          ),
          AwsRegion: ref('AWS::Region'),
          DefaultAction: 'ALLOW',
          UserPoolId: ref(
            cfLogicalNames.userPool(userAuthPoolName || resource.authentication.properties.userAuthPoolName)
          )
        }
      };
  }
};

export const getAppSyncApiLogRole = ({ accountId, region }: { accountId: string; region: string }) =>
  cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: getAssumeRolePolicy(),
    Policies: [
      {
        PolicyName: 'write-appsync-field-logs',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/appsync/apis/*`]
            }
          ]
        }
      }
    ]
  });

export const getAppSyncGraphqlApi = ({
  resource,
  userAuthPoolName
}: {
  resource: StpAppSyncApi;
  userAuthPoolName?: string;
}) => {
  const authentication = getGraphqlApiAuthentication({ resource, userAuthPoolName });
  return cfnResource('AWS::AppSync::GraphQLApi', {
    Name: awsResourceNames.appsyncApi({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: resource.name
    }),
    ...authentication,
    IntrospectionConfig: resource.introspectionEnabled ? 'ENABLED' : 'DISABLED',
    QueryDepthLimit: resource.queryDepthLimit,
    ResolverCountLimit: resource.resolverCountLimit,
    XrayEnabled: resource.xrayEnabled,
    ...(!resource.logging?.disabled
      ? {
          LogConfig: {
            CloudWatchLogsRoleArn: getAtt(cfLogicalNames.appsyncApiLogRole(resource.name), 'Arn'),
            ExcludeVerboseContent: !resource.logging?.includeVerboseContent,
            FieldLogLevel: (resource.logging?.fieldLogLevel || 'error').toUpperCase()
          }
        }
      : {}),
    Tags: stackManager.getTags()
  });
};

export const getAppSyncSchema = ({ definition, resource }: { definition: string; resource: StpAppSyncApi }) =>
  cfnResource('AWS::AppSync::GraphQLSchema', {
    ApiId: getAtt(cfLogicalNames.appsyncApi(resource.name), 'ApiId'),
    Definition: definition
  });

export const getAppSyncApiLogGroup = ({
  logClass,
  resource,
  retentionDays
}: {
  logClass?: CloudWatchLogGroupOptions['logClass'];
  resource: StpAppSyncApi;
  retentionDays: number;
}) =>
  cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: sub('/aws/appsync/apis/${ApiId}', {
      ApiId: getAtt(cfLogicalNames.appsyncApi(resource.name), 'ApiId')
    }),
    ...getCloudFormationLogGroupClassProperties(logClass),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays),
    Tags: stackManager.getTags()
  });

export const getAppSyncApiKey = ({ expires, resource }: { expires: number; resource: StpAppSyncApi }) =>
  cfnResource('AWS::AppSync::ApiKey', {
    ApiId: getAtt(cfLogicalNames.appsyncApi(resource.name), 'ApiId'),
    Description: 'Managed by Stacktape',
    Expires: expires
  });

export const getAppSyncApiKeyReference = (apiKeyLogicalName: string) => getAtt(apiKeyLogicalName, 'ApiKey');

export const getAppSyncCustomDomainUrls = (domainName: string) => ({
  url: `https://${domainName}/graphql`,
  realtimeUrl: `wss://${domainName}/graphql/realtime`
});

export const getAppSyncDataSourceRole = ({ lambdaEndpointArn }: { lambdaEndpointArn: string | Intrinsic }) =>
  cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: getAssumeRolePolicy(),
    Policies: [
      {
        PolicyName: 'invoke-appsync-resolver-lambda',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Action: ['lambda:InvokeFunction'], Resource: [lambdaEndpointArn] }]
        }
      }
    ]
  });

export const getAppSyncLambdaDataSource = ({
  api,
  lambdaEndpointArn,
  lambdaFunction
}: {
  api: StpAppSyncApi;
  lambdaEndpointArn: string | Intrinsic;
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  const name = awsResourceNames.appsyncDataSource({
    stpAppsyncApiName: api.name,
    stpLambdaFunctionName: lambdaFunction.name
  });
  if (!/^[_A-Za-z][_0-9A-Za-z]*$/.test(name)) {
    throw new Error(`Generated AppSync data source name is invalid: ${name}`);
  }
  return cfnResource('AWS::AppSync::DataSource', {
    ApiId: getAtt(cfLogicalNames.appsyncApi(api.name), 'ApiId'),
    LambdaConfig: { LambdaFunctionArn: lambdaEndpointArn },
    Name: name,
    ServiceRoleArn: getAtt(
      cfLogicalNames.appsyncApiDataSourceRole({
        stpAppsyncApiName: api.name,
        stpLambdaFunctionName: lambdaFunction.name
      }),
      'Arn'
    ),
    Type: 'AWS_LAMBDA'
  });
};

export const getAppSyncLambdaResolver = ({
  api,
  fieldName,
  lambdaFunction,
  typeName
}: {
  api: StpAppSyncApi;
  fieldName: string;
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
  typeName: string;
}) => {
  const dataSourceLogicalName = cfLogicalNames.appsyncApiDataSource({
    stpAppsyncApiName: api.name,
    stpLambdaFunctionName: lambdaFunction.name
  });
  const resolver = cfnResource('AWS::AppSync::Resolver', {
    ApiId: getAtt(cfLogicalNames.appsyncApi(api.name), 'ApiId'),
    DataSourceName: awsResourceNames.appsyncDataSource({
      stpAppsyncApiName: api.name,
      stpLambdaFunctionName: lambdaFunction.name
    }),
    FieldName: fieldName,
    TypeName: typeName
  });
  resolver.DependsOn = [cfLogicalNames.appsyncApiSchema(api.name), dataSourceLogicalName];
  return resolver;
};

export const getAppSyncDomain = ({
  certificateArn,
  domainName
}: {
  certificateArn: string | Intrinsic;
  domainName: string;
}) =>
  cfnResource('AWS::AppSync::DomainName', {
    CertificateArn: certificateArn,
    DomainName: domainName,
    Tags: stackManager.getTags()
  });

export const getAppSyncDomainAssociation = ({
  domainName,
  resource
}: {
  domainName: string;
  resource: StpAppSyncApi;
}) =>
  cfnResource('AWS::AppSync::DomainNameApiAssociation', {
    ApiId: getAtt(cfLogicalNames.appsyncApi(resource.name), 'ApiId'),
    DomainName: ref(cfLogicalNames.appsyncApiDomain(domainName))
  });

export const getAppSyncDnsRecord = ({ domainName, hostedZoneId }: { domainName: string; hostedZoneId: string }) =>
  cfnResource('AWS::Route53::RecordSet', {
    HostedZoneId: hostedZoneId,
    Name: domainName,
    Type: 'A',
    AliasTarget: {
      DNSName: getAtt(cfLogicalNames.appsyncApiDomain(domainName), 'AppSyncDomainName'),
      HostedZoneId: 'Z2FDTNDATAQYW2'
    }
  });
