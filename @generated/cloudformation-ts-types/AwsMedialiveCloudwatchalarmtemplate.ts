// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-cloudwatchalarmtemplate.json

/** Definition of AWS::MediaLive::CloudWatchAlarmTemplate Resource Type */
export type AwsMedialiveCloudwatchalarmtemplate = {
  /**
   * A cloudwatch alarm template's ARN (Amazon Resource Name)
   * @pattern ^arn:.+:medialive:.+:cloudwatch-alarm-template:.+$
   */
  Arn?: string;
  ComparisonOperator: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanThreshold" | "LessThanOrEqualToThreshold";
  CreatedAt?: string;
  /**
   * The number of datapoints within the evaluation period that must be breaching to trigger the alarm.
   * @default 0
   * @minimum 1
   */
  DatapointsToAlarm?: number;
  /**
   * A resource's optional description.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The number of periods over which data is compared to the specified threshold.
   * @default 0
   * @minimum 1
   */
  EvaluationPeriods: number;
  /**
   * A cloudwatch alarm template group's id. AWS provided template groups have ids that start with
   * `aws-`
   * @minLength 7
   * @maxLength 11
   * @pattern ^(aws-)?[0-9]{7}$
   */
  GroupId?: string;
  /**
   * A cloudwatch alarm template group's identifier. Can be either be its id or current name.
   * @pattern ^[^\s]+$
   */
  GroupIdentifier?: string;
  /**
   * A cloudwatch alarm template's id. AWS provided templates have ids that start with `aws-`
   * @minLength 7
   * @maxLength 11
   * @pattern ^(aws-)?[0-9]{7}$
   */
  Id?: string;
  Identifier?: string;
  /**
   * The name of the metric associated with the alarm. Must be compatible with targetResourceType.
   * @minLength 0
   * @maxLength 64
   */
  MetricName: string;
  ModifiedAt?: string;
  /**
   * A resource's name. Names must be unique within the scope of a resource type in a specific region.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[^\s]+$
   */
  Name: string;
  /**
   * The period, in seconds, over which the specified statistic is applied.
   * @default 0
   * @minimum 10
   * @maximum 86400
   */
  Period: number;
  Statistic: "SampleCount" | "Average" | "Sum" | "Minimum" | "Maximum";
  Tags?: Record<string, string>;
  TargetResourceType: "CLOUDFRONT_DISTRIBUTION" | "MEDIALIVE_MULTIPLEX" | "MEDIALIVE_CHANNEL" | "MEDIALIVE_INPUT_DEVICE" | "MEDIAPACKAGE_CHANNEL" | "MEDIAPACKAGE_ORIGIN_ENDPOINT" | "MEDIACONNECT_FLOW" | "MEDIATAILOR_PLAYBACK_CONFIGURATION" | "S3_BUCKET";
  /**
   * The threshold value to compare with the specified statistic.
   * @default 0
   */
  Threshold: number;
  TreatMissingData: "notBreaching" | "breaching" | "ignore" | "missing";
};
