// This file is auto-generated. Do not edit manually.
// Source: aws-dms-replicationconfig.json

/**
 * A replication configuration that you later provide to configure and start a AWS DMS Serverless
 * replication
 */
export type AwsDmsReplicationconfig = {
  /** A unique identifier of replication configuration */
  ReplicationConfigIdentifier: string;
  /** The Amazon Resource Name (ARN) of the Replication Config */
  ReplicationConfigArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the source endpoint for this AWS DMS Serverless replication
   * configuration
   */
  SourceEndpointArn: string;
  /**
   * The Amazon Resource Name (ARN) of the target endpoint for this AWS DMS Serverless replication
   * configuration
   */
  TargetEndpointArn: string;
  /**
   * The type of AWS DMS Serverless replication to provision using this replication configuration
   * @enum ["full-load","full-load-and-cdc","cdc"]
   */
  ReplicationType: "full-load" | "full-load-and-cdc" | "cdc";
  ComputeConfig: {
    AvailabilityZone?: string;
    DnsNameServers?: string;
    KmsKeyId?: string;
    MaxCapacityUnits: number;
    MinCapacityUnits?: number;
    MultiAZ?: boolean;
    PreferredMaintenanceWindow?: string;
    ReplicationSubnetGroupId?: string;
    VpcSecurityGroupIds?: string[];
  };
  /**
   * JSON settings for Servereless replications that are provisioned using this replication
   * configuration
   */
  ReplicationSettings?: Record<string, unknown>;
  /** JSON settings for specifying supplemental data */
  SupplementalSettings?: Record<string, unknown>;
  /**
   * A unique value or name that you get set for a given resource that can be used to construct an
   * Amazon Resource Name (ARN) for that resource
   */
  ResourceIdentifier?: string;
  /**
   * JSON table mappings for AWS DMS Serverless replications that are provisioned using this replication
   * configuration
   */
  TableMappings: Record<string, unknown>;
  /**
   * <p>Contains a map of the key-value pairs for the resource tag or tags assigned to the dataset.</p>
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
