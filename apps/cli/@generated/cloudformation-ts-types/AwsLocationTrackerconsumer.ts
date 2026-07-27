// This file is auto-generated. Do not edit manually.
// Source: aws-location-trackerconsumer.json

/** Definition of AWS::Location::TrackerConsumer Resource Type */
export type AwsLocationTrackerconsumer = {
  /**
   * @maxLength 1600
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:([^/].*)?$
   */
  ConsumerArn: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[-._\w]+$
   */
  TrackerName: string;
};
