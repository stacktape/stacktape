// This file is auto-generated. Do not edit manually.
// Source: aws-elasticloadbalancingv2-truststore.json

/** Resource Type definition for AWS::ElasticLoadBalancingV2::TrustStore */
export type AwsElasticloadbalancingv2Truststore = {
  /** The name of the trust store. */
  Name?: string;
  /** The name of the S3 bucket to fetch the CA certificate bundle from. */
  CaCertificatesBundleS3Bucket?: string;
  /** The name of the S3 object to fetch the CA certificate bundle from. */
  CaCertificatesBundleS3Key?: string;
  /** The version of the S3 bucket that contains the CA certificate bundle. */
  CaCertificatesBundleS3ObjectVersion?: string;
  /** The status of the trust store, could be either of ACTIVE or CREATING. */
  Status?: string;
  /** The number of certificates associated with the trust store. */
  NumberOfCaCertificates?: number;
  /**
   * The tags to assign to the trust store.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** The Amazon Resource Name (ARN) of the trust store. */
  TrustStoreArn?: string;
};
