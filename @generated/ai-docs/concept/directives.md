---
docType: concept
title: Directives
tags:
  - directives
  - concept
source: docs/_curated-docs/concepts/directives.mdx
priority: 1
---

# Directives

Directives are special functions (prefixed with `$`) that add dynamic behavior to your configuration. They allow you to reference secrets, resource parameters, and other dynamic values.

## Types of Directives

There are two categories of directives:

1. **Local directives**: Resolved when Stacktape parses your config (before deployment)
2. **Runtime directives**: Resolved by CloudFormation during deployment

## Local Directives

These are resolved immediately when Stacktape reads your configuration.

### $Stage()

Returns the current stage name.

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: $Format('api-{}.example.com', $Stage())
```

### $Region()

Returns the current AWS region.

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: AWS_REGION
          value: $Region()
```

### $Var()

References a value from the `variables` section.

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
```

### $File()

Loads and parses a file. Supports `.env`, `.json`, `.yml`, `.yaml`, and `.ini` files.

```yaml
resources:
  handler:
    type: function
    properties:
      # Load environment variables from .env file
      environment: $File('.env')
```

For `.env` files, this returns an array of `{ name, value }` objects.

### $FileRaw()

Reads a file as a raw UTF-8 string.

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: CONFIG
          value: $FileRaw('./config.json')
```

### $Format()

String interpolation using `{}` placeholders.

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: $Format('{}-api.example.com', $Stage())
        # dev -> "dev-api.example.com"
```

Multiple placeholders:

```yaml
environment:
  - name: APP_URL
    value: $Format('https://{}.{}.example.com', $Stage(), $Region())
    # -> "https://dev.us-east-1.example.com"
```

### $GitInfo()

Returns information about the current git repository.

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: GIT_COMMIT
          value: $GitInfo('commit')
        - name: GIT_BRANCH
          value: $GitInfo('branch')
```

Available properties:

- `commit` - Current commit SHA
- `branch` - Current branch name
- `username` - Git username
- `gitUrl` - Repository URL

### $CliArgs()

Accesses additional CLI arguments passed after `--`.

```bash
stacktape deploy --stage dev --region us-east-1 -- --myArg=value
```

```yaml
variables:
  myArg: $CliArgs('myArg')
```

### $StackOutput()

References outputs from another Stacktape stack.

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: SHARED_DB_URL
          value: $StackOutput('shared-infra-dev', 'database', 'connectionString')
```

Arguments: `(stackName, resourceName, paramName)`

## Runtime Directives

These are resolved by CloudFormation during deployment. Use them for values that don't exist until resources are created.

### $Secret()

References a secret from AWS Secrets Manager.

```yaml
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
```

Create secrets using the CLI:

```bash
stacktape secret:create --region us-east-1
# Enter name: db-password
# Enter value: your-secure-password
```

#### JSON Secrets

If your secret contains JSON, access specific keys with dot notation:

```bash
# Create a JSON secret
stacktape secret:create --region us-east-1
# name: api-keys
# value: {"stripe": "sk_...", "sendgrid": "SG..."}
```

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: STRIPE_KEY
          value: $Secret('api-keys.stripe')
        - name: SENDGRID_KEY
          value: $Secret('api-keys.sendgrid')
```

### $ResourceParam()

References a parameter from another resource. Used for values that are only known after deployment (URLs, ARNs, etc.).

```yaml
resources:
  api:
    type: http-api-gateway

  frontend:
    type: hosting-bucket
    properties:
      environment:
        - name: API_URL
          value: $ResourceParam('api', 'url')
```

Common parameters by resource type:

| Resource Type         | Parameters                                        |
| --------------------- | ------------------------------------------------- |
| `http-api-gateway`    | `url`, `arn`, `id`                                |
| `relational-database` | `connectionString`, `host`, `port`, `name`, `arn` |
| `dynamo-db-table`     | `tableName`, `tableArn`, `streamArn`              |
| `bucket`              | `bucketName`, `bucketArn`, `domainName`           |
| `sqs-queue`           | `queueUrl`, `queueArn`                            |
| `sns-topic`           | `topicArn`                                        |
| `user-auth-pool`      | `id`, `arn`, `clientId`                           |

### $CfResourceParam()

References a parameter from a raw CloudFormation resource.

```yaml
cloudformationResources:
  mySnsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: my-topic

resources:
  handler:
    type: function
    properties:
      environment:
        - name: TOPIC_ARN
          value: $CfResourceParam('mySnsTopic', 'Arn')
```

### $CfFormat()

Like `$Format()`, but resolved at CloudFormation deployment time. Use when combining runtime values.

```yaml
resources:
  database:
    type: relational-database

  handler:
    type: function
    properties:
      environment:
        - name: JDBC_URL
          value: $CfFormat('jdbc:postgresql://{}:{}/{}',
            $ResourceParam('database', 'host'),
            $ResourceParam('database', 'port'),
            $ResourceParam('database', 'name'))
```

### $CfStackOutput()

Like `$StackOutput()`, but resolved at deployment time with deletion protection.

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: SHARED_QUEUE_URL
          value: $CfStackOutput('shared-infra-dev', 'queue', 'queueUrl')
```

## TypeScript Equivalents

In TypeScript configuration, import directive functions:

```typescript
import { defineConfig, $Secret, $ResourceParam, $Format } from 'stacktape';

export default defineConfig(({ stage }) => {
  const database = new RelationalDatabase({
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const handler = new LambdaFunction({
    environment: {
      DB_HOST: $ResourceParam('database', 'host'),
      APP_URL: $Format('https://{}.example.com', stage)
    }
  });

  return { resources: { database, handler } };
});
```

## Directive Nesting

Directives can be nested up to 2 levels deep:

```yaml
# ✅ Valid - 2 levels
environment:
  - name: URL
    value: $Format('{}/api', $ResourceParam('api', 'url'))

# ❌ Invalid - 3 levels (use $Var to work around)
environment:
  - name: URL
    value: $Format('{}/{}', $Format('{}', $Stage()), $ResourceParam('api', 'url'))
```

Workaround using `$Var()`:

```yaml
variables:
  stagePrefix: $Format('{}-', $Stage())

resources:
  handler:
    type: function
    properties:
      environment:
        - name: URL
          value: $Format('{}/{}', $Var('stagePrefix'), $ResourceParam('api', 'url'))
```

## Where Directives Can Be Used

| Directive Type                        | Where Usable                               |
| ------------------------------------- | ------------------------------------------ |
| Local (`$Stage`, `$File`, etc.)       | Anywhere in config                         |
| Runtime (`$Secret`, `$ResourceParam`) | Only in `resources` and `scripts` sections |

## Next Steps
