import type { StpWebSocketApiGateway } from '@domain-services/config-manager/resolved-types/websocket-api-gateways';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import type { WebSocketApiIntegration } from '@stacktape/config/events';
import { CliError } from '@utils/errors';
import { getPropsOfResourceReferencedInConfig, type ResourceLookup } from './resource-lookup';

const WEBSOCKET_LIFECYCLE_ROUTE_KEYS = new Set(['$connect', '$disconnect', '$default']);
export const WEBSOCKET_API_STAGE_NAME = 'default' as const;

type WebSocketValidationContext = ResourceLookup & {
  functions: readonly StpLambdaFunction[];
};

export const getConnectToIncludingWebsocketApiGateways = ({
  connectTo,
  events
}: {
  connectTo: readonly string[] | undefined;
  events: ReadonlyArray<{ type: string; properties?: unknown }> | undefined;
}): string[] =>
  Array.from(
    new Set([
      ...(connectTo || []),
      ...(events || [])
        .filter((event): event is WebSocketApiIntegration => event.type === 'websocket-api-gateway')
        .map(({ properties }) => properties.websocketApiGatewayName)
    ])
  );

export const resolveReferenceToWebsocketApiGateway = ({
  activeConfig,
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  activeConfig: ResourceLookup;
  referencedFrom: string;
  referencedFromType?: StpWorkloadType;
  stpResourceReference: string;
}) =>
  getPropsOfResourceReferencedInConfig({
    activeConfig,
    stpResourceReference,
    stpResourceType: 'websocket-api-gateway',
    referencedFrom,
    referencedFromType
  });

export const getAllIntegrationsForWebsocketApiGateway = ({
  activeConfig,
  resource
}: {
  activeConfig: Pick<WebSocketValidationContext, 'functions'>;
  resource: StpWebSocketApiGateway;
}): (WebSocketApiIntegration & { workloadName: string })[] =>
  activeConfig.functions.flatMap(({ events, name }) =>
    (events || [])
      .filter(
        (event): event is WebSocketApiIntegration =>
          event.type === 'websocket-api-gateway' &&
          event.properties.websocketApiGatewayName === resource.nameChain.join('.')
      )
      .map((event) => ({ ...event, workloadName: name }))
  );

export const validateWebsocketApiGatewayConfig = ({
  activeConfig,
  resource
}: {
  activeConfig: WebSocketValidationContext;
  resource: StpWebSocketApiGateway;
}) => {
  if (!resource.routeSelectionExpression.trim()) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEBSOCKET_ROUTE_SELECTION_EXPRESSION_EMPTY',
      message: 'WebSocket API `' + resource.name + '` has an empty `routeSelectionExpression`.',
      hints:
        'Remove the property to use `$request.body.action`, or provide a non-empty API Gateway selection expression.'
    });
  }

  const integrations = getAllIntegrationsForWebsocketApiGateway({ activeConfig, resource });
  const routes = new Map<string, string>();
  for (const { workloadName, properties } of integrations) {
    const routeKey = properties.routeKey.trim();
    if (
      !routeKey ||
      routeKey !== properties.routeKey ||
      (routeKey.startsWith('$') && !WEBSOCKET_LIFECYCLE_ROUTE_KEYS.has(routeKey))
    ) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_WEBSOCKET_ROUTE_KEY_INVALID',
        message: 'Function `' + workloadName + '` uses invalid WebSocket route key `' + properties.routeKey + '`.',
        hints: 'Use a custom route key, or one of `$connect`, `$disconnect`, and `$default`.'
      });
    }
    const previousWorkload = routes.get(routeKey);
    if (previousWorkload) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_WEBSOCKET_ROUTE_CONFLICT',
        message:
          'WebSocket API `' +
          resource.name +
          '` routes `' +
          routeKey +
          '` to both `' +
          previousWorkload +
          '` and `' +
          workloadName +
          '`.',
        hints: 'Each route key can have only one handler.'
      });
    }
    routes.set(routeKey, workloadName);
  }

  const routeWithMisplacedAuthorizer = integrations.find(
    ({ properties }) => properties.authorizer && properties.routeKey !== '$connect'
  );
  if (routeWithMisplacedAuthorizer) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEBSOCKET_AUTHORIZER_ROUTE_INVALID',
      message:
        'Function `' +
        routeWithMisplacedAuthorizer.workloadName +
        '` configures a WebSocket authorizer on route `' +
        routeWithMisplacedAuthorizer.properties.routeKey +
        '`, but authorizers are supported only on the `$connect` route.',
      hints: 'WebSocket authorizers can be configured only on the `$connect` route.'
    });
  }

  const lifecycleRouteWithResponse = integrations.find(
    ({ properties }) => properties.returnResponse && ['$connect', '$disconnect'].includes(properties.routeKey)
  );
  if (lifecycleRouteWithResponse) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEBSOCKET_ROUTE_RESPONSE_ROUTE_INVALID',
      message:
        'Function `' +
        lifecycleRouteWithResponse.workloadName +
        '` enables `returnResponse` on WebSocket route `' +
        lifecycleRouteWithResponse.properties.routeKey +
        '`, but lifecycle routes cannot send a WebSocket message to the client.',
      hints:
        'Use `returnResponse` on `$default` or a custom message route. For a post-connect message, send through the API Gateway Management API after the connection is established.'
    });
  }

  const lambdaAuthorizer = integrations.find(({ properties }) => properties.authorizer?.type === 'lambda')?.properties
    .authorizer;
  if (lambdaAuthorizer?.type === 'lambda') {
    getPropsOfResourceReferencedInConfig({
      activeConfig,
      stpResourceReference: lambdaAuthorizer.properties.functionName,
      stpResourceType: 'function',
      referencedFrom: resource.name,
      referencedFromType: resource.type
    });
    const { identitySources } = lambdaAuthorizer.properties;
    if (identitySources?.length === 0) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_WEBSOCKET_AUTHORIZER_IDENTITY_SOURCES_EMPTY',
        message: `WebSocket API \`${resource.name}\` has an empty authorizer \`identitySources\` list.`,
        hints: 'Remove the property to use the Authorization header, or provide at least one identity source.'
      });
    }
    const invalidIdentitySource = identitySources?.find(
      (source) => !/^route\.request\.(header|querystring)\.[^.\s]+$/.test(source)
    );
    if (invalidIdentitySource) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_WEBSOCKET_AUTHORIZER_IDENTITY_SOURCE_INVALID',
        message:
          'WebSocket API `' +
          resource.name +
          '` uses invalid authorizer identity source `' +
          invalidIdentitySource +
          '`.',
        hints: 'Use `route.request.header.<name>` or `route.request.querystring.<name>`.'
      });
    }
  }
};
