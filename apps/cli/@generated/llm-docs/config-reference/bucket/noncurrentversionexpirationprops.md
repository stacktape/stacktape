# NonCurrentVersionExpirationProps API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { KeyValuePair } from 'stacktape';

type NonCurrentVersionExpirationProps = {
  /** Delete old versions this many days after they become non-current. Requires versioning: true. */
  daysAfterVersioned: number;
  /** Only apply this rule to objects with this key prefix (e.g., logs/, uploads/). */
  prefix?: string;
  /** Only apply this rule to objects with these tags. */
  tags?: Array<KeyValuePair>;
};
```

## Property: `daysAfterVersioned`

- Required: yes
- Type: `number`

Delete old versions this many days after they become non-current. Requires `versioning: true`.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      versioning: true
      lifecycleRules:
        - type: non-current-version-expiration
          properties:
            daysAfterVersioned: 30
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    versioning: true,
    lifecycleRules: [
      {
        type: 'non-current-version-expiration',
        properties: {
          daysAfterVersioned: 30
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
