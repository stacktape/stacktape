# CacheKeyCookiesNone API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyCookiesNone = {
  /** No cookies are included in the cache key. */
  none: true;
};
```

## Property: `none`

- Required: yes
- Type: `boolean = true`

No cookies are included in the cache key.

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
            none: true
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
        cookies: {
          none: true
        }
      }
    }
  }
});
return { resources: { api } };
});
```
