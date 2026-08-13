import type { LogForwardingBase } from './log-forwarding';
import type { DomainConfiguration, ResourceOverrides } from './shared';

/**
 * #### Managed, pay-per-use WebSocket API for real-time applications.
 *
 * ---
 *
 * Routes connections and messages to Lambda functions. Stacktape creates a stable `default` stage and injects the
 * connection-management endpoint into route handlers automatically.
 */
export interface WebSocketApiGateway {
  type: 'websocket-api-gateway';
  properties?: WebSocketApiGatewayProps;
  overrides?: ResourceOverrides;
}

export interface WebSocketApiGatewayProps {
  /**
   * #### Expression used to choose a route from each JSON message.
   *
   * ---
   *
   * The default expects messages such as `{ "action": "sendMessage" }`. Change this only when your client already
   * uses a different field.
   *
   * @default "$request.body.action"
   */
  routeSelectionExpression?: string;
  /**
   * #### Custom domains such as `realtime.example.com`.
   *
   * ---
   *
   * Stacktape uses the root mapping, so clients connect to `wss://realtime.example.com` without a stage suffix. A
   * WebSocket custom domain cannot also be attached to an HTTP or REST API Gateway in the same AWS account and region.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Access-log settings.
   *
   * ---
   *
   * JSON access logs are enabled by default and can be viewed with `stacktape logs` and in Console.
   */
  logging?: WebSocketApiAccessLogsConfig;
}

export interface WebSocketApiAccessLogsConfig extends LogForwardingBase {
  /**
   * #### Disable gateway access logs.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep gateway access logs.
   *
   * @default 30
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}
