# VpcSettings API Reference

## TypeScript definition

```typescript
import type { NatSettings, VpcReuseConfig } from 'stacktape';

type VpcSettings = {
  /** AWS services reachable from inside the VPC through interface endpoints. */
  interfaceEndpoints?: Array<string>;
  /** NAT Gateway configuration for private subnets. */
  nat?: NatSettings;
  /** Share a VPC with another Stacktape stack or use an existing VPC. */
  reuseVpc?: VpcReuseConfig;
};
```

## Property: `interfaceEndpoints`

- Required: no
- Type: `Array<string>`

AWS services reachable from inside the VPC through interface endpoints.

Resources placed into the VPC (for example lambda functions with `joinDefaultVpc: true`) have no
route to the public internet, so calls to AWS service APIs (SSM Parameter Store, Secrets Manager,
KMS, SQS, ...) hang until they time out. Listing a service here creates an
[interface VPC endpoint](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)
for it, giving everything inside the VPC a private route to that service.

Use the service's endpoint suffix: `ssm`, `secretsmanager`, `kms`, `sqs`, `sns`, `sts`, `lambda`,
`logs`, `monitoring`, `ecr.api`, `ecr.dkr`, ...
([full list](https://docs.aws.amazon.com/vpc/latest/privatelink/aws-services-privatelink-support.html)).
Each endpoint is billed by AWS (~$0.01/hour per availability zone plus data processing). Endpoints
are created in every VPC availability zone for high availability.
Only applies when the stack creates its own VPC. With `reuseVpc`, manage endpoints in the stack
that owns the VPC.

### Example 1 (yaml)

```yaml
stackConfig:
  vpc:
    interfaceEndpoints:
      - ssm
resources:
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      joinDefaultVpc: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/worker.ts' }),
    joinDefaultVpc: true
  });
  return {
    stackConfig: { vpc: { interfaceEndpoints: ['ssm'] } },
    resources: { worker }
  };
});
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
