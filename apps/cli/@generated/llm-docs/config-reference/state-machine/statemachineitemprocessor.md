# StateMachineItemProcessor API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type StateMachineItemProcessor = {
  StartAt: string;
  States: unknown;
  Comment?: string;
  /** How the `Map` state runs its items: `INLINE`, or `DISTRIBUTED` with an `ExecutionType`. */
  ProcessorConfig?: unknown;
};
```

## Property: `StartAt`

- Required: yes
- Type: `string`

## Property: `States`

- Required: yes
- Type: `unknown`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `ProcessorConfig`

- Required: no
- Type: `unknown`

How the `Map` state runs its items: `INLINE`, or `DISTRIBUTED` with an `ExecutionType`.
