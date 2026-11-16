# ForwardQueryStringNone API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardQueryStringNone = {
  /** No query parameters are forwarded to the origin. */
  none: true;
};
```

## Property: `none`

- Required: yes
- Type: `boolean = true`

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
