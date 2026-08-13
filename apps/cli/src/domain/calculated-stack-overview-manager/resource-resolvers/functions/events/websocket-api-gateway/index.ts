import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { getAtt, join, ref } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import type {
  WebSocketAuthorizer,
  WebSocketApiIntegration,
  WebSocketApiIntegrationProps
} from '@stacktape/config/events';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { resolveReferenceToWebsocketApiGateway } from '@domain-services/config-manager/utils/websocket-api-gateways';
import { WEBSOCKET_API_STAGE_NAME } from '@domain-services/config-manager/utils/websocket-api-gateways';
import { templateManager } from '@domain-services/template-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { resourceURIs } from '@utils/aws-resource-uris';

export const resolveWebsocketApiEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  const { name, nameChain, cfLogicalName, aliasLogicalName, events, timeout } = lambdaFunction;
  const websocketEvents = (events || []).filter(
    (event): event is WebSocketApiIntegration => event.type === 'websocket-api-gateway'
  );
  const gatewayNames = new Set<string>();

  for (const { properties } of websocketEvents) {
    const gateway = resolveReferenceToWebsocketApiGateway({
      activeConfig: configManager,
      stpResourceReference: properties.websocketApiGatewayName,
      referencedFrom: name,
      referencedFromType: 'function'
    });
    gatewayNames.add(gateway.name);
    const routeLogicalName = cfLogicalNames.websocketApiRoute({
      routeKey: properties.routeKey,
      stpResourceName: gateway.name
    });

    if (properties.authorizer?.type === 'lambda') {
      resolveLambdaAuthorizer({
        authorizer: properties.authorizer,
        gatewayName: gateway.name,
        routeHandlerNameChain: nameChain
      });
    }

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: routeLogicalName,
      nameChain,
      resource: getWebsocketApiRoute({ event: properties, gatewayName: gateway.name, workloadName: name })
    });
    if (properties.returnResponse) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.websocketApiRouteResponse({
          routeKey: properties.routeKey,
          stpResourceName: gateway.name
        }),
        nameChain,
        resource: getWebsocketApiRouteResponse({ gatewayName: gateway.name, routeLogicalName })
      });
    }
  }

  const lambdaEndpointArn = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');
  for (const gatewayName of gatewayNames) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.websocketApiLambdaIntegration({
        stpResourceName: name,
        stpWebsocketApiGatewayName: gatewayName
      }),
      nameChain,
      resource: getWebsocketApiLambdaIntegration({
        functionTimeout: timeout,
        gatewayName,
        lambdaEndpointArn
      })
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.websocketApiLambdaPermission({
        stpResourceNameOfLambda: name,
        stpResourceNameOfWebsocketApiGateway: gatewayName
      }),
      nameChain,
      resource: getWebsocketApiLambdaPermission({ gatewayName, lambdaEndpointArn })
    });
  }

  return [];
};

export const getWebsocketApiLambdaIntegration = ({
  functionTimeout,
  gatewayName,
  lambdaEndpointArn,
  region = calculatedStackOverviewManager.context.region
}: {
  functionTimeout: number;
  gatewayName: string;
  lambdaEndpointArn: string | Intrinsic;
  region?: typeof calculatedStackOverviewManager.context.region;
}) =>
  cfnResource('AWS::ApiGatewayV2::Integration', {
    ApiId: ref(cfLogicalNames.websocketApi(gatewayName)),
    IntegrationType: 'AWS_PROXY',
    IntegrationMethod: 'POST',
    IntegrationUri: resourceURIs.lambdaApiGatewayIntegration({
      region,
      lambdaEndpointArn
    }),
    TimeoutInMillis: Math.round(Math.min(functionTimeout + 0.5, 29) * 1000)
  });

