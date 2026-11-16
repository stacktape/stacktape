# AgentCoreMemoryProps API Reference

## TypeScript definition

```typescript
import type { CloudformationTag } from 'stacktape';

type AgentCoreMemoryProps = {
  description?: string;
  encryptionKeyArn?: string;
  /** How many days AgentCore keeps raw memory events. */
  eventRetentionDays?: number;
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

## Property: `eventRetentionDays`

- Required: no
- Type: `number`
- Default: `30`

How many days AgentCore keeps raw memory events.

Events older than this are deleted. AWS accepts 7 to 365 days.

## Property: `memoryStrategies`

- Required: no
- Type: `Array<unknown>`

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`
