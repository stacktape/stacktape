// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-truststore.json

/**
 * Resource Type definition for AWS::CloudFront::TrustStore. TrustStores contain CA certificates for
 * mTLS authentication and can be associated with CloudFront distributions.
 */
export type AwsCloudfrontTruststore = {
  /** The unique identifier for the trust store */
  Id?: string;
  /** A unique name to identify the trust store */
  Name: string;
  /**
   * The Amazon Resource Name (ARN) of the trust store
   * @pattern ^arn:aws:cloudfront::[0-9]{12}:trust-store/[A-Za-z0-9_]+$
   */
  Arn?: string;
  CaCertificatesBundleSource?: {
    CaCertificatesBundleS3Location: {
      /** The S3 bucket containing the CA certificates bundle PEM file */
      Bucket: string;
      /** The S3 object key of the CA certificates bundle PEM file */
      Key: string;
      /** The S3 bucket region */
      Region: string;
      /** The S3 object version of the CA certificates bundle PEM file */
      Version?: string;
    };
  };
  /**
   * Current status of the trust store
   * @enum ["PENDING","ACTIVE","FAILED"]
   */
  Status?: "PENDING" | "ACTIVE" | "FAILED";
  ETag?: string;
  /** The last modification timestamp of the trust store PEM file */
  LastModifiedTime?: string;
  /** The number of CA certificates in the trust store PEM file */
  NumberOfCaCertificates?: number;
  /** Key-value pairs for resource tagging */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9 _.:/=+\-@]{1,128}\Z
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9 _.:/=+\-@]{0,256}\Z
     */
    Value: string;
  }[];
};
