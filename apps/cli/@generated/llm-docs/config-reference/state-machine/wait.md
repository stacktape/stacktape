# Wait API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type Wait = {
  Type: "Wait";
  Comment?: string;
  End?: true;
  InputPath?: string | null;
  Next?: string;
  OutputPath?: string | null;
  Seconds?: number;
  SecondsPath?: string | null;
  Timestamp?: string;
  TimestampPath?: string | null;
};
```

## Property: `Type`

- Required: yes
- Type: `string = "Wait"`

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

## Property: `Seconds`

- Required: no
- Type: `number`

## Property: `SecondsPath`

- Required: no
- Type: `string | null`

## Property: `Timestamp`

- Required: no
- Type: `string`

## Property: `TimestampPath`

- Required: no
- Type: `string | null`
