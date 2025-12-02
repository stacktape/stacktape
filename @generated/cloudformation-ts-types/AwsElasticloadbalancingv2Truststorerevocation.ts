// This file is auto-generated. Do not edit manually.
// Source: aws-elasticloadbalancingv2-truststorerevocation.json

/** Resource Type definition for AWS::ElasticLoadBalancingV2::TrustStoreRevocation */
export type AwsElasticloadbalancingv2Truststorerevocation = {
  /**
   * The attributes required to create a trust store revocation.
   * @uniqueItems true
   */
  RevocationContents?: {
    S3Bucket?: string;
    S3Key?: string;
    S3ObjectVersion?: string;
    RevocationType?: string;
  }[];
  /** The Amazon Resource Name (ARN) of the trust store. */
  TrustStoreArn?: string;
  /** The ID associated with the revocation. */
  RevocationId?: number;
  /**
   * The data associated with a trust store revocation
   * @uniqueItems true
   */
  TrustStoreRevocations?: {
    TrustStoreArn?: string;
    RevocationId?: string;
    RevocationType?: string;
    NumberOfRevokedEntries?: number;
  }[];
};
