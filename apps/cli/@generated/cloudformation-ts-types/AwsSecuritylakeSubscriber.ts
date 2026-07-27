// This file is auto-generated. Do not edit manually.
// Source: aws-securitylake-subscriber.json

/** Resource Type definition for AWS::SecurityLake::Subscriber */
export type AwsSecuritylakeSubscriber = {
  AccessTypes: ("LAKEFORMATION" | "S3")[];
  /**
   * The ARN for the data lake.
   * @minLength 1
   * @maxLength 256
   */
  DataLakeArn: string;
  /** The AWS identity used to access your data. */
  SubscriberIdentity: {
    /**
     * The external ID used to establish trust relationship with the AWS identity.
     * @minLength 2
     * @maxLength 1224
     * @pattern ^[\w+=,.@:/-]*$
     */
    ExternalId: string;
    /**
     * The AWS identity principal.
     * @pattern ^([0-9]{12}|[a-z0-9\.\-]*\.(amazonaws|amazon)\.com)$
     */
    Principal: string;
  };
  /**
   * The name of your Security Lake subscriber account.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\\\w\s\-_:/,.@=+]*$
   */
  SubscriberName: string;
  /** The description for your subscriber account in Security Lake. */
  SubscriberDescription?: string;
  /**
   * An array of objects, one for each tag to associate with the subscriber. For each tag, you must
   * specify both a tag key and a tag value. A tag value cannot be null, but it can be an empty string.
   */
  Tags?: {
    /**
     * The name of the tag. This is a general label that acts as a category for a more specific tag value
     * (value).
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value that is associated with the specified tag key (key). This value acts as a descriptor for
     * the tag key. A tag value cannot be null, but it can be an empty string.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The supported AWS services from which logs and events are collected. */
  Sources: (unknown | unknown)[];
  ResourceShareArn?: string;
  ResourceShareName?: string;
  SubscriberRoleArn?: string;
  S3BucketArn?: string;
  SubscriberArn?: string;
};
