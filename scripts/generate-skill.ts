/**
 * Generates the Stacktape skill for AI agents (Claude Code, etc.)
 *
 * This skill is USE-CASE ORIENTED - it teaches AI how to help users
 * build real applications, not just understand infrastructure.
 *
 * Target users (2026):
 * - Vibecoders: Non-technical founders using AI to build products
 * - Freelancers: Building MVPs and prototypes for clients
 * - SMBs: Small teams needing production infrastructure
 * - Early-stage startups: Shipping fast with limited DevOps resources
 *
 * Usage: bun run scripts/generate-skill.ts
 */

import { join } from 'node:path';
import { emptyDir, ensureDir, readFile, writeFile } from 'fs-extra';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { commandDefinitions } from '../src/config/cli/commands';

const SKILL_OUTPUT_DIR = '.claude/skills/stacktape';
const TYPES_DIR = 'types/stacktape-config';

// Read a type definition file
const readTypeFile = async (fileName: string): Promise<string> => {
  const filePath = join(TYPES_DIR, fileName);
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
};

// Generate the main SKILL.md - the entry point
const generateMainSkill = (): string => {
  return `---
name: stacktape
description: Build and deploy full-stack apps to AWS. Use when user wants to deploy an app, build a SaaS, create an API, set up a database, or ship any web application to production.
---

# Stacktape - Ship to AWS in Minutes

Stacktape deploys your app to your own AWS account using a simple config file. No AWS expertise needed.

## When This Skill Activates

- User wants to deploy an application to AWS
- User is building a SaaS, API, web app, or mobile backend
- User needs a database, authentication, file storage, or background jobs
- User has a \`stacktape.yml\` or \`stacktape.ts\` file
- User wants to run their app locally for development

## Quick Start

**1. Create config** (\`stacktape.yml\` in project root):
\`\`\`yaml
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
\`\`\`

**2. Deploy:**
\`\`\`bash
npx stacktape deploy --stage prod --region us-east-1
\`\`\`

**3. Done.** You get a URL like \`https://abc123.execute-api.us-east-1.amazonaws.com\`

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

\`\`\`bash
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
\`\`\`

## Core Concepts (60-second version)

**Resources** - Things you deploy (APIs, databases, functions, etc.)

**Stages** - Isolated environments (dev, staging, prod). Same config, different stages.

**connectTo** - Magic glue. Connect resources and Stacktape handles permissions + env vars:
\`\`\`yaml
myApi:
  type: function
  properties:
    connectTo:
      - myDatabase  # Auto-injects DATABASE_URL, grants permissions
      - myBucket    # Auto-injects BUCKET_NAME, grants S3 access
\`\`\`

**$Secret()** - Reference secrets stored in AWS:
\`\`\`yaml
credentials:
  password: $Secret('my-db-password')
\`\`\`

## Reference Documentation

For detailed type definitions and all options:
- [types-reference.md](./types-reference.md) - All resource types and their properties
- [cli-reference.md](./cli-reference.md) - All CLI commands and options
- [dev-mode.md](./dev-mode.md) - Local development workflow

## AI Agent Tips

When running commands programmatically, always use \`--agent\` flag:
\`\`\`bash
npx stacktape deploy --stage prod --region us-east-1 --agent
\`\`\`

This disables interactive prompts and outputs machine-readable data.
`;
};

// SaaS Application Guide
const generateSaasGuide = (): string => {
  return `# Building a SaaS Application

Complete guide for deploying a SaaS with user authentication, database, and API.

## Minimal SaaS Stack

\`\`\`yaml
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
\`\`\`

## With Custom Domain

\`\`\`yaml
resources:
  api:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.myapp.com

  # ... rest of resources
\`\`\`

## With Email Sending (Transactional Emails)

\`\`\`yaml
resources:
  app:
    type: function
    properties:
      # ... other config
      connectTo:
        - database
        - auth
        - aws:ses  # Grants permission to send emails via AWS SES
\`\`\`

Then in your code:
\`\`\`typescript
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
\`\`\`

## With File Uploads (S3)

\`\`\`yaml
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
\`\`\`

## With Background Jobs

\`\`\`yaml
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
\`\`\`

## With Caching (Redis)

\`\`\`yaml
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
\`\`\`

## Full Production SaaS Template

\`\`\`yaml
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
\`\`\`

## Environment Variables Injected by connectTo

When you use \`connectTo\`, these env vars are automatically available in your code:

| Connected Resource | Environment Variables |
|--------------------|----------------------|
| relational-database | \`STP_{NAME}_CONNECTION_STRING\`, \`STP_{NAME}_HOST\`, \`STP_{NAME}_PORT\`, \`STP_{NAME}_DB_NAME\`, \`STP_{NAME}_USER\`, \`STP_{NAME}_PASSWORD\` |
| bucket | \`STP_{NAME}_BUCKET_NAME\`, \`STP_{NAME}_BUCKET_ARN\` |
| sqs-queue | \`STP_{NAME}_QUEUE_URL\`, \`STP_{NAME}_QUEUE_ARN\` |
| upstash-redis | \`STP_{NAME}_URL\`, \`STP_{NAME}_HOST\`, \`STP_{NAME}_PORT\`, \`STP_{NAME}_PASSWORD\` |
| user-auth-pool | \`STP_{NAME}_USER_POOL_ID\`, \`STP_{NAME}_USER_POOL_CLIENT_ID\` |

Example: If your database is named \`database\`, you get \`STP_DATABASE_CONNECTION_STRING\`.
`;
};

