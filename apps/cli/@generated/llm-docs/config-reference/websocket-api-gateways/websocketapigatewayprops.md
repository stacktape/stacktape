# WebSocketApiGatewayProps API Reference

## TypeScript definition

```typescript
import type { DomainConfiguration, WebSocketApiAccessLogsConfig } from 'stacktape';

type WebSocketApiGatewayProps = {
  /** Custom domains such as `realtime.example.com`. */
  customDomains?: Array<DomainConfiguration>;
  /** Access-log settings. */
  logging?: WebSocketApiAccessLogsConfig;
  /** Expression used to choose a route from each JSON message. */
  routeSelectionExpression?: string;
};
```

## Property: `customDomains`

- Required: no
- Type: `Array<DomainConfiguration>`

Custom domains such as `realtime.example.com`.

Stacktape uses the root mapping, so clients connect to `wss://realtime.example.com` without a stage suffix. A
WebSocket custom domain cannot also be attached to an HTTP or REST API Gateway in the same AWS account and region.

## Property: `logging`

- Required: no
- Type: `WebSocketApiAccessLogsConfig`

Access-log settings.

JSON access logs are enabled by default and can be viewed with `stacktape logs` and in Console.

## Property: `routeSelectionExpression`

- Required: no
- Type: `string`
- Default: `$request.body.action`

Expression used to choose a route from each JSON message.

The default expects messages such as `{ "action": "sendMessage" }`. Change this only when your client already
uses a different field.
