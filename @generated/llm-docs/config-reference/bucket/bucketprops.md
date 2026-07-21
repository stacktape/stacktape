# BucketProps API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { AbortIncompleteMultipartUpload, BucketAccessibility, BucketCdnConfiguration, BucketCorsConfig, ClassTransition, DirectoryUpload, Expiration, NonCurrentVersionClassTransition, NonCurrentVersionExpiration } from 'stacktape';

type BucketProps = {
  /** Who can read/write to this bucket: private (default), public-read, or public-read-write. */
  accessibility?: BucketAccessibility;
  /** Put a CDN (CloudFront) in front of this bucket for faster downloads and lower bandwidth costs. */
  cdn?: BucketCdnConfiguration;
  /** CORS settings for browser-based access to the bucket. */
  cors?: BucketCorsConfig;
  /** Sync a local directory to this bucket on every deploy. */
  directoryUpload?: DirectoryUpload;
  /** Send events (object created, deleted, etc.) to EventBridge for event-driven workflows. */
  enableEventBusNotifications?: boolean;
  /** Encrypt stored objects at rest (AES-256). */
  encryption?: boolean;
  /** Auto-delete or move objects to cheaper storage classes over time. */
  lifecycleRules?: Array<BucketLifecycleRules>;
  /** Keep previous versions of overwritten/deleted objects. Helps recover from mistakes. */
  versioning?: boolean;
};

/** Union choices used by the properties above. */
type BucketLifecycleRules =
  | Expiration
  | NonCurrentVersionExpiration
  | ClassTransition
  | NonCurrentVersionClassTransition
  | AbortIncompleteMultipartUpload;
```

## Property: `accessibility`

- Required: no
- Type: `BucketAccessibility`

Who can read/write to this bucket: `private` (default), `public-read`, or `public-read-write`.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      accessibility:
        accessibilityMode: public-read
      versioning: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    accessibility: {
      accessibilityMode: 'public-read'
    },
    versioning: true
  });
  return { resources: { myBucket } };
});
```

## Property: `cdn`

- Required: no
- Type: `BucketCdnConfiguration`

Put a CDN (CloudFront) in front of this bucket for faster downloads and lower bandwidth costs.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      cdn:
        enabled: true
        cloudfrontPriceClass: PriceClass_100
      directoryUpload:
        directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    cdn: {
      enabled: true,
      cloudfrontPriceClass: 'PriceClass_100'
    },
    directoryUpload: {
      directoryPath: './public'
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `cors`

- Required: no
- Type: `BucketCorsConfig`

CORS settings for browser-based access to the bucket.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
      accessibility:
        accessibilityMode: public-read
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true
    },
    accessibility: {
      accessibilityMode: 'public-read'
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `directoryUpload`

- Required: no
- Type: `DirectoryUpload`

Sync a local directory to this bucket on every deploy.

**Warning:** Replaces all existing bucket contents. Don't use for buckets
with user-uploaded or application-generated files.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
      cdn:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './dist'
    },
    cdn: {
      enabled: true
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `enableEventBusNotifications`

- Required: no
- Type: `boolean`
- Default: `false`

Send events (object created, deleted, etc.) to EventBridge for event-driven workflows.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      enableEventBusNotifications: true
      versioning: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    enableEventBusNotifications: true,
    versioning: true
  });
  return { resources: { myBucket } };
});
```

## Property: `encryption`

- Required: no
- Type: `boolean`

Encrypt stored objects at rest (AES-256).

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      encryption: true
      versioning: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    encryption: true,
    versioning: true
  });
  return { resources: { myBucket } };
});
```

## Property: `lifecycleRules`

- Required: no
- Type: `Array<expiration | non-current-version-expiration | class-transition | non-current-version-class-transition | abort-incomplete-multipart-upload>`

Auto-delete or move objects to cheaper storage classes over time.

Use to control storage costs: expire old files, archive infrequently accessed data,
or clean up incomplete uploads.

Choices:
- `expiration` (`Expiration`). Properties: `daysAfterUpload: number`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `non-current-version-expiration` (`NonCurrentVersionExpiration`). Properties: `daysAfterVersioned: number`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `class-transition` (`ClassTransition`). Properties: `daysAfterUpload: number`, `storageClass: string: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA"`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `non-current-version-class-transition` (`NonCurrentVersionClassTransition`). Properties: `daysAfterVersioned: number`, `storageClass: string: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA"`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `abort-incomplete-multipart-upload` (`AbortIncompleteMultipartUpload`). Properties: `daysAfterInitiation: number`, `prefix?: string`, `tags?: Array<KeyValuePair>`.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      lifecycleRules:
        - type: expiration
          properties:
            daysAfterUpload: 90
      versioning: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    lifecycleRules: [
      {
        type: 'expiration',
        properties: {
          daysAfterUpload: 90
        }
      }
    ],
    versioning: true
  });
  return { resources: { myBucket } };
});
```

## Property: `versioning`

- Required: no
- Type: `boolean`

Keep previous versions of overwritten/deleted objects. Helps recover from mistakes.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      versioning: true
      encryption: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    versioning: true,
    encryption: true
  });
  return { resources: { myBucket } };
});
```
