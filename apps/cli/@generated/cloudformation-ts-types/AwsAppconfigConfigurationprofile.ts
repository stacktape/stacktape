// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-configurationprofile.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsAppconfigConfigurationprofile = {
  /** The configuration profile ID */
  ConfigurationProfileId?: string;
  /**
   * A URI to locate the configuration. You can specify the AWS AppConfig hosted configuration store,
   * Systems Manager (SSM) document, an SSM Parameter Store parameter, or an Amazon S3 object.
   * @minLength 1
   * @maxLength 2048
   */
  LocationUri: string;
  /**
   * The type of configurations contained in the profile. When calling this API, enter one of the
   * following values for Type: AWS.AppConfig.FeatureFlags, AWS.Freeform
   * @pattern ^[a-zA-Z\.]+
   */
  Type?: string;
  /**
   * The AWS Key Management Service key identifier (key ID, key alias, or key ARN) provided when the
   * resource was created or updated.
   * @pattern ^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}|alias/[a-zA-Z0-9/_-]{1,250}|arn:aws[a-zA-Z-]*:kms:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(key/[0-9a-f-]{36}|alias/[a-zA-Z0-9/_-]{1,250})$
   */
  KmsKeyIdentifier?: string;
  /**
   * A description of the configuration profile.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The Amazon Resource Name of the AWS Key Management Service key to encrypt new configuration data
   * versions in the AWS AppConfig hosted configuration store. This attribute is only used for hosted
   * configuration types. To encrypt data managed in other configuration stores, see the documentation
   * for how to specify an AWS KMS key for that particular service.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:(aws[a-zA-Z-]*)?:[a-z]+:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:[a-zA-Z0-9-_/:.]+
   */
  KmsKeyArn?: string;
  /**
   * A list of methods for validating the configuration.
   * @maxItems 2
   * @uniqueItems false
   */
  Validators?: {
    /** AWS AppConfig supports validators of type JSON_SCHEMA and LAMBDA. */
    Type?: string;
    /**
     * Either the JSON Schema content or the Amazon Resource Name (ARN) of an Lambda function.
     * @minLength 0
     * @maxLength 32768
     */
    Content?: string;
  }[];
  /**
   * The ARN of an IAM role with permission to access the configuration at the specified LocationUri.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((arn):(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov|aws-eusc):(iam)::\d{12}:role[/].*)$
   */
  RetrievalRoleArn?: string;
  /**
   * On resource deletion this controls whether the Deletion Protection check should be applied,
   * bypassed, or (the default) whether the behavior should be controlled by the account-level Deletion
   * Protection setting. See
   * https://docs.aws.amazon.com/appconfig/latest/userguide/deletion-protection.html
   * @enum ["ACCOUNT_DEFAULT","APPLY","BYPASS"]
   */
  DeletionProtectionCheck?: "ACCOUNT_DEFAULT" | "APPLY" | "BYPASS";
  /**
   * The application ID.
   * @pattern [a-z0-9]{4,7}
   */
  ApplicationId: string;
  /**
   * Metadata to assign to the configuration profile. Tags help organize and categorize your AWS
   * AppConfig resources. Each tag consists of a key and an optional value, both of which you define.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The tag value can be up to 256 characters.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
    /**
     * The key-value string map. The tag key can be up to 128 characters and must not start with aws:.
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
  }[];
  /**
   * A name for the configuration profile.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
};
