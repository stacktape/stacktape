// This file is auto-generated. Do not edit manually.
// Source: aws-elasticache-subnetgroup.json

/** Resource Type definition for AWS::ElastiCache::SubnetGroup */
export type AwsElasticacheSubnetgroup = {
  /** The description for the cache subnet group. */
  Description: string;
  /**
   * The EC2 subnet IDs for the cache subnet group.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /** The name for the cache subnet group. This value is stored as a lowercase string. */
  CacheSubnetGroupName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
