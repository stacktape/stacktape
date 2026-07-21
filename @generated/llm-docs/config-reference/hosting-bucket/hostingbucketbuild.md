# HostingBucketBuild API Reference

Resource type: `hosting-bucket`

## TypeScript definition

```typescript
type HostingBucketBuild = {
  /** Command to run (e.g., npm run build, vite build, npm run dev). */
  command: string;
  /** Working directory for the command (relative to project root). */
  workingDirectory?: string;
};
```

## Property: `command`

- Required: yes
- Type: `string`

Command to run (e.g., `npm run build`, `vite build`, `npm run dev`).

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
        workingDirectory: .
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: {
      command: 'npm run build',
      workingDirectory: '.'
    }
  });
  return { resources: { frontend } };
});
```

## Property: `workingDirectory`

- Required: no
- Type: `string`
- Default: `.`

Working directory for the command (relative to project root).

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./apps/web/dist
      hostingContentType: single-page-app
      build:
        command: npm run build
        workingDirectory: ./apps/web
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './apps/web/dist',
    hostingContentType: 'single-page-app',
    build: {
      command: 'npm run build',
      workingDirectory: './apps/web'
    }
  });
  return { resources: { frontend } };
});
```
