# StackConfig API Reference

## TypeScript definition

```typescript
import type { CloudformationTag, NatSettings, StackOutput, TracingOptions, VpcSettings } from 'stacktape';

type StackConfig = {
  /** Stop saving stack info to a local file after each deployment. */
  disableStackInfoSaving?: boolean;
  /** NAT: outbound internet for workloads in the private subnets. */
  nat?: StackConfigNat;
  /** Custom values to display and save after each deployment. */
  outputs?: Array<StackOutput>;
  /** Directory for the stack info JSON file. */
  stackInfoDirectory?: string;
  /** Explicitly classifies this stack's stage as production or not.

The classification drives everything that treats production differently: error-tracking
incidents (every production error group enters the incident queue), the stricter
delete-production permission, deploy gates, AI remediation autonomy limits, and the severity
of security findings (a database reachable from the internet is `HIGH` in production and `LOW`
elsewhere; production-only findings such as missing deletion protection are listed by
`stacktape validate` but not reported for other stages).

When omitted, Stacktape infers it from the stage name: `prod`, `production`, `prd`, and `live`
(case-insensitive, including segmented variants like `prod-eu` or `client-a-prod`) count as
production, while names carrying a rehearsal marker (`pre-prod`, `prod-test`, `staging-live`)
do not. Set it explicitly when your naming does not follow those conventions.

This is a per-stage classification: with a TypeScript config, branch on the `stage` argument
to return different values for different stages. */
  stageType?: "non-production" | "production";
  /** Tags applied to every AWS resource in this stack. */
  tags?: Array<CloudformationTag>;
  /** Stack-wide distributed tracing default. */
  tracing?: TracingOptions;
  /** VPC configuration: reuse an existing VPC. */
  vpc?: VpcSettings;
};

/** Union choices used by the properties above. */
type StackConfigNat =
  | NatSettings
  | "option-2";
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
        type: js-bundle
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    stackConfig: { disableStackInfoSaving: true },
    resources: { api }
  };
});
```

## Property: `nat`

- Required: no
- Type: `NatSettings | option-2`

NAT: outbound internet for workloads in the private subnets.

Who uses it:

container workloads with `usePrivateSubnetsWithNAT: true` (they cannot run without it, so setting that flag
requires `nat`);
Lambda functions with `joinDefaultVpc: true`, which have no internet access at all until `nat` is set;
AgentCore runtimes that connect to VPC-only resources.

Pick `ec2` (one small instance, ~$7/month, no failover), `ha-ec2` (one instance per availability zone with
automatic failover, ~$7/month per zone) or `gateway` (AWS-managed NAT Gateways, ~$32/month per zone plus
$0.045 per GB). Switching between kinds keeps the VPC and subnets, but the public IPs change.

With `vpc.reuseVpc`, the reused VPC's own NAT is used and this setting creates nothing; set it to any kind to
place this stack's VPC functions in the reused VPC's private subnets.

Choices:
- `NatSettings` (`NatSettings`). Properties: `type: string: "ec2" | "gateway" | "ha-ec2"`, `instanceSize?: string`, `availabilityZones?: number: 2 | 3`.
- `option-2`

### Example 1 (yaml)

```yaml
stackConfig:
  nat: ha-ec2
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/api.ts
      joinDefaultVpc: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, JsBundleLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: 'src/api.ts' }),
    joinDefaultVpc: true
  });

  return {
    stackConfig: { nat: 'ha-ec2' },
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
        type: js-bundle
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, $ResourceParam, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
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
        type: js-bundle
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    stackConfig: { stackInfoDirectory: './build/stack-info' },
    resources: { api }
  };
});
```

## Property: `stageType`

- Required: no
- Type: `string: "non-production" | "production"`

Explicitly classifies this stack's stage as production or not.

The classification drives everything that treats production differently: error-tracking
incidents (every production error group enters the incident queue), the stricter
delete-production permission, deploy gates, AI remediation autonomy limits, and the severity
of security findings (a database reachable from the internet is `HIGH` in production and `LOW`
elsewhere; production-only findings such as missing deletion protection are listed by
`stacktape validate` but not reported for other stages).

When omitted, Stacktape infers it from the stage name: `prod`, `production`, `prd`, and `live`
(case-insensitive, including segmented variants like `prod-eu` or `client-a-prod`) count as
production, while names carrying a rehearsal marker (`pre-prod`, `prod-test`, `staging-live`)
do not. Set it explicitly when your naming does not follow those conventions.

This is a per-stage classification: with a TypeScript config, branch on the `stage` argument
to return different values for different stages.

### Example 1 (yaml)

```yaml
stackConfig:
  stageType: production
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/api.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(({ stage }) => {
  const api = new LambdaFunction({
    packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/api.ts' } }
  });
  return {
    stackConfig: { stageType: stage === 'live-eu' ? 'production' : 'non-production' },
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
        type: js-bundle
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
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

## Property: `tracing`

- Required: no
- Type: `TracingOptions`

Stack-wide distributed tracing default.

Applies to every resource in the stack that supports tracing. Individual resources can override
it with their own `tracing` property (`false` opts a resource out). Enabling tracing requires no
code changes for Lambda-based resources — Stacktape attaches the OpenTelemetry instrumentation
automatically.

### Example 1 (yaml)

```yaml
stackConfig:
  tracing:
    enabled: true
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/api.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/api.ts' } }
  });
  return {
    stackConfig: { tracing: { enabled: true } },
    resources: { api }
  };
});
```

## Property: `vpc`

- Required: no
- Type: `VpcSettings`

VPC configuration: reuse an existing VPC.
