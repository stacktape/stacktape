import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, join, ref } from '@stacktape/cloudformation/intrinsics';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { resourceURIs } from 'src/utils/aws-resource-uris';
import { CliError } from '@utils/errors';
import type { ContainerWorkloadHttpApiIntegrationProps, HttpApiIntegrationProps } from '@stacktape/config/events';
import type { StpAuthorizer } from '@stacktape/config/user-pools';

export const getHttpApiLambdaPermission = ({
  lambdaEndpointArn,
  stpResourceName
}: {
  lambdaEndpointArn: string | Intrinsic;
  stpResourceName: string;
}) => {
  return cfnResource('AWS::Lambda::Permission', {
    FunctionName: lambdaEndpointArn,
    Action: 'lambda:InvokeFunction',
    Principal: 'apigateway.amazonaws.com',
    SourceArn: join('', [
      `arn:aws:execute-api:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:`,
      ref(cfLogicalNames.httpApi(stpResourceName)),
      '/*'
    ])
  });
};

export const getHttpApiAuthorizerResource = (
  authorizerConfig: StpAuthorizer,
  authorizerName: string,
  stpResourceName: string
) => {
  if (authorizerConfig.type === 'cognito') {
    return cfnResource('AWS::ApiGatewayV2::Authorizer', {
      ApiId: ref(cfLogicalNames.httpApi(stpResourceName)),
      AuthorizerType: 'JWT',
      IdentitySource: authorizerConfig.properties.identitySources || ['$request.header.Authorization'],
      JwtConfiguration: {
        Audience: [ref(cfLogicalNames.userPoolClient(authorizerConfig.properties.userPoolName))],
        Issuer: join('/', [
          `https://cognito-idp.${calculatedStackOverviewManager.context.region}.amazonaws.com`,
          ref(cfLogicalNames.userPool(authorizerConfig.properties.userPoolName))
        ])
      },
      Name: authorizerName
    });
  }

  if (authorizerConfig.type === 'lambda') {
    const authorizerLambdaProps = configManager.functions.find(
      ({ name }) => name === authorizerConfig.properties.functionName
    );
    const authorizerLambdaEndpointArn = authorizerLambdaProps.aliasLogicalName
      ? ref(authorizerLambdaProps.aliasLogicalName)
      : getAtt(authorizerLambdaProps.cfLogicalName, 'Arn');
    // `${arns.lambdaFromFullName({
    //   accountId: calculatedStackOverviewManager.context.accountId,
    //   lambdaAwsName: authorizerLambdaProps.resourceName,
    //   region: calculatedStackOverviewManager.context.region
    // })}${authorizerLambdaProps.aliasLogicalName ? `:${awsResourceNames.lambdaStpAlias()}` : ''}`;
    return cfnResource('AWS::ApiGatewayV2::Authorizer', {
      ApiId: ref(cfLogicalNames.httpApi(stpResourceName)),
      AuthorizerType: 'REQUEST',
      AuthorizerUri: resourceURIs.lambdaAuthorizer({
        region: calculatedStackOverviewManager.context.region,
        lambdaEndpointArn: authorizerLambdaEndpointArn
      }),
      IdentitySource: authorizerConfig.properties.identitySources || [],
      Name: authorizerName,
      EnableSimpleResponses: authorizerConfig.properties.iamResponse !== true,
      AuthorizerResultTtlInSeconds: authorizerConfig.properties.cacheResultSeconds || 0,
      AuthorizerPayloadFormatVersion: '2.0'
    });
  }
};

export const getHttpApiRoute = ({
  workloadName,
  eventDetails
}: {
  workloadName: string;
  eventDetails: HttpApiIntegrationProps | ContainerWorkloadHttpApiIntegrationProps;
}) => {
  const { path, method, authorizer } = eventDetails;
  const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
    stpResourceReference: eventDetails.httpApiGatewayName,
    referencedFrom: workloadName
  });
  const routeKey = getHttpApiRouteKey({ workloadName, path, method });
  return cfnResource('AWS::ApiGatewayV2::Route', {
    ApiId: ref(cfLogicalNames.httpApi(httpApiGatewayInfo.name)),
    RouteKey: routeKey,
    ...(authorizer && {
      AuthorizerId: ref(
        cfLogicalNames.httpApiAuthorizer({
          path,
          method,
          stpResourceName: httpApiGatewayInfo.name
        })
      ),
      AuthorizationType: {
        cognito: 'JWT',
        lambda: 'CUSTOM'
        // @todo scopes?
      }[authorizer.type]
    }),
    Target: join('/', [
      'integrations',
      ref(
        (eventDetails as ContainerWorkloadHttpApiIntegrationProps).containerPort
          ? cfLogicalNames.httpApiContainerWorkloadIntegration({
              stpResourceName: workloadName,
              stpHttpApiGatewayName: httpApiGatewayInfo.name,
              targetContainerPort: (eventDetails as ContainerWorkloadHttpApiIntegrationProps).containerPort
            })
          : cfLogicalNames.httpApiLambdaIntegration({
              stpResourceName: workloadName,
              stpHttpApiGatewayName: httpApiGatewayInfo.name
            })
      )
    ])
  });
};

export const getHttpApiRouteKey = ({
  workloadName,
  path,
  method
}: {
  workloadName: string;
  path: HttpApiIntegrationProps['path'];
  method: HttpApiIntegrationProps['method'];
}) => {
  if (path === '*' || path === '$default') {
    if (method && !(method === '*')) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_HTTP_API_DEFAULT_ROUTE_METHOD_INVALID',
        message: `HTTP API event on \`${workloadName}\` uses the default route but method \`${method}\`.`,
        hints: 'Use method `*` (ANY) when path is `*` or `$default`.'
      });
    }
    return '$default';
  }
  return `${method === '*' ? 'ANY' : method} ${path}`;
};
