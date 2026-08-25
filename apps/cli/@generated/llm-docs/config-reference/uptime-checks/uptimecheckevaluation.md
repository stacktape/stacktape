# UptimeCheckEvaluation API Reference

## TypeScript definition

```typescript
type UptimeCheckEvaluation = {
  /** How many consecutive failed evaluations mark the check as down. */
  consecutiveFailures?: number;
  /** How many consecutive successful evaluations mark a down check as recovered. */
  consecutiveSuccesses?: number;
};
```

## Property: `consecutiveFailures`

- Required: no
- Type: `number`
- Default: `2`

How many consecutive failed evaluations mark the check as down.

Allowed range: 1 to 10.

## Property: `consecutiveSuccesses`

- Required: no
- Type: `number`
- Default: `2`

How many consecutive successful evaluations mark a down check as recovered.

Allowed range: 1 to 10.
