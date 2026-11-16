# CacheKeyQueryStringAll API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyQueryStringAll = {
  /** All query parameters are included in the cache key. */
  all: true;
};
```

## Property: `all`

- Required: yes
- Type: `boolean = true`

All query parameters are included in the cache key.

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
            all: true
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
          all: true
        }
      }
    }
  }
});
return { resources: { api } };
});
```
