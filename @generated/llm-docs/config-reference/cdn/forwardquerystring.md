# ForwardQueryString API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardQueryString = {
  /** All query parameters are forwarded to the origin. */
  all?: boolean;
  /** No query parameters are forwarded to the origin. */
  none?: boolean;
  /** Only the listed query parameters are forwarded to the origin. */
  whitelist?: Array<string>;
};
```

## Property: `all`

- Required: no
- Type: `boolean`

All query parameters are forwarded to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        queryString:
          all: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { queryString: {
    all: true
  } } }
});
return { resources: { api } };
});
```

## Property: `none`

- Required: no
- Type: `boolean`

No query parameters are forwarded to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        queryString:
          none: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { queryString: {
    none: true
  } } }
});
return { resources: { api } };
});
```

## Property: `whitelist`

- Required: no
- Type: `Array<string>`

Only the listed query parameters are forwarded to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        queryString:
          whitelist:
            - page
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { queryString: {
    whitelist: ['page']
  } } }
});
return { resources: { api } };
});
```
