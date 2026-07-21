# SsrWebCdnConfig API Reference

CDN configuration shared by all SSR web resources

## TypeScript definition

```typescript
import type { CdnCachingOptions, SsrWebPathCachingOverride } from 'stacktape';

type SsrWebCdnConfig = {
  /** Override default SSR caching behavior for all routes handled by the server. */
  defaultCachingOptions?: CdnCachingOptions;
  /** Skip clearing the CDN cache after each deploy. */
  disableInvalidationAfterDeploy?: boolean;
  /** Override caching for specific CDN path patterns. */
  pathCachingOverrides?: Array<SsrWebPathCachingOverride>;
};
```

## Property: `defaultCachingOptions`

- Required: no
- Type: `CdnCachingOptions`

Override default SSR caching behavior for all routes handled by the server.

Useful when you want to cache SSR responses longer than the framework defaults.

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      cdn:
        defaultCachingOptions:
          minTTL: 0
          defaultTTL: 60
          maxTTL: 3600
          cacheKeyParameters:
            queryString:
              all: true
            cookies:
              none: true
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    cdn: {
      defaultCachingOptions: {
        minTTL: 0,
        defaultTTL: 60,
        maxTTL: 3600,
        cacheKeyParameters: {
          queryString: { all: true },
          cookies: { none: true }
        }
      }
    }
  });

  return { resources: { webApp } };
});
```

## Property: `disableInvalidationAfterDeploy`

- Required: no
- Type: `boolean`
- Default: `false`

Skip clearing the CDN cache after each deploy.

By default, all cached content is flushed on every deploy so users see the latest version.
Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      cdn:
        disableInvalidationAfterDeploy: true
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    cdn: {
      disableInvalidationAfterDeploy: true
    }
  });

  return { resources: { webApp } };
});
```

## Property: `pathCachingOverrides`

- Required: no
- Type: `Array<SsrWebPathCachingOverride>`

Override caching for specific CDN path patterns.

Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      cdn:
        pathCachingOverrides:
          - path: /_server-islands/*
            cachingOptions:
              minTTL: 0
              defaultTTL: 0
              maxTTL: 0
          - path: /api/*
            cachingOptions:
              cacheMethods:
                - GET
                - HEAD
                - OPTIONS
              defaultTTL: 30
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
          path: '/_server-islands/*',
          cachingOptions: { minTTL: 0, defaultTTL: 0, maxTTL: 0 }
        },
        {
          path: '/api/*',
          cachingOptions: { cacheMethods: ['GET', 'HEAD', 'OPTIONS'], defaultTTL: 30 }
        }
      ]
    }
  });

  return { resources: { webApp } };
});
```
