import { globalStateManager } from '@application-services/global-state-manager';
import Authorizer from '@cloudform/apiGatewayV2/authorizer';
import Route from '@cloudform/apiGatewayV2/route';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import LambdaPermission from '@cloudform/lambda/permission';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { resourceURIs } from '@shared/naming/resource-uris';
import { ExpectedError } from '@utils/errors';

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
      `arn:aws:execute-api:${globalStateManager.region}:${globalStateManager.targetAwsAccount.awsAccountId}:`,
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
          `https://cognito-idp.${globalStateManager.region}.amazonaws.com`,
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
    //   accountId: globalStateManager.targetAwsAccount.awsAccountId,
    //   lambdaAwsName: authorizerLambdaProps.resourceName,
    //   region: globalStateManager.region
    // })}${authorizerLambdaProps.aliasLogicalName ? `:${awsResourceNames.lambdaStpAlias()}` : ''}`;
    return new Authorizer({
      ApiId: Ref(cfLogicalNames.httpApi(stpResourceName)),
      AuthorizerType: 'REQUEST',
      AuthorizerUri: resourceURIs.lambdaAuthorizer({
        region: globalStateManager.region,
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
  let routeKey: string;
  const { path, method, authorizer } = eventDetails;
  const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
    stpResourceReference: eventDetails.httpApiGatewayName,
    referencedFrom: workloadName
  });
  if (path === '*' || path === '$default') {
    routeKey = '$default';
    if (method && !(method === '*')) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Error in compute resource ${workloadName}. HttpApi event: If you specify path "*" ("$default") the only allowed method is "*" (ANY)`
      );
    }
  } else {
    routeKey = `${method === '*' ? 'ANY' : method} ${path}`;
  }
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
