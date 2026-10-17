# NatSettings API Reference

## TypeScript definition

```typescript
type NatSettings = {
  /** Which kind of NAT the stack runs. */
  type: "ec2" | "gateway" | "ha-ec2";
  /** How many availability zones get their own NAT (`ha-ec2` and `gateway` only). */
  availabilityZones?: 2 | 3;
  /** EC2 instance size of the NAT instances (`ec2` and `ha-ec2` only). */
  instanceSize?: string;
};
```

## Property: `type`

- Required: yes
- Type: `string: "ec2" | "gateway" | "ha-ec2"`

Which kind of NAT the stack runs.

**ec2**: one small EC2 instance (`t4g.nano` by default) managed by Stacktape. About $7/month, no per-GB
charge. If the instance dies, AWS replaces it, which takes about three minutes without outbound internet.
**ha-ec2**: one such instance per availability zone (two by default) with automatic failover. About $7/month
per zone. When an instance fails, Stacktape routes its zone through another zone's instance within about a
minute and routes back once the replacement is healthy; outbound calls from that zone fail during that minute
and open connections are reset.
**gateway**: AWS-managed NAT Gateways, one per availability zone. About $32/month per zone plus $0.045 per GB
processed. No instances, scales to 100 Gbps; the choice for high sustained throughput and strict uptime.

The shorthand `nat: ha-ec2` is the same as `nat: { type: ha-ec2 }`.

### Example 1 (yaml)

```yaml
stackConfig:
  nat:
    type: ha-ec2
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/worker.ts
      resources:
        cpu: 0.25
        memory: 512
      usePrivateSubnetsWithNAT: true
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/worker.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    usePrivateSubnetsWithNAT: true
  });

  return {
    stackConfig: { nat: { type: 'ha-ec2' } },
    resources: { worker }
  };
});
```

## Property: `availabilityZones`

- Required: no
- Type: `number: 2 | 3`
- Default: `2`

How many availability zones get their own NAT (`ha-ec2` and `gateway` only).

**2**: Balanced cost and availability.
**3**: Highest availability.

Each NAT gets a static Elastic IP that persists across deployments —
useful for IP whitelisting with external services.

### Example 1 (yaml)

```yaml
stackConfig:
  nat:
    type: gateway
    availabilityZones: 3
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/worker.ts
      resources:
        cpu: 0.25
        memory: 512
      usePrivateSubnetsWithNAT: true
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/worker.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    usePrivateSubnetsWithNAT: true
  });

  return {
    stackConfig: { nat: { type: 'gateway', availabilityZones: 3 } },
    resources: { worker }
  };
});
```

## Property: `instanceSize`

- Required: no
- Type: `string`
- Default: `t4g.nano`

EC2 instance size of the NAT instances (`ec2` and `ha-ec2` only).

Must be an arm64 (Graviton) size, for example `t4g.nano`, `t4g.micro`, `t4g.small` or `c7gn.medium`.
`t4g.nano` bursts to 5 Gbps and is enough for most applications; pick a larger size for sustained
high throughput.

### Example 1 (yaml)

```yaml
stackConfig:
  nat:
    type: ha-ec2
    instanceSize: t4g.small
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/worker.ts
      resources:
        cpu: 0.25
        memory: 512
      usePrivateSubnetsWithNAT: true
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/worker.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    usePrivateSubnetsWithNAT: true
  });

  return {
    stackConfig: { nat: { type: 'ha-ec2', instanceSize: 't4g.small' } },
    resources: { worker }
  };
});
```
