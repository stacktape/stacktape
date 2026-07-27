// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-publishingdestination.json

/** Resource Type definition for AWS::GuardDuty::PublishingDestination. */
export type AwsGuarddutyPublishingdestination = {
  /** The ID of the publishing destination. */
  Id?: string;
  /**
   * The ID of the GuardDuty detector associated with the publishing destination.
   * @minLength 1
   * @maxLength 300
   */
  DetectorId: string;
  /**
   * The type of resource for the publishing destination. Currently only Amazon S3 buckets are
   * supported.
   */
  DestinationType: string;
  DestinationProperties: {
    /** The ARN of the resource to publish to. */
    DestinationArn?: string;
    /** The ARN of the KMS key to use for encryption. */
    KmsKeyArn?: string;
  };
  /** The status of the publishing destination. */
  Status?: string;
  /**
   * The time, in epoch millisecond format, at which GuardDuty was first unable to publish findings to
   * the destination.
   */
  PublishingFailureStartTimestamp?: string;
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
