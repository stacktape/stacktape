---
docType: concept
title: YAML Configuration
tags:
  - yaml
  - configuration
  - concept
source: docs/_curated-docs/concepts/yaml-config.mdx
priority: 1
---

# YAML Configuration

YAML is a human-readable configuration format that works well for straightforward Stacktape configurations.

## Basic Structure

Create `stacktape.yml` in your project root:

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      cors:
        enabled: true

  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      events:
        - type: http-api-integration
          properties:
            httpApiGatewayName: api
            method: GET
            path: /
```

## Resource Definition

Each resource has three parts:

```yaml
resources:
  resourceName: # Unique name (used for references)
    type: resource-type # Type of resource
    properties: # Resource-specific configuration
      property1: value1
      property2: value2
```

## Available Resource Types

### Compute

| Type                       | Description                         |
| -------------------------- | ----------------------------------- |
| `function`                 | Lambda function                     |
| `edge-lambda-function`     | Lambda@Edge function                |
| `web-service`              | ECS container with public endpoint  |
| `private-service`          | ECS container with private endpoint |
| `worker-service`           | ECS background container            |
| `multi-container-workload` | Multiple containers                 |
| `batch-job`                | AWS Batch job                       |
| `nextjs-web`               | Next.js application                 |

### Databases

| Type                     | Description              |
| ------------------------ | ------------------------ |
| `relational-database`    | RDS/Aurora database      |
| `dynamo-db-table`        | DynamoDB table           |
| `redis-cluster`          | ElastiCache Redis        |
| `mongo-db-atlas-cluster` | MongoDB Atlas            |
| `upstash-redis`          | Upstash serverless Redis |
| `open-search-domain`     | OpenSearch/Elasticsearch |

### Networking

| Type                        | Description      |
| --------------------------- | ---------------- |
| `http-api-gateway`          | HTTP API Gateway |
| `application-load-balancer` | ALB              |
| `network-load-balancer`     | NLB              |

### Storage

| Type             | Description                      |
| ---------------- | -------------------------------- |
| `bucket`         | S3 bucket                        |
| `hosting-bucket` | S3 + CloudFront for static sites |
| `efs-filesystem` | EFS shared storage               |

### Messaging

| Type        | Description     |
| ----------- | --------------- |
| `sqs-queue` | SQS queue       |
| `sns-topic` | SNS topic       |
| `event-bus` | EventBridge bus |

### Security

| Type               | Description                 |
| ------------------ | --------------------------- |
| `user-auth-pool`   | Cognito user pool           |
| `web-app-firewall` | WAF                         |
| `bastion`          | Bastion host for VPC access |

### Other

| Type            | Description    |
| --------------- | -------------- |
| `state-machine` | Step Functions |

## Lambda Function Example

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      memory: 512
      timeout: 30
      environment:
        - name: NODE_ENV
          value: production
      events:
        - type: http-api-integration
          properties:
            httpApiGatewayName: api
            method: POST
            path: /users
        - type: schedule-integration
          properties:
            scheduleRate: rate(1 hour)
```

## Container Service Example

```yaml
resources:
  webApp:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 10
      events:
        - type: http-api-integration
          properties:
            httpApiGatewayName: api
            containerPort: 3000
            method: '*'
            path: '/*'
```

## Database Example

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          version: '16'
          primaryInstance:
            instanceSize: db.t4g.micro
      credentials:
        masterUserPassword: $Secret('db-password')
```

## Using Variables

Define reusable values with the `variables` section:

```yaml
variables:
  instanceSize: db.t4g.micro
  apiDomain: api.example.com

resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: $Var('instanceSize')

  api:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: $Var('apiDomain')
```

## Connecting Resources

Use `connectTo` to automatically handle permissions and credentials:

```yaml
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
      connectTo:
        - database # Automatically gets DB credentials
```

## Scripts

Define reusable scripts:

```yaml
scripts:
  migrate:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo:
        - database

  seed:
    type: local-script
    properties:
      executeCommand: npx prisma db seed
      connectTo:
        - database
```

Run scripts:

```bash
stacktape script:run --scriptName migrate --stage dev --region us-east-1
```

## Hooks

Execute scripts during deployment lifecycle:

```yaml
hooks:
  beforeDeploy:
    - scriptName: build
  afterDeploy:
    - scriptName: migrate
    - scriptName: seed
```

## VS Code Extension

For the best YAML editing experience, install the [Stacktape VS Code extension](https://marketplace.visualstudio.com/items?itemName=stacktape.stacktape):

- Syntax validation
- Autocompletion
- Inline documentation
- Error highlighting

`[IMAGE PLACEHOLDER: vscode-yaml-autocomplete]`

## Limitations vs TypeScript

YAML has some limitations compared to TypeScript:

| Feature           | TypeScript | YAML              |
| ----------------- | ---------- | ----------------- |
| Type checking     | ✅         | ❌                |
| Autocompletion    | ✅ Full    | ✅ With extension |
| Conditional logic | ✅ Native  | ⚠️ Via directives |
| Loops             | ✅ Native  | ❌                |
| Code reuse        | ✅ Imports | ⚠️ Variables only |
| IDE refactoring   | ✅         | ❌                |

For complex configurations with lots of conditional logic, consider TypeScript.

## Converting YAML to TypeScript

Stacktape's documentation automatically shows TypeScript equivalents for YAML examples. You can also manually convert:

**YAML:**

```yaml
resources:
  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
```

**TypeScript:**

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const handler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  return { resources: { handler } };
});
```

## Next Steps
