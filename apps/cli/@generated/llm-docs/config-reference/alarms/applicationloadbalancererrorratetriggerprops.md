# ApplicationLoadBalancerErrorRateTriggerProps API Reference

## TypeScript definition

```typescript
type ApplicationLoadBalancerErrorRateTriggerProps = {
  /** Fires when 4xx/5xx error rate exceeds this percentage. */
  thresholdPercent: number;
  /** How to compare the metric value against the threshold. */
  comparisonOperator?: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold";
};
```

## Property: `thresholdPercent`

- Required: yes
- Type: `number`

Fires when 4xx/5xx error rate exceeds this percentage.

Example: `5` fires the alarm if more than 5% of requests return errors.

### Example 1 (yaml)

```yaml
resources:
  loadBalancer:
    type: application-load-balancer
    properties:
      alarms:
        - description: Load balancer error rate too high
          trigger:
            type: application-load-balancer-error-rate
            properties:
              thresholdPercent: 5
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const loadBalancer = new ApplicationLoadBalancer({
    alarms: [
      {
        description: 'Load balancer error rate too high',
        trigger: {
          type: 'application-load-balancer-error-rate',
          properties: {
            thresholdPercent: 5
          }
        }
      }
    ]
  });

  return { resources: { loadBalancer } };
});
```

## Property: `comparisonOperator`

- Required: no
- Type: `string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`
- Default: `GreaterThanThreshold`

How to compare the metric value against the threshold.

### Example 1 (yaml)

```yaml
resources:
  mainDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserName: admin
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
      alarms:
        - description: Database free memory dropped below threshold
          trigger:
            type: database-free-memory
            properties:
              thresholdMB: 512
              comparisonOperator: LessThanThreshold
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserName: 'admin',
      masterUserPassword: $Secret('db-password')
    },
    engine: {
      type: 'postgres',
      properties: {
        version: '16.2',
        primaryInstance: { instanceSize: 'db.t3.micro' }
      }
    },
    alarms: [
      {
        description: 'Database free memory dropped below threshold',
        trigger: {
          type: 'database-free-memory',
          properties: {
            thresholdMB: 512,
            comparisonOperator: 'LessThanThreshold'
          }
        }
      }
    ]
  });

  return { resources: { mainDatabase } };
});
```
