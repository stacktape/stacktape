// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-publickey.json

/**
 * A public key that you can use with [signed URLs and signed
 * cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html),
 * or with [field-level
 * encryption](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html).
 * CloudFront supports signed URLs and signed cookies with RSA 2048 or ECDSA 256 key signatures.
 * Field-level encryption is only compatible with RSA 2048 key signatures.
 */
export type AwsCloudfrontPublickey = {
  CreatedTime?: string;
  Id?: string;
  /**
   * Configuration information about a public key that you can use with [signed URLs and signed
   * cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html),
   * or with [field-level
   * encryption](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html).
   */
  PublicKeyConfig: {
    /** A string included in the request to help make sure that the request can't be replayed. */
    CallerReference: string;
    /** A comment to describe the public key. The comment cannot be longer than 128 characters. */
    Comment?: string;
    /**
     * The public key that you can use with [signed URLs and signed
     * cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html),
     * or with [field-level
     * encryption](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html).
     */
    EncodedKey: string;
    /** A name to help identify the public key. */
    Name: string;
  };
};
