# ConvexFunctionsDeploymentConfig API Reference

## TypeScript definition

```typescript
type ConvexFunctionsDeploymentConfig = {
  /** Custom command to deploy Convex functions. */
  command?: string;
  /** Whether Stacktape should deploy Convex functions after infrastructure deploy. */
  enabled?: boolean;
  /** Working directory for the deploy command. */
  workingDirectory?: string;
};
```

## Property: `command`

- Required: no
- Type: `string`

Custom command to deploy Convex functions.

Stacktape injects `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` into the command
environment. If omitted, Stacktape runs:

`npx convex deploy --codegen disable --typecheck try`

Examples: `pnpm convex deploy --codegen disable`, `bunx convex deploy --typecheck disable`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      functionsDeployment:
        command: bunx convex deploy --typecheck disable
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    functionsDeployment: {
      command: 'bunx convex deploy --typecheck disable'
    }
  });
  return { resources: { backend } };
});
```

## Property: `enabled`

- Required: no
- Type: `boolean`
- Default: `true`

Whether Stacktape should deploy Convex functions after infrastructure deploy.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      functionsDeployment:
        enabled: false
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    functionsDeployment: {
      enabled: false
    }
  });
  return { resources: { backend } };
});
```

## Property: `workingDirectory`

- Required: no
- Type: `string`

Working directory for the deploy command.

Defaults to the project directory containing `appDirectory` when `appDirectory` points at a
`convex/` folder.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./packages/api/convex
      functionsDeployment:
        workingDirectory: ./packages/api
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './packages/api/convex',
    functionsDeployment: {
      workingDirectory: './packages/api'
    }
  });
  return { resources: { backend } };
});
```
