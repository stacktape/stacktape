// This file is auto-generated. Do not edit manually.
// Source: aws-sso-permissionset.json

/** Resource Type definition for SSO PermissionSet */
export type AwsSsoPermissionset = {
  /**
   * The name you want to assign to this permission set.
   * @minLength 1
   * @maxLength 32
   * @pattern [\w+=,.@-]+
   */
  Name: string;
  /**
   * The permission set that the policy will be attached to
   * @minLength 10
   * @maxLength 1224
   * @pattern arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::permissionSet/(sso)?ins-[a-zA-Z0-9-.]{16}/ps-[a-zA-Z0-9-./]{16}
   */
  PermissionSetArn?: string;
  /**
   * The permission set description.
   * @minLength 1
   * @maxLength 700
   * @pattern [\u0009\u000A\u000D\u0020-\u007E\u00A1-\u00FF]*
   */
  Description?: string;
  /**
   * The sso instance arn that the permission set is owned.
   * @minLength 10
   * @maxLength 1224
   * @pattern arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}
   */
  InstanceArn: string;
  /**
   * The length of time that a user can be signed in to an AWS account.
   * @minLength 1
   * @maxLength 100
   * @pattern ^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$
   */
  SessionDuration?: string;
  /**
   * The relay state URL that redirect links to any service in the AWS Management Console.
   * @minLength 1
   * @maxLength 240
   * @pattern [a-zA-Z0-9&amp;$@#\/%?=~\-_'&quot;|!:,.;*+\[\]\ \(\)\{\}]+
   */
  RelayStateType?: string;
  /**
   * @default []
   * @maxItems 20
   */
  ManagedPolicies?: string[];
  /** The inline policy to put in permission set. */
  InlinePolicy?: Record<string, unknown> | string;
  /** @maxItems 50 */
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
  /**
   * @default []
   * @maxItems 20
   */
  CustomerManagedPolicyReferences?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern [\w+=,.@-]+
     */
    Name: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern ((/[A-Za-z0-9\.,\+@=_-]+)*)/
     */
    Path?: string;
  }[];
  PermissionsBoundary?: {
    CustomerManagedPolicyReference?: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern [\w+=,.@-]+
       */
      Name: string;
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern ((/[A-Za-z0-9\.,\+@=_-]+)*)/
       */
      Path?: string;
    };
    ManagedPolicyArn?: string;
  };
};
