// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-publictypeversion.json

/** Test and Publish a resource that has been registered in the CloudFormation Registry. */
export type AwsCloudformationPublictypeversion = {
  /**
   * The Amazon Resource Number (ARN) of the extension.
   * @pattern arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:[0-9]{12}:type/.+
   */
  Arn?: string;
  /**
   * The Amazon Resource Number (ARN) of the extension with the versionId.
   * @pattern arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:[0-9]{12}:type/.+
   */
  TypeVersionArn?: string;
  /**
   * The version number of a public third-party extension
   * @minLength 5
   * @maxLength 64
   */
  PublicVersionNumber?: string;
  /**
   * The reserved publisher id for this type, or the publisher id assigned by CloudFormation for
   * publishing in this region.
   * @minLength 1
   * @maxLength 40
   * @pattern [0-9a-zA-Z-]{1,40}
   */
  PublisherId?: string;
  /**
   * The Amazon Resource Number (ARN) assigned to the public extension upon publication
   * @maxLength 1024
   * @pattern arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/.+
   */
  PublicTypeArn?: string;
  /**
   * The name of the type being registered.
   * We recommend that type names adhere to the following pattern:
   * company_or_organization::service::type.
   * @pattern [A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}(::MODULE){0,1}
   */
  TypeName?: string;
  /** A url to the S3 bucket where logs for the testType run will be available */
  LogDeliveryBucket?: string;
  /**
   * The kind of extension
   * @enum ["RESOURCE","MODULE","HOOK"]
   */
  Type?: "RESOURCE" | "MODULE" | "HOOK";
};
