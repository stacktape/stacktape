// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-modelpackagegroup.json

/** Resource Type definition for AWS::SageMaker::ModelPackageGroup */
export type AwsSagemakerModelpackagegroup = {
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  ModelPackageGroupArn?: string;
  ModelPackageGroupName: string;
  ModelPackageGroupDescription?: string;
  ModelPackageGroupPolicy?: Record<string, unknown> | string;
  /** The time at which the model package group was created. */
  CreationTime?: string;
  /**
   * The status of a modelpackage group job.
   * @enum ["Pending","InProgress","Completed","Failed","Deleting","DeleteFailed"]
   */
  ModelPackageGroupStatus?: "Pending" | "InProgress" | "Completed" | "Failed" | "Deleting" | "DeleteFailed";
};