// API Backend Guide
const generateApiGuide = (): string => {
  return `# Building an API Backend

Deploy REST or GraphQL APIs with database, caching, and more.

## Simple REST API

\`\`\`yaml
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts  # Express, Hono, Fastify, etc.
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
\`\`\`

Your handler (\`src/api.ts\`):
\`\`\`typescript
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

app.get('/users', (c) => c.json({ users: [] }));
app.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json({ id: 1, ...body });
});

export const handler = handle(app);
\`\`\`

## API with PostgreSQL Database

\`\`\`yaml
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - database

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
          minCapacity: 0
          maxCapacity: 4
      credentials:
        masterUserPassword: $Secret('db-password')
\`\`\`

In your code, use the injected connection string:
\`\`\`typescript
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.STP_DATABASE_CONNECTION_STRING
});
\`\`\`

## API with DynamoDB (NoSQL)

\`\`\`yaml
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - items

  items:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: pk
          type: S
        sortKey:
          name: sk
          type: S
      billing:
        type: on-demand  # Pay per request, no provisioning
\`\`\`

## API with Authentication

\`\`\`yaml
resources:
  api:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE']
        allowOrigins: ['https://myapp.com']

  publicEndpoints:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/public.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /public/{proxy+}
            method: '*'
            # No authorizer - public access

  protectedEndpoints:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/protected.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /api/{proxy+}
            method: '*'
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database
        - auth

  auth:
    type: user-auth-pool
    properties:
      allowSignUp: true
      emailVerificationRequired: true
\`\`\`

## GraphQL API

Same pattern, just use your GraphQL framework:

\`\`\`yaml
resources:
  graphql:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/graphql.ts
      events:
        - type: http-api-gateway
          properties:
            path: /graphql
            method: '*'
      connectTo:
        - database
\`\`\`

Handler with Apollo Server:
\`\`\`typescript
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';

const server = new ApolloServer({ typeDefs, resolvers });

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
\`\`\`

## Container-based API (for complex dependencies)

Use when you need:
- Custom system dependencies
- Long-running connections
- WebSockets
- More than 15 min execution time

\`\`\`yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 10
        scalingPolicy:
          keepAvgCpuUtilizationUnder: 70
      connectTo:
        - database
\`\`\`

## API Rate Limiting & Protection

\`\`\`yaml
resources:
  api:
    type: http-api-gateway
    properties:
      throttling:
        burstLimit: 100
        rateLimit: 50  # requests per second

  # Optional: Add WAF for advanced protection
  firewall:
    type: web-app-firewall
    properties:
      scope: regional
      associatedResources:
        - httpApiGatewayName: api
      ruleStatements:
        - type: rate-based
          properties:
            aggregateKeyType: IP
            limit: 1000  # per 5 minutes
            action: block
\`\`\`
`;
};

