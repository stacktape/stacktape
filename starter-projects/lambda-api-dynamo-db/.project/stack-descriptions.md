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

### 1.2 DynamoDB Table

Serverless NoSQL database for storing posts. Only the primary key needs to be configured.

```yml
postsTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: id
        type: string
```

### 1.3 API Function

The Hono app runs inside a single Lambda function. The catch-all route pattern (`/{proxy+}`) forwards all HTTP methods
and paths to the Hono router.

`connectTo` automatically grants DynamoDB access and injects the table name as an environment variable.

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
          path: /{proxy+}
          method: "*"
```
