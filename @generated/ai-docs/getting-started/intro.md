---
docType: getting-started
title: Introduction
tags:
  - introduction
  - getting-started
source: docs/_curated-docs/getting-started/intro.mdx
priority: 2
---

# Stacktape

Stacktape is a cloud development framework that lets you deploy production-grade infrastructure to **your own AWS account** with minimal configuration. Think of it as PaaS-level simplicity with full AWS ownership.

**What it does:**

- Takes a ~30 line config and generates ~1,200+ lines of CloudFormation
- Handles packaging, bundling, permissions, networking, and security
- Deploys containers, serverless functions, databases, and 30+ AWS resource types
- Provides a development mode for fast local iteration

## Quick Start

### 1. Install

```bash
npm install -g stacktape
```

### 2. Login

```bash
stacktape login
```

### 3. Configure AWS credentials

```bash
stacktape aws-profile:create
```

### 4. Create your config

Create `stacktape.ts`:

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  HttpApiIntegration,
  DynamoDbTable,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const db = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } }
  });

  const api = new HttpApiGateway({});

  const handler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [db],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: api.resourceName,
        method: 'GET',
        path: '/'
      })
    ]
  });

  return { resources: { api, handler, db } };
});
```

Create `src/handler.ts`:

```typescript
export const handler = async () => ({
  statusCode: 200,
  body: JSON.stringify({ message: 'Hello from Stacktape!' })
});
```

### 5. Deploy

```bash
stacktape deploy --stage dev --region us-east-1
```

Your API is now live on AWS.

## What happens during deploy

1. **Config parsing** - Resolves directives like `$Secret()` and validates the config
2. **Code packaging** - Bundles Lambda functions with esbuild, builds Docker images
3. **CloudFormation generation** - Transforms your config into AWS CloudFormation
4. **Deployment** - Creates all resources in AWS in the correct dependency order

## Core concepts

**Stage** - An isolated environment (`dev`, `staging`, `production`). Each stage creates completely separate resources.

**connectTo** - Automatically configures IAM permissions, injects environment variables, and sets up networking between resources.

```typescript
const handler = new LambdaFunction({
  connectTo: [db] // Grants permissions, injects STP_DB_TABLE_NAME
  // ...
});
```

**Directives** - Special functions for dynamic values:

- `$Secret('name')` - Reference AWS Secrets Manager
- `$ResourceParam('resource', 'param')` - Get values from other resources
- `$Stage()` - Current stage name

## Config formats

Stacktape supports TypeScript (recommended), YAML, and JSON configs.

**TypeScript** - Full type safety, autocomplete, conditional logic:

```typescript
export default defineConfig(({ stage }) => ({
  resources: {
    db: new RelationalDatabase({
      instanceSize: stage === 'prod' ? 'db.t4g.medium' : 'db.t4g.micro'
    })
  }
}));
```

**YAML** - Simpler syntax, no build step:

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

## Next steps

- [Workflow](/getting-started/workflow) - Understand the development and deployment workflow
- [Dev Mode](/getting-started/dev-mode) - Run locally with real cloud resources
- [Using with AI](/getting-started/using-with-ai) - Let AI agents build your infrastructure
