# EnvironmentVar API Reference

## TypeScript definition

```typescript
type EnvironmentVar = {
  /** Environment variable name (e.g., DATABASE_URL, API_KEY). */
  name: string;
  /** Environment variable value. Numbers and booleans are converted to strings. */
  value: string | number | boolean;
};
```

## Property: `name`

- Required: yes
- Type: `string`

Environment variable name (e.g., `DATABASE_URL`, `API_KEY`).

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      environment:
        - name: NODE_ENV
          value: production
        - name: MAX_CONNECTIONS
          value: 50
        - name: STRIPE_KEY
          value: $Secret('stripe.secret-key')
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    environment: {
      NODE_ENV: 'production',
      MAX_CONNECTIONS: 50,
      STRIPE_KEY: $Secret('stripe.secret-key')
    }
  });

  return { resources: { api } };
});
```

## Property: `value`

- Required: yes
- Type: `string | number | boolean`

Environment variable value. Numbers and booleans are converted to strings.
