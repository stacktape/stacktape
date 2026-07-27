# AgentCoreGatewayProps API Reference

## TypeScript definition

```typescript
import type { AgentCoreGatewayTool, AgentCoreJwtAuthorizerConfig, CloudformationTag } from 'stacktape';

type AgentCoreGatewayProps = {
  authorizer?: AgentCoreJwtAuthorizerConfig;
  description?: string;
  exceptionLevel?: "DEBUG";
  instructions?: string;
  searchType?: string;
  supportedVersions?: Array<string>;
  tags?: Array<CloudformationTag>;
  tools?: Array<AgentCoreGatewayTool>;
};
```

## Property: `authorizer`

- Required: no
- Type: `AgentCoreJwtAuthorizerConfig`

## Property: `description`

- Required: no
- Type: `string`

## Property: `exceptionLevel`

- Required: no
- Type: `string = "DEBUG"`

## Property: `instructions`

- Required: no
- Type: `string`

## Property: `searchType`

- Required: no
- Type: `string`

## Property: `supportedVersions`

- Required: no
- Type: `Array<string>`

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`

## Property: `tools`

- Required: no
- Type: `Array<AgentCoreGatewayTool>`
