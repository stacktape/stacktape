// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-workflow.json

/** Resource schema for AWS::ImageBuilder::Workflow */
export type AwsImagebuilderWorkflow = {
  /** The Amazon Resource Name (ARN) of the workflow. */
  Arn?: string;
  /** The name of the workflow. */
  Name: string;
  /** The version of the workflow. */
  Version: string;
  /** The description of the workflow. */
  Description?: string;
  /** The change description of the workflow. */
  ChangeDescription?: string;
  /**
   * The type of the workflow denotes whether the workflow is used to build, test, or distribute.
   * @enum ["BUILD","TEST","DISTRIBUTION"]
   */
  Type: "BUILD" | "TEST" | "DISTRIBUTION";
  /**
   * The data of the workflow.
   * @minLength 1
   * @maxLength 16000
   */
  Data?: string;
  /** The uri of the workflow. */
  Uri?: string;
  /** The KMS key identifier used to encrypt the workflow. */
  KmsKeyId?: string;
  /** The tags associated with the workflow. */
  Tags?: Record<string, string>;
  /** The latest version references of the workflow. */
  LatestVersion?: {
    /** The latest version ARN of the created workflow. */
    Arn?: string;
    /** The latest version ARN of the created workflow, with the same major version. */
    Major?: string;
    /** The latest version ARN of the created workflow, with the same minor version. */
    Minor?: string;
    /** The latest version ARN of the created workflow, with the same patch version. */
    Patch?: string;
  };
};
