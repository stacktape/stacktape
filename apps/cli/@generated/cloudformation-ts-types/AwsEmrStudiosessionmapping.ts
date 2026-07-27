// This file is auto-generated. Do not edit manually.
// Source: aws-emr-studiosessionmapping.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsEmrStudiosessionmapping = {
  /**
   * The name of the user or group. For more information, see UserName and DisplayName in the AWS SSO
   * Identity Store API Reference. Either IdentityName or IdentityId must be specified.
   */
  IdentityName: string;
  /**
   * Specifies whether the identity to map to the Studio is a user or a group.
   * @enum ["USER","GROUP"]
   */
  IdentityType: "USER" | "GROUP";
  /**
   * The Amazon Resource Name (ARN) for the session policy that will be applied to the user or group.
   * Session policies refine Studio user permissions without the need to use multiple IAM user roles.
   */
  SessionPolicyArn: string;
  /**
   * The ID of the Amazon EMR Studio to which the user or group will be mapped.
   * @minLength 4
   * @maxLength 256
   * @pattern ^es-[0-9A-Z]+
   */
  StudioId: string;
};
