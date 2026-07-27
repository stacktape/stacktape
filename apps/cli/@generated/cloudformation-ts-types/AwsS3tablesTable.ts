// This file is auto-generated. Do not edit manually.
// Source: aws-s3tables-table.json

/** Resource Type definition for AWS::S3Tables::Table */
export type AwsS3tablesTable = {
  WithoutMetadata?: "Yes";
  Compaction?: {
    /**
     * Indicates whether the Compaction maintenance action is enabled.
     * @enum ["enabled","disabled"]
     */
    Status?: "enabled" | "disabled";
    /**
     * The target file size for the table in MB.
     * @minimum 64
     */
    TargetFileSizeMB?: number;
  };
  Namespace: string;
  TableName: string;
  TableBucketARN: string;
  VersionToken?: string;
  TableARN?: string;
  OpenTableFormat: "ICEBERG";
  IcebergMetadata?: {
    IcebergSchema: {
      SchemaFieldList: {
        /** The field type */
        Type: string;
        /** A Boolean value that specifies whether values are required for each row in this field */
        Required?: boolean;
        /** The name of the field */
        Name: string;
      }[];
    };
  };
  WarehouseLocation?: string;
  SnapshotManagement?: {
    /**
     * Indicates whether the SnapshotManagement maintenance action is enabled.
     * @enum ["enabled","disabled"]
     */
    Status?: "enabled" | "disabled";
    /**
     * The minimum number of snapshots to keep.
     * @minimum 1
     */
    MinSnapshotsToKeep?: number;
    /**
     * The maximum age of a snapshot before it can be expired.
     * @minimum 1
     */
    MaxSnapshotAgeHours?: number;
  };
  /**
   * User tags (key-value pairs) to associate with the table.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * Tag value must be between 0 to 256 characters in length. Tag value can only contain alphanumeric
     * characters, spaces, _, ., /, =, +, -, and @.
     * @maxLength 256
     */
    Value: string;
    /**
     * Tag key must be between 1 to 128 characters in length. Tag key cannot start with 'aws:' and can
     * only contain alphanumeric characters, spaces, _, ., /, =, +, -, and @.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
