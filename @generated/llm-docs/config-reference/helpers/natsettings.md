# NatSettings API Reference

## TypeScript definition

```typescript
type NatSettings = {
  /** How many availability zones get a NAT Gateway (~$32/month each). */
  availabilityZones?: 1 | 2 | 3;
};
```

## Property: `availabilityZones`

- Required: no
- Type: `number: 1 | 2 | 3`
- Default: `2`

How many availability zones get a NAT Gateway (~$32/month each).

**1**: Cheapest, but no redundancy if that AZ goes down.
**2**: Balanced cost and availability.
**3**: Highest availability.

Each NAT Gateway gets a static Elastic IP that persists across deployments —
useful for IP whitelisting with external services.

### Example 1 (yaml)

```yaml
stackConfig:
  vpc:
    nat:
      availabilityZones: 1
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/worker.ts
      resources:
        cpu: 0.25
        memory: 512
      usePrivateSubnetsWithNAT: true
```

### Example 2 (typescript)

```typescript
import { WorkerService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/worker.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    usePrivateSubnetsWithNAT: true
  });

  return {
    stackConfig: { vpc: { nat: { availabilityZones: 1 } } },
    resources: { worker }
  };
});
```
