# CacheKeyHeaders API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyHeaders = {
  /** No headers are included in the cache key. */
  none?: boolean;
  /** Only the listed headers are included in the cache key. */
  whitelist?: Array<string>;
};
```

## Property: `none`

- Required: no
- Type: `boolean`

No headers are included in the cache key.

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
        headers: {
          none: true
        }
      }
    }
  }
});
return { resources: { api } };
});
```

## Property: `whitelist`

- Required: no
- Type: `Array<string>`

Only the listed headers are included in the cache key.

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
        headers: {
          whitelist: ['Authorization']
        }
      }
    }
  }
});
return { resources: { api } };
});
```
