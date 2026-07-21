# EventInputTransformer API Reference

## TypeScript definition

```typescript
type EventInputTransformer = {
  /** A template for constructing a new event payload. */
  inputTemplate: unknown;
  /** A map of key-value pairs to extract from the event payload. */
  inputPathsMap?: unknown;
};
```

## Property: `inputTemplate`

- Required: yes
- Type: `unknown`

A template for constructing a new event payload.

Use placeholders (``) to insert the values extracted with `inputPathsMap`.

## Property: `inputPathsMap`

- Required: no
- Type: `unknown`

A map of key-value pairs to extract from the event payload.

Each value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.
