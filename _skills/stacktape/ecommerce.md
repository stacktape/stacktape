# E-commerce & Marketplace

Build online stores, marketplaces, and payment-enabled apps.

## Simple Store with Stripe

```yaml
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
```

## Product Catalog with Search

```yaml
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
```

## Shopping Cart (Redis)

```yaml
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
```

Cart operations:
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.STP_CART_CACHE_URL,
  token: process.env.STP_CART_CACHE_PASSWORD
});

// Add to cart (expires in 7 days)
await redis.hset(`cart:${userId}`, { [productId]: quantity });
await redis.expire(`cart:${userId}`, 60 * 60 * 24 * 7);

// Get cart
const cart = await redis.hgetall(`cart:${userId}`);
```

## Inventory Management

```yaml
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
```

Atomic inventory update:
```typescript
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
```

## Multi-Vendor Marketplace

```yaml
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
```
