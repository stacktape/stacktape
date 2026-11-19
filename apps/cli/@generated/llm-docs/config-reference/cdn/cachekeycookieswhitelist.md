# CacheKeyCookiesWhitelist API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyCookiesWhitelist = {
  /** Only the listed cookies are included in the cache key. */
  whitelist: Array<string>;
};
```

## Property: `whitelist`

- Required: yes
- Type: `Array<string>`

Only the listed cookies are included in the cache key.

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
        cookies: {
          whitelist: ['sessionId']
        }
      }
    }
  }
});
return { resources: { api } };
});
```
