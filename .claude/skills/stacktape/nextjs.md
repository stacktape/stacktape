# Deploying Next.js Applications

Stacktape has first-class Next.js support with serverless SSR.

## Basic Next.js App

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./  # Where your Next.js app lives
      customDomains:
        - domainName: myapp.com
```

That's it. Stacktape handles:
- Static assets on CDN
- Server-side rendering with Lambda
- API routes
- Image optimization
- ISR (Incremental Static Regeneration)

## Next.js with Database

```yaml
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
```

Use Prisma, Drizzle, or raw SQL in your server components:
```typescript
// app/users/page.tsx
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.STP_DATABASE_CONNECTION_STRING
});

export default async function UsersPage() {
  const { rows } = await pool.query('SELECT * FROM users LIMIT 10');
  return <UserList users={rows} />;
}
```

## Next.js with Authentication

```yaml
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
```

## Full-Stack Next.js SaaS

```yaml
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
```

## Next.js API Routes as Separate Functions

For better cold start times, split heavy API routes:

```yaml
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
```
