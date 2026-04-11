---
docType: concept
title: Stages & Environments
tags:
  - stages
  - environments
  - concept
source: docs/_curated-docs/concepts/stages-and-environments.mdx
priority: 1
---

# Stages & Environments

Stages allow you to deploy multiple isolated environments from the same codebase. Each stage creates a completely separate set of AWS resources.

## What is a Stage?

A **stage** is an environment identifier like `dev`, `staging`, or `production`. When you deploy with different stages, Stacktape creates completely separate resources:

```bash
# Development environment
stacktape deploy --stage dev --region us-east-1
# Creates: my-app-dev stack with its own database, functions, etc.

# Production environment
stacktape deploy --stage production --region us-east-1
# Creates: my-app-production stack with completely separate resources
```

## Stack Naming

Your stack name is derived from your project name and stage:

```
{projectName}-{stage}
```

For example:

- Project: `my-api`, Stage: `dev` → Stack: `my-api-dev`
- Project: `my-api`, Stage: `production` → Stack: `my-api-production`

## Stage-Based Configuration

### TypeScript (Recommended)

Use the `stage` parameter in `defineConfig`:

```typescript
import { defineConfig, RelationalDatabase, LambdaFunction, RdsEnginePostgres, $Secret } from 'stacktape';

export default defineConfig(({ stage }) => {
  const isProduction = stage === 'production';

  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        // Larger instance for production
        instanceSize: isProduction ? 'db.t4g.medium' : 'db.t4g.micro',
        // Multi-AZ only in production
        multiAz: isProduction
      }
    }),
    credentials: {
      masterUserPassword: $Secret(`db-password-${stage}`)
    },
    // Different backup retention
    automatedBackupRetentionDays: isProduction ? 7 : 1
  });

  const handler = new LambdaFunction({
    // More memory for production
    memory: isProduction ? 1024 : 256,
    // Longer timeout for production
    timeout: isProduction ? 30 : 10,
    environment: {
      NODE_ENV: isProduction ? 'production' : 'development',
      LOG_LEVEL: isProduction ? 'warn' : 'debug'
    }
  });

  return { resources: { database, handler } };
});
```

### YAML with Directives

In YAML, use variables and the `$Stage()` directive:

```yaml
variables:
  instanceSize:
    $CfIf:
      - $CfEquals: [$Stage(), 'production']
      - db.t4g.medium
      - db.t4g.micro

resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: $Var('instanceSize')
      credentials:
        masterUserPassword: $Secret($Format('db-password-{}', $Stage()))
```

## Common Stage Patterns

### Development → Staging → Production

```typescript
export default defineConfig(({ stage }) => {
  const config =
    {
      dev: {
        instanceSize: 'db.t4g.micro',
        minInstances: 1,
        maxInstances: 1,
        multiAz: false
      },
      staging: {
        instanceSize: 'db.t4g.small',
        minInstances: 1,
        maxInstances: 3,
        multiAz: false
      },
      production: {
        instanceSize: 'db.t4g.medium',
        minInstances: 2,
        maxInstances: 10,
        multiAz: true
      }
    }[stage] || config.dev; // Default to dev for unknown stages

  return {
    resources: {
      database: new RelationalDatabase({
        engine: new RdsEnginePostgres({
          version: '16',
          primaryInstance: {
            instanceSize: config.instanceSize,
            multiAz: config.multiAz
          }
        })
      }),
      api: new WebService({
        scaling: {
          minInstances: config.minInstances,
          maxInstances: config.maxInstances
        }
      })
    }
  };
});
```

### Feature Branch Stages

Create temporary environments for feature branches:

```bash
# Deploy feature branch
stacktape deploy --stage feature-123 --region us-east-1

# Test the feature
curl https://feature-123.api.example.com

# Delete when done
stacktape delete --stage feature-123 --region us-east-1
```

### Preview Environments

The Stacktape Console can automatically create preview environments for pull requests:

