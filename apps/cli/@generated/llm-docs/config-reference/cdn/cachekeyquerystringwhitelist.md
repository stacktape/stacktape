# CacheKeyQueryStringWhitelist API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyQueryStringWhitelist = {
  /** Only the listed query parameters are included in the cache key. */
  whitelist: Array<string>;
};
```

## Property: `whitelist`

- Required: yes
- Type: `Array<string>`

Only the listed query parameters are included in the cache key.

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
        queryString: {
          whitelist: ['page']
        }
      }
    }
  }
});
return { resources: { api } };
});
```
