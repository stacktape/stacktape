---
docType: concept
title: Connecting Resources
tags:
  - connecting
  - resources
  - concept
source: docs/_curated-docs/concepts/connecting-resources.mdx
priority: 1
---

# Connecting Resources

The `connectTo` property is one of Stacktape's most powerful features. It automatically handles the complex configuration needed to connect resources together.

## What connectTo Does

When you use `connectTo`, Stacktape automatically:

1. **Grants IAM permissions** - The source resource gets permission to access the target
2. **Injects environment variables** - Connection details are added as `STP_*` variables
3. **Configures security groups** - Network traffic is allowed between resources
4. **Handles VPC placement** - Resources are placed in the same VPC when needed

## Basic Usage

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          version: '16'

  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      connectTo:
        - database
```

This single line (`connectTo: [database]`) replaces dozens of lines of manual IAM policies, environment variable configuration, and networking setup.

## Environment Variables

When you connect to a resource, Stacktape injects environment variables with a `STP_` prefix followed by the resource name in uppercase.

### Database Variables

```yaml
connectTo:
  - database # Name of the relational-database resource
```

Injected variables:

- `STP_DATABASE_CONNECTION_STRING` - Full connection string
- `STP_DATABASE_HOST` - Database hostname
- `STP_DATABASE_PORT` - Database port
- `STP_DATABASE_NAME` - Database name
- `STP_DATABASE_USER` - Master username
- `STP_DATABASE_PASSWORD` - Master password

### S3 Bucket Variables

```yaml
connectTo:
  - uploads # Name of the bucket resource
```

Injected variables:

- `STP_UPLOADS_BUCKET_NAME` - Bucket name
- `STP_UPLOADS_BUCKET_ARN` - Bucket ARN

### DynamoDB Table Variables

```yaml
connectTo:
  - usersTable # Name of the dynamo-db-table resource
```

Injected variables:

- `STP_USERS_TABLE_TABLE_NAME` - Table name
- `STP_USERS_TABLE_TABLE_ARN` - Table ARN
- `STP_USERS_TABLE_STREAM_ARN` - Stream ARN (if enabled)

### SQS Queue Variables

```yaml
connectTo:
  - jobQueue # Name of the sqs-queue resource
```

Injected variables:

- `STP_JOB_QUEUE_QUEUE_URL` - Queue URL
- `STP_JOB_QUEUE_QUEUE_ARN` - Queue ARN

### SNS Topic Variables

```yaml
connectTo:
  - notifications # Name of the sns-topic resource
```

Injected variables:

- `STP_NOTIFICATIONS_TOPIC_ARN` - Topic ARN

### Redis Variables

```yaml
connectTo:
  - cache # Name of the redis-cluster resource
```

Injected variables:

- `STP_CACHE_HOST` - Redis host
- `STP_CACHE_PORT` - Redis port
- `STP_CACHE_PRIMARY_HOST` - Primary node host
- `STP_CACHE_READER_HOST` - Reader endpoint (if replicas exist)

### Event Bus Variables

```yaml
connectTo:
  - events # Name of the event-bus resource
```

Injected variables:

- `STP_EVENTS_EVENT_BUS_NAME` - Event bus name
- `STP_EVENTS_EVENT_BUS_ARN` - Event bus ARN

## Using in Your Code

Access the injected environment variables in your application:

```typescript
// src/handler.ts
import { Client } from 'pg';

export const handler = async () => {
  // Connection string is automatically available
  const client = new Client({
    connectionString: process.env.STP_DATABASE_CONNECTION_STRING
  });

  await client.connect();
  const result = await client.query('SELECT NOW()');
  await client.end();

  return { statusCode: 200, body: JSON.stringify(result.rows) };
};
```

Or with individual variables:

```typescript
import { Client } from 'pg';

const client = new Client({
  host: process.env.STP_DATABASE_HOST,
  port: parseInt(process.env.STP_DATABASE_PORT || '5432'),
  database: process.env.STP_DATABASE_NAME,
  user: process.env.STP_DATABASE_USER,
  password: process.env.STP_DATABASE_PASSWORD
});
```

## Multiple Connections

Connect to multiple resources at once:

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres

  uploads:
    type: bucket

  cache:
    type: redis-cluster
    properties:
      instanceSize: cache.t4g.micro
      defaultUserPassword: $Secret('redis-password')

  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      connectTo:
        - database
        - uploads
        - cache
```

Your handler now has access to:

- `STP_DATABASE_*` variables
- `STP_UPLOADS_*` variables
- `STP_CACHE_*` variables

## IAM Permissions Granted

`connectTo` grants appropriate permissions based on the resource type:

| Target Resource       | Permissions Granted                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `relational-database` | Network access (security group)                                                                                         |
| `bucket`              | `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`                                                      |
| `dynamo-db-table`     | `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem`, `dynamodb:Query`, `dynamodb:Scan` |
| `sqs-queue`           | `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`                                                            |
| `sns-topic`           | `sns:Publish`                                                                                                           |
| `event-bus`           | `events:PutEvents`                                                                                                      |
| `redis-cluster`       | Network access (security group)                                                                                         |
| `user-auth-pool`      | `cognito-idp:*`                                                                                                         |

## Custom Permissions

If you need more fine-grained control, use `iamRoleStatements` instead of or in addition to `connectTo`:

```yaml
resources:
  uploads:
    type: bucket

  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      # connectTo for env vars and basic permissions
      connectTo:
        - uploads
      # Additional custom permissions
      iamRoleStatements:
        - Effect: Allow
          Action:
            - s3:GetObjectVersion
            - s3:GetObjectTagging
          Resource:
            - $ResourceParam('uploads', 'bucketArn')/*
```

## Scripts with connectTo

Scripts also support `connectTo`:

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres

scripts:
  migrate:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo:
        - database
      environment:
        - name: DATABASE_URL
          value: $ResourceParam('database', 'connectionString')
```

When you run the script, the database connection details are available:

```bash
stacktape script:run --scriptName migrate --stage dev --region us-east-1
```

## Connecting Container Services

Container services (web-service, private-service, worker-service) work the same way:

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres

  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - database
```

## VPC Considerations

When connecting to VPC-only resources (like databases with `accessibilityMode: vpc`):

1. **Lambda functions** are automatically placed in the VPC
2. **Container services** are automatically placed in the VPC
3. **Security groups** are configured to allow traffic

## Without connectTo

For comparison, here's what you'd need without `connectTo`:

```yaml
# WITHOUT connectTo - Manual configuration
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres

  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      # Manual environment variables
      environment:
        - name: DB_HOST
          value: $ResourceParam('database', 'host')
        - name: DB_PORT
          value: $ResourceParam('database', 'port')
        - name: DB_NAME
          value: $ResourceParam('database', 'name')
        - name: DB_USER
          value: $ResourceParam('database', 'masterUserName')
        - name: DB_PASSWORD
          value: $ResourceParam('database', 'masterUserPassword')
      # Manual VPC configuration
      vpc:
        useDefaultVpc: true
        securityGroupIds:
          - $ResourceParam('database', 'securityGroupId')
```

With `connectTo`, all of this is handled automatically.

## Next Steps
