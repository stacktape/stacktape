// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-mlflowtrackingserver.json

/** Resource Type definition for AWS::SageMaker::MlflowTrackingServer */
export type AwsSagemakerMlflowtrackingserver = {
  /**
   * The name of the MLFlow Tracking Server.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,255}$
   */
  TrackingServerName: string;
  /**
   * The Amazon Resource Name (ARN) of the MLFlow Tracking Server.
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:mlflow-tracking-server/.*$
   */
  TrackingServerArn?: string;
  /**
   * The size of the MLFlow Tracking Server.
   * @enum ["Small","Medium","Large"]
   */
  TrackingServerSize?: "Small" | "Medium" | "Large";
  /**
   * The MLFlow Version used on the MLFlow Tracking Server.
   * @minLength 1
   * @maxLength 32
   * @pattern ^\d+(\.\d+)+$
   */
  MlflowVersion?: string;
  /**
   * The Amazon Resource Name (ARN) of an IAM role that enables Amazon SageMaker to perform tasks on
   * behalf of the customer.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role\/?[a-zA-Z_0-9+=,.@\-_\/]+$
   */
  RoleArn: string;
  /**
   * The Amazon S3 URI for MLFlow Tracking Server artifacts.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^s3:\/\/([^\/]+)\/?(.*)$
   */
  ArtifactStoreUri: string;
  /** A flag to enable Automatic SageMaker Model Registration. */
  AutomaticModelRegistration?: boolean;
  /**
   * The start of the time window for maintenance of the MLFlow Tracking Server in UTC time.
   * @maxLength 9
   * @pattern ^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):([01]\d|2[0-3]):([0-5]\d)$
   */
  WeeklyMaintenanceWindowStart?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 1
   * @maxItems 50
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
