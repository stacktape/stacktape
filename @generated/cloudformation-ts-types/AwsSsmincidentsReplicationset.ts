// This file is auto-generated. Do not edit manually.
// Source: aws-ssmincidents-replicationset.json

/** Resource type definition for AWS::SSMIncidents::ReplicationSet */
export type AwsSsmincidentsReplicationset = {
  /** The ARN of the ReplicationSet. */
  Arn?: string;
  /** The ReplicationSet configuration. */
  Regions: {
    RegionName?: string;
    RegionConfiguration?: {
      /**
       * The AWS Key Management Service key ID or Key Alias to use to encrypt your replication set.
       * @maxLength 2048
       */
      SseKmsKeyId: string;
    };
  }[];
  /** @default false */
  DeletionProtected?: boolean;
  /**
   * The tags to apply to the replication set.
   * @default []
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