// AI Applications Guide
const generateAiAppsGuide = (): string => {
  return `# Building AI-Powered Applications

Deploy chatbots, AI agents, RAG systems, and more.

## Simple AI Chatbot API

\`\`\`yaml
resources:
  chat:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/chat.ts
      timeout: 60  # AI calls can be slow
      memory: 1024
      events:
        - type: http-api-gateway
          properties:
            path: /chat
            method: POST
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
\`\`\`

Handler:
\`\`\`typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler = async (event) => {
  const { message } = JSON.parse(event.body);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: message }]
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ reply: response.choices[0].message.content })
  };
};
\`\`\`

## RAG (Retrieval Augmented Generation) App

\`\`\`yaml
resources:
  # API endpoint
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/rag-api.ts
      timeout: 60
      memory: 2048
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
      connectTo:
        - vectorDb
        - documents

  # Vector database for embeddings
  vectorDb:
    type: open-search
    properties:
      clusterConfig:
        instanceType: t3.small.search
        instanceCount: 1
      ebsOptions:
        volumeSize: 20

  # Store original documents
  documents:
    type: bucket

  # Process new documents when uploaded
  documentProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-document.ts
      timeout: 300
      memory: 2048
      events:
        - type: s3
          properties:
            bucketName: documents
            s3Events:
              - s3:ObjectCreated:*
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
      connectTo:
        - vectorDb
        - documents
\`\`\`

## AI Agent with Tool Calling

\`\`\`yaml
resources:
  agent:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/agent.ts
      timeout: 120
      memory: 2048
      events:
        - type: http-api-gateway
          properties:
            path: /agent
            method: POST
      environment:
        - name: ANTHROPIC_API_KEY
          value: $Secret('anthropic-key')
      connectTo:
        - database
        - aws:ses  # Agent can send emails

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
\`\`\`

## GPU Batch Processing (Image Generation, ML)

For heavy AI workloads that need GPUs:

\`\`\`yaml
resources:
  # API receives requests
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - jobQueue
        - results

  # Queue for processing jobs
  jobQueue:
    type: sqs-queue

  # GPU batch job for inference
  mlProcessor:
    type: batch-job
    properties:
      packaging:
        type: external-image
        properties:
          uri: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
      resources:
        cpu: 4
        memory: 16384
        gpu: 1
      events:
        - type: sqs
          properties:
            sqsQueueName: jobQueue
      connectTo:
        - results

  # Store generated outputs
  results:
    type: bucket
\`\`\`

## Streaming Responses (Server-Sent Events)

For streaming AI responses, use a container:

\`\`\`yaml
resources:
  streamingApi:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/streaming-server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 5
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
\`\`\`

Handler with streaming:
\`\`\`typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import OpenAI from 'openai';

const app = new Hono();
const openai = new OpenAI();

app.post('/chat/stream', async (c) => {
  const { message } = await c.req.json();
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: message }],
    stream: true
  });
  
  return streamSSE(c, async (sseStream) => {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        await sseStream.writeSSE({ data: content });
      }
    }
  });
});

export default app;
\`\`\`

## AI with Conversation Memory (Redis)

\`\`\`yaml
resources:
  chat:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/chat-with-memory.ts
      events:
        - type: http-api-gateway
          properties:
            path: /chat
            method: POST
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
      connectTo:
        - conversationCache

  conversationCache:
    type: upstash-redis
    properties:
      eviction: true  # Auto-expire old conversations
\`\`\`

## Cost Tips for AI Apps

1. **Use serverless databases** - Aurora Serverless v2 scales to zero
2. **Use Upstash Redis** - Pay per request, not per hour
3. **Batch requests** - Process multiple items in one Lambda invocation
4. **Use SQS** - Queue requests to handle traffic spikes without scaling costs
5. **Consider spot instances** - Use \`batch-job\` with spot for 90% cost savings on ML workloads
`;
};

// Static Sites Guide
const generateStaticSitesGuide = (): string => {
  return `# Deploying Static Sites & SPAs

Deploy React, Vue, Svelte, or any static site with global CDN.

## Static Site (Vite, Create React App, etc.)

\`\`\`yaml
resources:
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist  # Your build output folder
      hostingContentType: single-page-app
\`\`\`

That's it. Build and deploy:
\`\`\`bash
npm run build
npx stacktape deploy --stage prod --region us-east-1
\`\`\`

## With Custom Domain

\`\`\`yaml
resources:
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      customDomains:
        - domainName: www.myapp.com
        - domainName: myapp.com
\`\`\`

## SPA with API Backend

\`\`\`yaml
resources:
  # Frontend (React, Vue, etc.)
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./frontend/dist
      hostingContentType: single-page-app
      customDomains:
        - domainName: myapp.com

  # Backend API
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./backend/src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
            httpApiGatewayName: apiGateway
      connectTo:
        - database

  apiGateway:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.myapp.com
      cors:
        enabled: true
        allowOrigins:
          - https://myapp.com
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
\`\`\`

## Astro / Static Site Generator

\`\`\`yaml
resources:
  blog:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      cacheControl:
        - pattern: "**/*.html"
          maxAge: 0  # Always revalidate HTML
        - pattern: "**/*"
          maxAge: 31536000  # Cache assets for 1 year
\`\`\`

## Marketing Site with Contact Form

\`\`\`yaml
resources:
  # Static marketing pages
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      customDomains:
        - domainName: mycompany.com

  # Contact form API
  contactApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/contact.ts
      events:
        - type: http-api-gateway
          properties:
            path: /contact
            method: POST
            httpApiGatewayName: apiGateway
      connectTo:
        - aws:ses  # For sending emails

  apiGateway:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.mycompany.com
      cors:
        enabled: true
        allowOrigins:
          - https://mycompany.com
\`\`\`

## Build Before Deploy

\`\`\`yaml
hooks:
  beforeDeploy:
    - scriptName: build

scripts:
  build:
    type: local-script
    properties:
      executeCommand: npm run build
\`\`\`
`;
};

