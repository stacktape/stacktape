// This file is auto-generated. Do not edit manually.
// Source: aws-iottwinmaker-syncjob.json

/** Resource schema for AWS::IoTTwinMaker::SyncJob */
export type AwsIottwinmakerSyncjob = {
  /**
   * The ID of the workspace.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_0-9][a-zA-Z_\-0-9]*[a-zA-Z0-9]+
   */
  WorkspaceId: string;
  /**
   * The source of the SyncJob.
   * @minLength 1
   * @maxLength 128
   */
  SyncSource: string;
  /**
   * The IAM Role that execute SyncJob.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iam::[0-9]{12}:role/.*
   */
  SyncRole: string;
  /** The date and time when the sync job was created. */
  CreationDateTime?: string;
  /** The date and time when the sync job was updated. */
  UpdateDateTime?: string;
  /**
   * The ARN of the SyncJob.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iottwinmaker:[a-z0-9-]+:[0-9]{12}:[\/a-zA-Z0-9_\-\.:]+
   */
  Arn?: string;
  /**
   * The state of SyncJob.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_\-0-9]+
   */
  State?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};
