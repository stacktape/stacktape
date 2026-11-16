# ForwardHeadersAllExcept API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardHeadersAllExcept = {
  /** Forward all viewer headers except the listed ones. */
  allExcept: Array<string>;
};
```

## Property: `allExcept`

- Required: yes
- Type: `Array<string>`

Forward all viewer headers except the listed ones.

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
          allExcept:
            - Host
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { headers: {
    allExcept: ['Host']
  } } }
});
return { resources: { api } };
});
```
