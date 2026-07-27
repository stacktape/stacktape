// This file is auto-generated. Do not edit manually.
// Source: aws-sso-applicationassignment.json

/** Resource Type definition for SSO application access grant to a user or group. */
export type AwsSsoApplicationassignment = {
  /**
   * The ARN of the application.
   * @minLength 10
   * @maxLength 1224
   * @pattern arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso::\d{12}:application/(sso)?ins-[a-zA-Z0-9-.]{16}/apl-[a-zA-Z0-9]{16}
   */
  ApplicationArn: string;
  /**
   * The entity type for which the assignment will be created.
   * @enum ["USER","GROUP"]
   */
  PrincipalType: "USER" | "GROUP";
  /**
   * An identifier for an object in IAM Identity Center, such as a user or group
   * @minLength 1
   * @maxLength 47
   * @pattern ^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$
   */
  PrincipalId: string;
};
