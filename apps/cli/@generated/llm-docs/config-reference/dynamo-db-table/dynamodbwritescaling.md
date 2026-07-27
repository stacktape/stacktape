# DynamoDbWriteScaling API Reference

Resource type: `dynamo-db-table`

## TypeScript definition

```typescript
type DynamoDbWriteScaling = {
  /** Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops. */
  keepUtilizationUnder: number;
  /** Maximum write units. Capacity never scales above this. */
  maxUnits: number;
  /** Minimum write units. Capacity never scales below this. */
  minUnits: number;
};
```

## Property: `keepUtilizationUnder`

- Required: yes
- Type: `number`

Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.

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

## Property: `maxUnits`

- Required: yes
- Type: `number`

Maximum write units. Capacity never scales above this.

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

## Property: `minUnits`

- Required: yes
- Type: `number`

Minimum write units. Capacity never scales below this.

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
