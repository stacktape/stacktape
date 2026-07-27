# DynamoDbProvisionedThroughput API Reference

Resource type: `dynamo-db-table`

## TypeScript definition

```typescript
import type { DynamoDbReadScaling, DynamoDbWriteScaling } from 'stacktape';

type DynamoDbProvisionedThroughput = {
  /** Read capacity units per second. 1 unit = one 4 KB strongly consistent read (or two eventually consistent). */
  readUnits: number;
  /** Write capacity units per second. 1 unit = one 1 KB write. */
  writeUnits: number;
  /** Auto-scale read capacity based on actual usage. Scales up/down between min and max units. */
  readScaling?: DynamoDbReadScaling;
  /** Auto-scale write capacity based on actual usage. Scales up/down between min and max units. */
  writeScaling?: DynamoDbWriteScaling;
};
```

## Property: `readUnits`

- Required: yes
- Type: `number`

Read capacity units per second. 1 unit = one 4 KB strongly consistent read (or two eventually consistent).

Requests exceeding this limit get throttled. Use `readScaling` to auto-adjust.

### Example 1 (yaml)

```yaml
resources:
  catalogTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: itemId
          type: string
      provisionedThroughput:
        readUnits: 50
        writeUnits: 5
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const catalogTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'itemId', type: 'string' }
    },
    provisionedThroughput: {
      readUnits: 50,
      writeUnits: 5
    }
  });

  return { resources: { catalogTable } };
});
```

## Property: `writeUnits`

- Required: yes
- Type: `number`

Write capacity units per second. 1 unit = one 1 KB write.

Requests exceeding this limit get throttled. Use `writeScaling` to auto-adjust.

### Example 1 (yaml)

```yaml
resources:
  ingestTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: recordId
          type: string
      provisionedThroughput:
        readUnits: 5
        writeUnits: 40
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ingestTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'recordId', type: 'string' }
    },
    provisionedThroughput: {
      readUnits: 5,
      writeUnits: 40
    }
  });

  return { resources: { ingestTable } };
});
```

## Property: `readScaling`

- Required: no
- Type: `DynamoDbReadScaling`

Auto-scale read capacity based on actual usage. Scales up/down between min and max units.

### Example 1 (yaml)

```yaml
resources:
  ordersTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: orderId
          type: string
      provisionedThroughput:
        readUnits: 20
        writeUnits: 10
        readScaling:
          minUnits: 20
          maxUnits: 200
          keepUtilizationUnder: 65
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'orderId', type: 'string' }
    },
    provisionedThroughput: {
      readUnits: 20,
      writeUnits: 10,
      readScaling: {
        minUnits: 20,
        maxUnits: 200,
        keepUtilizationUnder: 65
      }
    }
  });

  return { resources: { ordersTable } };
});
```

## Property: `writeScaling`

- Required: no
- Type: `DynamoDbWriteScaling`

Auto-scale write capacity based on actual usage. Scales up/down between min and max units.

### Example 1 (yaml)

```yaml
resources:
  ordersTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: orderId
          type: string
      provisionedThroughput:
        readUnits: 20
        writeUnits: 10
        writeScaling:
          minUnits: 10
          maxUnits: 100
          keepUtilizationUnder: 70
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'orderId', type: 'string' }
    },
    provisionedThroughput: {
      readUnits: 20,
      writeUnits: 10,
      writeScaling: {
        minUnits: 10,
        maxUnits: 100,
        keepUtilizationUnder: 70
      }
    }
  });

  return { resources: { ordersTable } };
});
```
