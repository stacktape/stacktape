# KeyValuePair API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
type KeyValuePair = {
  /** Key */
  key: string;
  /** Value */
  value: string;
};
```

## Property: `key`

- Required: yes
- Type: `string`

Key

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        fileOptions:
          - includePattern: 'assets/**'
            headers:
              - key: Cache-Control
                value: 'public, max-age=31536000, immutable'
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './dist',
      fileOptions: [
        {
          includePattern: 'assets/**',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable'
            }
          ]
        }
      ]
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `value`

- Required: yes
- Type: `string`

Value

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        fileOptions:
          - includePattern: 'assets/**'
            headers:
              - key: Cache-Control
                value: 'public, max-age=31536000, immutable'
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './dist',
      fileOptions: [
        {
          includePattern: 'assets/**',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable'
            }
          ]
        }
      ]
    }
  });
  return { resources: { assetsBucket } };
});
```
