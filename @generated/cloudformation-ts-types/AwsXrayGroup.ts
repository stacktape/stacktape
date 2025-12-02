// This file is auto-generated. Do not edit manually.
// Source: aws-xray-group.json

/** This schema provides construct and validation rules for AWS-XRay Group resource parameters. */
export type AwsXrayGroup = {
  /** The filter expression defining criteria by which to group traces. */
  FilterExpression?: string;
  /**
   * The case-sensitive name of the new group. Names must be unique.
   * @minLength 1
   * @maxLength 32
   */
  GroupName: string;
  /**
   * The ARN of the group that was generated on creation.
   * @minLength 1
   * @maxLength 400
   */
  GroupARN?: string;
  InsightsConfiguration?: {
    /** Set the InsightsEnabled value to true to enable insights or false to disable insights. */
    InsightsEnabled?: boolean;
    /**
     * Set the NotificationsEnabled value to true to enable insights notifications. Notifications can only
     * be enabled on a group with InsightsEnabled set to true.
     */
    NotificationsEnabled?: boolean;
  };
  Tags?: {
    /** The key name of the tag. */
    Key: string;
    /** The value for the tag. */
    Value: string;
  }[];
};
