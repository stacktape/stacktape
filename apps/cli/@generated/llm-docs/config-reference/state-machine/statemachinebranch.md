# StateMachineBranch API Reference

A nested workflow: a `Parallel` branch or the workflow a `Map` state runs for each item.

Resource type: `state-machine`

## TypeScript definition

```typescript
type StateMachineBranch = {
  StartAt: string;
  States: unknown;
  Comment?: string;
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
