# RelationalDatabaseCredentials API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type RelationalDatabaseCredentials = {
  /** Admin password. Avoid special characters: []{}(),;?*=!@. */
  masterUserPassword: string;
  /** Admin username. Avoid special characters: []{}(),;?*=!@. */
  masterUserName?: string;
};
```

## Property: `masterUserPassword`

- Required: yes
- Type: `string`

Admin password. Avoid special characters: `[]{}(),;?*=!@`.

Use `$Secret()` to store it securely instead of hardcoding.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserName: db_master_user
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: {
    masterUserName: 'db_master_user',
    masterUserPassword: $Secret('mainDatabase.password')
  },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `masterUserName`

- Required: no
- Type: `string`
- Default: `db_master_user`

Admin username. Avoid special characters: `[]{}(),;?*=!@`.

**Warning:** Changing this after creation **replaces the database and deletes all data**.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserName: app_admin
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: {
    masterUserName: 'app_admin',
    masterUserPassword: $Secret('mainDatabase.password')
  },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }
  }
});
return { resources: { mainDatabase } };
});
```
