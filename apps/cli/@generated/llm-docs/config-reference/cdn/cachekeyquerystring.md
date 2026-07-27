# CacheKeyQueryString API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyQueryString = {
  /** All query parameters are included in the cache key. */
  all?: boolean;
  /** No query parameters are included in the cache key. */
  none?: boolean;
  /** Only the listed query parameters are included in the cache key. */
  whitelist?: Array<string>;
};
```

## Property: `all`

- Required: no
- Type: `boolean`

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

## Property: `none`

- Required: no
- Type: `boolean`

No query parameters are included in the cache key.

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
        queryString: {
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
