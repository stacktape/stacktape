// This file is auto-generated. Do not edit manually.
// Source: aws-elasticache-parametergroup.json

/** Resource Type definition for AWS::ElastiCache::ParameterGroup */
export type AwsElasticacheParametergroup = {
  /** The description for this cache parameter group. */
  Description: string;
  /**
   * A comma-delimited list of parameter name/value pairs. For more information see
   * ModifyCacheParameterGroup in the Amazon ElastiCache API Reference Guide.
   */
  Properties?: Record<string, string>;
  /**
   * Tags are composed of a Key/Value pair. You can use tags to categorize and track each parameter
   * group. The tag value null is permitted.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The name of the Cache Parameter Group. */
  CacheParameterGroupName?: string;
  /** The name of the cache parameter group family that this cache parameter group is compatible with. */
  CacheParameterGroupFamily: string;
};
