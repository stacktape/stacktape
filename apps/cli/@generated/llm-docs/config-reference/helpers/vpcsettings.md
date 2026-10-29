# VpcSettings API Reference

## TypeScript definition

```typescript
import type { VpcReuseConfig } from 'stacktape';

type VpcSettings = {
  /** Share a VPC with another Stacktape stack or use an existing VPC. */
  reuseVpc?: VpcReuseConfig;
  /** Run this stage in the shared non-production network of its AWS account and region. */
  shared?: boolean;
};
```

## Property: `reuseVpc`

- Required: no
- Type: `VpcReuseConfig`

Share a VPC with another Stacktape stack or use an existing VPC.

Useful when this stack needs to access VPC-protected resources (databases, Redis)
from another stack. By default, a production stage gets a VPC of its own and a non-production stage joins the
shared non-production network (see `shared`).

**Important:** Set this when first creating the stack. Adding it to an already
deployed stack can cause resources to be replaced and **data to be lost**.

## Property: `shared`

- Required: no
- Type: `boolean`

Run this stage in the shared non-production network of its AWS account and region.

Non-production stages share one VPC (`stacktape-network`) and, when they need outbound internet, one small NAT
instance (`stacktape-network-nat`, ~$7.70/month for all of them). A new stage gets a VPC that takes no time to create,
and teams stay under the AWS limit of 5 VPCs per region. Each stage keeps its own security groups: resources in
`accessibilityMode: vpc` and internal load balancers admit only the stage's own workloads.

By default, a stage joins the shared network when it is non-production: `stackConfig.stageType`, then the type
chosen in the Stacktape Console, then the stage name decides (`dev`, `staging`, `test`, `preview`, `pr-12`,
`feature-x`, ...). Production stages and names that say neither (`main`, `acme`) get a VPC of their own. Set this
to `true` or `false` to choose yourself. Every deploy prints where the stage runs and why.

The choice is fixed by the first deploy that creates networked resources: moving a deployed stage to or from
the shared network means deleting and redeploying it. Stages with `reuseVpc`, MongoDB Atlas clusters, Kafka
clusters with function triggers, or `stackConfig.nat` set to `gateway` or `ha-ec2` always get a VPC of their own.
