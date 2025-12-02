/**
 * #### DynamoDB Table
 *
 * ---
 *
 * A fully managed, serverless, and highly available key-value and document database that delivers single-digit millisecond performance at any scale.
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
   * #### Configures the primary key for the table.
   *
   * ---
   *
   * The primary key uniquely identifies each item in the table. Two types of primary keys are supported:
   *
   * - **Simple primary key**: Composed of one attribute, the `partitionKey`.
   * - **Composite primary key**: Composed of two attributes, the `partitionKey` and the `sortKey`.
   *
   * The primary key cannot be modified after the table is created, and each item in the table must include the primary key attribute(s).
   *
   * For more details, see the [AWS documentation on primary keys](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey).
   */
  primaryKey: DynamoDbTablePrimaryKey;
  /**
   * #### Configures the read and write throughput capabilities of the table.
   *
   * ---
   *
   * - **Provisioned mode**: If you specify `provisionedThroughput`, you must set the read and write capacity for your table. This can provide cost predictability but may not handle unpredictable loads.
   * - **On-demand mode**: If `provisionedThroughput` is not configured, the table runs in on-demand mode, and you pay only for what you use.
   *
   * For more details on the differences between these modes, see the [AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html).
   */
  provisionedThroughput?: DynamoDbProvisionedThroughput;
  /**
   * #### Enables continuous backups with point-in-time recovery.
   *
   * ---
   *
   * Point-in-time recovery allows you to restore a table to any point in time within the last 35 days.
   * The recovery process always restores the data to a new table.
   *
   * Enabling this feature may result in additional charges. For more details, see the [AWS DynamoDB pricing page](https://aws.amazon.com/dynamodb/pricing/on-demand/#DynamoDB_detailed_feature_pricing).
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### Enables streaming of item changes and configures the stream type.
   *
   * ---
   *
   * The stream type determines what information is written to the stream when an item in the table is modified.
   * Streams can be consumed by [functions](https://docs.stacktape.com/compute-resources/lambda-functions/#dynamo-db-stream-event) and [batch jobs](https://docs.stacktape.com/compute-resources/batch-jobs/#dynamo-db-event).
   *
   * Allowed values are:
   * - `KEYS_ONLY`: Only the key attributes of the modified item are written to the stream.
   * - `NEW_IMAGE`: The entire item, as it appears after it was modified, is written to the stream.
   * - `OLD_IMAGE`: The entire item, as it appeared before it was modified, is written to the stream.
   * - `NEW_AND_OLD_IMAGES`: Both the new and old images of the item are written to the stream.
   */
  streamType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
  /**
   * #### A list of global secondary indexes for this table.
   *
   * ---
   *
   * By default, you can only query items in a DynamoDB table based on primary key attributes.
   * Global secondary indexes allow you to perform queries using a variety of different attributes.
   *
   * For more details, see the [AWS documentation on secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html).
   */
  secondaryIndexes?: DynamoDbTableGlobalSecondaryIndex[];
}

interface DynamoDbTablePrimaryKey {
  /**
   * #### Specifies the partition key for the table.
   *
   * ---
   *
   * If a table has only a `partitionKey` and no `sortKey`, no two items can have the same partition key.
   * DynamoDB uses the partition key's value as input to an internal hash function, which determines the partition (physical storage) where the item is stored.
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Specifies the sort key for the table.
   *
   * ---
   *
   * Using a `sortKey` provides additional flexibility when querying data.
   * In a table with a `partitionKey` and a `sortKey`, multiple items can have the same partition key, but they must have different sort key values.
   * All items with the same partition key are stored together, sorted by the sort key value.
   */
  sortKey?: DynamoDbAttribute;
}

