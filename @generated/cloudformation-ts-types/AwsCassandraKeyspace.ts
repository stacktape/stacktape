// This file is auto-generated. Do not edit manually.
// Source: aws-cassandra-keyspace.json

/** Resource schema for AWS::Cassandra::Keyspace */
export type AwsCassandraKeyspace = {
  /**
   * Name for Cassandra keyspace
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_]{1,47}$
   */
  KeyspaceName?: string;
  /**
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
  ReplicationSpecification?: {
    /** @enum ["SINGLE_REGION","MULTI_REGION"] */
    ReplicationStrategy?: "SINGLE_REGION" | "MULTI_REGION";
    RegionList?: ("af-south-1" | "ap-east-1" | "ap-northeast-1" | "ap-northeast-2" | "ap-south-1" | "ap-southeast-1" | "ap-southeast-2" | "ca-central-1" | "eu-central-1" | "eu-north-1" | "eu-west-1" | "eu-west-2" | "eu-west-3" | "me-central-1" | "me-south-1" | "sa-east-1" | "us-east-1" | "us-east-2" | "us-west-1" | "us-west-2")[];
  };
  /**
   * Indicates whether client-side timestamps are enabled (true) or disabled (false) for all tables in
   * the keyspace. To add a Region to a single-Region keyspace with at least one table, the value must
   * be set to true. After you enabled client-side timestamps for a table, you can’t disable it again.
   */
  ClientSideTimestampsEnabled?: boolean;
};
