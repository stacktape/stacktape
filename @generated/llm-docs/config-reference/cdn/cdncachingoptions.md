# CdnCachingOptions API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
import type { CdnCacheKey } from 'stacktape';

type CdnCachingOptions = {
  /** Which headers, cookies, and query params make responses unique in the cache. */
  cacheKeyParameters?: CdnCacheKey;
  /** HTTP methods to cache. Use ['GET', 'HEAD', 'OPTIONS'] if your API uses CORS preflight. */
  cacheMethods?: Array<"GET" | "HEAD" | "OPTIONS">;
  /** Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here. */
  cachePolicyId?: string;
  /** Default cache time (seconds). Used when the origin response has no Cache-Control or Expires header. */
  defaultTTL?: number;
  /** Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost. */
  disableCompression?: boolean;
  /** Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer. */
  maxTTL?: number;
  /** Minimum cache time (seconds). Overrides Cache-Control: max-age if the origin sets a lower value. */
  minTTL?: number;
};
```

## Property: `cacheKeyParameters`

- Required: no
- Type: `CdnCacheKey`

Which headers, cookies, and query params make responses unique in the cache.

Defaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.
Values included in the cache key are always forwarded to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        cacheKeyParameters:
          queryString:
            whitelist:
              - page
          headers:
            whitelist:
              - Authorization
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      cacheKeyParameters: {
        queryString: { whitelist: ['page'] },
        headers: { whitelist: ['Authorization'] }
      }
    }
  }
});
return { resources: { api } };
});
```

## Property: `cacheMethods`

- Required: no
- Type: `Array<string: "GET" | "HEAD" | "OPTIONS">`

HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        cacheMethods:
          - GET
          - HEAD
          - OPTIONS
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      cacheMethods: ['GET', 'HEAD', 'OPTIONS']
    }
  }
});
return { resources: { api } };
});
```

## Property: `cachePolicyId`

- Required: no
- Type: `string`

Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        cachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
    }
  }
});
return { resources: { api } };
});
```

## Property: `defaultTTL`

- Required: no
- Type: `number`

Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        defaultTTL: 86400
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      defaultTTL: 86400
    }
  }
});
return { resources: { api } };
});
```

## Property: `disableCompression`

- Required: no
- Type: `boolean`
- Default: `false`

Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        disableCompression: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      disableCompression: true
    }
  }
});
return { resources: { api } };
});
```

## Property: `maxTTL`

- Required: no
- Type: `number`

Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        maxTTL: 31536000
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      maxTTL: 31536000
    }
  }
});
return { resources: { api } };
});
```

## Property: `minTTL`

- Required: no
- Type: `number`

Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      cachingOptions:
        minTTL: 60
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    cachingOptions: {
      minTTL: 60
    }
  }
});
return { resources: { api } };
});
```
