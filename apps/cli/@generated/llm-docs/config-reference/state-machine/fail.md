# Fail API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type Fail = {
  Type: "Fail";
  Cause?: string;
  Comment?: string;
  Error?: string;
  InputPath?: string | null;
  OutputPath?: string | null;
};
```

## Property: `Type`

- Required: yes
- Type: `string = "Fail"`

## Property: `Cause`

- Required: no
- Type: `string`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `Error`

- Required: no
- Type: `string`

## Property: `InputPath`

- Required: no
- Type: `string | null`

## Property: `OutputPath`

- Required: no
- Type: `string | null`
