# AstroWebDevConfig API Reference

Resource type: `astro-web`

## TypeScript definition

```typescript
type AstroWebDevConfig = {
  /** Override the default astro dev command (e.g., npm run dev). */
  command?: string;
  /** Working directory for the dev command, relative to project root. */
  workingDirectory?: string;
};
```

## Property: `command`

- Required: no
- Type: `string`

Override the default `astro dev` command (e.g., `npm run dev`).

### Example 1 (yaml)

```yaml
resources:
  web:
    type: astro-web
    properties:
      dev:
        command: npm run dev
```

### Example 2 (typescript)

```typescript
import { AstroWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new AstroWeb({
    dev: {
      command: 'npm run dev'
    }
  });
  return { resources: { web } };
});
```

## Property: `workingDirectory`

- Required: no
- Type: `string`

Working directory for the dev command, relative to project root.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: astro-web
    properties:
      dev:
        command: astro dev
        workingDirectory: packages/storefront
```

### Example 2 (typescript)

```typescript
import { AstroWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new AstroWeb({
    dev: {
      command: 'astro dev',
      workingDirectory: 'packages/storefront'
    }
  });
  return { resources: { web } };
});
```
