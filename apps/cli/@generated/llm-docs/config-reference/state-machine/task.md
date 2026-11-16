# Task API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type Task = {
  Resource: TaskResource;
  Type: "Task";
  Catch?: Array<unknown>;
  Comment?: string;
  End?: true;
  HeartbeatSeconds?: number;
  InputPath?: string | null;
  Next?: string;
  OutputPath?: string | null;
  Parameters?: unknown;
  ResultPath?: string | null;
  Retry?: Array<unknown>;
  TimeoutSeconds?: number;
};

/** Union choices used by the properties above. */
type TaskResource =
  | "option-1"
  | "option-2";
```

## Property: `Resource`

- Required: yes
- Type: `option-1 | option-2`

Choices:
- `option-1`
- `option-2`

## Property: `Type`

- Required: yes
- Type: `string = "Task"`

## Property: `Catch`

- Required: no
- Type: `Array<unknown>`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `End`

- Required: no
- Type: `boolean = true`

## Property: `HeartbeatSeconds`

- Required: no
- Type: `number`

## Property: `InputPath`

- Required: no
- Type: `string | null`

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

## Property: `TimeoutSeconds`

- Required: no
- Type: `number`
