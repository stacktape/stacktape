# BodyContainsAssertionProps API Reference

## TypeScript definition

```typescript
type BodyContainsAssertionProps = {
  /** Text that must appear in the response body. */
  value: string;
};
```

## Property: `value`

- Required: yes
- Type: `string`

Text that must appear in the response body.

Matched against the first 512 KB of the response. Requires the `GET` method.
