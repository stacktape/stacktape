# ForwardCookies API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type ForwardCookies = {
  /** All cookies are forwarded to the origin. */
  all?: boolean;
  /** No cookies are forwarded to the origin. */
  none?: boolean;
  /** Only the listed cookies are forwarded to the origin. */
  whitelist?: Array<string>;
};
```

## Property: `all`

- Required: no
- Type: `boolean`

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

## Property: `none`

- Required: no
- Type: `boolean`

No cookies are forwarded to the origin.

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
          none: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: { enabled: true, forwardingOptions: { cookies: {
    none: true
  } } }
});
return { resources: { api } };
});
```

## Property: `whitelist`

- Required: no
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
