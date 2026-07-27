# SqsQueueReceivedMessagesCountTriggerProps API Reference

## TypeScript definition

```typescript
type SqsQueueReceivedMessagesCountTriggerProps = {
  /** Fires when received message count crosses this threshold. */
  thresholdCount: number;
  /** How to compare the metric value against the threshold. */
  comparisonOperator?: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold";
  /** How to aggregate metric values within each period: avg, sum, min, max, p90, p95, p99. */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
};
```

## Property: `thresholdCount`

- Required: yes
- Type: `number`

Fires when received message count crosses this threshold.

Default: fires if **average** messages received per period > `thresholdCount`.
Customize with `statistic` and `comparisonOperator`.

### Example 1 (yaml)

```yaml
resources:
  ingestionQueue:
    type: sqs-queue
    properties:
      alarms:
        - description: Ingestion backlog growing
          trigger:
            type: sqs-queue-received-messages-count
            properties:
              thresholdCount: 5000
```

### Example 2 (typescript)

```typescript
import { SqsQueue, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ingestionQueue = new SqsQueue({
    alarms: [
      {
        description: 'Ingestion backlog growing',
        trigger: {
          type: 'sqs-queue-received-messages-count',
          properties: {
            thresholdCount: 5000
          }
        }
      }
    ]
  });

  return { resources: { ingestionQueue } };
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

## Property: `statistic`

- Required: no
- Type: `string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`
- Default: `avg`

How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.

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
        - description: 99th-percentile duration too high
          trigger:
            type: lambda-duration
            properties:
              thresholdMilliseconds: 3000
              statistic: p99
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    alarms: [
      {
        description: '99th-percentile duration too high',
        trigger: {
          type: 'lambda-duration',
          properties: {
            thresholdMilliseconds: 3000,
            statistic: 'p99'
          }
        }
      }
    ]
  });

  return { resources: { worker } };
});
```
