// This file is auto-generated. Do not edit manually.
// Source: aws-ses-dedicatedippool.json

/** Resource Type definition for AWS::SES::DedicatedIpPool */
export type AwsSesDedicatedippool = {
  /**
   * The name of the dedicated IP pool.
   * @pattern ^[a-z0-9_-]{0,64}$
   */
  PoolName?: string;
  /**
   * Specifies whether the dedicated IP pool is managed or not. The default value is STANDARD.
   * @pattern ^(STANDARD|MANAGED)$
   */
  ScalingMode?: string;
  /**
   * The tags (keys and values) associated with the dedicated IP pool.
   * @minItems 0
   * @maxItems 50
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
};
