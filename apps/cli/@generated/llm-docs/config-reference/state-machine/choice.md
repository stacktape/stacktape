# Choice API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { Operator } from 'stacktape';

type Choice = {
  Choices: Array<Operator>;
  Type: string;
  Comment?: string;
  Default?: string;
  End?: boolean;
  InputPath?: string;
  Next?: string;
  OutputPath?: string;
};
```

## Property: `Choices`

- Required: yes
- Type: `Array<Operator>`

## Property: `Type`

- Required: yes
- Type: `string`

## Property: `Comment`

- Required: no
- Type: `string`

## Property: `Default`

- Required: no
- Type: `string`

## Property: `End`

- Required: no
- Type: `boolean`

## Property: `InputPath`

- Required: no
- Type: `string`

## Property: `Next`

- Required: no
- Type: `string`

## Property: `OutputPath`

- Required: no
- Type: `string`