// Next.js Guide
const generateNextjsGuide = (): string => {
  return `# Deploying Next.js Applications

Stacktape has first-class Next.js support with serverless SSR.

## Basic Next.js App

\`\`\`yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./  # Where your Next.js app lives
      customDomains:
        - domainName: myapp.com
\`\`\`

That's it. Stacktape handles:
- Static assets on CDN
- Server-side rendering with Lambda
- API routes
- Image optimization
- ISR (Incremental Static Regeneration)

## Next.js with Database

\`\`\`yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      customDomains:
        - domainName: myapp.com
      connectTo:
        - database

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
          minCapacity: 0
          maxCapacity: 4
      credentials:
        masterUserPassword: $Secret('db-password')
\`\`\`

Use Prisma, Drizzle, or raw SQL in your server components:
\`\`\`typescript
// app/users/page.tsx
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.STP_DATABASE_CONNECTION_STRING
});

export default async function UsersPage() {
  const { rows } = await pool.query('SELECT * FROM users LIMIT 10');
  return <UserList users={rows} />;
}
\`\`\`

## Next.js with Authentication

\`\`\`yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      connectTo:
        - database
        - auth

  auth:
    type: user-auth-pool
    properties:
      allowSignUp: true
      emailVerificationRequired: true

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
\`\`\`

## Full-Stack Next.js SaaS

\`\`\`yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      customDomains:
        - domainName: myapp.com
        - domainName: www.myapp.com
      connectTo:
        - database
        - cache
        - uploads
        - auth
        - aws:ses

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

  cache:
    type: upstash-redis
    properties:
      eviction: true

  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT', 'POST']
            allowedOrigins: ['https://myapp.com', 'https://www.myapp.com']
            allowedHeaders: ['*']

  auth:
    type: user-auth-pool
    properties:
      allowSignUp: true
      emailVerificationRequired: true
      passwordPolicy:
        minimumLength: 8
        requireNumbers: true

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
\`\`\`

## Next.js API Routes as Separate Functions

For better cold start times, split heavy API routes:

\`\`\`yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      # Exclude heavy API routes from Next.js bundle
      excludeRoutes:
        - /api/heavy-processing

  # Deploy heavy routes as separate Lambda
  heavyApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/heavy-api.ts
      timeout: 60
      memory: 2048
      events:
        - type: http-api-gateway
          properties:
            path: /api/heavy-processing
            method: '*'
\`\`\`
`;
};

