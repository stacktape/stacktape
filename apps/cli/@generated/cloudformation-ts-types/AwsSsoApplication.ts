// This file is auto-generated. Do not edit manually.
// Source: aws-sso-application.json

/** Resource Type definition for Identity Center (SSO) Application */
export type AwsSsoApplication = {
  /**
   * The name you want to assign to this Identity Center (SSO) Application
   * @minLength 0
   * @maxLength 255
   * @pattern ^[\w+=,.@-]+$
   */
  Name: string;
  /**
   * The description information for the Identity Center (SSO) Application
   * @minLength 1
   * @maxLength 128
   */
  Description?: string;
  /**
   * The ARN of the instance of IAM Identity Center under which the operation will run
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$
   */
  InstanceArn: string;
  /**
   * The Application ARN that is returned upon creation of the Identity Center (SSO) Application
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso::\d{12}:application/(sso)?ins-[a-zA-Z0-9-.]{16}/apl-[a-zA-Z0-9]{16}$
   */
  ApplicationArn?: string;
  /**
   * The ARN of the application provider under which the operation will run
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso::aws:applicationProvider/[a-zA-Z0-9-/]+$
   */
  ApplicationProviderArn: string;
  /**
   * Specifies whether the application is enabled or disabled
   * @enum ["ENABLED","DISABLED"]
   */
  Status?: "ENABLED" | "DISABLED";
  /** A structure that describes the options for the portal associated with an application */
  PortalOptions?: {
    /**
     * Indicates whether this application is visible in the access portal
     * @enum ["ENABLED","DISABLED"]
     */
    Visibility?: "ENABLED" | "DISABLED";
    /** A structure that describes the sign-in options for the access portal */
    SignInOptions?: {
      /**
       * This determines how IAM Identity Center navigates the user to the target application
       * @enum ["IDENTITY_CENTER","APPLICATION"]
       */
      Origin: "IDENTITY_CENTER" | "APPLICATION";
      /**
       * The URL that accepts authentication requests for an application, this is a required parameter if
       * the Origin parameter is APPLICATION
       * @minLength 1
       * @maxLength 512
       * @pattern ^http(s)?:\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&bb@#\/%?=~_|]$
       */
      ApplicationUrl?: string;
    };
  };
  /**
   * @maxItems 75
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[\w+=,.@-]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[\w+=,.@-]+$
     */
    Value: string;
  }[];
};
