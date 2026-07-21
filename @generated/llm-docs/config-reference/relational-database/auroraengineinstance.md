# AuroraEngineInstance API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type AuroraEngineInstance = {
  /** Instance size (e.g., db.t4g.medium, db.r6g.large). */
  instanceSize: string;
};
```

## Property: `instanceSize`

- Required: yes
- Type: `string`

Instance size (e.g., `db.t4g.medium`, `db.r6g.large`).

`t` family = burstable (dev/low-traffic). `r` family = memory-optimized (production).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: aurora-postgresql
      properties:
        version: '16.6'
        instances:
          - instanceSize: db.r6g.large
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql',
    properties: {
      version: '16.6',
      instances: [
        { instanceSize: 'db.r6g.large' }
      ]
    }
  }
});
return { resources: { mainDatabase } };
});
```
