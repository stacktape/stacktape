// This file is auto-generated. Do not edit manually.
// Source: aws-logs-loganomalydetector.json

/** The AWS::Logs::LogAnomalyDetector resource specifies a CloudWatch Logs LogAnomalyDetector. */
export type AwsLogsLoganomalydetector = {
  /** Account ID for owner of detector */
  AccountId?: string;
  /**
   * The Amazon Resource Name (ARN) of the CMK to use when encrypting log data.
   * @maxLength 256
   */
  KmsKeyId?: string;
  /** Name of detector */
  DetectorName?: string;
  /**
   * List of Arns for the given log group
   * @uniqueItems true
   */
  LogGroupArnList?: string[];
  /**
   * How often log group is evaluated
   * @enum ["FIVE_MIN","TEN_MIN","FIFTEEN_MIN","THIRTY_MIN","ONE_HOUR"]
   */
  EvaluationFrequency?: "FIVE_MIN" | "TEN_MIN" | "FIFTEEN_MIN" | "THIRTY_MIN" | "ONE_HOUR";
  /** @pattern  */
  FilterPattern?: string;
  /** Current status of detector. */
  AnomalyDetectorStatus?: string;
  AnomalyVisibilityTime?: number;
  /** When detector was created. */
  CreationTimeStamp?: number;
  /** When detector was lsat modified. */
  LastModifiedTimeStamp?: number;
  /** ARN of LogAnomalyDetector */
  AnomalyDetectorArn?: string;
};
