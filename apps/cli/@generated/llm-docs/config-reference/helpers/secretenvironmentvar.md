# SecretEnvironmentVar API Reference

## TypeScript definition

```typescript
type SecretEnvironmentVar = {
  /** Environment variable name exposed to the container (e.g., `DATABASE_PASSWORD`, `API_KEY`). */
  name: string;
  /** Secret source injected by the container runtime.

Use an exact `$SsmParam(...)` or `$Secret(...)` directive. Unlike `environment`, Stacktape passes only the
parameter or secret ARN to the container orchestrator; the sensitive value is never stored in the task
definition. */
  valueFrom: string;
};
```

## Property: `name`

- Required: yes
- Type: `string`

Environment variable name exposed to the container (e.g., `DATABASE_PASSWORD`, `API_KEY`).

## Property: `valueFrom`

- Required: yes
- Type: `string`

Secret source injected by the container runtime.

Use an exact `$SsmParam(...)` or `$Secret(...)` directive. Unlike `environment`, Stacktape passes only the
parameter or secret ARN to the container orchestrator; the sensitive value is never stored in the task
definition.
