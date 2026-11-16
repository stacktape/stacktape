# ForwardHeadersAllViewer API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardHeadersAllViewer = {
  /** Forward all headers from the viewer's request. */
  allViewer: true;
};
```

## Property: `allViewer`

- Required: yes
- Type: `boolean = true`

Forward all headers from the viewer's request.

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
          allViewer: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { headers: {
    allViewer: true
  } } }
});
return { resources: { api } };
});
```
