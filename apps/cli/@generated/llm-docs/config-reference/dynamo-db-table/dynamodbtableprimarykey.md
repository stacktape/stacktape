# DynamoDbTablePrimaryKey API Reference

Resource type: `dynamo-db-table`

## TypeScript definition

```typescript
import type { DynamoDbAttribute } from 'stacktape';

type DynamoDbTablePrimaryKey = {
  /** The main key attribute (e.g., userId, orderId). Must be unique if no sort key is used. */
  partitionKey: DynamoDbAttribute;
  /** Optional second key for composite keys. Enables range queries and multiple items per partition key. */
  sortKey?: DynamoDbAttribute;
};
```

## Property: `partitionKey`

- Required: yes
- Type: `DynamoDbAttribute`

The main key attribute (e.g., `userId`, `orderId`). Must be unique if no sort key is used.

### Example 1 (yaml)

```yaml
resources:
  devicesTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: deviceId
          type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const devicesTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'deviceId', type: 'string' }
    }
  });

  return { resources: { devicesTable } };
});
```

## Property: `sortKey`

- Required: no
- Type: `DynamoDbAttribute`

Optional second key for composite keys. Enables range queries and multiple items per partition key.

E.g., partition key `userId` + sort key `createdAt` lets you query all items for a user sorted by date.

### Example 1 (yaml)

```yaml
resources:
  eventsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: userId
          type: string
        sortKey:
          name: createdAt
          type: number
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const eventsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'userId', type: 'string' },
      sortKey: { name: 'createdAt', type: 'number' }
    }
  });

  return { resources: { eventsTable } };
});
```
