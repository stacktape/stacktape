// This file is auto-generated. Do not edit manually.
// Source: aws-iam-instanceprofile.json

/**
 * Creates a new instance profile. For information about instance profiles, see [Using instance
 * profiles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html).
 * For information about the number of instance profiles you can create, see [object
 * quotas](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html) in the *User
 * Guide*.
 */
export type AwsIamInstanceprofile = {
  /**
   * The path to the instance profile. For more information about paths, see [IAM
   * Identifiers](https://docs.aws.amazon.com/IAM/latest/UserGuide/Using_Identifiers.html) in the *IAM
   * User Guide*.
   * This parameter is optional. If it is not included, it defaults to a slash (/).
   * This parameter allows (through its [regex
   * pattern](https://docs.aws.amazon.com/http://wikipedia.org/wiki/regex)) a string of characters
   * consisting of either a forward slash (/) by itself or a string that must begin and end with forward
   * slashes. In addition, it can contain any ASCII character from the ! (``\u0021``) through the DEL
   * character (``\u007F``), including most punctuation characters, digits, and upper and lowercased
   * letters.
   */
  Path?: string;
  /**
   * The name of the role to associate with the instance profile. Only one role can be assigned to an
   * EC2 instance at a time, and all applications on the instance share the same role and permissions.
   * @uniqueItems true
   */
  Roles: string[];
  /**
   * The name of the instance profile to create.
   * This parameter allows (through its [regex
   * pattern](https://docs.aws.amazon.com/http://wikipedia.org/wiki/regex)) a string of characters
   * consisting of upper and lowercase alphanumeric characters with no spaces. You can also include any
   * of the following characters: _+=,.@-
   */
  InstanceProfileName?: string;
  Arn?: string;
};
