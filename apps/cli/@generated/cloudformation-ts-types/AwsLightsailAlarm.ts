// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-alarm.json

/** Resource Type definition for AWS::Lightsail::Alarm */
export type AwsLightsailAlarm = {
  /**
   * The name for the alarm. Specify the name of an existing alarm to update, and overwrite the previous
   * configuration of the alarm.
   * @pattern \w[\w\-]*\w
   */
  AlarmName: string;
  /** The name of the Lightsail resource that the alarm monitors. */
  MonitoredResourceName: string;
  /** The name of the metric to associate with the alarm. */
  MetricName: string;
  /**
   * The arithmetic operation to use when comparing the specified statistic to the threshold. The
   * specified statistic value is used as the first operand.
   */
  ComparisonOperator: string;
  /**
   * The contact protocols to use for the alarm, such as Email, SMS (text messaging), or both.
   * @uniqueItems true
   */
  ContactProtocols?: string[];
  AlarmArn?: string;
  /**
   * The number of data points that must be not within the specified threshold to trigger the alarm. If
   * you are setting an "M out of N" alarm, this value (datapointsToAlarm) is the M.
   */
  DatapointsToAlarm?: number;
  /**
   * The number of most recent periods over which data is compared to the specified threshold. If you
   * are setting an "M out of N" alarm, this value (evaluationPeriods) is the N.
   */
  EvaluationPeriods: number;
  /**
   * Indicates whether the alarm is enabled. Notifications are enabled by default if you don't specify
   * this parameter.
   */
  NotificationEnabled?: boolean;
  /**
   * The alarm states that trigger a notification.
   * @uniqueItems true
   */
  NotificationTriggers?: string[];
  /** The value against which the specified statistic is compared. */
  Threshold: number;
  /** Sets how this alarm will handle missing data points. */
  TreatMissingData?: string;
  /** The current state of the alarm. */
  State?: string;
};
