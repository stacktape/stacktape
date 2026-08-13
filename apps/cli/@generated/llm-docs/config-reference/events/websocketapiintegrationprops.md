# WebSocketApiIntegrationProps API Reference

## TypeScript definition

```typescript
type WebSocketApiIntegrationProps = {
  /** Route key handled by this function, for example `sendMessage`, `$connect`, or `$default`. */
  routeKey: string;
  /** Name of the `websocket-api-gateway` resource. */
  websocketApiGatewayName: string;
  /** Optional authorization for new connections. */
  authorizer?: WebSocketApiIntegrationAuthorizer;
  /** Send the Lambda handler's returned `body` directly back to the client that invoked this route. */
  returnResponse?: boolean;
};

/** Union choices used by the properties above. */
type WebSocketApiIntegrationAuthorizer =
  | "aws-iam"
  | "lambda";
```

## Property: `routeKey`

- Required: yes
- Type: `string`

Route key handled by this function, for example `sendMessage`, `$connect`, or `$default`.

## Property: `websocketApiGatewayName`

- Required: yes
- Type: `string`

Name of the `websocket-api-gateway` resource.

## Property: `authorizer`

- Required: no
- Type: `aws-iam | lambda`

Optional authorization for new connections.

Authorizers are supported only on the `$connect` route. Existing connections are not re-authorized for later
messages. Use `aws-iam` for SigV4 clients or a Lambda function for application-specific authentication.

Choices:
- `aws-iam`
- `lambda`. Properties: `functionName: string`, `identitySources?: Array<string>`.

## Property: `returnResponse`

- Required: no
- Type: `boolean`
- Default: `false`

Send the Lambda handler's returned `body` directly back to the client that invoked this route.

Keep this disabled for lifecycle routes, one-way events, broadcasts, and replies sent through the API Gateway
Management API. Enable it on `$default` or a custom message route for simple request-response interactions where
the handler should answer only the calling connection.