// Background Jobs Guide
const generateBackgroundJobsGuide = (): string => {
  return `# Background Jobs & Automations

Run scheduled tasks, process queues, handle webhooks.

## Scheduled Job (Cron)

\`\`\`yaml
resources:
  dailyReport:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/daily-report.ts
      timeout: 300
      events:
        - type: schedule
          properties:
            scheduleRate: cron(0 9 * * ? *)  # 9 AM UTC daily
      connectTo:
        - database
        - aws:ses
\`\`\`

Common cron patterns:
- \`cron(0 9 * * ? *)\` - Daily at 9 AM
- \`cron(0 */2 * * ? *)\` - Every 2 hours
- \`cron(0 9 ? * MON *)\` - Every Monday at 9 AM
- \`rate(5 minutes)\` - Every 5 minutes

## Job Queue with Retry

\`\`\`yaml
resources:
  # API adds jobs to queue
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - jobQueue

  # Main job queue
  jobQueue:
    type: sqs-queue
    properties:
      visibilityTimeoutSeconds: 300
      redrivePolicy:
        targetSqsQueueName: deadLetterQueue
        maxReceiveCount: 3  # Retry 3 times, then DLQ

  # Failed jobs
  deadLetterQueue:
    type: sqs-queue

  # Worker processes jobs
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      timeout: 300
      events:
        - type: sqs
          properties:
            sqsQueueName: jobQueue
            batchSize: 1
      connectTo:
        - database
\`\`\`

Adding jobs from your API:
\`\`\`typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

await sqs.send(new SendMessageCommand({
  QueueUrl: process.env.STP_JOB_QUEUE_QUEUE_URL,
  MessageBody: JSON.stringify({ type: 'process-order', orderId: 123 })
}));
\`\`\`

## Webhook Processor

\`\`\`yaml
resources:
  webhookReceiver:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/webhook.ts
      events:
        - type: http-api-gateway
          properties:
            path: /webhooks/{provider}
            method: POST
      connectTo:
        - database
        - notificationQueue

  # Process notifications async
  notificationQueue:
    type: sqs-queue

  notificationWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/notifications.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: notificationQueue
      connectTo:
        - aws:ses
\`\`\`

## File Processing Pipeline

Process files when uploaded to S3:

\`\`\`yaml
resources:
  uploads:
    type: bucket

  fileProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-file.ts
      timeout: 300
      memory: 2048
      events:
        - type: s3
          properties:
            bucketName: uploads
            s3Events:
              - s3:ObjectCreated:*
            filterRules:
              - type: prefix
                value: incoming/
      connectTo:
        - uploads
        - database
\`\`\`

## Long-Running Batch Jobs

For jobs > 15 minutes or needing more resources:

\`\`\`yaml
resources:
  heavyJob:
    type: batch-job
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/heavy-processing.ts
      resources:
        cpu: 4
        memory: 8192
      timeout: 3600  # 1 hour
      events:
        - type: schedule
          properties:
            scheduleRate: cron(0 2 * * ? *)  # 2 AM daily
      connectTo:
        - database
\`\`\`

## Event-Driven Architecture

\`\`\`yaml
resources:
  # Central event bus
  eventBus:
    type: event-bus

  # Order service publishes events
  orderService:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/orders.ts
      events:
        - type: http-api-gateway
          properties:
            path: /orders/{proxy+}
            method: '*'
      connectTo:
        - database
        - eventBus

  # Email service listens for order events
  emailService:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/send-emails.ts
      events:
        - type: event-bus
          properties:
            eventBusName: eventBus
            eventPattern:
              source:
                - orders
              detail-type:
                - OrderCreated
                - OrderShipped
      connectTo:
        - aws:ses

  # Analytics service listens for all events
  analyticsService:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/analytics.ts
      events:
        - type: event-bus
          properties:
            eventBusName: eventBus
            eventPattern:
              source:
                - prefix: ''  # All sources
      connectTo:
        - analyticsDb
\`\`\`

Publishing events:
\`\`\`typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

await eventBridge.send(new PutEventsCommand({
  Entries: [{
    EventBusName: process.env.STP_EVENT_BUS_NAME,
    Source: 'orders',
    DetailType: 'OrderCreated',
    Detail: JSON.stringify({ orderId: 123, userId: 456 })
  }]
}));
\`\`\`
`;
};

// Mobile Backend Guide
const generateMobileBackendGuide = (): string => {
  return `# Mobile App Backend

Build backends for iOS, Android, React Native, Flutter apps.

## Basic Mobile API with Auth

\`\`\`yaml
resources:
  api:
    type: http-api-gateway
    properties:
      cors:
        enabled: true

  # Public endpoints (login, register)
  publicApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/public.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /auth/{proxy+}
            method: '*'
      connectTo:
        - auth
        - database

  # Protected endpoints (require auth)
  protectedApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/protected.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /api/{proxy+}
            method: '*'
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database
        - uploads

  auth:
    type: user-auth-pool
    properties:
      allowSignUp: true
      emailVerificationRequired: true
      passwordPolicy:
        minimumLength: 8
      # Enable refresh tokens for mobile
      accessTokenValidity: 1  # 1 hour
      refreshTokenValidity: 30  # 30 days

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'

  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT']
            allowedOrigins: ['*']  # Mobile apps
            allowedHeaders: ['*']
\`\`\`

## Push Notifications

\`\`\`yaml
resources:
  # SNS topic for push notifications
  pushNotifications:
    type: sns-topic

  # API can trigger notifications
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - database
        - pushNotifications
\`\`\`

## Real-time Features (WebSockets)

\`\`\`yaml
resources:
  realtimeServer:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/websocket-server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 10
      connectTo:
        - redis
        - database

  # Redis for pub/sub across instances
  redis:
    type: upstash-redis
\`\`\`

## Offline-First with Sync

\`\`\`yaml
resources:
  syncApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/sync.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /sync
            method: POST
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database

  api:
    type: http-api-gateway

  auth:
    type: user-auth-pool

  # DynamoDB works great for sync
  database:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: userId
          type: S
        sortKey:
          name: itemId
          type: S
      billing:
        type: on-demand
\`\`\`

## File Uploads with Presigned URLs

\`\`\`yaml
resources:
  uploads:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT']
            allowedOrigins: ['*']
            allowedHeaders: ['*']
            exposeHeaders: ['ETag']

  uploadApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/upload-url.ts
      events:
        - type: http-api-gateway
          properties:
            path: /upload-url
            method: POST
      connectTo:
        - uploads
\`\`\`

Generate presigned URL:
\`\`\`typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export const handler = async (event) => {
  const { filename, contentType } = JSON.parse(event.body);
  const key = \`uploads/\${Date.now()}-\${filename}\`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.STP_UPLOADS_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });
  
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl, key })
  };
};
\`\`\`
`;
};

