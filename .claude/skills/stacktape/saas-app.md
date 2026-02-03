# Building a SaaS Application

Complete guide for deploying a SaaS with user authentication, database, and API.

## Minimal SaaS Stack

```yaml
resources:
  # API Gateway - your app's front door
  api:
    type: http-api-gateway

  # Your application code
  app:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api/index.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /{proxy+}
            method: '*'
      connectTo:
        - database
        - auth

  # PostgreSQL database (serverless, scales to zero)
  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
          minCapacity: 0    # Scale to zero when idle
          maxCapacity: 4    # Scale up under load
      credentials:
        masterUserPassword: $Secret('db-password')

  # User authentication (Cognito)
  auth:
    type: user-auth-pool
    properties:
      passwordPolicy:
        minimumLength: 8
      allowSignUp: true
      emailVerificationRequired: true
      allowedAuthFlows:
        - USER_PASSWORD_AUTH
        - USER_SRP_AUTH
```

## With Custom Domain

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.myapp.com

  # ... rest of resources
```

## With Email Sending (Transactional Emails)

```yaml
resources:
  app:
    type: function
    properties:
      # ... other config
      connectTo:
        - database
        - auth
        - aws:ses  # Grants permission to send emails via AWS SES
```

Then in your code:
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
const ses = new SESClient({});
await ses.send(new SendEmailCommand({
  Source: 'hello@myapp.com',
  Destination: { ToAddresses: [userEmail] },
  Message: {
    Subject: { Data: 'Welcome!' },
    Body: { Text: { Data: 'Thanks for signing up.' } }
  }
}));
```

## With File Uploads (S3)

```yaml
resources:
  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT', 'POST']
            allowedOrigins: ['*']
            allowedHeaders: ['*']

  app:
    type: function
    properties:
      connectTo:
        - database
        - uploads  # Injects STP_UPLOADS_BUCKET_NAME, grants S3 permissions
```

## With Background Jobs

```yaml
resources:
  # Queue for background tasks
  jobQueue:
    type: sqs-queue
    properties:
      visibilityTimeoutSeconds: 300  # 5 min timeout per job

  # Worker that processes jobs
  jobWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/workers/job-processor.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: jobQueue
            batchSize: 1
      connectTo:
        - database
        - aws:ses

  # API can send jobs to queue
  app:
    type: function
    properties:
      connectTo:
        - database
        - jobQueue  # Can send messages to queue
```

## With Caching (Redis)

```yaml
resources:
  cache:
    type: upstash-redis  # Serverless Redis, pay per request
    properties:
      eviction: true

  app:
    type: function
    properties:
      connectTo:
        - database
        - cache  # Injects REDIS_URL
```

## Full Production SaaS Template

```yaml
resources:
  # API Gateway with custom domain
  api:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.myapp.com

  # Main API function
  app:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api/index.ts
      timeout: 29
      memory: 1024
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /{proxy+}
            method: '*'
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database
        - cache
        - uploads
        - jobQueue
        - aws:ses

  # PostgreSQL (serverless)
  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
          minCapacity: 0
          maxCapacity: 8
      credentials:
        masterUserPassword: $Secret('db-password')

  # Redis cache
  cache:
    type: upstash-redis
    properties:
      eviction: true

  # File uploads
  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT', 'POST', 'DELETE']
            allowedOrigins: ['https://myapp.com', 'https://www.myapp.com']
            allowedHeaders: ['*']

  # Authentication
  auth:
    type: user-auth-pool
    properties:
      passwordPolicy:
        minimumLength: 8
        requireNumbers: true
      allowSignUp: true
      emailVerificationRequired: true
      mfaConfiguration: optional
      customAttributes:
        - name: organization_id
          attributeDataType: String

  # Background job queue
  jobQueue:
    type: sqs-queue
    properties:
      visibilityTimeoutSeconds: 300
      redrivePolicy:
        targetSqsQueueName: deadLetterQueue
        maxReceiveCount: 3

  # Failed jobs go here
  deadLetterQueue:
    type: sqs-queue

  # Job processor
  jobWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/workers/jobs.ts
      timeout: 300
      memory: 1024
      events:
        - type: sqs
          properties:
            sqsQueueName: jobQueue
            batchSize: 1
      connectTo:
        - database
        - cache
        - aws:ses

# Run migrations after each deploy
hooks:
  afterDeploy:
    - scriptName: migrate

scripts:
  migrate:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo:
        - database
```

## Environment Variables Injected by connectTo

When you use `connectTo`, these env vars are automatically available in your code:

| Connected Resource | Environment Variables |
|--------------------|----------------------|
| relational-database | `STP_{NAME}_CONNECTION_STRING`, `STP_{NAME}_HOST`, `STP_{NAME}_PORT`, `STP_{NAME}_DB_NAME`, `STP_{NAME}_USER`, `STP_{NAME}_PASSWORD` |
| bucket | `STP_{NAME}_BUCKET_NAME`, `STP_{NAME}_BUCKET_ARN` |
| sqs-queue | `STP_{NAME}_QUEUE_URL`, `STP_{NAME}_QUEUE_ARN` |
| upstash-redis | `STP_{NAME}_URL`, `STP_{NAME}_HOST`, `STP_{NAME}_PORT`, `STP_{NAME}_PASSWORD` |
| user-auth-pool | `STP_{NAME}_USER_POOL_ID`, `STP_{NAME}_USER_POOL_CLIENT_ID` |

Example: If your database is named `database`, you get `STP_DATABASE_CONNECTION_STRING`.
