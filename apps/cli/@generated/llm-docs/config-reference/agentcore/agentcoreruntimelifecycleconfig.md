# AgentCoreRuntimeLifecycleConfig API Reference

## TypeScript definition

```typescript
type AgentCoreRuntimeLifecycleConfig = {
  /** How long an idle runtime session stays alive, in seconds. */
  idleTimeoutSeconds?: number;
  /** Longest time a runtime session can live, in seconds. */
  maxLifetimeSeconds?: number;
};
```

## Property: `idleTimeoutSeconds`

- Required: no
- Type: `number`

How long an idle runtime session stays alive, in seconds.

AWS ends a session that receives no request for this long. A shorter timeout lowers cost. When omitted, AWS uses
its default (15 minutes).

## Property: `maxLifetimeSeconds`

- Required: no
- Type: `number`

Longest time a runtime session can live, in seconds.

AWS ends the session after this time, even while it is active. When omitted, AWS uses its default (8 hours).