// E-commerce Guide
const generateEcommerceGuide = (): string => {
  return `# E-commerce & Marketplace

Build online stores, marketplaces, and payment-enabled apps.

## Simple Store with Stripe

\`\`\`yaml
resources:
  api:
    type: http-api-gateway
    properties:
      cors:
        enabled: true

  # Store API
  storeApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/store.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /{proxy+}
            method: '*'
      environment:
        - name: STRIPE_SECRET_KEY
          value: $Secret('stripe-secret')
      connectTo:
        - database
        - aws:ses

  # Handle Stripe webhooks
  stripeWebhook:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/stripe-webhook.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /webhooks/stripe
            method: POST
      environment:
        - name: STRIPE_WEBHOOK_SECRET
          value: $Secret('stripe-webhook-secret')
      connectTo:
        - database
        - orderQueue

  # Process orders async
  orderQueue:
    type: sqs-queue

  orderProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-order.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: orderQueue
      connectTo:
        - database
        - aws:ses

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'

  # Storefront
  storefront:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./frontend/dist
      hostingContentType: single-page-app
\`\`\`

## Product Catalog with Search

\`\`\`yaml
resources:
  # Product API
  productApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/products.ts
      events:
        - type: http-api-gateway
          properties:
            path: /products/{proxy+}
            method: '*'
      connectTo:
        - database
        - productSearch
        - productImages

  # Full-text search
  productSearch:
    type: open-search
    properties:
      clusterConfig:
        instanceType: t3.small.search
        instanceCount: 1

  # Product images
  productImages:
    type: bucket
    properties:
      corsConfiguration:
        corsRules:
          - allowedMethods: ['GET', 'PUT']
            allowedOrigins: ['*']
            allowedHeaders: ['*']

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
\`\`\`

## Shopping Cart (Redis)

\`\`\`yaml
resources:
  cartApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/cart.ts
      events:
        - type: http-api-gateway
          properties:
            path: /cart/{proxy+}
            method: '*'
      connectTo:
        - cartCache
        - database

  # Fast cart storage with auto-expiry
  cartCache:
    type: upstash-redis
    properties:
      eviction: true
\`\`\`

Cart operations:
\`\`\`typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.STP_CART_CACHE_URL,
  token: process.env.STP_CART_CACHE_PASSWORD
});

// Add to cart (expires in 7 days)
await redis.hset(\`cart:\${userId}\`, { [productId]: quantity });
await redis.expire(\`cart:\${userId}\`, 60 * 60 * 24 * 7);

// Get cart
const cart = await redis.hgetall(\`cart:\${userId}\`);
\`\`\`

## Inventory Management

\`\`\`yaml
resources:
  # Use DynamoDB for high-concurrency inventory updates
  inventory:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: productId
          type: S
      billing:
        type: on-demand

  inventoryApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/inventory.ts
      events:
        - type: http-api-gateway
          properties:
            path: /inventory/{proxy+}
            method: '*'
      connectTo:
        - inventory
\`\`\`

Atomic inventory update:
\`\`\`typescript
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});

// Decrement inventory atomically
await dynamodb.send(new UpdateItemCommand({
  TableName: process.env.STP_INVENTORY_TABLE_NAME,
  Key: { productId: { S: productId } },
  UpdateExpression: 'SET quantity = quantity - :qty',
  ConditionExpression: 'quantity >= :qty',  // Only if enough stock
  ExpressionAttributeValues: { ':qty': { N: String(quantity) } }
}));
\`\`\`

## Multi-Vendor Marketplace

\`\`\`yaml
resources:
  api:
    type: http-api-gateway

  # Vendor management
  vendorApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/vendors.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /vendors/{proxy+}
            method: '*'
            authorizer:
              type: cognito
              properties:
                userAuthPoolName: auth
      connectTo:
        - database

  # Product listings
  productApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/products.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /products/{proxy+}
            method: '*'
      connectTo:
        - database
        - productSearch

  # Orders and payouts
  orderApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/orders.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /orders/{proxy+}
            method: '*'
      environment:
        - name: STRIPE_SECRET_KEY
          value: $Secret('stripe-secret')
      connectTo:
        - database
        - payoutQueue

  # Process vendor payouts
  payoutQueue:
    type: sqs-queue

  payoutProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payouts.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: payoutQueue
      environment:
        - name: STRIPE_SECRET_KEY
          value: $Secret('stripe-secret')
      connectTo:
        - database

  auth:
    type: user-auth-pool
    properties:
      customAttributes:
        - name: vendorId
          attributeDataType: String
        - name: role
          attributeDataType: String

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'

  productSearch:
    type: open-search
    properties:
      clusterConfig:
        instanceType: t3.small.search
\`\`\`
`;
};

