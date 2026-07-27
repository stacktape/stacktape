# RdsEngineReadReplica API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type RdsEngineReadReplica = {
  /** Instance size (e.g., db.t4g.micro, db.r6g.large). */
  instanceSize: string;
  /** Create a standby replica in another availability zone for automatic failover. */
  multiAz?: boolean;
};
```

## Property: `instanceSize`

- Required: yes
- Type: `string`

Instance size (e.g., `db.t4g.micro`, `db.r6g.large`).

Determines CPU, memory, and network capacity. Quick guide:

**db.t4g.micro** (~$12/mo): Dev/testing, 2 vCPU, 1 GB RAM
**db.t4g.medium** (~$50/mo): Small production, 2 vCPU, 4 GB RAM
**db.r6g.large** (~$180/mo): Production, 2 vCPU, 16 GB RAM

`t` family instances are burstable (fine for low/variable load). Use `r` family for steady workloads.

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
        primaryInstance:
          instanceSize: db.r6g.large
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
      primaryInstance: {
        instanceSize: 'db.r6g.large'
      }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `multiAz`

- Required: no
- Type: `boolean`

Create a standby replica in another availability zone for automatic failover.

If the primary goes down, traffic fails over to the standby automatically.
Also reduces downtime during maintenance. Doubles the instance cost.

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
        primaryInstance:
          instanceSize: db.t4g.medium
          multiAz: true
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
      primaryInstance: {
        instanceSize: 'db.t4g.medium',
        multiAz: true
      }
    }
  }
});
return { resources: { mainDatabase } };
});
```
