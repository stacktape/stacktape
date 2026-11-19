# ForwardCookiesAll API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardCookiesAll = {
  /** All cookies are forwarded to the origin. */
  all: true;
};
```

## Property: `all`

- Required: yes
- Type: `boolean = true`

All cookies are forwarded to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        cookies:
          all: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { cookies: {
    all: true
  } } }
});
return { resources: { api } };
});
```
