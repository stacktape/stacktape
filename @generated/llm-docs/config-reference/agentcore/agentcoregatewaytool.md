# AgentCoreGatewayTool API Reference

## TypeScript definition

```typescript
import type { AgentCoreToolDefinition } from 'stacktape';

type AgentCoreGatewayTool = {
  name: string;
  toolSchema: Array<AgentCoreToolDefinition>;
  description?: string;
  function?: string;
  lambdaArn?: string;
};
```

## Property: `name`

- Required: yes
- Type: `string`

## Property: `toolSchema`

- Required: yes
- Type: `Array<AgentCoreToolDefinition>`

## Property: `description`

- Required: no
- Type: `string`

## Property: `function`

- Required: no
- Type: `string`

## Property: `lambdaArn`

- Required: no
- Type: `string`
