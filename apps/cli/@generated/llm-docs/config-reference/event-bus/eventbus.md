# EventBus API Reference

Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.

Resource type: `event-bus`

## TypeScript definition

```typescript
import type { EventBusProps } from 'stacktape';

type EventBus = {
  /** Escape hatch to modify the underlying CloudFormation resources Stacktape creates. */
  overrides?: unknown;
  properties?: EventBusProps;
};
```

## Property: `overrides`

- Required: no
- Type: `unknown`

Escape hatch to modify the underlying CloudFormation resources Stacktape creates.

Use dot-notation paths to override specific properties on any child resource.
Find resource logical IDs with `stacktape stack-info --detailed`.

### Example 1 (yaml)

```yaml
resources:
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
    overrides:
      MainDbDatabaseInstance:
        Properties.StorageEncrypted: true
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({
      version: '16.2',
      primaryInstance: { instanceSize: 'db.t3.micro' }
    }),
    overrides: {
      MainDbDatabaseInstance: { 'Properties.StorageEncrypted': true }
    }
  });

  return { resources: { mainDb } };
});
```

## Property: `properties`

- Required: no
- Type: `EventBusProps`
