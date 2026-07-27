# CognitoAuthorizerProperties API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type CognitoAuthorizerProperties = {
  /** Name of the user pool to protect the API */
  userPoolName: string;
  /** Where to read the JWT from in the request */
  identitySources?: Array<string>;
};
```

## Property: `userPoolName`

- Required: yes
- Type: `string`

Name of the user pool to protect the API

The Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.
Stacktape uses this to:

Set the expected **audience** to the user pool client ID.
Build the expected **issuer** URL based on the user pool and AWS region.

In practice this means only JWTs issued by this pool (and its client) will be considered valid.

### Example 1 (yaml)

```yaml
resources:
  authPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
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
            path: /me
            authorizer:
              type: cognito
              properties:
                userPoolName: authPool
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, HttpApiGateway, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authPool = new UserAuthPool({ userVerificationType: 'email-code' });
  const httpApi = new HttpApiGateway({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'httpApi',
          method: 'GET',
          path: '/me',
          authorizer: {
            type: 'cognito',
            properties: {
              userPoolName: 'authPool'
            }
          }
        }
      }
    ]
  });
  return { resources: { authPool, httpApi, apiFunction } };
});
```

## Property: `identitySources`

- Required: no
- Type: `Array<string>`

Where to read the JWT from in the request

A list of identity sources that tell API Gateway where to look for the bearer token, using the
`$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).

If you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,
using a JWT authorizer as described in the API Gateway v2 authorizer docs
([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).

### Example 1 (yaml)

```yaml
resources:
  authPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
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
            path: /me
            authorizer:
              type: cognito
              properties:
                userPoolName: authPool
                identitySources:
                  - $request.header.Authorization
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, HttpApiGateway, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authPool = new UserAuthPool({ userVerificationType: 'email-code' });
  const httpApi = new HttpApiGateway({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'httpApi',
          method: 'GET',
          path: '/me',
          authorizer: {
            type: 'cognito',
            properties: {
              userPoolName: 'authPool',
              identitySources: ['$request.header.Authorization']
            }
          }
        }
      }
    ]
  });
  return { resources: { authPool, httpApi, apiFunction } };
});
```
