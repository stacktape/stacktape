// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-keygroup.json

/**
 * A key group.
 * A key group contains a list of public keys that you can use with [CloudFront signed URLs and
 * signed
 * cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html).
 */
export type AwsCloudfrontKeygroup = {
  Id?: string;
  /** The key group configuration. */
  KeyGroupConfig: {
    /** A comment to describe the key group. The comment cannot be longer than 128 characters. */
    Comment?: string;
    /**
     * A list of the identifiers of the public keys in the key group.
     * @uniqueItems false
     */
    Items: string[];
    /** A name to identify the key group. */
    Name: string;
  };
  LastModifiedTime?: string;
};
