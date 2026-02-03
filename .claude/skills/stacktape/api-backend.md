# Building an API Backend

Deploy REST or GraphQL APIs with database, caching, and more.

## Simple REST API

```yaml
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
```

Your handler (`src/api.ts`):
```typescript
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

app.get('/users', (c) => c.json({ users: [] }));
app.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json({ id: 1, ...body });
});

export const handler = handle(app);
```

## API with PostgreSQL Database

```yaml
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
```

In your code, use the injected connection string:
```typescript
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.STP_DATABASE_CONNECTION_STRING
});
```

## API with DynamoDB (NoSQL)

```yaml
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
```

## API with Authentication

```yaml
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
```

## GraphQL API

Same pattern, just use your GraphQL framework:

```yaml
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
```

Handler with Apollo Server:
```typescript
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';

const server = new ApolloServer({ typeDefs, resolvers });

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
```

## Container-based API (for complex dependencies)

Use when you need:
- Custom system dependencies
- Long-running connections
- WebSockets
- More than 15 min execution time

```yaml
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
```

## API Rate Limiting & Protection

```yaml
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
```
