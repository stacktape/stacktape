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

### 1.2 Kinesis Stream

A real-time data stream for ingesting events. Kinesis handles scaling and durability automatically.

```yml
eventStream:
  type: kinesis-stream
```

### 1.3 DynamoDB Table

Stores aggregated analytics with a composite key — partition key for event type, sort key for the hour bucket.
Atomic counters (`ADD`) ensure accurate counts even under concurrent writes.

```yml
analyticsTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: pk
        type: string
      sortKey:
        name: sk
        type: string
```

### 1.4 Process Events Function

Consumes records from the Kinesis stream in batches. Decodes base64 records, groups them by event type and hour,
and writes aggregated counts to DynamoDB using atomic `ADD` operations.

- **Batch size** - up to 100 records per invocation.
- **Max batch window** - waits up to 10 seconds to collect a full batch.
- **Starting position** - `LATEST` to only process new events.

```yml
processEvents:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/process-events.ts
    memory: 512
    timeout: 60
    connectTo:
      - analyticsTable
    events:
      - type: kinesis-stream
        properties:
          kinesisStreamName: eventStream
          batchSize: 100
          startingPosition: LATEST
          maxBatchWindowSeconds: 10
```

### 1.5 API Function

Hono-based HTTP API for sending events to the Kinesis stream and querying aggregated analytics from DynamoDB.

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
      - eventStream
      - analyticsTable
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
