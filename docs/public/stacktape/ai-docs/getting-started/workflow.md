---
docType: getting-started
title: Workflow
tags:
  - workflow
  - getting-started
source: docs/_curated-docs/getting-started/workflow.mdx
priority: 2
---

# Workflow

Stacktape is an Infrastructure-as-Code (IaC) tool. You define your infrastructure in a config file, and Stacktape translates it into AWS CloudFormation and deploys it.

## The mental model

**Traditional IaC (CloudFormation, Terraform):**

- You write hundreds of lines describing every detail
- You manage IAM policies, security groups, VPC configs manually
- Mistakes are common, debugging is painful

**Stacktape:**

- You write what you want at a high level (~30 lines)
- Stacktape generates the low-level details (~1,200+ lines of CloudFormation)
- Best practices are built in (security, networking, permissions)

You still own everything. It all deploys to your AWS account. You can inspect, override, or eject at any time.

## Configuration file

Your config file (`stacktape.ts`, `stacktape.yml`, or `stacktape.json`) defines:

- **Resources** - Lambda functions, databases, queues, buckets, etc.
- **Connections** - Which resources can access each other
- **Scripts** - Database migrations, seed scripts, utilities

```typescript
// stacktape.ts
import { defineConfig, LambdaFunction, RelationalDatabase } from 'stacktape';

export default defineConfig(({ stage }) => {
  const db = new RelationalDatabase({
    engine: { type: 'postgres', version: '16' },
    primaryInstance: {
      instanceSize: stage === 'prod' ? 'db.t4g.medium' : 'db.t4g.micro'
    }
  });

  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/api.ts' } },
    connectTo: [db]
  });

  return { resources: { db, api } };
});
```

## Stages and environments

Each deployment has a **stage** (environment name). Stages are completely isolated - separate databases, separate functions, separate everything.

```bash
stacktape deploy --stage dev --region us-east-1    # my-app-dev stack
stacktape deploy --stage staging --region us-east-1 # my-app-staging stack
stacktape deploy --stage prod --region us-east-1    # my-app-prod stack
```

Use stages in your config for environment-specific settings:

```typescript
export default defineConfig(({ stage }) => ({
  resources: {
    db: new RelationalDatabase({
      primaryInstance: {
        instanceSize: stage === 'prod' ? 'db.t4g.medium' : 'db.t4g.micro',
        multiAz: stage === 'prod'
      }
    })
  }
}));
```

## The connectTo pattern

When you connect resources with `connectTo`, Stacktape automatically:

1. **Grants IAM permissions** - The source resource can access the target
2. **Injects environment variables** - Connection strings, hostnames, ARNs
3. **Configures networking** - Security groups, VPC placement if needed

```typescript
const db = new DynamoDbTable({
  /* ... */
});

const handler = new LambdaFunction({
  connectTo: [db] // Handler gets read/write access to db
  // ...
});
// Environment: STP_DB_TABLE_NAME, STP_DB_TABLE_ARN
```

This replaces pages of IAM policies and networking configs with a single line.

## Deployment flow

When you run `stacktape deploy`:

1. **Parse** - Load config, resolve directives (`$Secret()`, `$Stage()`, etc.)
2. **Validate** - Check config structure and resource compatibility
3. **Package** - Bundle Lambda code with esbuild, build Docker images
4. **Generate** - Transform config into CloudFormation template
5. **Deploy** - Upload artifacts to S3, execute CloudFormation

```
$ stacktape deploy --stage dev --region us-east-1

Packaging handler...           [2.1s]
Uploading artifacts...         [1.4s]
Deploying stack my-app-dev...  [45s]

Stack deployed successfully!

Outputs:
  api.url: https://abc123.execute-api.us-east-1.amazonaws.com
```

## Development workflow

For active development, use **dev mode** instead of deploying every change:

```bash
stacktape dev --stage dev --region us-east-1
```

This runs your workloads locally while connected to (or emulating) cloud resources. See [Dev Mode](/getting-started/dev-mode).

## Typical iteration cycle

1. **Write config** - Define your infrastructure in `stacktape.ts`
2. **Dev mode** - Iterate locally with `stacktape dev`
3. **Deploy** - Ship to dev/staging with `stacktape deploy`
4. **Test** - Verify in cloud environment
5. **Production** - Deploy to prod stage

## Extending Stacktape

Need something Stacktape doesn't support natively? You have options:

**Overrides** - Modify any generated CloudFormation property:

```typescript
const fn = new LambdaFunction({
  // ...
  overrides: {
    lambda: { Description: 'Custom description' }
  }
});
```

**Raw CloudFormation** - Add any AWS resource:

```typescript
export default defineConfig(() => ({
  resources: {
    /* ... */
  },
  cloudformationResources: {
    myTopic: {
      Type: 'AWS::SNS::Topic',
      Properties: { TopicName: 'my-topic' }
    }
  }
}));
```

**Transforms** - Programmatically modify resources (TypeScript only):

```typescript
const fn = new LambdaFunction({
  // ...
  transforms: {
    lambda: (props) => ({
      ...props,
      MemorySize: (props.MemorySize ?? 128) * 2
    })
  }
});
```

## Next steps

- [Dev Mode](/getting-started/dev-mode) - Local development with cloud resources
- [Using with AI](/getting-started/using-with-ai) - AI-assisted development
- [Console](/getting-started/console) - Web-based management
