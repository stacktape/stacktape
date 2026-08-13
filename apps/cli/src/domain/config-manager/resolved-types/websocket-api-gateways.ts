import type { WebSocketApiGateway } from '@stacktape/config/websocket-api-gateways';

export type StpWebSocketApiGateway = NonNullable<WebSocketApiGateway['properties']> & {
  name: string;
  type: WebSocketApiGateway['type'];
  configParentResourceType: WebSocketApiGateway['type'];
  nameChain: string[];
};

export type WebSocketApiGatewayReferencableParam =
  | 'apiId'
  | 'url'
  | 'managementEndpoint'
  | 'customDomains'
  | 'customDomainUrl'
  | 'customDomainUrls'
  | 'canonicalDomain';
