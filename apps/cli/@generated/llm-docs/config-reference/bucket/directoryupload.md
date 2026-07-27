# DirectoryUpload API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { DirectoryUploadFilter } from 'stacktape';

type DirectoryUpload = {
  /** Path to the local directory to upload (relative to project root). */
  directoryPath: string;
  /** Disable faster uploads via S3 Transfer Acceleration. Saves a small per-GB cost. */
  disableS3TransferAcceleration?: boolean;
  /** Glob patterns for files to skip during upload (relative to directoryPath). */
  excludeFilesPatterns?: Array<string>;
  /** Set HTTP headers or tags on files matching specific patterns. */
  fileOptions?: Array<DirectoryUploadFilter>;
  /** Preset for HTTP caching headers, optimized for your frontend framework. */
  headersPreset?: "astro-static-website" | "gatsby-static-website" | "nuxt-static-website" | "single-page-app" | "static-website" | "sveltekit-static-website";
};
```

## Property: `directoryPath`

- Required: yes
- Type: `string`

Path to the local directory to upload (relative to project root).

The bucket will mirror this directory exactly — existing files not in the directory are deleted.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./build
      cdn:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './build'
    },
    cdn: {
      enabled: true
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `disableS3TransferAcceleration`

- Required: no
- Type: `boolean`
- Default: `false`

Disable faster uploads via S3 Transfer Acceleration. Saves a small per-GB cost.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        disableS3TransferAcceleration: true
      cdn:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './dist',
      disableS3TransferAcceleration: true
    },
    cdn: {
      enabled: true
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `excludeFilesPatterns`

- Required: no
- Type: `Array<string>`

Glob patterns for files to skip during upload (relative to `directoryPath`).

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        excludeFilesPatterns:
          - '**/*.map'
          - '.DS_Store'
      cdn:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './dist',
      excludeFilesPatterns: ['**/*.map', '.DS_Store']
    },
    cdn: {
      enabled: true
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `fileOptions`

- Required: no
- Type: `Array<DirectoryUploadFilter>`

Set HTTP headers or tags on files matching specific patterns.

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
      cdn:
        enabled: true
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
    },
    cdn: {
      enabled: true
    }
  });
  return { resources: { assetsBucket } };
});
```

## Property: `headersPreset`

- Required: no
- Type: `string: "astro-static-website" | "gatsby-static-website" | "nuxt-static-website" | "single-page-app" | "static-website" | "sveltekit-static-website"`

Preset for HTTP caching headers, optimized for your frontend framework.

**`single-page-app`**: HTML never cached, hashed assets cached forever. For React/Vue/Angular SPAs.
**`static-website`**: CDN-cached, never browser-cached. For generic static sites.
**`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**: Framework-specific
caching (hashed build assets cached forever, HTML always fresh).

Override individual files with `fileOptions`.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        headersPreset: single-page-app
      cdn:
        enabled: true
        rewriteRoutesForSinglePageApp: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({
    directoryUpload: {
      directoryPath: './dist',
      headersPreset: 'single-page-app'
    },
    cdn: {
      enabled: true,
      rewriteRoutesForSinglePageApp: true
    }
  });
  return { resources: { assetsBucket } };
});
```
