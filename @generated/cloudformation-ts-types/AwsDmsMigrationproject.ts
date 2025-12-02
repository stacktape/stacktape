// This file is auto-generated. Do not edit manually.
// Source: aws-dms-migrationproject.json

/** Resource schema for AWS::DMS::MigrationProject */
export type AwsDmsMigrationproject = {
  /**
   * The property describes a name to identify the migration project.
   * @minLength 1
   * @maxLength 255
   */
  MigrationProjectName?: string;
  /**
   * The property describes an identifier for the migration project. It is used for
   * describing/deleting/modifying can be name/arn
   * @minLength 1
   * @maxLength 255
   */
  MigrationProjectIdentifier?: string;
  /**
   * The property describes an ARN of the migration project.
   * @minLength 1
   * @maxLength 255
   */
  MigrationProjectArn?: string;
  /**
   * The property describes a creating time of the migration project.
   * @minLength 1
   * @maxLength 40
   */
  MigrationProjectCreationTime?: string;
  /**
   * The property describes an instance profile identifier for the migration project. For create
   * @minLength 1
   * @maxLength 255
   */
  InstanceProfileIdentifier?: string;
  /**
   * The property describes an instance profile name for the migration project. For read
   * @minLength 1
   * @maxLength 255
   */
  InstanceProfileName?: string;
  /**
   * The property describes an instance profile arn for the migration project. For read
   * @minLength 1
   * @maxLength 255
   */
  InstanceProfileArn?: string;
  /** The property describes transformation rules for the migration project. */
  TransformationRules?: string;
  /**
   * The optional description of the migration project.
   * @minLength 1
   * @maxLength 255
   */
  Description?: string;
  /** The property describes schema conversion application attributes for the migration project. */
  SchemaConversionApplicationAttributes?: {
    S3BucketPath?: string;
    S3BucketRoleArn?: string;
  };
  /**
   * The property describes source data provider descriptors for the migration project.
   * @uniqueItems true
   */
  SourceDataProviderDescriptors?: {
    DataProviderIdentifier?: string;
    DataProviderName?: string;
    DataProviderArn?: string;
    SecretsManagerSecretId?: string;
    SecretsManagerAccessRoleArn?: string;
  }[];
  /**
   * The property describes target data provider descriptors for the migration project.
   * @uniqueItems true
   */
  TargetDataProviderDescriptors?: {
    DataProviderIdentifier?: string;
    DataProviderName?: string;
    DataProviderArn?: string;
    SecretsManagerSecretId?: string;
    SecretsManagerAccessRoleArn?: string;
  }[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, , and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, , and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
