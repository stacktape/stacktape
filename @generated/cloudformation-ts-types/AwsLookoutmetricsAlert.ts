// This file is auto-generated. Do not edit manually.
// Source: aws-lookoutmetrics-alert.json

/** Resource Type definition for AWS::LookoutMetrics::Alert */
export type AwsLookoutmetricsAlert = {
  /**
   * The name of the alert. If not provided, a name is generated automatically.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
   */
  AlertName?: string;
  /** ARN assigned to the alert. */
  Arn?: string;
  /**
   * A description for the alert.
   * @maxLength 256
   * @pattern .*\S.*
   */
  AlertDescription?: string;
  /**
   * The Amazon resource name (ARN) of the Anomaly Detector to alert.
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):.*:.*:.*:.+
   */
  AnomalyDetectorArn: string;
  /**
   * A number between 0 and 100 (inclusive) that tunes the sensitivity of the alert.
   * @minimum 0
   * @maximum 100
   */
  AlertSensitivityThreshold: number;
  /** The action to be taken by the alert when an anomaly is detected. */
  Action: {
    SNSConfiguration?: {
      /** ARN of an IAM role that LookoutMetrics should assume to access the SNS topic. */
      RoleArn: string;
      /** ARN of an SNS topic to send alert notifications to. */
      SnsTopicArn: string;
    };
    LambdaConfiguration?: {
      /** ARN of an IAM role that LookoutMetrics should assume to access the Lambda function. */
      RoleArn: string;
      /** ARN of a Lambda to send alert notifications to. */
      LambdaArn: string;
    };
  };
};
