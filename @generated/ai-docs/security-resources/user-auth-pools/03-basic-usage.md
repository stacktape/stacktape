# Basic usage

This example shows a Lambda function connected to an HTTP API Gateway with an authorizer that only allows access to users authenticated by `myUserPool`.

```yaml
resources:
  createPost:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: myGateway
            path: /post/create
            method: POST
            authorizer:
              type: cognito
              properties:
                userPoolName: myUserPool

  myUserPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 8
```