### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the Lambda function.

For convenience, it has [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) allowed.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 DynamoDB Table

Serverless NoSQL database for storing posts. Only the primary key (`id`) needs to be configured — DynamoDB
handles scaling automatically.

```yml
postsTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: id
        type: string
```

### 1.3 GraphQL Function

The [graphql-yoga](https://the-guild.dev/graphql/yoga-server) server runs inside a single Lambda function.
The catch-all route pattern (`/{proxy+}`) forwards all requests to the yoga handler.

The function is configured as follows:

- **Packaging** - uses `stacktape-lambda-buildpack` to auto-build from TypeScript source.
- **ConnectTo list** - connecting to `postsTable` grants DynamoDB access and injects the table name as
  `STP_POSTS_TABLE_NAME` environment variable.
- **Events** - all HTTP methods and paths are forwarded to the function, which handles routing internally.

```yml
api:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/index.ts
    memory: 512
    connectTo:
      - postsTable
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /
          method: '*'
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /{proxy+}
          method: '*'
```
