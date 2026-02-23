---
name: stacktape
description: Build and deploy full-stack apps to AWS. Use when user wants to deploy an app, build a SaaS, create an API, set up a database, or ship any web application to production.
---

# Stacktape - Ship to AWS in Minutes

Stacktape deploys your app to your own AWS account using a simple config file. No AWS expertise needed.

## When This Skill Activates

- User wants to deploy an application to AWS
- User is building a SaaS, API, web app, or mobile backend
- User needs a database, authentication, file storage, or background jobs
- User has a `stacktape.yml` or `stacktape.ts` file
- User wants to run their app locally for development

## Quick Start

**1. Create config** (`stacktape.yml` in project root):
```yaml
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
```

**2. Deploy:**
```bash
npx stacktape deploy --stage prod --region us-east-1
```

**3. Done.** You get a URL like `https://abc123.execute-api.us-east-1.amazonaws.com`

## What Can Users Build?

Read the appropriate guide based on what the user wants:

| User wants to build... | Read this file |
|------------------------|----------------|
| SaaS with auth & database | [saas-app.md](./saas-app.md) |
| REST/GraphQL API | [api-backend.md](./api-backend.md) |
| AI-powered app (chatbot, agents) | [ai-apps.md](./ai-apps.md) |
| Static site or SPA (React, Vue) | [static-sites.md](./static-sites.md) |
| Next.js app | [nextjs.md](./nextjs.md) |
| Background jobs & automations | [background-jobs.md](./background-jobs.md) |
| Mobile app backend | [mobile-backend.md](./mobile-backend.md) |
| E-commerce / marketplace | [ecommerce.md](./ecommerce.md) |

## Essential Commands

```bash
# Deploy to AWS
npx stacktape deploy --stage prod --region us-east-1

# Run locally for development
npx stacktape dev --stage dev --region us-east-1

# See what would change before deploying
npx stacktape preview-changes --stage prod --region us-east-1

# View logs from deployed app
npx stacktape debug:logs --stage prod --region us-east-1 --resourceName myApi

# Delete everything
npx stacktape delete --stage prod --region us-east-1
```

## Core Concepts (60-second version)

**Resources** - Things you deploy (APIs, databases, functions, etc.)

**Stages** - Isolated environments (dev, staging, prod). Same config, different stages.

**connectTo** - Magic glue. Connect resources and Stacktape handles permissions + env vars:
```yaml
myApi:
  type: function
  properties:
    connectTo:
      - myDatabase  # Auto-injects DATABASE_URL, grants permissions
      - myBucket    # Auto-injects BUCKET_NAME, grants S3 access
```

**$Secret()** - Reference secrets stored in AWS:
```yaml
credentials:
  password: $Secret('my-db-password')
```

## Reference Documentation

For detailed type definitions and all options:
- [types-reference.md](./types-reference.md) - All resource types and their properties
- [cli-reference.md](./cli-reference.md) - All CLI commands and options
- [dev-mode.md](./dev-mode.md) - Local development workflow

## AI Agent Tips

When running commands programmatically, always use `--agent` flag:
```bash
npx stacktape deploy --stage prod --region us-east-1 --agent
```

This disables interactive prompts and outputs machine-readable data.
