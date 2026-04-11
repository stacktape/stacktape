---
docType: getting-started
title: How It Works
tags:
  - how
  - works
  - getting-started
source: docs/_curated-docs/getting-started/how-it-works.mdx
priority: 2
---

# How It Works

Stacktape transforms your configuration into production-grade AWS infrastructure via CloudFormation.

## The Deployment Flow

## Stacks and Stages

**Stack** = A complete deployment unit containing all your resources.

**Stage** = An environment identifier (`dev`, `staging`, `production`).

Each stage creates a completely separate stack:

```bash
stacktape deploy --stage dev --region us-east-1     # Creates: my-app-dev
stacktape deploy --stage prod --region us-east-1    # Creates: my-app-prod
```

Both stacks are fully isolated—separate databases, functions, everything.

## The `connectTo` System

When you connect resources:

```yaml
resources:
  database:
    type: relational-database

  api:
    type: function
    properties:
      connectTo:
        - database
```

Stacktape automatically:

1. **Creates IAM permissions** - Function can access database
2. **Injects environment variables** - `STP_DATABASE_CONNECTION_STRING`, `STP_DATABASE_HOST`, etc.
3. **Configures networking** - Security group rules, VPC placement

This replaces dozens of lines of manual IAM policies and networking config.

## Generated Environment Variables

| Resource Type         | Variables Injected                                   |
| --------------------- | ---------------------------------------------------- |
| `relational-database` | `STP_{NAME}_CONNECTION_STRING`, `HOST`, `PORT`, etc. |
| `dynamo-db-table`     | `STP_{NAME}_TABLE_NAME`, `TABLE_ARN`                 |
| `bucket`              | `STP_{NAME}_BUCKET_NAME`, `BUCKET_ARN`               |
| `redis-cluster`       | `STP_{NAME}_HOST`, `PORT`                            |
| `sqs-queue`           | `STP_{NAME}_QUEUE_URL`, `QUEUE_ARN`                  |

## What Gets Created in AWS

Every stack includes baseline resources:

| Resource              | Purpose                                   |
| --------------------- | ----------------------------------------- |
| CloudFormation Stack  | Manages all resources as a unit           |
| S3 Bucket             | Stores deployment artifacts               |
| IAM Roles             | Permissions for each resource             |
| CloudWatch Log Groups | Centralized logging                       |
| VPC (if needed)       | Private networking for databases/services |

Plus your defined resources (functions, databases, etc.).

## Extend and Override

Need more control? Override any CloudFormation property:

```ts
const myFunction = new LambdaFunction({
  // ... config
  overrides: {
    lambda: { Description: 'Custom description' }
  }
});
```

Or add raw CloudFormation:

```ts
export default defineConfig(() => ({
  resources: {
    /* ... */
  },
  cloudformationResources: {
    myResource: {
      Type: 'AWS::SNS::Topic',
      Properties: { TopicName: 'my-topic' }
    }
  }
}));
```

## Comparison

| Feature            | Stacktape | CloudFormation | Terraform |
| ------------------ | --------- | -------------- | --------- |
| Lines of config    | ~30       | ~1,200         | ~500      |
| Learning curve     | Low       | High           | Medium    |
| Type safety        | Yes (TS)  | No             | Limited   |
| Development mode   | Yes       | No             | No        |
| Built-in packaging | Yes       | No             | No        |
| AWS-native         | Yes       | Yes            | No        |
