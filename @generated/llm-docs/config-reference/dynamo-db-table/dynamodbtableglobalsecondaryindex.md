# DynamoDbTableGlobalSecondaryIndex API Reference

Resource type: `dynamo-db-table`

## TypeScript definition

```typescript
import type { DynamoDbAttribute } from 'stacktape';

type DynamoDbTableGlobalSecondaryIndex = {
  /** Name of the index (used when querying). */
  name: string;
  /** Partition key for this index — the attribute you&#39;ll query by. */
  partitionKey: DynamoDbAttribute;
  /** Extra attributes to copy into the index. Only projected attributes are available when querying. */
  projections?: Array<string>;
  /** Optional sort key for range queries within a partition. */
  sortKey?: DynamoDbAttribute;
};
```

## Property: `name`

- Required: yes
- Type: `string`

Name of the index (used when querying).

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
      secondaryIndexes:
        -
          name: byCustomer
          partitionKey:
            name: customerId
            type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'orderId', type: 'string' }
    },
    secondaryIndexes: [
      {
        name: 'byCustomer',
        partitionKey: { name: 'customerId', type: 'string' }
      }
    ]
  });

  return { resources: { ordersTable } };
});
```

## Property: `partitionKey`

- Required: yes
- Type: `DynamoDbAttribute`

Partition key for this index — the attribute you'll query by.

### Example 1 (yaml)

```yaml
resources:
  ticketsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: ticketId
          type: string
      secondaryIndexes:
        - name: byAssignee
          partitionKey:
            name: assigneeId
            type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ticketsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'ticketId', type: 'string' }
    },
    secondaryIndexes: [
      {
        name: 'byAssignee',
        partitionKey: { name: 'assigneeId', type: 'string' }
      }
    ]
  });

  return { resources: { ticketsTable } };
});
```

## Property: `projections`

- Required: no
- Type: `Array<string>`

Extra attributes to copy into the index. Only projected attributes are available when querying.

The table's primary key is always projected. List additional attributes you need in query results.

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
          projections:
            - displayName
            - avatarUrl
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
        partitionKey: { name: 'email', type: 'string' },
        projections: ['displayName', 'avatarUrl']
      }
    ]
  });

  return { resources: { usersTable } };
});
```

## Property: `sortKey`

- Required: no
- Type: `DynamoDbAttribute`

Optional sort key for range queries within a partition.

### Example 1 (yaml)

```yaml
resources:
  ticketsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: ticketId
          type: string
      secondaryIndexes:
        - name: byAssigneePriority
          partitionKey:
            name: assigneeId
            type: string
          sortKey:
            name: priority
            type: number
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ticketsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'ticketId', type: 'string' }
    },
    secondaryIndexes: [
      {
        name: 'byAssigneePriority',
        partitionKey: { name: 'assigneeId', type: 'string' },
        sortKey: { name: 'priority', type: 'number' }
      }
    ]
  });

  return { resources: { ticketsTable } };
});
```
