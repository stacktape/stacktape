// This file is auto-generated. Do not edit manually.
// Source: aws-rbin-rule.json

/** Resource Type definition for AWS::Rbin::Rule */
export type AwsRbinRule = {
  /**
   * Rule Arn is unique for each rule.
   * @minLength 0
   * @maxLength 1011
   */
  Arn?: string;
  /**
   * The unique ID of the retention rule.
   * @pattern [0-9a-zA-Z]{11}
   */
  Identifier?: string;
  /**
   * The description of the retention rule.
   * @maxLength 255
   */
  Description?: string;
  /**
   * Information about the resource tags used to identify resources that are retained by the retention
   * rule.
   * @maxItems 50
   * @uniqueItems true
   */
  ResourceTags?: {
    /**
     * The tag key of the resource.
     * @minLength 1
     * @maxLength 128
     */
    ResourceTagKey: string;
    /**
     * The tag value of the resource
     * @minLength 0
     * @maxLength 256
     */
    ResourceTagValue: string;
  }[];
  /**
   * Information about the exclude resource tags used to identify resources that are excluded by the
   * retention rule.
   * @maxItems 5
   * @uniqueItems true
   */
  ExcludeResourceTags?: {
    /**
     * The tag key of the resource.
     * @minLength 1
     * @maxLength 128
     */
    ResourceTagKey: string;
    /**
     * The tag value of the resource
     * @minLength 0
     * @maxLength 256
     */
    ResourceTagValue: string;
  }[];
  /**
   * The resource type retained by the retention rule.
   * @enum ["EBS_SNAPSHOT","EC2_IMAGE","EBS_VOLUME"]
   */
  ResourceType: "EBS_SNAPSHOT" | "EC2_IMAGE" | "EBS_VOLUME";
  /**
   * Information about the tags assigned to the retention rule.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A unique identifier for the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * String which you can use to describe or define the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Information about the retention period for which the retention rule is to retain resources. */
  RetentionPeriod: {
    /**
     * The retention period value of the rule.
     * @minimum 1
     * @maximum 3650
     */
    RetentionPeriodValue: number;
    /**
     * The retention period unit of the rule
     * @enum ["DAYS"]
     */
    RetentionPeriodUnit: "DAYS";
  };
  /**
   * The state of the retention rule. Only retention rules that are in the available state retain
   * resources.
   * @pattern pending|available
   */
  Status?: string;
  /** Information about the retention rule lock configuration. */
  LockConfiguration?: {
    /**
     * The unlock delay period, measured in the unit specified for UnlockDelayUnit.
     * @minimum 7
     * @maximum 30
     */
    UnlockDelayValue?: number;
    /**
     * The unit of time in which to measure the unlock delay. Currently, the unlock delay can be measure
     * only in days.
     * @enum ["DAYS"]
     */
    UnlockDelayUnit?: "DAYS";
  };
  /**
   * The lock state for the retention rule.
   * @pattern locked|pending_unlock|unlocked
   */
  LockState?: string;
};
