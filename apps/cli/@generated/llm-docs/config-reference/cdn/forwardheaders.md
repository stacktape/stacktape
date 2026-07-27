# ForwardHeaders API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardHeaders = {
  /** Forward all viewer headers except the listed ones. */
  allExcept?: Array<string>;
  /** Forward all headers from the viewer&#39;s request. */
  allViewer?: boolean;
  /** Forward all viewer headers plus the listed CloudFront-specific headers (e.g., CloudFront-Viewer-Country). */
  allViewerAndWhitelistCloudFront?: Array<string>;
  /** No headers are forwarded to the origin. */
  none?: boolean;
  /** Only the listed headers are forwarded to the origin. */
  whitelist?: Array<string>;
};
```

## Property: `allExcept`

- Required: no
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

## Property: `allViewer`

- Required: no
- Type: `boolean`

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

## Property: `allViewerAndWhitelistCloudFront`

- Required: no
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

## Property: `none`

- Required: no
- Type: `boolean`

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

## Property: `whitelist`

- Required: no
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
