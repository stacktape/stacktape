# CdnBucketOrigin API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CdnBucketOrigin = {
  /** Name of the bucket resource to route to. */
  bucketName: string;
  /** Disable clean URL normalization (e.g., /about → /about.html). */
  disableUrlNormalization?: boolean;
};
```

## Property: `bucketName`

- Required: yes
- Type: `string`

Name of the `bucket` resource to route to.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /assets/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/assets/*',
        routeTo: {
          type: 'bucket',
          properties: {
            bucketName: 'assets'
          }
        }
      }
    ]
  }
});
return { resources: { assets, api } };
});
```

## Property: `disableUrlNormalization`

- Required: no
- Type: `boolean`
- Default: `false`

Disable clean URL normalization (e.g., `/about` → `/about.html`).

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /assets/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
              disableUrlNormalization: true
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/assets/*',
        routeTo: {
          type: 'bucket',
          properties: {
            bucketName: 'assets',
            disableUrlNormalization: true
          }
        }
      }
    ]
  }
});
return { resources: { assets, api } };
});
```
