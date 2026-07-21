# CdnHttpApiGatewayOrigin API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CdnHttpApiGatewayOrigin = {
  /** Name of the http-api-gateway resource to route to. */
  httpApiGatewayName: string;
};
```

## Property: `httpApiGatewayName`

- Required: yes
- Type: `string`

Name of the `http-api-gateway` resource to route to.

### Example 1 (yaml)

```yaml
resources:
cdnApi:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /api/*
          routeTo:
            type: http-api-gateway
            properties:
              httpApiGatewayName: backendApi
backendApi:
  type: http-api-gateway
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const backendApi = new HttpApiGateway({});
const cdnApi = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/api/*',
        routeTo: {
          type: 'http-api-gateway',
          properties: {
            httpApiGatewayName: 'backendApi'
          }
        }
      }
    ]
  }
});
return { resources: { backendApi, cdnApi } };
});
```
