// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-webapp.json

/** Resource Type definition for AWS::Transfer::WebApp */
export type AwsTransferWebapp = {
  /**
   * Specifies the unique Amazon Resource Name (ARN) for the web app.
   * @minLength 20
   * @maxLength 1600
   * @pattern arn:.*
   */
  Arn?: string;
  /**
   * A unique identifier for the web app.
   * @minLength 24
   * @maxLength 24
   * @pattern ^webapp-([0-9a-f]{17})$
   */
  WebAppId?: string;
  IdentityProviderDetails: {
    /**
     * @minLength 10
     * @maxLength 1224
     * @pattern ^arn:[\w-]+:sso::\d{12}:application/(sso)?ins-[a-zA-Z0-9-.]{16}/apl-[a-zA-Z0-9]{16}$
     */
    ApplicationArn?: string;
    /**
     * The Amazon Resource Name (ARN) for the IAM Identity Center used for the web app.
     * @minLength 10
     * @maxLength 1224
     * @pattern ^arn:[\w-]+:sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$
     */
    InstanceArn?: string;
    /**
     * The IAM role in IAM Identity Center used for the web app.
     * @minLength 20
     * @maxLength 2048
     * @pattern ^arn:[a-z-]+:iam::[0-9]{12}:role[:/]\S+$
     */
    Role?: string;
  };
  /**
   * The AccessEndpoint is the URL that you provide to your users for them to interact with the Transfer
   * Family web app. You can specify a custom URL or use the default value.
   * @minLength 1
   * @maxLength 1024
   */
  AccessEndpoint?: string;
  WebAppUnits?: {
    /** @minimum 1 */
    Provisioned: number;
  };
  WebAppCustomization?: {
    /**
     * Specifies a title to display on the web app.
     * @minLength 0
     * @maxLength 100
     */
    Title?: string;
    /**
     * Specifies a logo to display on the web app.
     * @minLength 1
     * @maxLength 51200
     */
    LogoFile?: string;
    /**
     * Specifies a favicon to display in the browser tab.
     * @minLength 1
     * @maxLength 20960
     */
    FaviconFile?: string;
  };
  WebAppEndpointPolicy?: "STANDARD" | "FIPS";
  /**
   * Key-value pairs that can be used to group and search for web apps.
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 0
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
