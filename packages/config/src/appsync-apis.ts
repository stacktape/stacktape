import type { LogForwardingBase } from './log-forwarding';
import type { DomainConfiguration, ResourceOverrides } from './shared';

/**
 * #### Managed GraphQL API powered by AWS AppSync.
 *
 * ---
 *
 * Define the GraphQL schema and attach Lambda functions to fields with `appsync-api` events. Stacktape creates the
 * AppSync data sources, invocation roles, resolvers, logs, and dependencies for you.
 */
export interface AppSyncApi {
  type: 'appsync-api';
  properties: AppSyncApiProps;
  overrides?: ResourceOverrides;
}

export interface AppSyncApiProps {
  /**
   * #### Authentication required by every GraphQL request.
   *
   * ---
   *
   * Choose IAM for service-to-service APIs, a Stacktape user auth pool for application users, or an expiring API key
   * for deliberately public and short-lived access. AppSync APIs have one authentication mode in this version.
   */
  authentication: AppSyncApiAuthentication;
  /**
   * #### Path to the GraphQL schema.
   *
   * ---
   *
   * The path is relative to the Stacktape project directory. Stacktape checks the schema syntax and verifies every
   * configured Lambda resolver field before deployment.
   *
   * @default "schema.graphql"
   */
  schemaFilePath?: string;
  /**
   * #### Field-level AppSync logging.
   *
   * ---
   *
   * Errors are logged by default without request headers, variables, or full resolver context. Enable verbose content
   * only while diagnosing a problem because it can contain sensitive application data.
   */
  logging?: AppSyncApiLogging;
  /**
   * #### Maximum nested selection depth accepted by a GraphQL operation.
   *
   * Set to `0` only if you intentionally want no depth limit.
   *
   * @default 10
   */
  queryDepthLimit?: number;
  /**
   * #### Maximum number of resolvers a single GraphQL operation can execute.
   *
   * Set to `0` only if you intentionally want no resolver-count limit.
   *
   * @default 1000
   */
  resolverCountLimit?: number;
  /**
   * #### Allow clients and GraphQL tooling to inspect the schema.
   *
   * Disable this only when your security policy requires it; disabling introspection does not replace authorization.
   *
   * @default true
   */
  introspectionEnabled?: boolean;
  /**
   * #### Trace requests with AWS X-Ray.
   *
   * @default false
   */
  xrayEnabled?: boolean;
  /**
   * #### Optional custom domain for the GraphQL API.
   *
   * ---
   *
   * AppSync requires its ACM certificate in `us-east-1`, even when the API is deployed in another region. Stacktape
   * selects the correct managed certificate automatically. If you provide `customCertificateArn`, it must also be
   * from `us-east-1`.
   */
  customDomain?: DomainConfiguration;
}

export type AppSyncApiAuthentication =
  | {
      /** #### Authenticate AWS workloads with Signature Version 4. */
      type: 'aws-iam';
    }
  | {
      /** #### Authenticate application users with a Stacktape Cognito user auth pool. */
      type: 'user-auth-pool';
      properties: AppSyncUserAuthPoolAuthenticationProps;
    }
  | {
      /** #### Authenticate with a deliberately expiring AppSync API key. */
      type: 'api-key';
      properties: AppSyncApiKeyAuthenticationProps;
    };

export interface AppSyncUserAuthPoolAuthenticationProps {
  /** #### Name of the `user-auth-pool` resource that authenticates GraphQL requests. */
  userAuthPoolName: string;
}

export interface AppSyncApiKeyAuthenticationProps {
  /**
   * #### Fixed RFC 3339 timestamp when the API key expires.
   *
   * ---
   *
   * The timestamp must include a timezone and be between 1 and 365 days in the future when you deploy. AppSync rounds
   * expiration down to the hour. Stacktape never silently extends the key on later deployments, so changing this value
   * is an explicit security decision.
   *
   * **Example:** `2027-01-31T00:00:00Z`
   */
  expiresAt: string;
}

export interface AppSyncApiLogging extends LogForwardingBase {
  /**
   * #### Disable AppSync field logs.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Which resolver results AppSync writes to CloudWatch Logs.
   *
   * `error` is suitable for normal operation. `all` is useful temporarily while debugging and can generate much more
   * log data.
   *
   * @default "error"
   */
  fieldLogLevel?: 'error' | 'all';
  /**
   * #### Include request headers, variables, and full resolver context in logs.
   *
   * This content can contain credentials or personal data. Enable it only when you understand that exposure.
   *
   * @default false
   */
  includeVerboseContent?: boolean;
  /**
   * #### How many days to keep AppSync field logs.
   *
   * @default 30
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}
