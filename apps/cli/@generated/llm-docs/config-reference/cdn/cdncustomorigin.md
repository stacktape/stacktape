# CdnCustomOrigin API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CdnCustomOrigin = {
  /** Domain name of the external origin (e.g., api.example.com). */
  domainName: string;
  /** Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP. */
  port?: number;
  /** Protocol for connecting to the origin. */
  protocol?: "HTTP" | "HTTPS";
};
```

## Property: `domainName`

- Required: yes
- Type: `string`

Domain name of the external origin (e.g., `api.example.com`).

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /legacy/*
          routeTo:
            type: custom-origin
            properties:
              domainName: api.example.com
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/legacy/*',
        routeTo: {
          type: 'custom-origin',
          properties: {
            domainName: 'api.example.com'
          }
        }
      }
    ]
  }
});
return { resources: { api } };
});
```

## Property: `port`

- Required: no
- Type: `number`

Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /legacy/*
          routeTo:
            type: custom-origin
            properties:
              domainName: api.example.com
              protocol: HTTP
              port: 8080
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/legacy/*',
        routeTo: {
          type: 'custom-origin',
          properties: {
            domainName: 'api.example.com',
            protocol: 'HTTP',
            port: 8080
          }
        }
      }
    ]
  }
});
return { resources: { api } };
});
```

## Property: `protocol`

- Required: no
- Type: `string: "HTTP" | "HTTPS"`
- Default: `HTTPS`

Protocol for connecting to the origin.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /legacy/*
          routeTo:
            type: custom-origin
            properties:
              domainName: api.example.com
              protocol: HTTPS
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/legacy/*',
        routeTo: {
          type: 'custom-origin',
          properties: {
            domainName: 'api.example.com',
            protocol: 'HTTPS'
          }
        }
      }
    ]
  }
});
return { resources: { api } };
});
```
