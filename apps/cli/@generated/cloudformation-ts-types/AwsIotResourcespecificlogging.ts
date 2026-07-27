// This file is auto-generated. Do not edit manually.
// Source: aws-iot-resourcespecificlogging.json

/** Resource-specific logging allows you to specify a logging level for a specific thing group. */
export type AwsIotResourcespecificlogging = {
  /**
   * The target type. Value must be THING_GROUP, CLIENT_ID, SOURCE_IP, PRINCIPAL_ID, or EVENT_TYPE.
   * @enum ["THING_GROUP","CLIENT_ID","SOURCE_IP","PRINCIPAL_ID","EVENT_TYPE"]
   */
  TargetType: "THING_GROUP" | "CLIENT_ID" | "SOURCE_IP" | "PRINCIPAL_ID" | "EVENT_TYPE";
  /**
   * The target name.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9.:\s_\-]+
   */
  TargetName: string;
  /**
   * The log level for a specific target. Valid values are: ERROR, WARN, INFO, DEBUG, or DISABLED.
   * @enum ["ERROR","WARN","INFO","DEBUG","DISABLED"]
   */
  LogLevel: "ERROR" | "WARN" | "INFO" | "DEBUG" | "DISABLED";
  /**
   * Unique Id for a Target (TargetType:TargetName), this will be internally built to serve as primary
   * identifier for a log target.
   * @minLength 13
   * @maxLength 140
   * @pattern [a-zA-Z0-9.:\s_\-]+
   */
  TargetId?: string;
};
