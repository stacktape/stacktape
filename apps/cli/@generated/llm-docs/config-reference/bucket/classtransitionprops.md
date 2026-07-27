# ClassTransitionProps API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { KeyValuePair } from 'stacktape';

type ClassTransitionProps = {
  /** Move objects to a cheaper storage class this many days after upload. */
  daysAfterUpload: number;
  /** Target storage class. Cheaper classes have higher retrieval costs/latency. */
  storageClass: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
  /** Only apply this rule to objects with this key prefix (e.g., logs/, uploads/). */
  prefix?: string;
  /** Only apply this rule to objects with these tags. */
  tags?: Array<KeyValuePair>;
};
```

## Property: `daysAfterUpload`

- Required: yes
- Type: `number`

Move objects to a cheaper storage class this many days after upload.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      lifecycleRules:
        - type: class-transition
          properties:
            prefix: archive/
            daysAfterUpload: 90
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
          prefix: 'archive/',
          daysAfterUpload: 90,
          storageClass: 'GLACIER'
        }
      }
    ]
  });
  return { resources: { myBucket } };
});
```

## Property: `storageClass`

- Required: yes
- Type: `string: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA"`

Target storage class. Cheaper classes have higher retrieval costs/latency.

`STANDARD_IA` / `ONEZONE_IA`: Infrequent access, instant retrieval.
`INTELLIGENT_TIERING`: AWS auto-moves between tiers based on access patterns.
`GLACIER`: Archive, minutes to hours for retrieval.
`DEEP_ARCHIVE`: Cheapest, 12+ hours for retrieval.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      lifecycleRules:
        - type: class-transition
          properties:
            prefix: cold/
            daysAfterUpload: 180
            storageClass: DEEP_ARCHIVE
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
          prefix: 'cold/',
          daysAfterUpload: 180,
          storageClass: 'DEEP_ARCHIVE'
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
