// This file is auto-generated. Do not edit manually.
// Source: aws-cassandra-table.json

/** Resource schema for AWS::Cassandra::Table */
export type AwsCassandraTable = {
  /**
   * Name for Cassandra keyspace
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_]{1,47}$
   */
  KeyspaceName: string;
  /**
   * Name for Cassandra table
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_]{1,47}$
   */
  TableName?: string;
  /**
   * Non-key columns of the table
   * @uniqueItems true
   */
  RegularColumns?: {
    /** @pattern ^[a-zA-Z0-9][a-zA-Z0-9_]{1,47}$ */
    ColumnName: string;
    ColumnType: string;
  }[];
  /**
   * Partition key columns of the table
   * @minItems 1
   * @uniqueItems true
   */
  PartitionKeyColumns: {
    /** @pattern ^[a-zA-Z0-9][a-zA-Z0-9_]{1,47}$ */
    ColumnName: string;
    ColumnType: string;
  }[];
  /**
   * Clustering key columns of the table
   * @uniqueItems true
   */
  ClusteringKeyColumns?: ({
    Column: {
      /** @pattern ^[a-zA-Z0-9][a-zA-Z0-9_]{1,47}$ */
      ColumnName: string;
      ColumnType: string;
    };
    /**
     * @default "ASC"
     * @enum ["ASC","DESC"]
     */
    OrderBy?: "ASC" | "DESC";
  })[];
  BillingMode?: {
    Mode: "PROVISIONED" | "ON_DEMAND";
    ProvisionedThroughput?: {
      /** @minimum 1 */
      ReadCapacityUnits: number;
      /** @minimum 1 */
      WriteCapacityUnits: number;
    };
  };
  /** Indicates whether point in time recovery is enabled (true) or disabled (false) on the table */
  PointInTimeRecoveryEnabled?: boolean;
  /**
   * Indicates whether client side timestamps are enabled (true) or disabled (false) on the table. False
   * by default, once it is enabled it cannot be disabled again.
   */
  ClientSideTimestampsEnabled?: boolean;
  /**
   * An array of key-value pairs to apply to this resource
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * Default TTL (Time To Live) in seconds, where zero is disabled. If the value is greater than zero,
   * TTL is enabled for the entire table and an expiration timestamp is added to each column.
   * @minimum 0
   */
  DefaultTimeToLive?: number;
  EncryptionSpecification?: {
    EncryptionType: "AWS_OWNED_KMS_KEY" | "CUSTOMER_MANAGED_KMS_KEY";
    KmsKeyIdentifier?: string;
  };
  AutoScalingSpecifications?: {
    WriteCapacityAutoScaling?: {
      /** @default false */
      AutoScalingDisabled?: boolean;
      /** @minimum 1 */
      MinimumUnits?: number;
      /** @minimum 1 */
      MaximumUnits?: number;
      ScalingPolicy?: {
        TargetTrackingScalingPolicyConfiguration?: {
          /** @default "false" */
          DisableScaleIn?: boolean;
          /** @default 0 */
          ScaleInCooldown?: number;
          /** @default 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
        };
      };
    };
    ReadCapacityAutoScaling?: {
      /** @default false */
      AutoScalingDisabled?: boolean;
      /** @minimum 1 */
      MinimumUnits?: number;
      /** @minimum 1 */
      MaximumUnits?: number;
      ScalingPolicy?: {
        TargetTrackingScalingPolicyConfiguration?: {
          /** @default "false" */
          DisableScaleIn?: boolean;
          /** @default 0 */
          ScaleInCooldown?: number;
          /** @default 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
        };
      };
    };
  };
  CdcSpecification?: {
    Status: "ENABLED" | "DISABLED";
    ViewType?: "NEW_IMAGE" | "OLD_IMAGE" | "KEYS_ONLY" | "NEW_AND_OLD_IMAGES";
    /**
     * An array of key-value pairs to apply to the CDC stream resource
     * @minItems 0
     * @maxItems 50
     * @uniqueItems true
     */
    Tags?: {
      /**
       * @minLength 1
       * @maxLength 128
       */
      Key: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      Value: string;
    }[];
  };
  /**
   * @minItems 1
   * @uniqueItems true
   */
  ReplicaSpecifications?: {
    /**
     * @minLength 2
     * @maxLength 25
     */
    Region: string;
    ReadCapacityUnits?: number;
    ReadCapacityAutoScaling?: {
      /** @default false */
      AutoScalingDisabled?: boolean;
      /** @minimum 1 */
      MinimumUnits?: number;
      /** @minimum 1 */
      MaximumUnits?: number;
      ScalingPolicy?: {
        TargetTrackingScalingPolicyConfiguration?: {
          /** @default "false" */
          DisableScaleIn?: boolean;
          /** @default 0 */
          ScaleInCooldown?: number;
          /** @default 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
        };
      };
    };
  }[];
  WarmThroughput?: {
    /** @minimum 1 */
    ReadUnitsPerSecond?: number;
    /** @minimum 1 */
    WriteUnitsPerSecond?: number;
  };
};
