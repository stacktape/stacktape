# LambdaAuthorizerProperties API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type LambdaAuthorizerProperties = {
  /** Name of the authorizer function */
  functionName: string;
  /** Cache authorizer results */
  cacheResultSeconds?: number;
  /** Use IAM-style (v1) authorizer responses */
  iamResponse?: boolean;
  /** Where to read identity data from */
  identitySources?: Array<string>;
};
```

## Property: `functionName`

- Required: yes
- Type: `string`

Name of the authorizer function

The Stacktape name of a `function` resource that should run for each authorized request.
API Gateway calls this Lambda, passes request details, and uses its response to allow or deny access.

### Example 1 (yaml)

```yaml
resources:
  authorizerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/authorizer.ts
  httpApi:
    type: http-api-gateway
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: httpApi
            method: GET
            path: /orders
            authorizer:
              type: lambda
              properties:
                functionName: authorizerFunction
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authorizerFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
  });
  const httpApi = new HttpApiGateway({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'httpApi',
          method: 'GET',
          path: '/orders',
          authorizer: {
            type: 'lambda',
            properties: {
              functionName: 'authorizerFunction'
            }
          }
        }
      }
    ]
  });
  return { resources: { authorizerFunction, httpApi, apiFunction } };
});
```

## Property: `cacheResultSeconds`

- Required: no
- Type: `number`

Cache authorizer results

Number of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.
While cached, repeated requests skip calling your authorizer function and reuse the previous result.

This value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).

### Example 1 (yaml)

```yaml
resources:
  authorizerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/authorizer.ts
  httpApi:
    type: http-api-gateway
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: httpApi
            method: GET
            path: /orders
            authorizer:
              type: lambda
              properties:
                functionName: authorizerFunction
                identitySources:
                  - $request.header.Authorization
                cacheResultSeconds: 300
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authorizerFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
  });
  const httpApi = new HttpApiGateway({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'httpApi',
          method: 'GET',
          path: '/orders',
          authorizer: {
            type: 'lambda',
            properties: {
              functionName: 'authorizerFunction',
              identitySources: ['$request.header.Authorization'],
              cacheResultSeconds: 300
            }
          }
        }
      }
    ]
  });
  return { resources: { authorizerFunction, httpApi, apiFunction } };
});
```

## Property: `iamResponse`

- Required: no
- Type: `boolean`

Use IAM-style (v1) authorizer responses

If `true`, your Lambda must return a full IAM policy document (the "v1" format).
If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)
so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.

This flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.

### Example 1 (yaml)

```yaml
resources:
  authorizerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/authorizer.ts
  httpApi:
    type: http-api-gateway
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: httpApi
            method: GET
            path: /orders
            authorizer:
              type: lambda
              properties:
                functionName: authorizerFunction
                iamResponse: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authorizerFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
  });
  const httpApi = new HttpApiGateway({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'httpApi',
          method: 'GET',
          path: '/orders',
          authorizer: {
            type: 'lambda',
            properties: {
              functionName: 'authorizerFunction',
              iamResponse: true
            }
          }
        }
      }
    ]
  });
  return { resources: { authorizerFunction, httpApi, apiFunction } };
});
```

## Property: `identitySources`

- Required: no
- Type: `Array<string>`

Where to read identity data from

A list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,
or stage variables) using the `$request.*` syntax.

When left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.

### Example 1 (yaml)

```yaml
resources:
  authorizerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/authorizer.ts
  httpApi:
    type: http-api-gateway
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: httpApi
            method: GET
            path: /orders
            authorizer:
              type: lambda
              properties:
                functionName: authorizerFunction
                identitySources:
                  - $request.header.Authorization
                  - $request.querystring.apiKey
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authorizerFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
  });
  const httpApi = new HttpApiGateway({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'httpApi',
          method: 'GET',
          path: '/orders',
          authorizer: {
            type: 'lambda',
            properties: {
              functionName: 'authorizerFunction',
              identitySources: ['$request.header.Authorization', '$request.querystring.apiKey']
            }
          }
        }
      }
    ]
  });
  return { resources: { authorizerFunction, httpApi, apiFunction } };
});
```
