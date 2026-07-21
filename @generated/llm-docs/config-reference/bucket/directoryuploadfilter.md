# DirectoryUploadFilter API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { KeyValuePair } from 'stacktape';

type DirectoryUploadFilter = {
  /** Glob pattern for files this rule applies to (e.g., *.html, assets/**). */
  includePattern: string;
  /** Glob pattern for files to exclude even if they match includePattern. */
  excludePattern?: string;
  /** HTTP headers (e.g., Cache-Control) for matching files. Forwarded through CDN to the browser. */
  headers?: Array<KeyValuePair>;
  /** Tags for matching files. Can be used to target files with lifecycleRules. */
  tags?: Array<KeyValuePair>;
};
```

## Property: `includePattern`

- Required: yes
- Type: `string`

Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`).

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        fileOptions:
          - includePattern: '*.html'
            headers:
              - key: Cache-Control
                value: no-cache
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
          includePattern: '*.html',
          headers: [{ key: 'Cache-Control', value: 'no-cache' }]
        }
      ]
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `excludePattern`

- Required: no
- Type: `string`

Glob pattern for files to exclude even if they match `includePattern`.

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
            excludePattern: 'assets/uncompressed/**'
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
          excludePattern: 'assets/uncompressed/**',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
        }
      ]
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `headers`

- Required: no
- Type: `Array<KeyValuePair>`

HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.

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
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
        }
      ]
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `tags`

- Required: no
- Type: `Array<KeyValuePair>`

Tags for matching files. Can be used to target files with `lifecycleRules`.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        fileOptions:
          - includePattern: 'reports/**'
            tags:
              - key: category
                value: report
      lifecycleRules:
        - type: expiration
          properties:
            tags:
              - key: category
                value: report
            daysAfterUpload: 30
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
          includePattern: 'reports/**',
          tags: [{ key: 'category', value: 'report' }]
        }
      ]
    },
    lifecycleRules: [
      {
        type: 'expiration',
        properties: {
          tags: [{ key: 'category', value: 'report' }],
          daysAfterUpload: 30
        }
      }
    ]
  });
  return { resources: { assetsBucket } };
});
```
