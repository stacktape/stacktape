# Operator API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type Operator = {
  And?: Array<Operator>;
  BooleanEquals?: boolean;
  Next?: string;
  Not?: Operator;
  NumericEquals?: number;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThan?: number;
  NumericLessThanEquals?: number;
  Or?: Array<Operator>;
  StringEquals?: string;
  StringGreaterThan?: string;
  StringGreaterThanEquals?: string;
  StringLessThan?: string;
  StringLessThanEquals?: string;
  TimestampEquals?: string;
  TimestampGreaterThan?: string;
  TimestampGreaterThanEquals?: string;
  TimestampLessThan?: string;
  TimestampLessThanEquals?: string;
  Variable?: string;
};
```

## Property: `And`

- Required: no
- Type: `Array<Operator>`

## Property: `BooleanEquals`

- Required: no
- Type: `boolean`

## Property: `Next`

- Required: no
- Type: `string`

## Property: `Not`

- Required: no
- Type: `Operator`

## Property: `NumericEquals`

- Required: no
- Type: `number`

## Property: `NumericGreaterThan`

- Required: no
- Type: `number`

## Property: `NumericGreaterThanEquals`

- Required: no
- Type: `number`

## Property: `NumericLessThan`

- Required: no
- Type: `number`

## Property: `NumericLessThanEquals`

- Required: no
- Type: `number`

## Property: `Or`

- Required: no
- Type: `Array<Operator>`

## Property: `StringEquals`

- Required: no
- Type: `string`

## Property: `StringGreaterThan`

- Required: no
- Type: `string`

## Property: `StringGreaterThanEquals`

- Required: no
- Type: `string`

## Property: `StringLessThan`

- Required: no
- Type: `string`

## Property: `StringLessThanEquals`

- Required: no
- Type: `string`

## Property: `TimestampEquals`

- Required: no
- Type: `string`

## Property: `TimestampGreaterThan`

- Required: no
- Type: `string`

## Property: `TimestampGreaterThanEquals`

- Required: no
- Type: `string`

## Property: `TimestampLessThan`

- Required: no
- Type: `string`

## Property: `TimestampLessThanEquals`

- Required: no
- Type: `string`

## Property: `Variable`

- Required: no
- Type: `string`