export const getWebsocketApiRoute = ({
  event,
  gatewayName,
  workloadName
}: {
  event: WebSocketApiIntegrationProps;
  gatewayName: string;
  workloadName: string;
}) =>
  cfnResource('AWS::ApiGatewayV2::Route', {
    ApiId: ref(cfLogicalNames.websocketApi(gatewayName)),
    RouteKey: event.routeKey,
    AuthorizationType:
      event.authorizer?.type === 'lambda' ? 'CUSTOM' : event.authorizer?.type === 'aws-iam' ? 'AWS_IAM' : 'NONE',
    ...(event.authorizer?.type === 'lambda'
      ? { AuthorizerId: ref(cfLogicalNames.websocketApiAuthorizer(gatewayName)) }
      : {}),
    ...(event.returnResponse ? { RouteResponseSelectionExpression: '$default' } : {}),
    Target: join('/', [
      'integrations',
      ref(
        cfLogicalNames.websocketApiLambdaIntegration({
          stpResourceName: workloadName,
          stpWebsocketApiGatewayName: gatewayName
        })
      )
    ])
  });

export const getWebsocketApiRouteResponse = ({
  gatewayName,
  routeLogicalName
}: {
  gatewayName: string;
  routeLogicalName: string;
}) =>
  cfnResource('AWS::ApiGatewayV2::RouteResponse', {
    ApiId: ref(cfLogicalNames.websocketApi(gatewayName)),
    RouteId: ref(routeLogicalName),
    RouteResponseKey: '$default'
  });

export const getWebsocketApiLambdaPermission = ({
  accountId = calculatedStackOverviewManager.context.accountId,
  gatewayName,
  lambdaEndpointArn,
  region = calculatedStackOverviewManager.context.region
}: {
  accountId?: string;
  gatewayName: string;
  lambdaEndpointArn: string | Intrinsic;
  region?: typeof calculatedStackOverviewManager.context.region;
}) =>
  cfnResource('AWS::Lambda::Permission', {
    FunctionName: lambdaEndpointArn,
    Action: 'lambda:InvokeFunction',
    Principal: 'apigateway.amazonaws.com',
    SourceAccount: accountId,
    SourceArn: join('', [
      `arn:aws:execute-api:${region}:${accountId}:`,
      ref(cfLogicalNames.websocketApi(gatewayName)),
      `/${WEBSOCKET_API_STAGE_NAME}/*`
    ])
  });

const resolveLambdaAuthorizer = ({
  authorizer,
  gatewayName,
  routeHandlerNameChain
}: {
  authorizer: Extract<WebSocketAuthorizer, { type: 'lambda' }>;
  gatewayName: string;
  routeHandlerNameChain: string[];
}) => {
  const authorizerLambda = resolveReferenceToLambdaFunction({
    stpResourceReference: authorizer.properties.functionName,
    referencedFrom: gatewayName,
    referencedFromType: 'function'
  });
  const authorizerEndpointArn = authorizerLambda.aliasLogicalName
    ? ref(authorizerLambda.aliasLogicalName)
    : getAtt(authorizerLambda.cfLogicalName, 'Arn');
  const authorizerLogicalName = cfLogicalNames.websocketApiAuthorizer(gatewayName);
  if (!templateManager.getCfResourceFromTemplate(authorizerLogicalName)) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: authorizerLogicalName,
      nameChain: routeHandlerNameChain,
      resource: cfnResource('AWS::ApiGatewayV2::Authorizer', {
        ApiId: ref(cfLogicalNames.websocketApi(gatewayName)),
        AuthorizerType: 'REQUEST',
        AuthorizerUri: resourceURIs.lambdaAuthorizer({
          region: calculatedStackOverviewManager.context.region,
          lambdaEndpointArn: authorizerEndpointArn
        }),
        IdentitySource: authorizer.properties.identitySources || ['route.request.header.Authorization'],
        Name: `${gatewayName}-connect-authorizer`
      })
    });
  }

  const permissionLogicalName = cfLogicalNames.websocketApiAuthorizerLambdaPermission({
    stpResourceNameOfLambda: authorizerLambda.name,
    stpResourceNameOfWebsocketApiGateway: gatewayName
  });
  if (!templateManager.getCfResourceFromTemplate(permissionLogicalName)) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: permissionLogicalName,
      nameChain: authorizerLambda.nameChain,
      resource: cfnResource('AWS::Lambda::Permission', {
        FunctionName: authorizerEndpointArn,
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceAccount: calculatedStackOverviewManager.context.accountId,
        SourceArn: join('', [
          `arn:aws:execute-api:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:`,
          ref(cfLogicalNames.websocketApi(gatewayName)),
          '/authorizers/*'
        ])
      })
    });
  }
};
