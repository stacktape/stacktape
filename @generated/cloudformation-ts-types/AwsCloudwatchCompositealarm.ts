// This file is auto-generated. Do not edit manually.
// Source: aws-cloudwatch-compositealarm.json

/**
 * The AWS::CloudWatch::CompositeAlarm type specifies an alarm which aggregates the states of other
 * Alarms (Metric or Composite Alarms) as defined by the AlarmRule expression
 */
export type AwsCloudwatchCompositealarm = {
  /**
   * Amazon Resource Name (ARN) of the alarm
   * @minLength 1
   * @maxLength 1600
   */
  Arn?: string;
  /**
   * The name of the Composite Alarm
   * @minLength 1
   * @maxLength 255
   */
  AlarmName?: string;
  /**
   * Expression which aggregates the state of other Alarms (Metric or Composite Alarms)
   * @minLength 1
   * @maxLength 10240
   */
  AlarmRule: string;
  /**
   * The description of the alarm
   * @minLength 0
   * @maxLength 1024
   */
  AlarmDescription?: string;
  /**
   * Indicates whether actions should be executed during any changes to the alarm state. The default is
   * TRUE.
   */
  ActionsEnabled?: boolean;
  /**
   * The actions to execute when this alarm transitions to the OK state from any other state. Each
   * action is specified as an Amazon Resource Name (ARN).
   * @maxItems 5
   */
  OKActions?: string[];
  /**
   * The list of actions to execute when this alarm transitions into an ALARM state from any other
   * state. Specify each action as an Amazon Resource Name (ARN).
   * @maxItems 5
   */
  AlarmActions?: string[];
  /**
   * The actions to execute when this alarm transitions to the INSUFFICIENT_DATA state from any other
   * state. Each action is specified as an Amazon Resource Name (ARN).
   * @maxItems 5
   */
  InsufficientDataActions?: string[];
  /**
   * Actions will be suppressed if the suppressor alarm is in the ALARM state. ActionsSuppressor can be
   * an AlarmName or an Amazon Resource Name (ARN) from an existing alarm.
   * @minLength 1
   * @maxLength 1600
   */
  ActionsSuppressor?: string;
  /**
   * Actions will be suppressed if ExtensionPeriod is active. The length of time that actions are
   * suppressed is in seconds.
   * @minimum 0
   */
  ActionsSuppressorWaitPeriod?: number;
  /**
   * Actions will be suppressed if WaitPeriod is active. The length of time that actions are suppressed
   * is in seconds.
   * @minimum 0
   */
  ActionsSuppressorExtensionPeriod?: number;
  /**
   * A list of key-value pairs to associate with the composite alarm. You can associate as many as 50
   * tags with an alarm.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A unique identifier for the tag. The combination of tag keys and values can help you organize and
     * categorize your resources.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the specified tag key.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
