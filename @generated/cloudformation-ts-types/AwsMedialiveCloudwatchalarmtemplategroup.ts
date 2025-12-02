// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-cloudwatchalarmtemplategroup.json

/** Definition of AWS::MediaLive::CloudWatchAlarmTemplateGroup Resource Type */
export type AwsMedialiveCloudwatchalarmtemplategroup = {
  /**
   * A cloudwatch alarm template group's ARN (Amazon Resource Name)
   * @pattern ^arn:.+:medialive:.+:cloudwatch-alarm-template-group:.+$
   */
  Arn?: string;
  CreatedAt?: string;
  /**
   * A resource's optional description.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * A cloudwatch alarm template group's id. AWS provided template groups have ids that start with
   * `aws-`
   * @minLength 7
   * @maxLength 11
   * @pattern ^(aws-)?[0-9]{7}$
   */
  Id?: string;
  Identifier?: string;
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
