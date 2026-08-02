import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import Authorizer from '@cloudform/apiGatewayV2/authorizer';
import Route from '@cloudform/apiGatewayV2/route';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import LambdaPermission from '@cloudform/lambda/permission';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { resourceURIs } from 'src/utils/aws-resource-uris';
import { CliError } from '@utils/errors';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { ContainerWorkloadHttpApiIntegrationProps, HttpApiIntegrationProps } from '@stacktape/config/events';
import type { StpAuthorizer } from '@stacktape/config/user-pools';

export const getHttpApiLambdaPermission = ({
  lambdaEndpointArn,
  stpResourceName
}: {
  lambdaEndpointArn: string | IntrinsicFunction;
  stpResourceName: string;
}) => {
  return new LambdaPermission({
    FunctionName: lambdaEndpointArn,
    Action: 'lambda:InvokeFunction',
    Principal: 'apigateway.amazonaws.com',
    SourceArn: Join('', [
      `arn:aws:execute-api:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:`,
      Ref(cfLogicalNames.httpApi(stpResourceName)),
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
    return new Authorizer({
      ApiId: Ref(cfLogicalNames.httpApi(stpResourceName)),
      AuthorizerType: 'JWT',
      IdentitySource: authorizerConfig.properties.identitySources || ['$request.header.Authorization'],
      JwtConfiguration: {
        Audience: [Ref(cfLogicalNames.userPoolClient(authorizerConfig.properties.userPoolName))],
        Issuer: Join('/', [
          `https://cognito-idp.${calculatedStackOverviewManager.context.region}.amazonaws.com`,
          Ref(cfLogicalNames.userPool(authorizerConfig.properties.userPoolName))
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
      ? Ref(authorizerLambdaProps.aliasLogicalName)
      : GetAtt(authorizerLambdaProps.cfLogicalName, 'Arn');
    // `${arns.lambdaFromFullName({
    //   accountId: calculatedStackOverviewManager.context.accountId,
    //   lambdaAwsName: authorizerLambdaProps.resourceName,
    //   region: calculatedStackOverviewManager.context.region
    // })}${authorizerLambdaProps.aliasLogicalName ? `:${awsResourceNames.lambdaStpAlias()}` : ''}`;
    return new Authorizer({
      ApiId: Ref(cfLogicalNames.httpApi(stpResourceName)),
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
  return new Route({
    ApiId: Ref(cfLogicalNames.httpApi(httpApiGatewayInfo.name)),
    RouteKey: routeKey,
    ...(authorizer && {
      AuthorizerId: Ref(
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
    Target: Join('/', [
      'integrations',
      Ref(
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
