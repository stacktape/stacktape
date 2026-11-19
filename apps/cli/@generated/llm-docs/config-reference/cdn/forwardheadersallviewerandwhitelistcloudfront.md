# ForwardHeadersAllViewerAndWhitelistCloudFront API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardHeadersAllViewerAndWhitelistCloudFront = {
  /** Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`). */
  allViewerAndWhitelistCloudFront: Array<string>;
};
```

## Property: `allViewerAndWhitelistCloudFront`

- Required: yes
- Type: `Array<string>`

Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).

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
          allViewerAndWhitelistCloudFront:
            - CloudFront-Viewer-Country
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { headers: {
    allViewerAndWhitelistCloudFront: ['CloudFront-Viewer-Country']
  } } }
});
return { resources: { api } };
});
```
