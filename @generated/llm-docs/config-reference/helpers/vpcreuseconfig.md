# VpcReuseConfig API Reference

## TypeScript definition

```typescript
type VpcReuseConfig = {
  /** Project name of the stack whose VPC you want to share. */
  projectName?: string;
  /** Stage of the stack whose VPC you want to share. */
  stage?: string;
  /** Direct VPC ID to reuse (e.g., vpc-1234567890abcdef0). */
  vpcId?: string;
};
```

## Property: `projectName`

- Required: no
- Type: `string`

Project name of the stack whose VPC you want to share.

Must be used together with `stage`. Cannot be combined with `vpcId`.

### Example 1 (yaml)

```yaml
stackConfig:
  vpc:
    reuseVpc:
      projectName: shared-infra
      stage: production
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
      vpc: {
        reuseVpc: { projectName: 'shared-infra', stage: 'production' }
      }
    },
    resources: { api }
  };
});
```

## Property: `stage`

- Required: no
- Type: `string`

Stage of the stack whose VPC you want to share.

Must be used together with `projectName`. Cannot be combined with `vpcId`.

## Property: `vpcId`

- Required: no
- Type: `string`

Direct VPC ID to reuse (e.g., `vpc-1234567890abcdef0`).

Use this to connect to a VPC not managed by Stacktape. Cannot be combined
with `projectName`/`stage`.

The VPC must use a private CIDR range (10.x, 172.16-31.x, or 192.168.x)
and have at least 3 public subnets (subnets with a route to an Internet Gateway).

### Example 1 (yaml)

```yaml
stackConfig:
  vpc:
    reuseVpc:
      vpcId: vpc-1234567890abcdef0
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
      vpc: {
        reuseVpc: {
          vpcId: 'vpc-1234567890abcdef0'
        }
      }
    },
    resources: { api }
  };
});
```