// Types Reference (comprehensive)
const generateTypesReference = async (): Promise<string> => {
  const rootTypes = await readTypeFile('_root.d.ts');
  const helperTypes = await readTypeFile('__helpers.d.ts');
  const functionTypes = await readTypeFile('functions.d.ts');
  const webServiceTypes = await readTypeFile('web-services.d.ts');
  const databaseTypes = await readTypeFile('relational-databases.d.ts');
  const dynamoTypes = await readTypeFile('dynamo-db-tables.d.ts');
  const bucketTypes = await readTypeFile('buckets.d.ts');
  const hostingTypes = await readTypeFile('hosting-buckets.d.ts');
  const sqsTypes = await readTypeFile('sqs-queues.d.ts');
  const authTypes = await readTypeFile('user-pools.d.ts');
  const eventTypes = await readTypeFile('events.d.ts');

  return `# Stacktape Type Reference

Complete TypeScript type definitions for all Stacktape resources.

## Root Config Structure

\`\`\`typescript
${rootTypes}
\`\`\`

## Helper Types

\`\`\`typescript
${helperTypes}
\`\`\`

## Lambda Functions (\`type: function\`)

\`\`\`typescript
${functionTypes}
\`\`\`

## Web Services (\`type: web-service\`)

\`\`\`typescript
${webServiceTypes}
\`\`\`

## Relational Databases (\`type: relational-database\`)

\`\`\`typescript
${databaseTypes}
\`\`\`

## DynamoDB Tables (\`type: dynamo-db-table\`)

\`\`\`typescript
${dynamoTypes}
\`\`\`

## S3 Buckets (\`type: bucket\`)

\`\`\`typescript
${bucketTypes}
\`\`\`

## Hosting Buckets (\`type: hosting-bucket\`)

\`\`\`typescript
${hostingTypes}
\`\`\`

## SQS Queues (\`type: sqs-queue\`)

\`\`\`typescript
${sqsTypes}
\`\`\`

## User Auth Pools (\`type: user-auth-pool\`)

\`\`\`typescript
${authTypes}
\`\`\`

## Event Types

\`\`\`typescript
${eventTypes}
\`\`\`
`;
};

// CLI Reference
const generateCliReference = (): string => {
  const cliContent: string[] = [
    `# Stacktape CLI Reference

All commands support \`--agent\` flag for non-interactive, machine-readable output.

## Essential Commands

### Deploy
\`\`\`bash
npx stacktape deploy --stage <stage> --region <region>
\`\`\`
Deploys your application to AWS.

### Local Development
\`\`\`bash
npx stacktape dev --stage <stage> --region <region>
\`\`\`
Runs your app locally with hot reload. Emulates databases locally.

### Preview Changes
\`\`\`bash
npx stacktape preview-changes --stage <stage> --region <region>
\`\`\`
Shows what would change without deploying.

### Delete
\`\`\`bash
npx stacktape delete --stage <stage> --region <region>
\`\`\`
Removes all deployed resources.

## Debugging Commands

### View Logs
\`\`\`bash
npx stacktape debug:logs --stage <stage> --region <region> --resourceName <name>
\`\`\`

### View Metrics
\`\`\`bash
npx stacktape debug:metrics --stage <stage> --region <region> --resourceName <name>
\`\`\`

### Database Query (PostgreSQL)
\`\`\`bash
npx stacktape debug:sql --stage <stage> --region <region> --resourceName <dbName>
\`\`\`

### DynamoDB Query
\`\`\`bash
npx stacktape debug:dynamodb --stage <stage> --region <region> --resourceName <tableName>
\`\`\`

### Container Shell
\`\`\`bash
npx stacktape debug:container-exec --stage <stage> --region <region> --resourceName <name>
\`\`\`

## Secret Management

### Create Secret
\`\`\`bash
npx stacktape secret:create --secretName <name> --secretValue <value> --region <region>
\`\`\`

### Get Secret
\`\`\`bash
npx stacktape secret:get --secretName <name> --region <region>
\`\`\`

## Common Options

| Option | Description |
|--------|-------------|
| \`--stage\` | Environment name (dev, staging, prod) |
| \`--region\` | AWS region (us-east-1, eu-west-1, etc.) |
| \`--configPath\` | Path to config file (default: stacktape.yml) |
| \`--agent\` | Machine-readable output, no prompts |
| \`--profile\` | AWS profile to use |

## All Commands

`
  ];

  // Add all commands
  const commands = Object.keys(commandDefinitions).sort();
  for (const cmd of commands) {
    const def = commandDefinitions[cmd as keyof typeof commandDefinitions];
    if (!def) continue;
    cliContent.push(`### \`stacktape ${cmd}\`\n${def.description}\n`);
  }

  return cliContent.join('\n');
};

