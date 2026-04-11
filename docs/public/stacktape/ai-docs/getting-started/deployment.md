---
docType: getting-started
title: Deployment
tags:
  - deployment
  - getting-started
source: docs/_curated-docs/getting-started/deployment.mdx
priority: 2
---

# Deployment

This guide covers everything you need to know about deploying your Stacktape infrastructure to AWS.

## Basic Deployment

```bash
stacktape deploy --stage dev --region us-east-1
```

| Option            | Required | Description                                                               |
| ----------------- | -------- | ------------------------------------------------------------------------- |
| `--stage` (`-s`)  | Yes      | Environment name: `dev`, `staging`, `production`, etc. Max 12 characters. |
| `--region` (`-r`) | Yes      | AWS region: `us-east-1`, `eu-west-1`, `ap-southeast-1`, etc.              |
| `--configPath`    | No       | Path to config file. Default: `stacktape.ts` or `stacktape.yml`           |
| `--awsProfile`    | No       | AWS profile to use. Default: `default`                                    |

## What Happens During Deployment

### Example Output

```
Stacktape: Deploy

  Stage:   dev
  Region:  us-east-1
  Stack:   my-api-dev

✓ Validating configuration...
✓ Packaging handler (1.2 MB)...
✓ Packaging worker (890 KB)...
✓ Uploading artifacts to S3...
✓ Deploying CloudFormation stack...

  Creating: MyApiDevHandlerLambda
  Creating: MyApiDevDatabase
  Creating: MyApiDevApiGateway
  ✓ Created: MyApiDevHandlerLambda
  ✓ Created: MyApiDevDatabase
  ✓ Created: MyApiDevApiGateway

✓ Stack deployed successfully in 47s

Stack Outputs:
  api.url:      https://abc123.execute-api.us-east-1.amazonaws.com
  database.host: my-api-dev-db.xxx.us-east-1.rds.amazonaws.com
```

## Deployment Strategies

### Hot-Swap (Development)

Update Lambda code in ~5 seconds without full CloudFormation deployment:

```bash
stacktape deploy --stage dev --region us-east-1 --hotSwap
```

Hot-swap directly updates Lambda function code, bypassing CloudFormation. Use only for development - it can cause state drift.

**What hot-swap updates:**

- Lambda function code
- Lambda environment variables
- Container image references

**What hot-swap doesn't update:**

- New resources (databases, queues, etc.)
- IAM permissions
- API Gateway routes
- Resource configuration (memory, timeout, etc.)

### Full Deployment (Production)

Always use full deployment for production:

```bash
stacktape deploy --stage production --region us-east-1
```

Full deployment:

- Updates all resources through CloudFormation
- Maintains infrastructure state consistency
- Enables automatic rollback on failure
- Required for any configuration changes

### CodeBuild Deployment

For resource-intensive builds (large Docker images, monorepos), offload to AWS CodeBuild:

```bash
stacktape codebuild:deploy --stage production --region us-east-1
```

This:

1. Zips your project and uploads to S3
2. Spins up a CodeBuild environment in your AWS account
3. Runs the deployment there (more CPU/memory available)
4. Streams logs to your terminal

Useful when your local machine is slow or has limited resources.

## Deployment Options

### Skip Confirmation Prompts

For CI/CD pipelines:

```bash
stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
```

### Disable Auto-Rollback

By default, failed deployments automatically rollback to the previous state. Disable this to debug failures:

```bash
stacktape deploy --stage dev --region us-east-1 --disableAutoRollback
```

Then inspect the failed resources in AWS Console, fix the issue, and either:

- Deploy again (will continue from failed state)
- Manually rollback: `stacktape rollback --stage dev --region us-east-1`

### Preserve Temp Files

Keep generated CloudFormation templates for debugging:

```bash
stacktape deploy --stage dev --region us-east-1 --preserveTempFiles
```

Files are saved to `.stacktape/<invocation-id>/`.

### Debug Logging

```bash
stacktape deploy --stage dev --region us-east-1 --logLevel debug
```

### No Build Cache

Force fresh builds (useful if cache is corrupted):

```bash
stacktape deploy --stage dev --region us-east-1 --noCache
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to production
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: |
          npm install -g stacktape
          stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  image: node:20
  stage: deploy
  only:
    - main
  script:
    - npm ci
    - npm install -g stacktape
    - stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
  variables:
    STACKTAPE_API_KEY: $STACKTAPE_API_KEY
```

### Environment Variables for CI/CD

