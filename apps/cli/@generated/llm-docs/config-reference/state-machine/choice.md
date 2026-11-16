# Choice API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { Operator } from 'stacktape';

type Choice = {
  Choices: Array<Operator>;
  Type: "Choice";
  Comment?: string;
  Default?: string;
  End?: true;
  InputPath?: string | null;
  Next?: string;
  OutputPath?: string | null;
};
```

## Property: `Choices`

- Required: yes
- Type: `Array<Operator>`

## Property: `Type`

- Required: yes
- Type: `string = "Choice"`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `Default`

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