// Dev Mode Guide
const generateDevModeGuide = (): string => {
  return `# Local Development with Dev Mode

Run your entire stack locally for fast development.

## Quick Start

\`\`\`bash
npx stacktape dev --stage dev --region us-east-1
\`\`\`

This:
1. Deploys minimal infrastructure to AWS (API Gateway, auth, etc.)
2. Runs your functions/containers locally
3. Emulates databases locally (PostgreSQL, DynamoDB, Redis)
4. Hot reloads on code changes

## Options

| Option | Description |
|--------|-------------|
| \`--watch\` | Auto-rebuild on file changes |
| \`--resources\` | Run specific resources only (comma-separated) |
| \`--freshDb\` | Reset local database data |
| \`--remoteResources\` | Use deployed AWS resources instead of local |

## Examples

\`\`\`bash
# Run with hot reload
npx stacktape dev --stage dev --region us-east-1 --watch

# Run only specific resources
npx stacktape dev --stage dev --region us-east-1 --resources api,worker

# Fresh database (reset data)
npx stacktape dev --stage dev --region us-east-1 --freshDb

# Use deployed database instead of local
npx stacktape dev --stage dev --region us-east-1 --remoteResources database
\`\`\`

## Agent Mode (Programmatic Control)

\`\`\`bash
npx stacktape dev --stage dev --region us-east-1 --agent --agentPort 7331
\`\`\`

HTTP API available at \`http://localhost:7331\`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/trpc/health\` | GET | Health check |
| \`/trpc/status\` | GET | Get workload status |
| \`/trpc/logs\` | GET | Get logs (supports pagination) |
| \`/trpc/rebuild\` | POST | Rebuild specific workload |
| \`/trpc/stop\` | POST | Stop dev mode |

## Local Database Data

Data persists in \`.stacktape/dev-data/{stage}/{resourceName}/data/\`

Use \`--freshDb\` to reset.

## Stop Dev Mode

\`\`\`bash
# Stop running agent
npx stacktape dev:stop --agentPort 7331

# Cleanup orphaned containers
npx stacktape dev:stop --cleanupContainers
\`\`\`
`;
};

// Main generation function
export const generateSkill = async () => {
  logInfo('Generating Stacktape skill (use-case oriented)...');

  await ensureDir(SKILL_OUTPUT_DIR);
  await emptyDir(SKILL_OUTPUT_DIR);

  const files: Record<string, string | Promise<string>> = {
    'SKILL.md': generateMainSkill(),
    'saas-app.md': generateSaasGuide(),
    'api-backend.md': generateApiGuide(),
    'ai-apps.md': generateAiAppsGuide(),
    'static-sites.md': generateStaticSitesGuide(),
    'nextjs.md': generateNextjsGuide(),
    'background-jobs.md': generateBackgroundJobsGuide(),
    'mobile-backend.md': generateMobileBackendGuide(),
    'ecommerce.md': generateEcommerceGuide(),
    'types-reference.md': generateTypesReference(),
    'cli-reference.md': generateCliReference(),
    'dev-mode.md': generateDevModeGuide()
  };

  for (const [fileName, contentPromise] of Object.entries(files)) {
    const content = await contentPromise;
    const filePath = join(SKILL_OUTPUT_DIR, fileName);
    await writeFile(filePath, content, 'utf-8');
    logInfo(`  Generated ${fileName}`);
  }

  logSuccess(`Done! Skill generated in ${SKILL_OUTPUT_DIR}/`);
  logInfo('\nFiles generated:');
  logInfo('  SKILL.md - Main entry point');
  logInfo('  saas-app.md - SaaS with auth, database, payments');
  logInfo('  api-backend.md - REST/GraphQL APIs');
  logInfo('  ai-apps.md - AI chatbots, RAG, agents');
  logInfo('  static-sites.md - React, Vue, static sites');
  logInfo('  nextjs.md - Next.js apps');
  logInfo('  background-jobs.md - Cron, queues, webhooks');
  logInfo('  mobile-backend.md - Mobile app backends');
  logInfo('  ecommerce.md - E-commerce, marketplaces');
  logInfo('  types-reference.md - Full type definitions');
  logInfo('  cli-reference.md - CLI commands');
  logInfo('  dev-mode.md - Local development');
};

if (import.meta.main) {
  generateSkill();
}
