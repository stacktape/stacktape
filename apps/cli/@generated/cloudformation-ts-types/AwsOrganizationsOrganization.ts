// This file is auto-generated. Do not edit manually.
// Source: aws-organizations-organization.json

/** Resource schema for AWS::Organizations::Organization */
export type AwsOrganizationsOrganization = {
  /**
   * The unique identifier (ID) of an organization.
   * @pattern ^o-[a-z0-9]{10,32}$
   */
  Id?: string;
  /**
   * The Amazon Resource Name (ARN) of an organization.
   * @pattern ^arn:aws.*:organizations::\d{12}:organization\/o-[a-z0-9]{10,32}
   */
  Arn?: string;
  /**
   * Specifies the feature set supported by the new organization. Each feature set supports different
   * levels of functionality.
   * @default "ALL"
   * @enum ["ALL","CONSOLIDATED_BILLING"]
   */
  FeatureSet?: "ALL" | "CONSOLIDATED_BILLING";
  /**
   * The Amazon Resource Name (ARN) of the account that is designated as the management account for the
   * organization.
   * @pattern ^arn:aws.*:organizations::\d{12}:account\/o-[a-z0-9]{10,32}\/\d{12}
   */
  ManagementAccountArn?: string;
  /**
   * The unique identifier (ID) of the management account of an organization.
   * @pattern ^\d{12}$
   */
  ManagementAccountId?: string;
  /**
   * The email address that is associated with the AWS account that is designated as the management
   * account for the organization.
   * @minLength 6
   * @maxLength 64
   * @pattern [^\s@]+@[^\s@]+\.[^\s@]+
   */
  ManagementAccountEmail?: string;
  /**
   * The unique identifier (ID) for the root.
   * @maxLength 64
   * @pattern ^r-[0-9a-z]{4,32}$
   */
  RootId?: string;
};
