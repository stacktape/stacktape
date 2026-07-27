# SsrWebPathCachingOverride API Reference

## TypeScript definition

```typescript
import type { CdnCachingOptions } from 'stacktape';

type SsrWebPathCachingOverride = {
  /** Caching behavior override for this path pattern. */
  cachingOptions: CdnCachingOptions;
  /** URL path pattern to match (e.g., /api/*, /_server-islands/*). */
  path: string;
};
```

## Property: `cachingOptions`

- Required: yes
- Type: `CdnCachingOptions`

Caching behavior override for this path pattern.

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      cdn:
        pathCachingOverrides:
          - path: /api/*
            cachingOptions:
              cacheMethods:
                - GET
                - HEAD
              minTTL: 0
              defaultTTL: 15
              maxTTL: 300
              cacheKeyParameters:
                queryString:
                  whitelist:
                    - page
                    - limit
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    cdn: {
      pathCachingOverrides: [
        {
          path: '/api/*',
          cachingOptions: {
            cacheMethods: ['GET', 'HEAD'],
            minTTL: 0,
            defaultTTL: 15,
            maxTTL: 300,
            cacheKeyParameters: {
              queryString: { whitelist: ['page', 'limit'] }
            }
          }
        }
      ]
    }
  });

  return { resources: { webApp } };
});
```

## Property: `path`

- Required: yes
- Type: `string`

URL path pattern to match (e.g., `/api/*`, `/_server-islands/*`).

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      cdn:
        pathCachingOverrides:
          -
            path: /_nuxt/*
            cachingOptions:
              minTTL: 31536000
              defaultTTL: 31536000
              maxTTL: 31536000
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    cdn: {
      pathCachingOverrides: [
        {
          path: '/_nuxt/*',
          cachingOptions: { minTTL: 31536000, defaultTTL: 31536000, maxTTL: 31536000 }
        }
      ]
    }
  });

  return { resources: { webApp } };
});
```
