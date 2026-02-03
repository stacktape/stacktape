# Mobile App Backend

Build backends for iOS, Android, React Native, Flutter apps.

## Basic Mobile API with Auth

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      cors:
        enabled: true

  # Public endpoints (login, register)
  publicApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/public.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /auth/{proxy+}
            method: '*'
      connectTo:
        - auth
        - database

  # Protected endpoints (require auth)
  protectedApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/protected.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /api/{proxy+}
            method: '*'
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database
        - uploads

  auth:
    type: user-auth-pool
    properties:
      allowSignUp: true
      emailVerificationRequired: true
      passwordPolicy:
        minimumLength: 8
      # Enable refresh tokens for mobile
      accessTokenValidity: 1  # 1 hour
      refreshTokenValidity: 30  # 30 days

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'

  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT']
            allowedOrigins: ['*']  # Mobile apps
            allowedHeaders: ['*']
```

## Push Notifications

```yaml
resources:
  # SNS topic for push notifications
  pushNotifications:
    type: sns-topic

  # API can trigger notifications
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - database
        - pushNotifications
```

## Real-time Features (WebSockets)

```yaml
resources:
  realtimeServer:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/websocket-server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 10
      connectTo:
        - redis
        - database

  # Redis for pub/sub across instances
  redis:
    type: upstash-redis
```

## Offline-First with Sync

```yaml
resources:
  syncApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/sync.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /sync
            method: POST
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database

  api:
    type: http-api-gateway

  auth:
    type: user-auth-pool

  # DynamoDB works great for sync
  database:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: userId
          type: S
        sortKey:
          name: itemId
          type: S
      billing:
        type: on-demand
```

## File Uploads with Presigned URLs

```yaml
resources:
  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT']
            allowedOrigins: ['*']
            allowedHeaders: ['*']
            exposeHeaders: ['ETag']

  uploadApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/upload-url.ts
      events:
        - type: http-api-gateway
          properties:
            path: /upload-url
            method: POST
      connectTo:
        - uploads
```

Generate presigned URL:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export const handler = async (event) => {
  const { filename, contentType } = JSON.parse(event.body);
  const key = `uploads/${Date.now()}-${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.STP_UPLOADS_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });
  
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl, key })
  };
};
```