interface DynamoDbTableGlobalSecondaryIndex {
  /**
   * #### The name of the index.
   */
  name: string;
  /**
   * #### Specifies the partition key for the index.
   *
   * ---
   *
   * DynamoDB uses the partition key's value as input to an internal hash function, which determines the partition where the item is stored.
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Specifies the sort key for the index.
   *
   * ---
   *
   * Using a `sortKey` provides additional flexibility when querying data.
   * In an index with a `partitionKey` and a `sortKey`, multiple items can have the same partition key, but they must have different sort key values.
   */
  sortKey?: DynamoDbAttribute;
  /**
   * #### A list of attributes that are copied from the table into the global secondary index.
   *
   * ---
   *
   * When querying a secondary index, you can only access attributes that are projected into it.
   * By default, the table's primary key (partition key and sort key) is projected into the index.
   */
  projections?: string[];
}

interface DynamoDbAttribute {
  /**
   * #### The name of the attribute that will be used as a key.
   */
  name: string;
  /**
   * #### The type of the attribute that will be used as a key.
   */
  type: 'string' | 'number' | 'binary';
}

interface DynamoDbProvisionedThroughput {
  /**
   * #### The number of read units available per second.
   *
   * ---
   *
   * Each read unit represents either:
   * - One strongly consistent read
   * - Two eventually consistent reads
   *
   * This applies to items up to 4 KB in size. Reading larger items will consume additional read capacity units.
   * If you exceed the provisioned read capacity, you will receive a `ThrottlingException`.
   */
  readUnits: number;
  /**
   * #### The number of write units available per second.
   *
   * ---
   *
   * One write unit represents one write per second for an item up to 1 KB in size.
   * Writing larger items will consume additional write capacity units.
   * If you exceed the provisioned write capacity, you will receive a `ThrottlingException`.
   */
  writeUnits: number;
  /**
   * #### Auto-scaling configuration for write units.
   *
   * ---
   *
   * Even in provisioned mode, you can configure throughput to scale based on load.
   * The table throughput scales up or down once the specified thresholds are met.
   *
   * For more details, see [this detailed AWS article](https://aws.amazon.com/blogs/database/amazon-dynamodb-auto-scaling-performance-and-cost-optimization-at-any-scale/).
   */
  writeScaling?: DynamoDbWriteScaling;
  /**
   * #### Auto-scaling configuration for read units.
   *
   * ---
   *
   * Even in provisioned mode, you can configure throughput to scale based on load.
   * The table throughput scales up or down once the specified thresholds are met.
   *
   * For more details, see [this detailed AWS article](https://aws.amazon.com/blogs/database/amazon-dynamodb-auto-scaling-performance-and-cost-optimization-at-any-scale/).
   */
  readScaling?: DynamoDbReadScaling;
}

interface DynamoDbWriteScaling {
  /**
   * #### The minimum number of provisioned write units per second.
   *
   * ---
   *
   * The available write units will never scale down below this threshold.
   */
  minUnits: number;
  /**
   * #### The maximum number of provisioned write units per second that the table can scale up to.
   *
   * ---
   *
   * The available write units will never scale up above this threshold.
   */
  maxUnits: number;
  /**
   * #### The target utilization percentage for scaling.
   *
   * ---
   *
   * If the table's consumed write capacity exceeds (or falls below) your target utilization for a sustained period, the provisioned capacity will be increased (or decreased).
   */
  keepUtilizationUnder: number;
}

interface DynamoDbReadScaling {
  /**
   * #### The minimum number of provisioned read units per second.
   *
   * ---
   *
   * The available read units will never scale down below this threshold.
   */
  minUnits: number;
  /**
   * #### The maximum number of provisioned read units per second that the table can scale up to.
   *
   * ---
   *
   * The available read units will never scale up above this threshold.
   */
  maxUnits: number;
  /**
   * #### The target utilization percentage for scaling.
   *
   * ---
   *
   * If the table's consumed read capacity exceeds (or falls below) your target utilization for a sustained period, the provisioned capacity will be increased (or decreased).
   */
  keepUtilizationUnder: number;
}

type DynamoDBTableReferencableParam = 'name' | 'arn' | 'streamArn';
