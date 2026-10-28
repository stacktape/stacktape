# ContainerWorkloadHttpApiIntegrationProps API Reference

## TypeScript definition

```typescript
import type { CognitoAuthorizer, IamAuthorizer, LambdaAuthorizer } from 'stacktape';

type ContainerWorkloadHttpApiIntegrationProps = {
  /** The container port that will receive traffic from the API Gateway. */
  containerPort: number;
  /** The name of the HTTP API Gateway. */
  httpApiGatewayName: string;
  /** The HTTP method that will trigger this integration. */
  method: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
  /** The URL path that will trigger this integration. */
  path: string;
  /** An authorizer to protect this route. */
  authorizer?: ContainerWorkloadHttpApiIntegrationAuthorizer;
  /** The payload format version for the Lambda integration. */
  payloadFormat?: "1.0" | "2.0";
};

/** Union choices used by the properties above. */
type ContainerWorkloadHttpApiIntegrationAuthorizer =
  | CognitoAuthorizer
  | LambdaAuthorizer
  | IamAuthorizer;
```

## Property: `containerPort`

- Required: yes
- Type: `number`

The container port that will receive traffic from the API Gateway.

### Example 1 (yaml)

```yaml
resources:
  publicApi:
    type: http-api-gateway
    properties: {}
  appWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: web
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/web-app:latest'
          events:
            - type: http-api-gateway
              properties:
                httpApiGatewayName: publicApi
                method: '*'
                path: '/{proxy+}'
                containerPort: 8080
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, HttpApiGateway, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const publicApi = new HttpApiGateway({});
  const appWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'web',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/web-app:latest' } },
        events: [
          {
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName: 'publicApi',
              method: '*',
              path: '/{proxy+}',
              containerPort: 8080
            }
          }
        ]
      }
    ]
  });
  return { resources: { publicApi, appWorkload } };
});
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
- Type: `cognito | lambda | aws-iam`

An authorizer to protect this route.

Cognito and Lambda authorizers reject unauthorized requests with `401 Unauthorized`. With `aws-iam`, callers sign
requests with AWS credentials allowed to call `execute-api:Invoke`, and API Gateway rejects the rest with
`403 Forbidden`.

Choices:
- `cognito` (`CognitoAuthorizer`). Properties: `userPoolName: string`, `identitySources?: Array<string>`.
- `lambda` (`LambdaAuthorizer`). Properties: `functionName: string`, `iamResponse?: boolean`, `identitySources?: Array<string>`, `cacheResultSeconds?: number`.
- `aws-iam` (`IamAuthorizer`)

## Property: `payloadFormat`

- Required: no
- Type: `string: "1.0" | "2.0"`
- Default: `1.0`

The payload format version for the Lambda integration.

For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
