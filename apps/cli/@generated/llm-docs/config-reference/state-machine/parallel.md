# Parallel API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { StateMachineBranch } from 'stacktape';

type Parallel = {
  /** The workflows that run in parallel. Each is a native Amazon States Language branch. */
  Branches: Array<StateMachineBranch>;
  Type: "Parallel";
  Catch?: Array<unknown>;
  Comment?: string;
  End?: true;
  InputPath?: string | null;
  Next?: string;
  OutputPath?: string | null;
  ResultPath?: string | null;
  Retry?: Array<unknown>;
};
```

## Property: `Branches`

- Required: yes
- Type: `Array<StateMachineBranch>`

The workflows that run in parallel. Each is a native Amazon States Language branch.

## Property: `Type`

- Required: yes
- Type: `string = "Parallel"`

## Property: `Catch`

- Required: no
- Type: `Array<unknown>`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `End`

- Required: no
- Type: `boolean = true`

## Property: `InputPath`

- Required: no
- Type: `string | null`

## Property: `Next`

- Required: no
- Type: `string`

## Property: `OutputPath`

- Required: no
- Type: `string | null`

## Property: `ResultPath`

- Required: no
- Type: `string | null`

## Property: `Retry`

- Required: no
- Type: `Array<unknown>`
