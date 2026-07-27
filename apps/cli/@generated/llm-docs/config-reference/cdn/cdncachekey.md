# CdnCacheKey API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
import type { CacheKeyCookies, CacheKeyHeaders, CacheKeyQueryString } from 'stacktape';

type CdnCacheKey = {
  /** Which cookies to include in the cache key. Different cookie values = different cached responses. */
  cookies?: CacheKeyCookies;
  /** Which headers to include in the cache key. Different header values = different cached responses. */
  headers?: CacheKeyHeaders;
  /** Which query params to include in the cache key. Different param values = different cached responses. */
  queryString?: CacheKeyQueryString;
};
```

## Property: `cookies`

- Required: no
- Type: `CacheKeyCookies`

Which cookies to include in the cache key. Different cookie values = different cached responses.

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
          cookies:
            whitelist:
              - sessionId
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
        cookies: { whitelist: ['sessionId'] }
      }
    }
  }
});
return { resources: { api } };
});
```

## Property: `headers`

- Required: no
- Type: `CacheKeyHeaders`

Which headers to include in the cache key. Different header values = different cached responses.

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
        headers: { whitelist: ['Authorization'] }
      }
    }
  }
});
return { resources: { api } };
});
```

## Property: `queryString`

- Required: no
- Type: `CacheKeyQueryString`

Which query params to include in the cache key. Different param values = different cached responses.

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
              - lang
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
        queryString: { whitelist: ['lang'] }
      }
    }
  }
});
return { resources: { api } };
});
```
