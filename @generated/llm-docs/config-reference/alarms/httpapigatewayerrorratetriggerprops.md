# HttpApiGatewayErrorRateTriggerProps API Reference

## TypeScript definition

```typescript
type HttpApiGatewayErrorRateTriggerProps = {
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

### Example 1 (yaml)

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      alarms:
        - description: API Gateway error rate too high
          trigger:
            type: http-api-gateway-error-rate
            properties:
              thresholdPercent: 3
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new HttpApiGateway({
    alarms: [
      {
        description: 'API Gateway error rate too high',
        trigger: {
          type: 'http-api-gateway-error-rate',
          properties: {
            thresholdPercent: 3
          }
        }
      }
    ]
  });

  return { resources: { api } };
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
