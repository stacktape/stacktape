# CdnCacheKey API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
import type { CacheKeyCookiesAll, CacheKeyCookiesAllExcept, CacheKeyCookiesNone, CacheKeyCookiesWhitelist, CacheKeyHeadersNone, CacheKeyHeadersWhitelist, CacheKeyQueryStringAll, CacheKeyQueryStringNone, CacheKeyQueryStringWhitelist } from 'stacktape';

type CdnCacheKey = {
  /** Which cookies to include in the cache key. Different cookie values = different cached responses. */
  cookies?: CdnCacheKeyCookies;
  /** Which headers to include in the cache key. Different header values = different cached responses. */
  headers?: CdnCacheKeyHeaders;
  /** Which query params to include in the cache key. Different param values = different cached responses. */
  queryString?: CdnCacheKeyQueryString;
};

/** Union choices used by the properties above. */
type CdnCacheKeyCookies =
  | CacheKeyCookiesNone
  | CacheKeyCookiesWhitelist
  | CacheKeyCookiesAllExcept
  | CacheKeyCookiesAll;

type CdnCacheKeyHeaders =
  | CacheKeyHeadersNone
  | CacheKeyHeadersWhitelist;

type CdnCacheKeyQueryString =
  | CacheKeyQueryStringAll
  | CacheKeyQueryStringNone
  | CacheKeyQueryStringWhitelist;
```

## Property: `cookies`

- Required: no
- Type: `CacheKeyCookiesNone | CacheKeyCookiesWhitelist | CacheKeyCookiesAllExcept | CacheKeyCookiesAll`

Which cookies to include in the cache key. Different cookie values = different cached responses.

Choices:
- `CacheKeyCookiesNone` (`CacheKeyCookiesNone`). Properties: `none: boolean = true`.
- `CacheKeyCookiesWhitelist` (`CacheKeyCookiesWhitelist`). Properties: `whitelist: Array<string>`.
- `CacheKeyCookiesAllExcept` (`CacheKeyCookiesAllExcept`). Properties: `allExcept: Array<string>`.
- `CacheKeyCookiesAll` (`CacheKeyCookiesAll`). Properties: `all: boolean = true`.

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
- Type: `CacheKeyHeadersNone | CacheKeyHeadersWhitelist`

Which headers to include in the cache key. Different header values = different cached responses.

Choices:
- `CacheKeyHeadersNone` (`CacheKeyHeadersNone`). Properties: `none: boolean = true`.
- `CacheKeyHeadersWhitelist` (`CacheKeyHeadersWhitelist`). Properties: `whitelist: Array<string>`.

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
- Type: `CacheKeyQueryStringAll | CacheKeyQueryStringNone | CacheKeyQueryStringWhitelist`

Which query params to include in the cache key. Different param values = different cached responses.

Choices:
- `CacheKeyQueryStringAll` (`CacheKeyQueryStringAll`). Properties: `all: boolean = true`.
- `CacheKeyQueryStringNone` (`CacheKeyQueryStringNone`). Properties: `none: boolean = true`.
- `CacheKeyQueryStringWhitelist` (`CacheKeyQueryStringWhitelist`). Properties: `whitelist: Array<string>`.

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
