# RedisAccessibility API Reference

Resource type: `redis`

## TypeScript definition

```typescript
type RedisAccessibility = {
  /** Who can connect to this cache. */
  accessibilityMode: "scoping-workloads-in-vpc" | "vpc";
};
```

## Property: `accessibilityMode`

- Required: yes
- Type: `string: "scoping-workloads-in-vpc" | "vpc"`
- Default: `vpc`

Who can connect to this cache.

**`vpc`** (default): Any resource in the same VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
**`scoping-workloads-in-vpc`**: Only resources that list this cache in their `connectTo`.

Caches don't have public IPs — you can't connect from your local machine directly.
Use a bastion host for local access.
