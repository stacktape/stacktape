# CacheKeyCookies API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CacheKeyCookies = {
  /** All cookies are included in the cache key. */
  all?: boolean;
  /** All cookies except the listed ones are included in the cache key. */
  allExcept?: Array<string>;
  /** No cookies are included in the cache key. */
  none?: boolean;
  /** Only the listed cookies are included in the cache key. */
  whitelist?: Array<string>;
};
```

## Property: `all`

- Required: no
- Type: `boolean`

All cookies are included in the cache key.

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
        cookies: {
          all: true
        }
      }
    }
  }
});
return { resources: { api } };
});
```

## Property: `allExcept`

- Required: no
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

## Property: `none`

- Required: no
- Type: `boolean`

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

## Property: `whitelist`

- Required: no
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
