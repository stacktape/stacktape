# DynamoDbAttribute API Reference

Resource type: `dynamo-db-table`

## TypeScript definition

```typescript
type DynamoDbAttribute = {
  /** Attribute name (e.g., userId, email, createdAt). */
  name: string;
  /** Attribute data type: string, number, or binary. */
  type: "binary" | "number" | "string";
};
```

## Property: `name`

- Required: yes
- Type: `string`

Attribute name (e.g., `userId`, `email`, `createdAt`).

### Example 1 (yaml)

```yaml
resources:
  productsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: sku
          type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const productsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'sku',
        type: 'string'
      }
    }
  });

  return { resources: { productsTable } };
});
```

## Property: `type`

- Required: yes
- Type: `string: "binary" | "number" | "string"`

Attribute data type: `string`, `number`, or `binary`.

### Example 1 (yaml)

```yaml
resources:
  metricsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: metricId
          type: string
        sortKey:
          name: timestamp
          type: number
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const metricsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'metricId', type: 'string' },
      sortKey: {
        name: 'timestamp',
        type: 'number'
      }
    }
  });

  return { resources: { metricsTable } };
});
```
