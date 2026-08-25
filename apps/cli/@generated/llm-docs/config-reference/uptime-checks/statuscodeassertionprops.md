# StatusCodeAssertionProps API Reference

## TypeScript definition

```typescript
type StatusCodeAssertionProps = {
  /** HTTP status codes counted as successful. */
  accepted: Array<number>;
};
```

## Property: `accepted`

- Required: yes
- Type: `Array<number>`

HTTP status codes counted as successful.

The response status must exactly match one of the listed codes.
