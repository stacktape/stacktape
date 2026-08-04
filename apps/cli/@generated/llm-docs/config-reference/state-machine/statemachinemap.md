# StateMachineMap API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { StpStateMachine } from 'stacktape';

type StateMachineMap = {
  Iterator: StpStateMachine;
  Type: string;
  Catch?: Array<unknown>;
  Comment?: string;
  End?: boolean;
  InputPath?: string;
  ItemsPath?: string;
  MaxConcurrency?: number;
  Next?: string;
  OutputPath?: string;
  Parameters?: unknown;
  ResultPath?: string;
  Retry?: Array<unknown>;
};
```

## Property: `Iterator`

- Required: yes
- Type: `StpStateMachine`

## Property: `Type`

- Required: yes
- Type: `string`

## Property: `Catch`

- Required: no
- Type: `Array<unknown>`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `End`

- Required: no
- Type: `boolean`

## Property: `InputPath`

- Required: no
- Type: `string`

## Property: `ItemsPath`

- Required: no
- Type: `string`

## Property: `MaxConcurrency`

- Required: no
- Type: `number`

## Property: `Next`

- Required: no
- Type: `string`

## Property: `OutputPath`

- Required: no
- Type: `string`

## Property: `Parameters`

- Required: no
- Type: `unknown`

## Property: `ResultPath`

- Required: no
- Type: `string`

## Property: `Retry`

- Required: no
- Type: `Array<unknown>`
