// This file is auto-generated. Do not edit manually.
// Source: aws-sso-assignment.json

/** Resource Type definition for SSO assignmet */
export type AwsSsoAssignment = {
  /**
   * The sso instance that the permission set is owned.
   * @minLength 10
   * @maxLength 1224
   * @pattern arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}
   */
  InstanceArn: string;
  /**
   * The account id to be provisioned.
   * @pattern \d{12}
   */
  TargetId: string;
  /**
   * The type of resource to be provisioned to, only aws account now
   * @enum ["AWS_ACCOUNT"]
   */
  TargetType: "AWS_ACCOUNT";
  /**
   * The permission set that the assignment will be assigned
   * @minLength 10
   * @maxLength 1224
   * @pattern arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::permissionSet/(sso)?ins-[a-zA-Z0-9-.]{16}/ps-[a-zA-Z0-9-./]{16}
   */
  PermissionSetArn: string;
  /**
   * The assignee's type, user/group
   * @enum ["USER","GROUP"]
   */
  PrincipalType: "USER" | "GROUP";
  /**
   * The assignee's identifier, user id/group id
   * @minLength 1
   * @maxLength 47
   * @pattern ^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$
   */
  PrincipalId: string;
};
