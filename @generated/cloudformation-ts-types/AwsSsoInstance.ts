// This file is auto-generated. Do not edit manually.
// Source: aws-sso-instance.json

/** Resource Type definition for Identity Center (SSO) Instance */
export type AwsSsoInstance = {
  /**
   * The name you want to assign to this Identity Center (SSO) Instance
   * @minLength 1
   * @maxLength 32
   * @pattern ^[\w+=,.@-]+$
   */
  Name?: string;
  /**
   * The SSO Instance ARN that is returned upon creation of the Identity Center (SSO) Instance
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$
   */
  InstanceArn?: string;
  /**
   * The AWS accountId of the owner of the Identity Center (SSO) Instance
   * @minLength 12
   * @maxLength 12
   * @pattern ^\d{12}?$
   */
  OwnerAccountId?: string;
  /**
   * The ID of the identity store associated with the created Identity Center (SSO) Instance
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-]*$
   */
  IdentityStoreId?: string;
  /**
   * The status of the Identity Center (SSO) Instance, create_in_progress/delete_in_progress/active
   * @enum ["CREATE_IN_PROGRESS","DELETE_IN_PROGRESS","ACTIVE"]
   */
  Status?: "CREATE_IN_PROGRESS" | "DELETE_IN_PROGRESS" | "ACTIVE";
  /**
   * @maxItems 75
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern [\w+=,.@-]+
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern [\w+=,.@-]+
     */
    Value: string;
  }[];
};
