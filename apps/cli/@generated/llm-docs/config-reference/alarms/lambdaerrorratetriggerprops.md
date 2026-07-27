# LambdaErrorRateTriggerProps API Reference

## TypeScript definition

```typescript
type LambdaErrorRateTriggerProps = {
  /** Fires when the percentage of failed Lambda invocations exceeds this value. */
  thresholdPercent: number;
  /** How to compare the metric value against the threshold. */
  comparisonOperator?: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold";
};
```

## Property: `thresholdPercent`

- Required: yes
- Type: `number`

Fires when the percentage of failed Lambda invocations exceeds this value.

### Example 1 (yaml)

```yaml
resources:
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/worker.ts
      alarms:
        - description: Worker failing too often
          trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 5
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    alarms: [
      {
        description: 'Worker failing too often',
        trigger: {
          type: 'lambda-error-rate',
          properties: {
            thresholdPercent: 5
          }
        }
      }
    ]
  });

  return { resources: { worker } };
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
