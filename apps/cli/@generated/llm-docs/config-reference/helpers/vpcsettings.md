# VpcSettings API Reference

## TypeScript definition

```typescript
import type { VpcReuseConfig } from 'stacktape';

type VpcSettings = {
  /** Share a VPC with another Stacktape stack or use an existing VPC. */
  reuseVpc?: VpcReuseConfig;
};
```

## Property: `reuseVpc`

- Required: no
- Type: `VpcReuseConfig`

Share a VPC with another Stacktape stack or use an existing VPC.

Useful when this stack needs to access VPC-protected resources (databases, Redis)
from another stack. By default, each stack gets its own VPC.

**Important:** Set this when first creating the stack. Adding it to an already
deployed stack can cause resources to be replaced and **data to be lost**.
