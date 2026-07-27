# LambdaFunctionDestinations API Reference

Resource type: `function`

## TypeScript definition

```typescript
type LambdaFunctionDestinations = {
  /** ARN to receive error details when the function fails. Useful for dead-letter processing. */
  onFailure?: string;
  /** ARN to receive the result when the function succeeds (SQS, SNS, EventBus, or Lambda ARN). */
  onSuccess?: string;
};
```

## Property: `onFailure`

- Required: no
- Type: `string`

ARN to receive error details when the function fails. Useful for dead-letter processing.

### Example 1 (yaml)

```yaml
resources:
  asyncWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      destinations:
        onFailure: $ResourceParam('failureQueue', 'arn')
  failureQueue:
    type: sqs-queue
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, SqsQueue, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const asyncWorker = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
    destinations: {
      onFailure: $ResourceParam('failureQueue', 'arn')
    }
  });
  const failureQueue = new SqsQueue({});
  return { resources: { asyncWorker, failureQueue } };
});
```

## Property: `onSuccess`

- Required: no
- Type: `string`

ARN to receive the result when the function succeeds (SQS, SNS, EventBus, or Lambda ARN).

### Example 1 (yaml)

```yaml
resources:
  asyncWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      destinations:
        onSuccess: $ResourceParam('resultsTopic', 'arn')
  resultsTopic:
    type: sns-topic
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, SnsTopic, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const asyncWorker = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
    destinations: {
      onSuccess: $ResourceParam('resultsTopic', 'arn')
    }
  });
  const resultsTopic = new SnsTopic({});
  return { resources: { asyncWorker, resultsTopic } };
});
```
