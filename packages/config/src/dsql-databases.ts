import type { ResourceOverrides } from './shared';
import type { SupportedAWSRegion } from './aws-regions';

/**
 * #### Serverless PostgreSQL-compatible database powered by Amazon Aurora DSQL.
 *
 * ---
 *
 * DSQL has no instances or capacity settings to manage. It exposes a public, TLS-only endpoint and authenticates
 * every connection with a short-lived IAM token instead of a stored password.
 *
 * `connectTo` is the quickest way to start: it injects the connection details and grants the workload access as the
 * built-in `admin` database role. Use explicit resource parameters and your own scoped IAM statement after creating
 * application-specific database roles when you need least-privilege access.
 */
export interface DsqlDatabase {
  type: 'dsql-database';
  properties?: DsqlDatabaseProps;
  overrides?: ResourceOverrides;
}

export interface DsqlDatabaseProps {
  /**
   * #### Prevent the cluster from being deleted.
   *
   * ---
   *
   * Enable this for production data. You must disable it before intentionally removing the resource.
   *
   * DSQL does not create automatic backups, point-in-time recovery, or a final snapshot through this resource, so a
   * deletion can be irreversible unless you configured AWS Backup separately.
   *
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * #### ARN of a customer-managed KMS key used to encrypt the cluster.
   *
   * ---
   *
   * Omit this to use an AWS-owned key, which is the simplest choice for most applications. Supplying your own key
   * gives you control over its policy and lifecycle, and makes keeping that key available your responsibility.
   */
  kmsKeyArn?: string;
}

/** Regions where Aurora DSQL is available within Stacktape's supported AWS region catalog. */
export const AURORA_DSQL_REGIONS = [
  'us-east-2',
  'us-east-1',
  'us-west-2',
  'ap-east-1',
  'ap-south-1',
  'ap-northeast-3',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'sa-east-1'
] as const satisfies readonly SupportedAWSRegion[];

export type AuroraDsqlRegion = (typeof AURORA_DSQL_REGIONS)[number];
