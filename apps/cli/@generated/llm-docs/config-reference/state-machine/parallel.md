# Parallel API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { StpStateMachine } from 'stacktape';

type Parallel = {
  Branches: Array<StpStateMachine>;
  Type: string;
  Catch?: Array<unknown>;
  Comment?: string;
  End?: boolean;
  InputPath?: string;
  Next?: string;
  OutputPath?: string;
  ResultPath?: string;
  Retry?: Array<unknown>;
};
```

## Property: `Branches`

- Required: yes
- Type: `Array<StpStateMachine>`

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

## Property: `Next`

- Required: no
- Type: `string`

## Property: `OutputPath`

- Required: no
- Type: `string`

## Property: `ResultPath`

- Required: no
- Type: `string`

## Property: `Retry`

- Required: no
- Type: `Array<unknown>`
