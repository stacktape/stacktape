# SsrWebDevConfig API Reference

Dev server configuration shared by all SSR web resources

## TypeScript definition

```typescript
type SsrWebDevConfig = {
  /** Override the default dev server command (e.g., npm run dev). */
  command?: string;
  /** Working directory for the dev command, relative to project root. */
  workingDirectory?: string;
};
```

## Property: `command`

- Required: no
- Type: `string`

Override the default dev server command (e.g., `npm run dev`).

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      dev:
        command: npm run dev
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    dev: {
      command: 'npm run dev'
    }
  });

  return { resources: { webApp } };
});
```

## Property: `workingDirectory`

- Required: no
- Type: `string`

Working directory for the dev command, relative to project root.

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: packages/web
      dev:
        command: npm run dev
        workingDirectory: packages/web
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: 'packages/web',
    dev: {
      command: 'npm run dev',
      workingDirectory: 'packages/web'
    }
  });

  return { resources: { webApp } };
});
```
