// This file is auto-generated. Do not edit manually.
// Source: aws-databrew-schedule.json

/** Resource schema for AWS::DataBrew::Schedule. */
export type AwsDatabrewSchedule = {
  /** @uniqueItems true */
  JobNames?: string[];
  /**
   * Schedule cron
   * @minLength 1
   * @maxLength 512
   */
  CronExpression: string;
  /**
   * Schedule Name
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /** @uniqueItems false */
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
