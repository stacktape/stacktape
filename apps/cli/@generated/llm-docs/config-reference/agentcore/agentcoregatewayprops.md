# AgentCoreGatewayProps API Reference

## TypeScript definition

```typescript
import type { AgentCoreGatewayJwtAuthorizer, AgentCoreGatewayNoAuthorizer, AgentCoreGatewayTool, CloudformationTag } from 'stacktape';

type AgentCoreGatewayProps = {
  /** Who can call the gateway's tools. */
  authorizer: AgentCoreGatewayAuthorizer;
  description?: string;
  exceptionLevel?: "DEBUG";
  instructions?: string;
  searchType?: "SEMANTIC";
  supportedVersions?: Array<string>;
  tags?: Array<CloudformationTag>;
  tools?: Array<AgentCoreGatewayTool>;
};

/** Union choices used by the properties above. */
type AgentCoreGatewayAuthorizer =
  | AgentCoreGatewayJwtAuthorizer
  | AgentCoreGatewayNoAuthorizer;
```

## Property: `authorizer`

- Required: yes
- Type: `jwt | none`

Who can call the gateway's tools.

Required, because the gateway exposes every configured tool to its callers.

`jwt`: callers must send a JSON Web Token issued by your identity provider.
`none`: anyone who can reach the gateway endpoint can call its tools. Use it only for tools that are safe to
expose publicly.

Choices:
- `jwt` (`AgentCoreGatewayJwtAuthorizer`) — Require a JSON Web Token from your identity provider on every gateway call.. Properties: `discoveryUrl: string`, `allowedAudience?: Array<string>`, `allowedClients?: Array<string>`, `allowedScopes?: Array<string>`.
- `none` (`AgentCoreGatewayNoAuthorizer`) — Allow unauthenticated calls to the gateway's tools.

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
- Type: `string = "SEMANTIC"`

## Property: `supportedVersions`

- Required: no
- Type: `Array<string>`

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`

## Property: `tools`

- Required: no
- Type: `Array<AgentCoreGatewayTool>`