1. Open a PR
2. Stacktape automatically deploys a `preview-{pr-number}` stage
3. PR gets a comment with the deployment URL
4. When PR is merged/closed, the environment is deleted

`[IMAGE PLACEHOLDER: console-preview-environments]`

## Stage-Specific Secrets

Create separate secrets for each stage:

```bash
# Development secrets
stacktape secret:create --region us-east-1
# name: db-password-dev
# value: dev-password

# Production secrets
stacktape secret:create --region us-east-1
# name: db-password-production
# value: super-secure-production-password
```

Reference in config:

```typescript
export default defineConfig(({ stage }) => {
  const database = new RelationalDatabase({
    credentials: {
      masterUserPassword: $Secret(`db-password-${stage}`)
    }
  });

  return { resources: { database } };
});
```

## Stage-Specific Domains

```typescript
export default defineConfig(({ stage }) => {
  const api = new HttpApiGateway({
    customDomains:
      stage === 'production' ? [{ domainName: 'api.example.com' }] : [{ domainName: `${stage}.api.example.com` }]
  });

  return { resources: { api } };
});
```

Results:

- `production` → `api.example.com`
- `staging` → `staging.api.example.com`
- `dev` → `dev.api.example.com`

## Conditional Resources

Only create certain resources in specific stages:

```typescript
export default defineConfig(({ stage }) => {
  const resources: Record<string, any> = {};

  // Always create API
  resources.api = new HttpApiGateway({});

  // Database only in non-ephemeral stages
  if (!stage.startsWith('preview-')) {
    resources.database = new RelationalDatabase({
      engine: new RdsEnginePostgres({ version: '16' })
    });
  }

  // Monitoring only in production
  if (stage === 'production') {
    resources.firewall = new WebAppFirewall({ scope: 'regional' });
  }

  return { resources };
});
```

## Sharing Resources Across Stages

Sometimes you want to share certain resources (like a database) across stages. Use a separate "shared infrastructure" stack:

**shared-infra/stacktape.ts:**

```typescript
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16' })
  });

  return { resources: { database } };
});
```

**api/stacktape.ts:**

```typescript
export default defineConfig(({ stage }) => {
  const handler = new LambdaFunction({
    environment: {
      DATABASE_URL: $StackOutput(`shared-infra-${stage}`, 'database', 'connectionString')
    }
  });

  return { resources: { handler } };
});
```

## Default Stage and Region

Set defaults to avoid typing them every time:

```bash
stacktape defaults:configure
# Set default stage: dev
# Set default region: us-east-1
```

Now you can deploy without specifying stage/region:

```bash
stacktape deploy
# Uses stage=dev, region=us-east-1
```

Override when needed:

```bash
stacktape deploy --stage production --region eu-west-1
```

## Listing Stages

View all deployed stacks:

```bash
stacktape stack:list --region us-east-1
```

Output:

```
┌──────────────────────┬─────────────┬─────────────────────────┐
│ Stack Name           │ Status      │ Last Updated            │
├──────────────────────┼─────────────┼─────────────────────────┤
│ my-api-dev           │ DEPLOYED    │ 2024-01-15 10:30:00     │
│ my-api-staging       │ DEPLOYED    │ 2024-01-14 15:45:00     │
│ my-api-production    │ DEPLOYED    │ 2024-01-10 09:00:00     │
│ my-api-feature-123   │ DEPLOYED    │ 2024-01-15 11:00:00     │
└──────────────────────┴─────────────┴─────────────────────────┘
```

## Best Practices

1. **Use consistent naming**: `dev`, `staging`, `production` or `development`, `test`, `prod`
2. **Separate secrets per stage**: Never share production secrets with development
3. **Start small in dev**: Use minimal resources in development to save costs
4. **Test in staging**: Make staging as close to production as possible
5. **Protect production**: Add additional safeguards (WAF, monitoring, multi-AZ)
6. **Clean up feature stages**: Delete temporary stages when no longer needed

## Next Steps
