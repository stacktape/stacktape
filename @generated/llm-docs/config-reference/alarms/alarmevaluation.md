# AlarmEvaluation API Reference

## TypeScript definition

```typescript
type AlarmEvaluation = {
  /** How many periods (within evaluationPeriods) must breach the threshold to fire the alarm. */
  breachedPeriods?: number;
  /** How many recent periods to evaluate. Prevents alarms from firing on short spikes. */
  evaluationPeriods?: number;
  /** Duration of one evaluation period in seconds. Must be a multiple of 60. */
  period?: number;
};
```

## Property: `breachedPeriods`

- Required: no
- Type: `number`
- Default: `1`

How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.

Must be ≤ `evaluationPeriods`.

### Example 1 (yaml)

```yaml
resources:
  checkoutFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/checkout.ts
      alarms:
        - description: Checkout errors persisting across multiple periods
          trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 2
          evaluation:
            period: 60
            evaluationPeriods: 5
            breachedPeriods: 3
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const checkoutFn = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/checkout.ts' }),
    alarms: [
      {
        description: 'Checkout errors persisting across multiple periods',
        trigger: {
          type: 'lambda-error-rate',
          properties: { thresholdPercent: 2 }
        },
        evaluation: {
          period: 60,
          evaluationPeriods: 5,
          breachedPeriods: 3
        }
      }
    ]
  });

  return { resources: { checkoutFn } };
});
```

## Property: `evaluationPeriods`

- Required: no
- Type: `number`
- Default: `1`

How many recent periods to evaluate. Prevents alarms from firing on short spikes.

Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
in at least 3 of the last 5 periods.

### Example 1 (yaml)

```yaml
resources:
  paymentsFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/payments.ts
      alarms:
        - description: Payments error rate elevated
          trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 1
          evaluation:
            period: 60
            evaluationPeriods: 5
            breachedPeriods: 3
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsFn = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/payments.ts' }),
    alarms: [
      {
        description: 'Payments error rate elevated',
        trigger: {
          type: 'lambda-error-rate',
          properties: { thresholdPercent: 1 }
        },
        evaluation: {
          period: 60,
          evaluationPeriods: 5,
          breachedPeriods: 3
        }
      }
    ]
  });

  return { resources: { paymentsFn } };
});
```

## Property: `period`

- Required: no
- Type: `number`
- Default: `60`

Duration of one evaluation period in seconds. Must be a multiple of 60.

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
        - description: Worker running too long
          trigger:
            type: lambda-duration
            properties:
              thresholdMilliseconds: 5000
          evaluation:
            period: 300
            evaluationPeriods: 2
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    alarms: [
      {
        description: 'Worker running too long',
        trigger: {
          type: 'lambda-duration',
          properties: { thresholdMilliseconds: 5000 }
        },
        evaluation: {
          period: 300,
          evaluationPeriods: 2
        }
      }
    ]
  });

  return { resources: { worker } };
});
```
