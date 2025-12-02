# HTTP API event

Triggers the function when a request is made to a specified HTTP API Gateway.

```yaml
resources:
  myHttpApi:
    type: http-api-gateway

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: myHttpApi
            path: /hello
            method: GET
      # {stop-highlight}
```

### Cognito authorizer

Restricts access to users authenticated with a [User Pool](../../../security-resources/user-auth-pools.md).

```yaml
resources:
  myGateway:
    type: http-api-gateway

  myUserPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/my-lambda.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: myGateway
            path: /some-path
            method: '*'
            # {start-highlight}
            authorizer:
              type: cognito
              properties:
                userPoolName: myUserPool
            # {stop-highlight}
```

```typescript
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProvider({});

const handler = async (event, context) => {
  const userData = await cognito.getUser({ AccessToken: event.headers.authorization });
  // do something with your user data
};

export default handler;
```

### Lambda authorizer

Uses another Lambda function to authorize incoming requests.