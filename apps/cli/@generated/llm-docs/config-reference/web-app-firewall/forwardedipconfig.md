# ForwardedIPConfig API Reference

Resource type: `web-app-firewall`

## TypeScript definition

```typescript
type ForwardedIPConfig = {
  /** What to do when the header is missing. MATCH = apply rule action, NO_MATCH = skip. */
  fallbackBehavior: "MATCH" | "NO_MATCH";
  /** HTTP header containing the client IP (e.g., X-Forwarded-For). */
  headerName: string;
};
```

## Property: `fallbackBehavior`

- Required: yes
- Type: `string: "MATCH" | "NO_MATCH"`

What to do when the header is missing. `MATCH` = apply rule action, `NO_MATCH` = skip.

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
              fallbackBehavior: MATCH
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
            fallbackBehavior: 'MATCH'
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

## Property: `headerName`

- Required: yes
- Type: `string`

HTTP header containing the client IP (e.g., `X-Forwarded-For`).

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
