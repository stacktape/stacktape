# ForwardQueryStringWhitelist API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardQueryStringWhitelist = {
  /** Only the listed query parameters are forwarded to the origin. */
  whitelist: Array<string>;
};
```

## Property: `whitelist`

- Required: yes
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
