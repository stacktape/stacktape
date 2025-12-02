// This file is auto-generated. Do not edit manually.
// Source: aws-cassandra-type.json

/** Resource schema for AWS::Cassandra::Type */
export type AwsCassandraType = {
  /** Name of the Keyspace which contains the User-Defined Type. */
  KeyspaceName: string;
  /** Name of the User-Defined Type. */
  TypeName: string;
  /**
   * Field definitions of the User-Defined Type
   * @uniqueItems true
   */
  Fields: {
    FieldName: string;
    FieldType: string;
  }[];
  /**
   * List of Tables that directly reference the User-Defined Type in their columns.
   * @uniqueItems true
   */
  DirectReferringTables?: string[];
  /**
   * List of parent User-Defined Types that directly reference the User-Defined Type in their fields.
   * @uniqueItems true
   */
  DirectParentTypes?: string[];
  /** Maximum nesting depth of the User-Defined Type across the field types. */
  MaxNestingDepth?: number;
  /** Timestamp of the last time the User-Defined Type's meta data was modified. */
  LastModifiedTimestamp?: number;
  /** ARN of the Keyspace which contains the User-Defined Type. */
  KeyspaceArn?: string;
};
