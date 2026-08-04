# CdnCustomRequestHeader API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CdnCustomRequestHeader = {
  /** Name of the header */
  headerName: string;
  /** Value of the header */
  value: string;
};
```

## Property: `headerName`

- Required: yes
- Type: `string`

Name of the header

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        customRequestHeaders:
          - headerName: X-Api-Key
            value: $Secret('cdn-origin-key')
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      customRequestHeaders: [
        {
          headerName: 'X-Api-Key',
          value: $Secret('cdn-origin-key')
        }
      ]
    }
  }
});
return { resources: { api } };
});
```

## Property: `value`

- Required: yes
- Type: `string`

Value of the header

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        customRequestHeaders:
          - headerName: X-Api-Key
            value: $Secret('cdn-origin-key')
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      customRequestHeaders: [
        {
          headerName: 'X-Api-Key',
          value: $Secret('cdn-origin-key')
        }
      ]
    }
  }
});
return { resources: { api } };
});
```
