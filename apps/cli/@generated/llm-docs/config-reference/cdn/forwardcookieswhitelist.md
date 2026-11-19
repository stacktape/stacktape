# ForwardCookiesWhitelist API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardCookiesWhitelist = {
  /** Only the listed cookies are forwarded to the origin. */
  whitelist: Array<string>;
};
```

## Property: `whitelist`

- Required: yes
- Type: `Array<string>`

Only the listed cookies are forwarded to the origin.

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
          whitelist:
            - sessionId
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { cookies: {
    whitelist: ['sessionId']
  } } }
});
return { resources: { api } };
});
```
