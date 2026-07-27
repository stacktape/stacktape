# ApplicationLoadBalancer API Reference

HTTP/HTTPS load balancer with flat ~$18/month pricing. Required for WebSockets, firewalls, and gradual deployments.

Resource type: `application-load-balancer`

## TypeScript definition

```typescript
import type { ApplicationLoadBalancerProps } from 'stacktape';

type ApplicationLoadBalancer = {
  /** Escape hatch to modify the underlying CloudFormation resources Stacktape creates. */
  overrides?: unknown;
  properties?: ApplicationLoadBalancerProps;
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
- Type: `ApplicationLoadBalancerProps`
