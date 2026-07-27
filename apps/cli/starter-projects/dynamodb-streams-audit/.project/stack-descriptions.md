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

### 1.2 Products Table

The main data table for products. Has `streamType: NEW_AND_OLD_IMAGES` enabled, which means every change (insert,
update, delete) emits an event containing both the old and new versions of the item.

```yml
productsTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: id
        type: string
    streamType: NEW_AND_OLD_IMAGES
```

### 1.3 Audit Table

Stores audit log entries. Uses a composite key — `entityId` (the product ID) as partition key and `timestamp` as sort
key — so you can query the full change history for any product.

```yml
auditTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: entityId
        type: string
      sortKey:
        name: timestamp
        type: string
```

### 1.4 Process Stream Function

Consumes change events from the products table's DynamoDB stream. For each event, it writes an audit entry with the
event type (INSERT/MODIFY/REMOVE), before/after images, and a timestamp.

- **Events** - DynamoDB stream trigger using `$ResourceParam('productsTable', 'streamArn')`.
- **Starting position** - `LATEST` to only capture new changes.

```yml
processStream:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/process-stream.ts
    memory: 256
    connectTo:
      - auditTable
    events:
      - type: dynamo-db-stream
        properties:
          streamArn: $ResourceParam('productsTable', 'streamArn')
          batchSize: 10
          startingPosition: LATEST
```

### 1.5 API Function

Hono-based HTTP API with full CRUD for products and endpoints to query the audit log — both globally and per product.

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
      - productsTable
      - auditTable
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