| Variable                | Description                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `STACKTAPE_API_KEY`     | Your Stacktape API key (get from [console.stacktape.com/api-keys](https://console.stacktape.com/api-keys)) |
| `AWS_ACCESS_KEY_ID`     | AWS credentials (alternative to connected account)                                                         |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (alternative to connected account)                                                         |

## GitOps (Console-based)

Connect your repository to the Stacktape Console for automated deployments:

1. Go to [console.stacktape.com](https://console.stacktape.com)
2. Create a new project
3. Connect your GitHub/GitLab/Bitbucket repository
4. Configure branch-to-stage mapping:
   - `main` → `production`
   - `develop` → `staging`
   - Pull requests → `preview-{pr-number}`

**Features:**

- Automatic deployment on push
- Preview environments for pull requests
- Deployment history and logs
- One-click rollback
- Slack/Discord notifications

## Managing Deployments

### View Stack Information

```bash
stacktape stack:info --stage dev --region us-east-1
```

Output:

```
Stack: my-api-dev
Status: DEPLOYED
Region: us-east-1

Resources:
  handler (function)
    URL: https://abc123.execute-api.us-east-1.amazonaws.com
    ARN: arn:aws:lambda:us-east-1:123456789:function:my-api-dev-handler

  database (relational-database)
    Host: my-api-dev-db.xxx.us-east-1.rds.amazonaws.com
    Port: 5432
```

### List All Stacks

```bash
stacktape stack:list --region us-east-1
```

### Preview Changes

See what will change before deploying:

```bash
stacktape preview-changes --stage dev --region us-east-1
```

Output:

```
Changes to be applied:

+ CREATE: newFunction (Lambda Function)
~ UPDATE: handler (Lambda Function)
    - memory: 256 → 512
    - timeout: 10 → 30
- DELETE: oldFunction (Lambda Function)

Resources unchanged: 3
```

### Delete Stack

```bash
stacktape delete --stage dev --region us-east-1
```

### Rollback

If a deployment fails with auto-rollback disabled:

```bash
stacktape rollback --stage dev --region us-east-1
```

If a specific resource is blocking rollback:

```bash
stacktape rollback --stage dev --region us-east-1 --resourcesToSkip BrokenResource
```

## Setting Defaults

Configure defaults to avoid typing stage/region every time:

```bash
stacktape defaults:configure
```

Prompts:

```
? Default stage: dev
? Default region: us-east-1
? Default AWS profile: default
```

Now you can just run:

```bash
stacktape deploy
stacktape dev
stacktape logs --resourceName handler
```

View current defaults:

```bash
stacktape defaults:list
```

## Deployment Best Practices

### 1. Use Stages for Environments

```bash
# Development - fast iteration, hot-swap OK
stacktape deploy --stage dev --region us-east-1 --hotSwap

# Staging - test production config
stacktape deploy --stage staging --region us-east-1

# Production - full deployment, no shortcuts
stacktape deploy --stage production --region us-east-1
```

### 2. Protect Production

Add confirmation for production deployments in CI:

```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: |
    echo "Deploying to PRODUCTION"
    stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
```

### 3. Run Migrations in Hooks

```typescript
export default defineConfig(() => ({
  hooks: {
    afterDeploy: [{ scriptName: 'migrate' }]
  },
  scripts: {
    migrate: {
      executeCommand: 'npx prisma migrate deploy',
      environment: {
        DATABASE_URL: $ResourceParam('database', 'connectionString')
      }
    }
  },
  resources: {
    /* ... */
  }
}));
```

### 4. Use Preview Environments

For pull request previews, use dynamic stage names:

```bash
# In CI, use PR number as stage
stacktape deploy --stage "preview-${PR_NUMBER}" --region us-east-1
```

Clean up when PR is closed:

```bash
stacktape delete --stage "preview-${PR_NUMBER}" --region us-east-1
```

## Troubleshooting

### "Stack is in ROLLBACK_COMPLETE state"

The stack failed to create and rolled back. Delete it and try again:

```bash
stacktape delete --stage dev --region us-east-1
stacktape deploy --stage dev --region us-east-1
```

### "Resource limit exceeded"

You've hit AWS service limits. Request a limit increase in AWS Console under Service Quotas.

### "Deployment is taking too long"

- Check if you're deploying a large Docker image (use `--logLevel debug`)
- Consider using `codebuild:deploy` for better build performance
- Ensure your config doesn't create unnecessary resources

### "No changes to deploy"

Your configuration matches what's already deployed. If you expected changes, check:

- You're deploying the correct stage
- Your config file was saved
- The changes are in a Stacktape-managed resource (not `cloudformationResources`)
