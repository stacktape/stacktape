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

### 1.2 SNS Topic

A pub/sub topic for broadcasting notifications. When a message is published, all subscribers receive it independently.

```yml
notificationTopic:
  type: sns-topic
```

### 1.3 DynamoDB Table

Stores notifications persisted by the store subscriber. Uses a simple `id` primary key.

```yml
notificationsTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: id
        type: string
```

### 1.4 Log Notification Function

First SNS subscriber — logs notification details to CloudWatch. Simulates a notification side effect like sending an
email or calling a webhook.

```yml
logNotification:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/log-notification.ts
    memory: 256
    events:
      - type: sns
        properties:
          snsTopicName: notificationTopic
```

### 1.5 Store Notification Function

Second SNS subscriber — persists each notification to DynamoDB. Demonstrates that multiple subscribers process the
same message independently.

```yml
storeNotification:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/store-notification.ts
    memory: 256
    connectTo:
      - notificationsTable
    events:
      - type: sns
        properties:
          snsTopicName: notificationTopic
```

### 1.6 API Function

Hono-based HTTP API for publishing notifications to the SNS topic and listing stored notifications from DynamoDB.

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
      - notificationTopic
      - notificationsTable
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
