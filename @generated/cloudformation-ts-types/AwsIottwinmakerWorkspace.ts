// This file is auto-generated. Do not edit manually.
// Source: aws-iottwinmaker-workspace.json

/** Resource schema for AWS::IoTTwinMaker::Workspace */
export type AwsIottwinmakerWorkspace = {
  /**
   * The ID of the workspace.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_0-9][a-zA-Z_\-0-9]*[a-zA-Z0-9]+
   */
  WorkspaceId: string;
  /**
   * The ARN of the workspace.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iottwinmaker:[a-z0-9-]+:[0-9]{12}:[\/a-zA-Z0-9_\-\.:]+
   */
  Arn?: string;
  /**
   * The description of the workspace.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  /**
   * The ARN of the execution role associated with the workspace.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iam::[0-9]{12}:role/.*
   */
  Role: string;
  /** The ARN of the S3 bucket where resources associated with the workspace are stored. */
  S3Location: string;
  /** The date and time when the workspace was created. */
  CreationDateTime?: string;
  /** The date and time of the current update. */
  UpdateDateTime?: string;
  /** A map of key-value pairs to associate with a resource. */
  Tags?: Record<string, string>;
};
