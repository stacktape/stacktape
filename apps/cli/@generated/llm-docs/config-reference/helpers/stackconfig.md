# StackConfig API Reference

## TypeScript definition

```typescript
import type { CloudformationTag, StackOutput, VpcSettings } from 'stacktape';

type StackConfig = {
  /** Stop saving stack info to a local file after each deployment. */
  disableStackInfoSaving?: boolean;
  /** Custom values to display and save after each deployment. */
  outputs?: Array<StackOutput>;
  /** Directory for the stack info JSON file. */
  stackInfoDirectory?: string;
  /** Tags applied to every AWS resource in this stack. */
  tags?: Array<CloudformationTag>;
  /** VPC configuration: reuse an existing VPC or configure NAT Gateways. */
  vpc?: VpcSettings;
};
```

## Property: `disableStackInfoSaving`

- Required: no
- Type: `boolean`
- Default: `false`

Stop saving stack info to a local file after each deployment.

By default, Stacktape saves resource details and custom outputs to
`.stacktape-stack-info/{stackName}.json` after every deploy.

### Example 1 (yaml)

```yaml
stackConfig:
  disableStackInfoSaving: true
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
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    stackConfig: { disableStackInfoSaving: true },
    resources: { api }
  };
});
```

## Property: `outputs`

- Required: no
- Type: `Array<StackOutput>`

Custom values to display and save after each deployment.

Use outputs to surface dynamic values like API URLs, database endpoints, or resource ARNs
that are only known after deployment. Outputs are:

Printed in the terminal after deploy
Saved to the stack info JSON file
Optionally exported for cross-stack references (via `export: true`)

### Example 1 (yaml)

```yaml
stackConfig:
  outputs:
    - name: ApiUrl
      value: $ResourceParam('api', 'url')
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
      outputs: [{ name: 'ApiUrl', value: $ResourceParam('api', 'url') }]
    },
    resources: { api }
  };
});
```

## Property: `stackInfoDirectory`

- Required: no
- Type: `string`
- Default: `.stacktape-stack-info/`

Directory for the stack info JSON file.

Relative to the project root.

### Example 1 (yaml)

```yaml
stackConfig:
  stackInfoDirectory: ./build/stack-info
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
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    stackConfig: { stackInfoDirectory: './build/stack-info' },
    resources: { api }
  };
});
```

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`

Tags applied to every AWS resource in this stack.

Useful for cost tracking, access control, and organization. Stacktape automatically
adds `projectName`, `stage`, and `stackName` tags — your custom tags are merged on top.

Max 45 tags.

### Example 1 (yaml)

```yaml
stackConfig:
  tags:
    - name: team
      value: payments
    - name: costCenter
      value: '4100'
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
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    stackConfig: {
      tags: [
        { name: 'team', value: 'payments' },
        { name: 'costCenter', value: '4100' }
      ]
    },
    resources: { api }
  };
});
```

## Property: `vpc`

- Required: no
- Type: `VpcSettings`

VPC configuration: reuse an existing VPC or configure NAT Gateways.
