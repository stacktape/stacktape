# HighlightLogForwardingProps API Reference

## TypeScript definition

```typescript
type HighlightLogForwardingProps = {
  /** Your Highlight.io project ID (from the Highlight console). */
  projectId: string;
  /** Highlight.io endpoint. Override for self-hosted or regional endpoints. */
  endpointUrl?: string;
};
```

## Property: `projectId`

- Required: yes
- Type: `string`

Your Highlight.io project ID (from the Highlight console).

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      memory: 512
      logging:
        logForwarding:
          type: highlight
          properties:
            projectId: "1jdkoe52"
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'highlight',
        properties: {
          projectId: '1jdkoe52'
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `endpointUrl`

- Required: no
- Type: `string`
- Default: `https://pub.highlight.io/v1/logs/firehose`

Highlight.io endpoint. Override for self-hosted or regional endpoints.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      memory: 512
      logging:
        logForwarding:
          type: highlight
          properties:
            projectId: "1jdkoe52"
            endpointUrl: https://pub.highlight.io/v1/logs/firehose
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'highlight',
        properties: {
          projectId: '1jdkoe52',
          endpointUrl: 'https://pub.highlight.io/v1/logs/firehose'
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```
