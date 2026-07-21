# BastionProps API Reference

Resource type: `bastion`

## TypeScript definition

```typescript
import type { BastionLoggingConfig } from 'stacktape';

type BastionProps = {
  /** EC2 instance type. t3.micro is sufficient for SSH tunneling and basic admin tasks. */
  instanceSize?: string;
  /** Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch. */
  logging?: BastionLoggingConfig;
  /** Shell commands to run when the instance starts (as root — no sudo needed). */
  runCommandsAtLaunch?: Array<string>;
};
```

## Property: `instanceSize`

- Required: no
- Type: `string`
- Default: `t3.micro`

EC2 instance type. `t3.micro` is sufficient for SSH tunneling and basic admin tasks.

### Example 1 (yaml)

```yaml
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserName: admin
        masterUserPassword: $Secret('database.password')
      engine:
        type: postgres
        properties:
          version: '16.4'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: vpc
  bastion:
    type: bastion
    properties:
      instanceSize: t3.small
```

### Example 2 (typescript)

```typescript
import { Bastion, RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    credentials: { masterUserName: 'admin', masterUserPassword: $Secret('database.password') },
    engine: { type: 'postgres', properties: { version: '16.4', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
    accessibility: { accessibilityMode: 'vpc' }
  });
  const bastion = new Bastion({
    instanceSize: 't3.small'
  });
  return { resources: { database, bastion } };
});
```

## Property: `logging`

- Required: no
- Type: `BastionLoggingConfig`

Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch.

### Example 1 (yaml)

```yaml
resources:
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      logging:
        messages:
          retentionDays: 30
        secure:
          retentionDays: 180
        audit:
          retentionDays: 365
```

### Example 2 (typescript)

```typescript
import { Bastion, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    logging: {
      messages: { retentionDays: 30 },
      secure: { retentionDays: 180 },
      audit: { retentionDays: 365 }
    }
  });
  return { resources: { bastion } };
});
```

## Property: `runCommandsAtLaunch`

- Required: no
- Type: `Array<string>`

Shell commands to run when the instance starts (as root — no `sudo` needed).

Use to install CLI tools, database clients, or other dependencies.
**Warning:** changing this list after creation replaces the instance — any data on the old instance is lost.

### Example 1 (yaml)

```yaml
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserName: admin
        masterUserPassword: $Secret('database.password')
      engine:
        type: postgres
        properties:
          version: '16.4'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: vpc
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      runCommandsAtLaunch:
        - yum install -y postgresql15
        - yum install -y redis6
```

### Example 2 (typescript)

```typescript
import { Bastion, RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    credentials: { masterUserName: 'admin', masterUserPassword: $Secret('database.password') },
    engine: { type: 'postgres', properties: { version: '16.4', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
    accessibility: { accessibilityMode: 'vpc' }
  });
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    runCommandsAtLaunch: ['yum install -y postgresql15', 'yum install -y redis6']
  });
  return { resources: { database, bastion } };
});
```
