# CacheKeyCookiesAllExcept API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyCookiesAllExcept = {
  /** All cookies except the listed ones are included in the cache key. */
  allExcept: Array<string>;
};
```

## Property: `allExcept`

- Required: yes
- Type: `Array<string>`

All cookies except the listed ones are included in the cache key.

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
            allExcept:
              - tracking
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
          allExcept: ['tracking']
        }
      }
    }
  }
});
return { resources: { api } };
});
```
