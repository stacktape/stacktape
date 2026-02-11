### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the API function.

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

Stores monitor definitions and their check history. Each monitor record includes the URL to check, the current status,
and the last 10 health check results.

```yml
monitorsTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: id
        type: string
```

### 1.3 Health Check Function

Runs on a schedule (every 5 minutes). Scans all monitors from DynamoDB, sends an HTTP request to each URL, records the
response status, latency, and status code, then updates the monitor with the latest results.

- **Timeout** - 120 seconds to allow checking multiple URLs.
- **Schedule** - `rate(5 minutes)` for regular health checks.

```yml
checkHealth:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/check-health.ts
    memory: 512
    timeout: 120
    connectTo:
      - monitorsTable
    events:
      - type: schedule
        properties:
          scheduleRate: rate(5 minutes)
```

### 1.4 API Function

Hono-based HTTP API for managing monitors — create, list, get details, and delete. Each monitor includes its recent
check history.

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
      - monitorsTable
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
