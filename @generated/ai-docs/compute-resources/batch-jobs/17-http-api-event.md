# HTTP Api event

Triggers the job in response to a request to a specified HTTP API Gateway. Routes are matched based on the most specific path. For more details, see the [AWS Docs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html#http-api-develop-routes.evaluation).

```yaml
resources:
  myHttpApi:
    type: http-api-gateway

  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      resources:
        cpu: 2
        memory: 1800
      # {start-highlight}
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: myHttpApi
            path: /hello
            method: GET
      # {stop-highlight}
```

> Lambda function connected to an HTTP API Gateway "myHttpApi"

### Cognito authorizer

Restricts access to users authenticated with a [User Pool](../../../security-resources/user-auth-pools.md). The request must include an `access token`. If authorized, the job receives user claims in its payload.

```yaml
resources:
  myGateway:
    type: http-api-gateway

  myUserPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code

  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      resources:
        cpu: 2
        memory: 1800
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

> Example cognito authorizer

```typescript
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProvider({});

(async () => {
  const event = JSON.parse(process.env.STP_TRIGGER_EVENT_DATA);
  const userData = await cognito.getUser({ AccessToken: event.headers.authorization });
  // do something with your user data
})();
```

> Example lambda batch job that fetches user data from Cognito

### Lambda authorizer

Uses a dedicated Lambda function to decide if a request is authorized. The authorizer function returns a policy document or a simple boolean response. You can configure `identitySources` to specify which parts of the request are used for authorization. To learn more, see the [AWS Docs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html).