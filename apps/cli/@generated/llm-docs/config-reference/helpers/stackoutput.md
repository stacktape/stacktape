# StackOutput API Reference

## TypeScript definition

```typescript
type StackOutput = {
  /** Name of the output (used as the key in terminal and stack info file). */
  name: string;
  /** Value to output. Typically a directive like $ResourceParam('myApi', 'url'). */
  value: string;
  /** Human-readable description shown alongside the output. */
  description?: string;
  /** Make this output available to other CloudFormation stacks. */
  export?: boolean;
};
```

## Property: `name`

- Required: yes
- Type: `string`

Name of the output (used as the key in terminal and stack info file).

## Property: `value`

- Required: yes
- Type: `string`

Value to output. Typically a directive like `$ResourceParam('myApi', 'url')`.

## Property: `description`

- Required: no
- Type: `string`

Human-readable description shown alongside the output.

### Example 1 (yaml)

```yaml
stackConfig:
  outputs:
    - name: ApiUrl
      value: $ResourceParam('api', 'url')
      description: Public HTTPS endpoint of the API service
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    stackConfig: {
      outputs: [
        {
          name: 'ApiUrl',
          value: $ResourceParam('api', 'url'),
          description: 'Public HTTPS endpoint of the API service'
        }
      ]
    },
    resources: { api }
  };
});
```

## Property: `export`

- Required: no
- Type: `boolean`
- Default: `false`

Make this output available to other CloudFormation stacks.

Exported outputs can be referenced from other stacks using `$CfStackOutput()`.

### Example 1 (yaml)

```yaml
stackConfig:
  outputs:
    - name: SharedBucketName
      value: $ResourceParam('assets', 'name')
      export: true
resources:
  assets:
    type: bucket
    properties: {}
```

### Example 2 (typescript)

```typescript
import { Bucket, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assets = new Bucket({});

  return {
    stackConfig: {
      outputs: [
        {
          name: 'SharedBucketName',
          value: $ResourceParam('assets', 'name'),
          export: true
        }
      ]
    },
    resources: { assets }
  };
});
```
