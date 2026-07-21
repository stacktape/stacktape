# RateBasedStatementProps API Reference

Resource type: `web-app-firewall`

## TypeScript definition

```typescript
import type { ForwardedIPConfig } from 'stacktape';

type RateBasedStatementProps = {
  /** Max requests per IP in a 5-minute window. Range: 100–20,000,000. Exceeding triggers the action. */
  limit: number;
  name: string;
  /** Evaluation order. Lower = evaluated first. Must be unique across all rules. */
  priority: number;
  /** What to do when the rate limit is exceeded. */
  action?: "Allow" | "Block" | "Captcha" | "Challenge" | "Count";
  /** IP = direct client IP, FORWARDED_IP = IP from a header (e.g., X-Forwarded-For behind a proxy). */
  aggregateBasedOn?: "FORWARDED_IP" | "IP";
  /** Disable CloudWatch metrics for this rule. */
  disableMetrics?: boolean;
  /** Header and fallback settings when using FORWARDED_IP aggregation. */
  forwardedIPConfig?: ForwardedIPConfig;
  /** Save samples of requests matching this rule for inspection in the WAF console. */
  sampledRequestsEnabled?: boolean;
};
```

## Property: `limit`

- Required: yes
- Type: `number`

Max requests per IP in a 5-minute window. Range: 100–20,000,000. Exceeding triggers the `action`.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: rate-based-rule
          properties:
            name: RateLimitPerIp
            limit: 2000
            aggregateBasedOn: IP
            action: Block
            priority: 0
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'rate-based-rule',
        properties: {
          name: 'RateLimitPerIp',
          limit: 2000,
          aggregateBasedOn: 'IP',
          action: 'Block',
          priority: 0
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```

## Property: `name`

- Required: yes
- Type: `string`

## Property: `priority`

- Required: yes
- Type: `number`

Evaluation order. Lower = evaluated first. Must be unique across all rules.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 0
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesKnownBadInputsRuleSet
            vendorName: AWS
            priority: 1
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 0
        }
      },
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          vendorName: 'AWS',
          priority: 1
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```

## Property: `action`

- Required: no
- Type: `string: "Allow" | "Block" | "Captcha" | "Challenge" | "Count"`
- Default: `Block`

What to do when the rate limit is exceeded.

`Block`: Return 403 (most common for rate limiting).
`Count`: Log only, don't block (useful for testing thresholds).
`Captcha`/`Challenge`: Verify the client is human.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: rate-based-rule
          properties:
            name: RateLimitPerIp
            limit: 500
            aggregateBasedOn: IP
            action: Captcha
            priority: 0
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'rate-based-rule',
        properties: {
          name: 'RateLimitPerIp',
          limit: 500,
          aggregateBasedOn: 'IP',
          action: 'Captcha',
          priority: 0
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```

## Property: `aggregateBasedOn`

- Required: no
- Type: `string: "FORWARDED_IP" | "IP"`

`IP` = direct client IP, `FORWARDED_IP` = IP from a header (e.g., `X-Forwarded-For` behind a proxy).

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: rate-based-rule
          properties:
            name: RateLimitForwarded
            limit: 2000
            aggregateBasedOn: FORWARDED_IP
            forwardedIPConfig:
              headerName: X-Forwarded-For
              fallbackBehavior: NO_MATCH
            action: Block
            priority: 0
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'rate-based-rule',
        properties: {
          name: 'RateLimitForwarded',
          limit: 2000,
          aggregateBasedOn: 'FORWARDED_IP',
          forwardedIPConfig: {
            headerName: 'X-Forwarded-For',
            fallbackBehavior: 'NO_MATCH'
          },
          action: 'Block',
          priority: 0
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```

## Property: `disableMetrics`

- Required: no
- Type: `boolean`
- Default: `false`

Disable CloudWatch metrics for this rule.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 0
            disableMetrics: true
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 0,
          disableMetrics: true
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```

## Property: `forwardedIPConfig`

- Required: no
- Type: `ForwardedIPConfig`

Header and fallback settings when using `FORWARDED_IP` aggregation.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: rate-based-rule
          properties:
            name: RateLimitForwarded
            limit: 2000
            aggregateBasedOn: FORWARDED_IP
            forwardedIPConfig:
              headerName: X-Forwarded-For
              fallbackBehavior: NO_MATCH
            action: Block
            priority: 0
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'rate-based-rule',
        properties: {
          name: 'RateLimitForwarded',
          limit: 2000,
          aggregateBasedOn: 'FORWARDED_IP',
          forwardedIPConfig: {
            headerName: 'X-Forwarded-For',
            fallbackBehavior: 'NO_MATCH'
          },
          action: 'Block',
          priority: 0
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```

## Property: `sampledRequestsEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Save samples of requests matching this rule for inspection in the WAF console.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 0
            sampledRequestsEnabled: true
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: apiFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 0,
          sampledRequestsEnabled: true
        }
      }
    ]
  });

  const apiService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'apiFirewall'
  });

  return { resources: { apiFirewall, apiService } };
});
```
