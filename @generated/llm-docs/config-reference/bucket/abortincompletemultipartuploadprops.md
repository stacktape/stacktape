# AbortIncompleteMultipartUploadProps API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { KeyValuePair } from 'stacktape';

type AbortIncompleteMultipartUploadProps = {
  /** Clean up incomplete multipart uploads after this many days. Prevents storage waste. */
  daysAfterInitiation: number;
  /** Only apply this rule to objects with this key prefix (e.g., logs/, uploads/). */
  prefix?: string;
  /** Only apply this rule to objects with these tags. */
  tags?: Array<KeyValuePair>;
};
```

## Property: `daysAfterInitiation`

- Required: yes
- Type: `number`

Clean up incomplete multipart uploads after this many days. Prevents storage waste.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      lifecycleRules:
        - type: abort-incomplete-multipart-upload
          properties:
            daysAfterInitiation: 7
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    lifecycleRules: [
      {
        type: 'abort-incomplete-multipart-upload',
        properties: {
          daysAfterInitiation: 7
        }
      }
    ]
  });
  return { resources: { myBucket } };
});
```

## Property: `prefix`

- Required: no
- Type: `string`

Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      lifecycleRules:
        - type: expiration
          properties:
            prefix: logs/
            daysAfterUpload: 30
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
          prefix: 'logs/',
          daysAfterUpload: 30
        }
      }
    ]
  });
  return { resources: { myBucket } };
});
```

## Property: `tags`

- Required: no
- Type: `Array<KeyValuePair>`

Only apply this rule to objects with these tags.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      lifecycleRules:
        - type: class-transition
          properties:
            tags:
              - key: tier
                value: archive
            daysAfterUpload: 60
            storageClass: GLACIER
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    lifecycleRules: [
      {
        type: 'class-transition',
        properties: {
          tags: [{ key: 'tier', value: 'archive' }],
          daysAfterUpload: 60,
          storageClass: 'GLACIER'
        }
      }
    ]
  });
  return { resources: { myBucket } };
});
```
