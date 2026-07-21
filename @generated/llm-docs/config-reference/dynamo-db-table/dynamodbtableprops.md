# DynamoDbTableProps API Reference

Resource type: `dynamo-db-table`

## TypeScript definition

```typescript
import type { DevModeConfig, DynamoDbProvisionedThroughput, DynamoDbTableGlobalSecondaryIndex, DynamoDbTablePrimaryKey } from 'stacktape';

type DynamoDbTableProps = {
  /** The primary key that uniquely identifies each item. */
  primaryKey: DynamoDbTablePrimaryKey;
  /** Dev mode: runs locally in Docker by default. Set remote: true to use the deployed table. */
  dev?: DevModeConfig;
  /** Enable continuous backups with point-in-time recovery (restore to any second in the last 35 days). */
  enablePointInTimeRecovery?: boolean;
  /** Fixed-capacity mode with predictable pricing. Omit for on-demand (pay-per-request) mode. */
  provisionedThroughput?: DynamoDbProvisionedThroughput;
  /** Additional indexes for querying by attributes other than the primary key. */
  secondaryIndexes?: Array<DynamoDbTableGlobalSecondaryIndex>;
  /** Stream item changes to trigger functions or batch jobs in real time. */
  streamType?: "KEYS_ONLY" | "NEW_AND_OLD_IMAGES" | "NEW_IMAGE" | "OLD_IMAGE";
};
```

## Property: `primaryKey`

- Required: yes
- Type: `DynamoDbTablePrimaryKey`

The primary key that uniquely identifies each item.

**Simple key**: Just a `partitionKey` (e.g., `userId`).
**Composite key**: `partitionKey` + `sortKey` (e.g., `userId` + `createdAt`).

  **Cannot be changed after creation.** Every item must include the primary key attribute(s).

### Example 1 (yaml)

```yaml
resources:
  ordersTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: customerId
          type: string
        sortKey:
          name: orderId
          type: string
  reconcileJob:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/reconcile.ts
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'customerId', type: 'string' },
      sortKey: { name: 'orderId', type: 'string' }
    }
  });

  const reconcileJob = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/reconcile.ts' }
    },
    events: [
      {
        type: 'schedule',
        properties: { scheduleRate: 'rate(1 hour)' }
      }
    ]
  });

  return { resources: { ordersTable, reconcileJob } };
});
```

## Property: `dev`

- Required: no
- Type: `DevModeConfig`

Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed table.

### Example 1 (yaml)

```yaml
resources:
  cacheTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: cacheKey
          type: string
      dev:
        remote: false
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const cacheTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'cacheKey', type: 'string' }
    },
    dev: {
      remote: false
    }
  });

  return { resources: { cacheTable } };
});
```

## Property: `enablePointInTimeRecovery`

- Required: no
- Type: `boolean`

Enable continuous backups with point-in-time recovery (restore to any second in the last 35 days).

Restores always create a new table. Adds ~20% to storage cost.

### Example 1 (yaml)

```yaml
resources:
  paymentsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: paymentId
          type: string
      enablePointInTimeRecovery: true
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'paymentId', type: 'string' }
    },
    enablePointInTimeRecovery: true
  });

  return { resources: { paymentsTable } };
});
```

## Property: `provisionedThroughput`

- Required: no
- Type: `DynamoDbProvisionedThroughput`

Fixed-capacity mode with predictable pricing. Omit for on-demand (pay-per-request) mode.

**On-demand** (default, no config): Pay per read/write. Best for unpredictable or variable traffic.
**Provisioned**: Set fixed read/write capacity. Cheaper at steady, predictable load. Can auto-scale.

### Example 1 (yaml)

```yaml
resources:
  sessionsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: sessionId
          type: string
      provisionedThroughput:
        readUnits: 25
        writeUnits: 10
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sessionsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'sessionId', type: 'string' }
    },
    provisionedThroughput: {
      readUnits: 25,
      writeUnits: 10
    }
  });

  return { resources: { sessionsTable } };
});
```

## Property: `secondaryIndexes`

- Required: no
- Type: `Array<DynamoDbTableGlobalSecondaryIndex>`

Additional indexes for querying by attributes other than the primary key.

Without indexes, you can only query by primary key. Add a secondary index to query by
any attribute (e.g., query orders by `status` or users by `email`).

### Example 1 (yaml)

```yaml
resources:
  usersTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: userId
          type: string
      secondaryIndexes:
        - name: byEmail
          partitionKey:
            name: email
            type: string
        - name: byStatusCreatedAt
          partitionKey:
            name: status
            type: string
          sortKey:
            name: createdAt
            type: number
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const usersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'userId', type: 'string' }
    },
    secondaryIndexes: [
      {
        name: 'byEmail',
        partitionKey: { name: 'email', type: 'string' }
      },
      {
        name: 'byStatusCreatedAt',
        partitionKey: { name: 'status', type: 'string' },
        sortKey: { name: 'createdAt', type: 'number' }
      }
    ]
  });

  return { resources: { usersTable } };
});
```

## Property: `streamType`

- Required: no
- Type: `string: "KEYS_ONLY" | "NEW_AND_OLD_IMAGES" | "NEW_IMAGE" | "OLD_IMAGE"`

Stream item changes to trigger functions or batch jobs in real time.

`KEYS_ONLY`: Only key attributes of the changed item.
`NEW_IMAGE`: The full item after the change.
`OLD_IMAGE`: The full item before the change.
`NEW_AND_OLD_IMAGES`: Both before and after — useful for change tracking and auditing.

### Example 1 (yaml)

```yaml
resources:
  productsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: productId
          type: string
      streamType: NEW_AND_OLD_IMAGES
  auditLogger:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/audit.ts
      events:
        - type: dynamo-db-stream
          properties:
            streamArn: $ResourceParam('productsTable', 'streamArn')
            batchSize: 25
            startingPosition: LATEST
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, LambdaFunction, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const productsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'productId', type: 'string' }
    },
    streamType: 'NEW_AND_OLD_IMAGES'
  });

  const auditLogger = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/audit.ts' }
    },
    events: [
      {
        type: 'dynamo-db-stream',
        properties: {
          streamArn: $ResourceParam('productsTable', 'streamArn'),
          batchSize: 25,
          startingPosition: 'LATEST'
        }
      }
    ]
  });

  return { resources: { productsTable, auditLogger } };
});
```
