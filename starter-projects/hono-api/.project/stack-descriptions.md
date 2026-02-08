### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the Lambda function.

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for convenience.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 Hono Lambda Function

The Hono app runs inside a Lambda function. The `hono/aws-lambda` adapter converts Lambda events to standard web
requests that Hono can handle.

- **Packaging** - uses `stacktape-lambda-buildpack` which automatically transpiles TypeScript and bundles dependencies.
- **Events** - configured with a catch-all route that forwards all HTTP methods and paths to the Hono router.

```yml
api:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/index.ts
    memory: 512
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /
          method: "*"
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /{proxy+}
          method: "*"
```
