// This file is auto-generated. Do not edit manually.
// Source: aws-docdbelastic-cluster.json

/**
 * The AWS::DocDBElastic::Cluster Amazon DocumentDB (with MongoDB compatibility) Elastic Scale
 * resource describes a Cluster
 */
export type AwsDocdbelasticCluster = {
  /**
   * @minLength 1
   * @maxLength 50
   * @pattern [a-zA-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*
   */
  ClusterName: string;
  ClusterArn?: string;
  ClusterEndpoint?: string;
  AdminUserName: string;
  AdminUserPassword?: string;
  ShardCapacity: number;
  ShardCount: number;
  /** @uniqueItems false */
  VpcSecurityGroupIds?: string[];
  /** @uniqueItems false */
  SubnetIds?: string[];
  PreferredMaintenanceWindow?: string;
  PreferredBackupWindow?: string;
  BackupRetentionPeriod?: number;
  ShardInstanceCount?: number;
  KmsKeyId?: string;
  /**
   * @minItems 0
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
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  AuthType: string;
};
