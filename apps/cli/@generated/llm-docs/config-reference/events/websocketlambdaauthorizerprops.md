# WebSocketLambdaAuthorizerProps API Reference

## TypeScript definition

```typescript
type WebSocketLambdaAuthorizerProps = {
  /** Name of the Stacktape Lambda function that authorizes connections. */
  functionName: string;
  /** Request values passed to the authorizer. */
  identitySources?: Array<string>;
};
```

## Property: `functionName`

- Required: yes
- Type: `string`

Name of the Stacktape Lambda function that authorizes connections.

## Property: `identitySources`

- Required: no
- Type: `Array<string>`
- Default: `["route.request.header.Authorization"]`

Request values passed to the authorizer.

WebSocket identity sources use `route.request.header.*` or `route.request.querystring.*` expressions.
