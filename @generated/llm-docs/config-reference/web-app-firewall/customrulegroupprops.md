# CustomRuleGroupProps API Reference

Resource type: `web-app-firewall`

## TypeScript definition

```typescript
type CustomRuleGroupProps = {
  /** ARN of the custom WAF rule group. */
  arn: string;
  name: string;
  /** Evaluation order. Lower = evaluated first. Must be unique across all rules. */
  priority: number;
  /** Disable CloudWatch metrics for this rule. */
  disableMetrics?: boolean;
  /** None = apply normally, Count = log matches without blocking (dry-run mode). */
  overrideAction?: "Count" | "None";
  /** Save samples of requests matching this rule for inspection in the WAF console. */
  sampledRequestsEnabled?: boolean;
};
```

## Property: `arn`

- Required: yes
- Type: `string`

ARN of the custom WAF rule group.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: custom-rule-group
          properties:
            name: CompanyRuleGroup
            arn: arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv
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
        type: 'custom-rule-group',
        properties: {
          name: 'CompanyRuleGroup',
          arn: 'arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv',
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

## Property: `overrideAction`

- Required: no
- Type: `string: "Count" | "None"`

`None` = apply normally, `Count` = log matches without blocking (dry-run mode).

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: custom-rule-group
          properties:
            name: CompanyRuleGroup
            arn: arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv
            priority: 0
            overrideAction: Count
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
        type: 'custom-rule-group',
        properties: {
          name: 'CompanyRuleGroup',
          arn: 'arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv',
          priority: 0,
          overrideAction: 'Count'
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
