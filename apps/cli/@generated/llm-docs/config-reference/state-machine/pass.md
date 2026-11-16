# Pass API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type Pass = {
  Type: "Pass";
  Comment?: string;
  End?: true;
  InputPath?: string | null;
  Next?: string;
  OutputPath?: string | null;
  Parameters?: unknown;
  Result?: unknown;
  ResultPath?: string | null;
};
```

## Property: `Type`

- Required: yes
- Type: `string = "Pass"`

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

## Property: `Parameters`

- Required: no
- Type: `unknown`

## Property: `Result`

- Required: no
- Type: `unknown`

## Property: `ResultPath`

- Required: no
- Type: `string | null`
