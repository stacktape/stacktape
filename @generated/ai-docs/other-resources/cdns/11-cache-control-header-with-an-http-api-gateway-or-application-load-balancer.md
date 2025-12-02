# Cache-Control header with an HTTP API Gateway or Application Load Balancer

When using a _CDN_ with an API gateway or an ALB, you can set the `Cache-Control` header in the responses from your application.

```yaml
resources:
  myApiGateway:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: hello.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: myApiGateway
            method: GET
            path: /hello
```

```typescript
export default async (event, context) => {
  return {
    statusCode: 200,
    statusDescription: '200 OK',
    isBase64Encoded: false,
    headers: {
      'Content-Type': 'text/plain',
      // {start-highlight}
      'Cache-Control': 'max-age=30'
      // {stop-highlight}
    },
    body: 'Hello !!!'
  };
};
```

> A Lambda function that returns a response with a `Cache-Control` header.

For more information on the `Cache-Control` header, see the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control).