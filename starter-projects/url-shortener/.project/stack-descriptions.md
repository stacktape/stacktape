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

Stores shortened URLs with their codes, original URLs, and click counts. The partition key is the short code
for O(1) lookups during redirect.

```yml
linksTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: code
        type: string
```

### 1.3 API Function

A Hono app that provides three endpoints:

- `POST /shorten` - creates a new short URL with a random 6-character code
- `GET /links` - lists all shortened URLs with click counts
- `GET /:code` - looks up the code, increments the click counter, and redirects (301) to the original URL

**ConnectTo** grants DynamoDB access and injects the table name as `STP_LINKS_TABLE_NAME`.

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
      - linksTable
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
