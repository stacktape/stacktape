# ForwardHeadersWhitelist API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardHeadersWhitelist = {
  /** Only the listed headers are forwarded to the origin. */
  whitelist: Array<string>;
};
```

## Property: `whitelist`

- Required: yes
- Type: `Array<string>`

Only the listed headers are forwarded to the origin.

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
          whitelist:
            - User-Agent
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { headers: {
    whitelist: ['User-Agent']
  } } }
});
return { resources: { api } };
});
```
