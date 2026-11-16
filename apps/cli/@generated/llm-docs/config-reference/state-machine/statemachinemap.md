# StateMachineMap API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { StateMachineBranch, StateMachineItemProcessor } from 'stacktape';

type StateMachineMap = {
  Type: "Map";
  Catch?: Array<unknown>;
  Comment?: string;
  End?: true;
  InputPath?: string | null;
  /** The workflow that runs for each item. */
  ItemProcessor?: StateMachineItemProcessor;
  ItemsPath?: string | null;
  /** The workflow that runs for each item (the older name for `ItemProcessor`). */
  Iterator?: StateMachineBranch;
  MaxConcurrency?: number;
  Next?: string;
  OutputPath?: string | null;
  Parameters?: unknown;
  ResultPath?: string | null;
  Retry?: Array<unknown>;
};
```

## Property: `Type`

- Required: yes
- Type: `string = "Map"`

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

## Property: `ItemProcessor`

- Required: no
- Type: `StateMachineItemProcessor`

The workflow that runs for each item.

## Property: `ItemsPath`

- Required: no
- Type: `string | null`

## Property: `Iterator`

- Required: no
- Type: `StateMachineBranch`

The workflow that runs for each item (the older name for `ItemProcessor`).

## Property: `MaxConcurrency`

- Required: no
- Type: `number`

## Property: `Next`

- Required: no
- Type: `string`

## Property: `OutputPath`

- Required: no
- Type: `string | null`

## Property: `Parameters`

- Required: no
- Type: `unknown`

## Property: `ResultPath`

- Required: no
- Type: `string | null`

## Property: `Retry`

- Required: no
- Type: `Array<unknown>`
