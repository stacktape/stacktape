# WebAppFirewallProps API Reference

Resource type: `web-app-firewall`

## TypeScript definition

```typescript
import type { CustomResponseBodies, CustomRuleGroup, ManagedRuleGroup, RateBasedStatement } from 'stacktape';

type WebAppFirewallProps = {
  /** cdn for CloudFront-attached resources, regional for ALBs, User Pools, or direct API Gateways. */
  scope: "cdn" | "regional";
  /** Seconds a solved CAPTCHA stays valid before requiring re-verification. */
  captchaImmunityTime?: number;
  /** Seconds a solved challenge stays valid before requiring re-verification. */
  challengeImmunityTime?: number;
  /** Custom response bodies for Block actions. Map of key → content type + body. */
  customResponseBodies?: CustomResponseBodies;
  /** What happens when no rule matches a request. */
  defaultAction?: "Allow" | "Block";
  /** Disable CloudWatch metrics for the firewall. */
  disableMetrics?: boolean;
  /** Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules. */
  rules?: Array<WebAppFirewallRules>;
  /** Save samples of matched requests for inspection in the AWS WAF console. */
  sampledRequestsEnabled?: boolean;
  /** Domains accepted in WAF tokens. Enables token sharing across multiple protected websites. */
  tokenDomains?: Array<string>;
};

/** Union choices used by the properties above. */
type WebAppFirewallRules =
  | ManagedRuleGroup
  | CustomRuleGroup
  | RateBasedStatement;
```

## Property: `scope`

- Required: yes
- Type: `string: "cdn" | "regional"`

`cdn` for CloudFront-attached resources, `regional` for ALBs, User Pools, or direct API Gateways.

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

## Property: `captchaImmunityTime`

- Required: no
- Type: `number`
- Default: `300`

Seconds a solved CAPTCHA stays valid before requiring re-verification.

### Example 1 (yaml)

```yaml
resources:
  botFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      captchaImmunityTime: 600
      rules:
        - type: rate-based-rule
          properties:
            name: SuspiciousTraffic
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
      useFirewall: botFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const botFirewall = new WebAppFirewall({
    scope: 'regional',
    captchaImmunityTime: 600,
    rules: [
      {
        type: 'rate-based-rule',
        properties: {
          name: 'SuspiciousTraffic',
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
    useFirewall: 'botFirewall'
  });

  return { resources: { botFirewall, apiService } };
});
```

## Property: `challengeImmunityTime`

- Required: no
- Type: `number`
- Default: `300`

Seconds a solved challenge stays valid before requiring re-verification.

### Example 1 (yaml)

```yaml
resources:
  botFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      challengeImmunityTime: 900
      rules:
        - type: rate-based-rule
          properties:
            name: SuspiciousTraffic
            limit: 500
            aggregateBasedOn: IP
            action: Challenge
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
      useFirewall: botFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const botFirewall = new WebAppFirewall({
    scope: 'regional',
    challengeImmunityTime: 900,
    rules: [
      {
        type: 'rate-based-rule',
        properties: {
          name: 'SuspiciousTraffic',
          limit: 500,
          aggregateBasedOn: 'IP',
          action: 'Challenge',
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
    useFirewall: 'botFirewall'
  });

  return { resources: { botFirewall, apiService } };
});
```

## Property: `customResponseBodies`

- Required: no
- Type: `CustomResponseBodies`

Custom response bodies for `Block` actions. Map of key → content type + body.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      defaultAction: Block
      customResponseBodies:
        accessDenied:
          contentType: application/json
          content: '{"error":"Access denied by web application firewall"}'
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
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
    defaultAction: 'Block',
    customResponseBodies: {
      accessDenied: {
        contentType: 'application/json',
        content: '{"error":"Access denied by web application firewall"}'
      }
    },
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
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

## Property: `defaultAction`

- Required: no
- Type: `string: "Allow" | "Block"`
- Default: `Allow`

What happens when no rule matches a request.

**`Allow`** (recommended): Allow all traffic, block only what rules catch.
**`Block`**: Block all traffic, allow only what rules explicitly permit (returns 403).

### Example 1 (yaml)

```yaml
resources:
  adminFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      defaultAction: Block
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 0
  adminService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/admin.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      useFirewall: adminFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminFirewall = new WebAppFirewall({
    scope: 'regional',
    defaultAction: 'Block',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 0
        }
      }
    ]
  });

  const adminService = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/admin.ts' }
    },
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: { type: 'application-load-balancer' },
    useFirewall: 'adminFirewall'
  });

  return { resources: { adminFirewall, adminService } };
});
```

## Property: `disableMetrics`

- Required: no
- Type: `boolean`
- Default: `false`

Disable CloudWatch metrics for the firewall.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      disableMetrics: true
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
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
    disableMetrics: true,
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
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

## Property: `rules`

- Required: no
- Type: `Array<managed-rule-group | custom-rule-group | rate-based-rule>`

Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules.

If omitted, Stacktape uses `AWSManagedRulesCommonRuleSet` + `AWSManagedRulesKnownBadInputsRuleSet` by default.

Choices:
- `managed-rule-group` (`ManagedRuleGroup`). Properties: `vendorName: string`, `excludedRules?: Array<string>`, `overrideAction?: string: "Count" | "None"`, `priority: number`, `name: string`, `disableMetrics?: boolean`, `sampledRequestsEnabled?: boolean`.
- `custom-rule-group` (`CustomRuleGroup`). Properties: `arn: string`, `overrideAction?: string: "Count" | "None"`, `priority: number`, `name: string`, `disableMetrics?: boolean`, `sampledRequestsEnabled?: boolean`.
- `rate-based-rule` (`RateBasedStatement`). Properties: `limit: number`, `aggregateBasedOn?: string: "FORWARDED_IP" | "IP"`, `forwardedIPConfig?: ForwardedIPConfig`, `action?: string: "Allow" | "Block" | "Captcha" | "Challenge" | "Count"`, `priority: number`, `name: string`, `disableMetrics?: boolean`, `sampledRequestsEnabled?: boolean`.

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
        - type: rate-based-rule
          properties:
            name: RateLimitPerIp
            limit: 2000
            aggregateBasedOn: IP
            priority: 2
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
      },
      {
        type: 'rate-based-rule',
        properties: {
          name: 'RateLimitPerIp',
          limit: 2000,
          aggregateBasedOn: 'IP',
          priority: 2
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

Save samples of matched requests for inspection in the AWS WAF console.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      sampledRequestsEnabled: true
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
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
    sampledRequestsEnabled: true,
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
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

## Property: `tokenDomains`

- Required: no
- Type: `Array<string>`

Domains accepted in WAF tokens. Enables token sharing across multiple protected websites.

### Example 1 (yaml)

```yaml
resources:
  edgeFirewall:
    type: web-app-firewall
    properties:
      scope: cdn
      tokenDomains:
        - app.example.com
        - admin.example.com
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 0
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      useFirewall: edgeFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const edgeFirewall = new WebAppFirewall({
    scope: 'cdn',
    tokenDomains: ['app.example.com', 'admin.example.com'],
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 0
        }
      }
    ]
  });

  const web = new NextjsWeb({
    appDirectory: './',
    useFirewall: 'edgeFirewall'
  });

  return { resources: { edgeFirewall, web } };
});
```
