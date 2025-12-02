// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-stack.json

/** The AWS::CloudFormation::Stack resource nests a stack as a resource in a top-level template. */
export type AwsCloudformationStack = {
  /** @uniqueItems false */
  Capabilities?: ("CAPABILITY_IAM" | "CAPABILITY_NAMED_IAM" | "CAPABILITY_AUTO_EXPAND")[];
  RoleARN?: string;
  /** @uniqueItems false */
  Outputs?: {
    Description?: string;
    ExportName?: string;
    OutputKey?: string;
    OutputValue?: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  DisableRollback?: boolean;
  EnableTerminationProtection?: boolean;
  /**
   * @maxItems 5
   * @uniqueItems false
   */
  NotificationARNs?: string[];
  Parameters?: Record<string, string>;
  ParentId?: string;
  RootId?: string;
  ChangeSetId?: string;
  StackName: string;
  StackId?: string;
  StackPolicyBody?: Record<string, unknown>;
  StackPolicyURL?: string;
  /** @enum ["CREATE_IN_PROGRESS","CREATE_FAILED","CREATE_COMPLETE","ROLLBACK_IN_PROGRESS","ROLLBACK_FAILED","ROLLBACK_COMPLETE","DELETE_IN_PROGRESS","DELETE_FAILED","DELETE_COMPLETE","UPDATE_IN_PROGRESS","UPDATE_COMPLETE_CLEANUP_IN_PROGRESS","UPDATE_COMPLETE","UPDATE_FAILED","UPDATE_ROLLBACK_IN_PROGRESS","UPDATE_ROLLBACK_FAILED","UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS","UPDATE_ROLLBACK_COMPLETE","REVIEW_IN_PROGRESS","IMPORT_IN_PROGRESS","IMPORT_COMPLETE","IMPORT_ROLLBACK_IN_PROGRESS","IMPORT_ROLLBACK_FAILED","IMPORT_ROLLBACK_COMPLETE"] */
  StackStatus?: "CREATE_IN_PROGRESS" | "CREATE_FAILED" | "CREATE_COMPLETE" | "ROLLBACK_IN_PROGRESS" | "ROLLBACK_FAILED" | "ROLLBACK_COMPLETE" | "DELETE_IN_PROGRESS" | "DELETE_FAILED" | "DELETE_COMPLETE" | "UPDATE_IN_PROGRESS" | "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS" | "UPDATE_COMPLETE" | "UPDATE_FAILED" | "UPDATE_ROLLBACK_IN_PROGRESS" | "UPDATE_ROLLBACK_FAILED" | "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS" | "UPDATE_ROLLBACK_COMPLETE" | "REVIEW_IN_PROGRESS" | "IMPORT_IN_PROGRESS" | "IMPORT_COMPLETE" | "IMPORT_ROLLBACK_IN_PROGRESS" | "IMPORT_ROLLBACK_FAILED" | "IMPORT_ROLLBACK_COMPLETE";
  StackStatusReason?: string;
  /**
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  TemplateBody?: Record<string, unknown> | string;
  /**
   * @minLength 1
   * @maxLength 1024
   */
  TemplateURL?: string;
  /** @minimum 1 */
  TimeoutInMinutes?: number;
  LastUpdateTime?: string;
  CreationTime?: string;
};
