# AgentCoreMemoryProps API Reference

## TypeScript definition

```typescript
import type { CloudformationTag } from 'stacktape';

type AgentCoreMemoryProps = {
  description?: string;
  encryptionKeyArn?: string;
  eventExpiryDuration?: number;
  expirationDays?: number;
  memoryStrategies?: Array<unknown>;
  tags?: Array<CloudformationTag>;
};
```

## Property: `description`

- Required: no
- Type: `string`

## Property: `encryptionKeyArn`

- Required: no
- Type: `string`

## Property: `eventExpiryDuration`

- Required: no
- Type: `number`

## Property: `expirationDays`

- Required: no
- Type: `number`

## Property: `memoryStrategies`

- Required: no
- Type: `Array<unknown>`

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`
