/**
 * #### Serverless NoSQL database with single-digit millisecond reads/writes at any scale.
 *
 * ---
 *
 * No servers to manage, no capacity planning needed (in on-demand mode). Pay per read/write.
 * Great for user profiles, session data, IoT data, and any key-value or document workload.
 */
interface DynamoDbTable {
  type: 'dynamo-db-table';
  properties: DynamoDbTableProps;
  overrides?: ResourceOverrides;
}

type StpDynamoTable = DynamoDbTable['properties'] & {
  name: string;
  type: DynamoDbTable['type'];
  configParentResourceType: DynamoDbTable['type'] | NextjsWeb['type'];
  nameChain: string[];
};

interface DynamoDbTableProps {
  /**
   * #### The primary key that uniquely identifies each item.
   *
   * ---
   *
   * - **Simple key**: Just a `partitionKey` (e.g., `userId`).
   * - **Composite key**: `partitionKey` + `sortKey` (e.g., `userId` + `createdAt`).
   *
   * > **Cannot be changed after creation.** Every item must include the primary key attribute(s).
   */
  primaryKey: DynamoDbTablePrimaryKey;
  /**
   * #### Fixed-capacity mode with predictable pricing. Omit for on-demand (pay-per-request) mode.
   *
   * ---
   *
   * - **On-demand** (default, no config): Pay per read/write. Best for unpredictable or variable traffic.
   * - **Provisioned**: Set fixed read/write capacity. Cheaper at steady, predictable load. Can auto-scale.
   */
  provisionedThroughput?: DynamoDbProvisionedThroughput;
  /**
   * #### Enable continuous backups with point-in-time recovery (restore to any second in the last 35 days).
   *
   * ---
   *
   * Restores always create a new table. Adds ~20% to storage cost.
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### Stream item changes to trigger functions or batch jobs in real time.
   *
   * ---
   *
   * - `KEYS_ONLY`: Only key attributes of the changed item.
   * - `NEW_IMAGE`: The full item after the change.
   * - `OLD_IMAGE`: The full item before the change.
   * - `NEW_AND_OLD_IMAGES`: Both before and after — useful for change tracking and auditing.
   */
  streamType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
  /**
   * #### Additional indexes for querying by attributes other than the primary key.
   *
   * ---
   *
   * Without indexes, you can only query by primary key. Add a secondary index to query by
   * any attribute (e.g., query orders by `status` or users by `email`).
   */
  secondaryIndexes?: DynamoDbTableGlobalSecondaryIndex[];
  /**
   * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed table.
   */
  dev?: DevModeConfig;
}

interface DynamoDbTablePrimaryKey {
  /**
   * #### The main key attribute (e.g., `userId`, `orderId`). Must be unique if no sort key is used.
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Optional second key for composite keys. Enables range queries and multiple items per partition key.
   *
   * ---
   *
   * E.g., partition key `userId` + sort key `createdAt` lets you query all items for a user sorted by date.
   */
  sortKey?: DynamoDbAttribute;
}

interface DynamoDbTableGlobalSecondaryIndex {
  /**
   * #### Name of the index (used when querying).
   */
  name: string;
  /**
   * #### Partition key for this index — the attribute you'll query by.
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Optional sort key for range queries within a partition.
   */
  sortKey?: DynamoDbAttribute;
  /**
   * #### Extra attributes to copy into the index. Only projected attributes are available when querying.
   *
   * ---
   *
   * The table's primary key is always projected. List additional attributes you need in query results.
   */
  projections?: string[];
}

interface DynamoDbAttribute {
  /**
   * #### Attribute name (e.g., `userId`, `email`, `createdAt`).
   */
  name: string;
  /**
   * #### Attribute data type: `string`, `number`, or `binary`.
   */
  type: 'string' | 'number' | 'binary';
}

interface DynamoDbProvisionedThroughput {
  /**
   * #### Read capacity units per second. 1 unit = one 4 KB strongly consistent read (or two eventually consistent).
   *
   * ---
   *
   * Requests exceeding this limit get throttled. Use `readScaling` to auto-adjust.
   */
  readUnits: number;
  /**
   * #### Write capacity units per second. 1 unit = one 1 KB write.
   *
   * ---
   *
   * Requests exceeding this limit get throttled. Use `writeScaling` to auto-adjust.
   */
  writeUnits: number;
  /**
   * #### Auto-scale write capacity based on actual usage. Scales up/down between min and max units.
   */
  writeScaling?: DynamoDbWriteScaling;
  /**
   * #### Auto-scale read capacity based on actual usage. Scales up/down between min and max units.
   */
  readScaling?: DynamoDbReadScaling;
}

interface DynamoDbWriteScaling {
  /**
   * #### Minimum write units. Capacity never scales below this.
   */
  minUnits: number;
  /**
   * #### Maximum write units. Capacity never scales above this.
   */
  maxUnits: number;
  /**
   * #### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.
   */
  keepUtilizationUnder: number;
}

interface DynamoDbReadScaling {
  /**
   * #### Minimum read units. Capacity never scales below this.
   */
  minUnits: number;
  /**
   * #### Maximum read units. Capacity never scales above this.
   */
  maxUnits: number;
  /**
   * #### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.
   */
  keepUtilizationUnder: number;
}

type DynamoDBTableReferencableParam = 'name' | 'arn' | 'streamArn';
