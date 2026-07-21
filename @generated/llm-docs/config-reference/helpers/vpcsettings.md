# VpcSettings API Reference

## TypeScript definition

```typescript
import type { NatSettings, VpcReuseConfig } from 'stacktape';

type VpcSettings = {
  /** NAT Gateway configuration for private subnets. */
  nat?: NatSettings;
  /** Share a VPC with another Stacktape stack or use an existing VPC. */
  reuseVpc?: VpcReuseConfig;
};
```

## Property: `nat`

- Required: no
- Type: `NatSettings`

NAT Gateway configuration for private subnets.

Only applies when you have workloads using `usePrivateSubnetsWithNAT: true`.
Controls how many availability zones get a NAT Gateway (affects cost and redundancy).

## Property: `reuseVpc`

- Required: no
- Type: `VpcReuseConfig`

Share a VPC with another Stacktape stack or use an existing VPC.

Useful when this stack needs to access VPC-protected resources (databases, Redis)
from another stack. By default, each stack gets its own VPC.

  **Important:** Set this when first creating the stack. Adding it to an already
deployed stack can cause resources to be replaced and **data to be lost**.
