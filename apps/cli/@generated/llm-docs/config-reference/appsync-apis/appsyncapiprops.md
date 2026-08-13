# AppSyncApiProps API Reference

## TypeScript definition

```typescript
import type { AppSyncApiLogging, DomainConfiguration } from 'stacktape';

type AppSyncApiProps = {
  /** Authentication required by every GraphQL request. */
  authentication: AppSyncApiAuthentication;
  /** Optional custom domain for the GraphQL API. */
  customDomain?: DomainConfiguration;
  /** Allow clients and GraphQL tooling to inspect the schema.

Disable this only when your security policy requires it; disabling introspection does not replace authorization. */
  introspectionEnabled?: boolean;
  /** Field-level AppSync logging. */
  logging?: AppSyncApiLogging;
  /** Maximum nested selection depth accepted by a GraphQL operation.

Set to `0` only if you intentionally want no depth limit. */
  queryDepthLimit?: number;
  /** Maximum number of resolvers a single GraphQL operation can execute.

Set to `0` only if you intentionally want no resolver-count limit. */
  resolverCountLimit?: number;
  /** Path to the GraphQL schema. */
  schemaFilePath?: string;
  /** Trace requests with AWS X-Ray. */
  xrayEnabled?: boolean;
};

/** Union choices used by the properties above. */
type AppSyncApiAuthentication =
  | "aws-iam"
  | "user-auth-pool"
  | "api-key";
```

## Property: `authentication`

- Required: yes
- Type: `aws-iam | user-auth-pool | api-key`

Authentication required by every GraphQL request.

Choose IAM for service-to-service APIs, a Stacktape user auth pool for application users, or an expiring API key
for deliberately public and short-lived access. AppSync APIs have one authentication mode in this version.

Choices:
- `aws-iam`
- `user-auth-pool`. Properties: `userAuthPoolName: string`.
- `api-key`. Properties: `expiresAt: string`.

## Property: `customDomain`

- Required: no
- Type: `DomainConfiguration`

Optional custom domain for the GraphQL API.

AppSync requires its ACM certificate in `us-east-1`, even when the API is deployed in another region. Stacktape
selects the correct managed certificate automatically. If you provide `customCertificateArn`, it must also be
from `us-east-1`.

## Property: `introspectionEnabled`

- Required: no
- Type: `boolean`
- Default: `true`

Allow clients and GraphQL tooling to inspect the schema.

Disable this only when your security policy requires it; disabling introspection does not replace authorization.

## Property: `logging`

- Required: no
- Type: `AppSyncApiLogging`

Field-level AppSync logging.

Errors are logged by default without request headers, variables, or full resolver context. Enable verbose content
only while diagnosing a problem because it can contain sensitive application data.

## Property: `queryDepthLimit`

- Required: no
- Type: `number`
- Default: `10`

Maximum nested selection depth accepted by a GraphQL operation.

Set to `0` only if you intentionally want no depth limit.

## Property: `resolverCountLimit`

- Required: no
- Type: `number`
- Default: `1000`

Maximum number of resolvers a single GraphQL operation can execute.

Set to `0` only if you intentionally want no resolver-count limit.

## Property: `schemaFilePath`

- Required: no
- Type: `string`
- Default: `schema.graphql`

Path to the GraphQL schema.

The path is relative to the Stacktape project directory. Stacktape checks the schema syntax and verifies every
configured Lambda resolver field before deployment.

## Property: `xrayEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Trace requests with AWS X-Ray.
