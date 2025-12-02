// This file is auto-generated. Do not edit manually.
// Source: aws-iot-logging.json

/**
 * Logging Options enable you to configure your IoT V2 logging role and default logging level so that
 * you can monitor progress events logs as it passes from your devices through Iot core service.
 */
export type AwsIotLogging = {
  /**
   * Your 12-digit account ID (used as the primary identifier for the CloudFormation resource).
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AccountId: string;
  /**
   * The ARN of the role that allows IoT to write to Cloudwatch logs.
   * @minLength 20
   * @maxLength 2048
   */
  RoleArn: string;
  /**
   * The log level to use. Valid values are: ERROR, WARN, INFO, DEBUG, or DISABLED.
   * @enum ["ERROR","WARN","INFO","DEBUG","DISABLED"]
   */
  DefaultLogLevel: "ERROR" | "WARN" | "INFO" | "DEBUG" | "DISABLED";
};
