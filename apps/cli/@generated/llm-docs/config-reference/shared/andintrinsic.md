# AndIntrinsic API Reference

## TypeScript definition

```typescript
type AndIntrinsic = {
  "Fn::And": Array<AndIntrinsicFnAnd>;
};

/** Union choices used by the properties above. */
type AndIntrinsicFnAnd =
  | "option-1"
  | AndIntrinsic
  | "option-3"
  | "option-4"
  | "option-5";
```

## Property: `Fn::And`

- Required: yes
- Type: `Array<option-1 | AndIntrinsic | option-3 | option-4 | option-5>`

Choices:
- `option-1`. Properties: `Condition: string`.
- `AndIntrinsic` (`AndIntrinsic`). Properties: `Fn::And: Array<ConditionExpression>`.
- `option-3`. Properties: `Fn::Equals: Array<unknown>`.
- `option-4`. Properties: `Fn::Not: Array<unknown>`.
- `option-5`. Properties: `Fn::Or: Array<ConditionExpression>`.
