# RdsEngineStorage API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type RdsEngineStorage = {
  /** Initial storage in GB. Auto-scales up when free space is low. */
  initialSize?: number;
  /** Max storage in GB. The database won&#39;t auto-scale beyond this. */
  maxSize?: number;
};
```

## Property: `initialSize`

- Required: no
- Type: `number`
- Default: `20`

Initial storage in GB. Auto-scales up when free space is low.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: postgres
      properties:
        version: '16.6'
        storage:
          initialSize: 100
          maxSize: 500
        primaryInstance:
          instanceSize: db.t4g.medium
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      storage: {
        initialSize: 100,
        maxSize: 500
      },
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `maxSize`

- Required: no
- Type: `number`
- Default: `200`

Max storage in GB. The database won't auto-scale beyond this.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: postgres
      properties:
        version: '16.6'
        storage:
          initialSize: 100
          maxSize: 1000
        primaryInstance:
          instanceSize: db.t4g.medium
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      storage: {
        initialSize: 100,
        maxSize: 1000
      },
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```
