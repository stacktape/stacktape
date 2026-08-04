# DevModeConfig API Reference

Dev Mode Configuration

## TypeScript definition

```typescript
type DevModeConfig = {
  /** Use the deployed AWS resource instead of a local emulation. */
  remote?: boolean;
};
```

## Property: `remote`

- Required: no
- Type: `boolean`
- Default: `false`

Use the deployed AWS resource instead of a local emulation.

By default, databases, Redis, and DynamoDB run locally in Docker during dev mode.
Set to `true` to connect to the real deployed resource instead (must be deployed first).

Useful when local emulation doesn't match production behavior closely enough,
or when you need to work with real data.

### Example 1 (yaml)

```yaml
resources:
  myApi:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - sessionsTable
  sessionsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string
      dev:
        remote: true
```

### Example 2 (typescript)

```typescript
import { WebService, DynamoDbTable, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sessionsTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } },
    dev: { remote: true }
  });

  const myApi = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    connectTo: [sessionsTable]
  });

  return { resources: { myApi, sessionsTable } };
});
```
