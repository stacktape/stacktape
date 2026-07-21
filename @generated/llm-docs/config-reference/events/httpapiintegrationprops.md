# HttpApiIntegrationProps API Reference

## TypeScript definition

```typescript
import type { CognitoAuthorizer, LambdaAuthorizer } from 'stacktape';

type HttpApiIntegrationProps = {
  /** The name of the HTTP API Gateway. */
  httpApiGatewayName: string;
  /** The HTTP method that will trigger this integration. */
  method: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
  /** The URL path that will trigger this integration. */
  path: string;
  /** An authorizer to protect this route. */
  authorizer?: HttpApiIntegrationAuthorizer;
  /** The payload format version for the Lambda integration. */
  payloadFormat?: "1.0" | "2.0";
};

/** Union choices used by the properties above. */
type HttpApiIntegrationAuthorizer =
  | CognitoAuthorizer
  | LambdaAuthorizer;
```

## Property: `httpApiGatewayName`

- Required: yes
- Type: `string`

The name of the HTTP API Gateway.

## Property: `method`

- Required: yes
- Type: `string: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT"`

The HTTP method that will trigger this integration.

You can specify an exact method (e.g., `GET`) or use `*` to match any method.

## Property: `path`

- Required: yes
- Type: `string`

The URL path that will trigger this integration.

**Exact path**: `/users`
**Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.
**Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`.

## Property: `authorizer`

- Required: no
- Type: `cognito | lambda`

An authorizer to protect this route.

Unauthorized requests will be rejected with a `401 Unauthorized` response.

Choices:
- `cognito` (`CognitoAuthorizer`). Properties: `userPoolName: string`, `identitySources?: Array<string>`.
- `lambda` (`LambdaAuthorizer`). Properties: `functionName: string`, `iamResponse?: boolean`, `identitySources?: Array<string>`, `cacheResultSeconds?: number`.

## Property: `payloadFormat`

- Required: no
- Type: `string: "1.0" | "2.0"`
- Default: `'1.0'`

The payload format version for the Lambda integration.

For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
