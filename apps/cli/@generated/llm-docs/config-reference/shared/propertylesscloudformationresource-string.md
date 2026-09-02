# PropertylessCloudFormationResource<string> API Reference

## TypeScript definition

```typescript
type PropertylessCloudFormationResource<string> = {
  Type: string;
  Condition?: string;
  CreationPolicy?: unknown;
  DeletionPolicy?: "Delete" | "Retain" | "RetainExceptOnCreate" | "Snapshot";
  DependsOn?: PropertylessCloudFormationResource<string>DependsOn;
  Metadata?: unknown;
  UpdatePolicy?: unknown;
  UpdateReplacePolicy?: "Delete" | "Retain" | "Snapshot";
};

/** Union choices used by the properties above. */
type PropertylessCloudFormationResource<string>DependsOn =
  | "option-1"
  | "option-2";
```

## Property: `Type`

- Required: yes
- Type: `string`

## Property: `Condition`

- Required: no
- Type: `string`

## Property: `CreationPolicy`

- Required: no
- Type: `unknown`

## Property: `DeletionPolicy`

- Required: no
- Type: `string: "Delete" | "Retain" | "RetainExceptOnCreate" | "Snapshot"`

## Property: `DependsOn`

- Required: no
- Type: `option-1 | option-2`

Choices:
- `option-1`
- `option-2`

## Property: `Metadata`

- Required: no
- Type: `unknown`

## Property: `UpdatePolicy`

- Required: no
- Type: `unknown`

## Property: `UpdateReplacePolicy`

- Required: no
- Type: `string: "Delete" | "Retain" | "Snapshot"`
