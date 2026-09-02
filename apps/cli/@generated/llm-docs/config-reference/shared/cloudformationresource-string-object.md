# CloudFormationResource<string,object> API Reference

## TypeScript definition

```typescript
type CloudFormationResource<string,object> = {
  Properties: unknown;
  Type: string;
  Condition?: string;
  CreationPolicy?: unknown;
  DeletionPolicy?: "Delete" | "Retain" | "RetainExceptOnCreate" | "Snapshot";
  DependsOn?: CloudFormationResource<string,object>DependsOn;
  Metadata?: unknown;
  UpdatePolicy?: unknown;
  UpdateReplacePolicy?: "Delete" | "Retain" | "Snapshot";
};

/** Union choices used by the properties above. */
type CloudFormationResource<string,object>DependsOn =
  | "option-1"
  | "option-2";
```

## Property: `Properties`

- Required: yes
- Type: `unknown`

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
