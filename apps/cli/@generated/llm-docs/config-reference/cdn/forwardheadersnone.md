# ForwardHeadersNone API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardHeadersNone = {
  /** No headers are forwarded to the origin. */
  none: true;
};
```

## Property: `none`

- Required: yes
- Type: `boolean = true`

No headers are forwarded to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        headers:
          none: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { headers: {
    none: true
  } } }
});
return { resources: { api } };
});
```
