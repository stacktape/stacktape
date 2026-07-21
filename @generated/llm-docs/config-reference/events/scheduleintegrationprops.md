# ScheduleIntegrationProps API Reference

## TypeScript definition

```typescript
import type { EventInputTransformer } from 'stacktape';

type ScheduleIntegrationProps = {
  /** The schedule rate or cron expression. */
  scheduleRate: string;
  /** A fixed JSON object to be passed as the event payload. */
  input?: unknown;
  /** A JSONPath expression to extract a portion of the event to pass to the target. */
  inputPath?: string;
  /** Customizes the event payload sent to the target. */
  inputTransformer?: EventInputTransformer;
};
```

## Property: `scheduleRate`

- Required: yes
- Type: `string`

The schedule rate or cron expression.

Examples: `rate(2 hours)`, `cron(0 10 * * ? *)`

## Property: `input`

- Required: no
- Type: `unknown`

A fixed JSON object to be passed as the event payload.

If you need to customize the payload based on the event, use `inputTransformer` instead.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

**Example (YAML):**

```yaml
resources:
  reportFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/report.ts
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
            input:
              source: my-scheduled-event
```

**Example (TypeScript):**

```ts
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/report.ts' }),
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'rate(1 hour)',
          input: { source: 'my-scheduled-event' }
        }
      }
    ]
  });
  return { resources: { reportFunction } };
});
```

## Property: `inputPath`

- Required: no
- Type: `string`

A JSONPath expression to extract a portion of the event to pass to the target.

This is useful for forwarding only a specific part of the event payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

### Example 1 (yaml)

```yaml
resources:
  reportFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/report.ts
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
            inputPath: $.detail
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/report.ts' }),
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'rate(1 hour)',
          inputPath: '$.detail'
        }
      }
    ]
  });
  return { resources: { reportFunction } };
});
```

## Property: `inputTransformer`

- Required: no
- Type: `EventInputTransformer`

Customizes the event payload sent to the target.

This allows you to extract values from the original event and use them to construct a new payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

### Example 1 (yaml)

```yaml
resources:
  reportFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/report.ts
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
            inputTransformer:
              inputPathsMap:
                eventTime: $.time
              inputTemplate:
                message: This event occurred at <eventTime>.
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/report.ts' }),
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'rate(1 hour)',
          inputTransformer: {
            inputPathsMap: { eventTime: '$.time' },
            inputTemplate: { message: 'This event occurred at <eventTime>.' }
          }
        }
      }
    ]
  });
  return { resources: { reportFunction } };
});
```
