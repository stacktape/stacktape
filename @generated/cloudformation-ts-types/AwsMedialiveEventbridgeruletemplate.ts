// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-eventbridgeruletemplate.json

/** Definition of AWS::MediaLive::EventBridgeRuleTemplate Resource Type */
export type AwsMedialiveEventbridgeruletemplate = {
  /**
   * An eventbridge rule template's ARN (Amazon Resource Name)
   * @pattern ^arn:.+:medialive:.+:eventbridge-rule-template:.+$
   */
  Arn?: string;
  /** Placeholder documentation for __timestampIso8601 */
  CreatedAt?: string;
  /**
   * A resource's optional description.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /** Placeholder documentation for __listOfEventBridgeRuleTemplateTarget */
  EventTargets?: {
    /**
     * Target ARNs must be either an SNS topic or CloudWatch log group.
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn.+$
     */
    Arn: string;
  }[];
  EventType: "MEDIALIVE_MULTIPLEX_ALERT" | "MEDIALIVE_MULTIPLEX_STATE_CHANGE" | "MEDIALIVE_CHANNEL_ALERT" | "MEDIALIVE_CHANNEL_INPUT_CHANGE" | "MEDIALIVE_CHANNEL_STATE_CHANGE" | "MEDIAPACKAGE_INPUT_NOTIFICATION" | "MEDIAPACKAGE_KEY_PROVIDER_NOTIFICATION" | "MEDIAPACKAGE_HARVEST_JOB_NOTIFICATION" | "SIGNAL_MAP_ACTIVE_ALARM" | "MEDIACONNECT_ALERT" | "MEDIACONNECT_SOURCE_HEALTH" | "MEDIACONNECT_OUTPUT_HEALTH" | "MEDIACONNECT_FLOW_STATUS_CHANGE";
  /**
   * An eventbridge rule template group's id. AWS provided template groups have ids that start with
   * `aws-`
   * @minLength 7
   * @maxLength 11
   * @pattern ^(aws-)?[0-9]{7}$
   */
  GroupId?: string;
  /**
   * An eventbridge rule template group's identifier. Can be either be its id or current name.
   * @pattern ^[^\s]+$
   */
  GroupIdentifier?: string;
  /**
   * An eventbridge rule template's id. AWS provided templates have ids that start with `aws-`
   * @minLength 7
   * @maxLength 11
   * @pattern ^(aws-)?[0-9]{7}$
   */
  Id?: string;
  /** Placeholder documentation for __string */
  Identifier?: string;
  /** Placeholder documentation for __timestampIso8601 */
  ModifiedAt?: string;
  /**
   * A resource's name. Names must be unique within the scope of a resource type in a specific region.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[^\s]+$
   */
  Name: string;
  Tags?: Record<string, string>;
};
