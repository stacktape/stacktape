// This file is auto-generated. Do not edit manually.
// Source: aws-redshiftserverless-snapshot.json

/** Resource Type definition for AWS::RedshiftServerless::Snapshot Resource Type. */
export type AwsRedshiftserverlessSnapshot = {
  /**
   * The name of the snapshot.
   * @minLength 3
   * @maxLength 64
   * @pattern ^(?=^[a-z0-9-]+$).{3,64}$
   */
  SnapshotName: string;
  /**
   * The namespace the snapshot is associated with.
   * @minLength 3
   * @maxLength 64
   * @pattern ^(?=^[a-z0-9-]+$).{3,64}$
   */
  NamespaceName?: string;
  /** The owner account of the snapshot. */
  OwnerAccount?: string;
  /** The retention period of the snapshot. */
  RetentionPeriod?: number;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Definition for snapshot resource */
  Snapshot?: {
    NamespaceArn?: string;
    /**
     * @minLength 3
     * @maxLength 64
     * @pattern ^[a-z0-9-]+$
     */
    NamespaceName?: string;
    /**
     * @minLength 3
     * @maxLength 64
     * @pattern ^[a-z0-9-]+$
     */
    SnapshotName?: string;
    SnapshotCreateTime?: string;
    Status?: "AVAILABLE" | "CREATING" | "DELETED" | "CANCELLED" | "FAILED" | "COPYING";
    AdminUsername?: string;
    KmsKeyId?: string;
    OwnerAccount?: string;
    RetentionPeriod?: number;
    SnapshotArn?: string;
  };
};
