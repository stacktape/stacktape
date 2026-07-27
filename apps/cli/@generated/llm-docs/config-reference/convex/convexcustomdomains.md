# ConvexCustomDomains API Reference

## TypeScript definition

```typescript
import type { DomainConfiguration } from 'stacktape';

type ConvexCustomDomains = {
  /** API + WebSocket origin. Set as CONVEX_CLOUD_ORIGIN on the backend. */
  cloud: DomainConfiguration;
  /** HTTP-actions origin. Set as CONVEX_SITE_ORIGIN on the backend. */
  site: DomainConfiguration;
  /** Dashboard domain. Required if dashboard.enabled is true. */
  dashboard?: DomainConfiguration;
};
```

## Property: `cloud`

- Required: yes
- Type: `DomainConfiguration`

API + WebSocket origin. Set as `CONVEX_CLOUD_ORIGIN` on the backend.

Frontend clients connect here via the `convex-js` client. Example: `api.myapp.com`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      customDomains:
        cloud:
          domainName: api.myapp.com
        site:
          domainName: webhooks.myapp.com
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    customDomains: {
      cloud: {
        domainName: 'api.myapp.com'
      },
      site: {
        domainName: 'webhooks.myapp.com'
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `site`

- Required: yes
- Type: `DomainConfiguration`

HTTP-actions origin. Set as `CONVEX_SITE_ORIGIN` on the backend.

User-defined `httpAction()` routes (webhooks, OAuth callbacks) are served here.
Example: `webhooks.myapp.com`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      customDomains:
        cloud:
          domainName: api.myapp.com
        site:
          domainName: webhooks.myapp.com
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    customDomains: {
      cloud: {
        domainName: 'api.myapp.com'
      },
      site: {
        domainName: 'webhooks.myapp.com'
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `dashboard`

- Required: no
- Type: `DomainConfiguration`

Dashboard domain. Required if `dashboard.enabled` is `true`.

Example: `convex-admin.myapp.com`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
      customDomains:
        cloud:
          domainName: api.myapp.com
        site:
          domainName: webhooks.myapp.com
        dashboard:
          domainName: convex-admin.myapp.com
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true
    },
    customDomains: {
      cloud: {
        domainName: 'api.myapp.com'
      },
      site: {
        domainName: 'webhooks.myapp.com'
      },
      dashboard: {
        domainName: 'convex-admin.myapp.com'
      }
    }
  });
  return { resources: { backend } };
});
```
