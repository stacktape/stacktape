// This file is auto-generated. Do not edit manually.
// Source: aws-connect-user.json

/** Resource Type definition for AWS::Connect::User */
export type AwsConnectUser = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /** The identifier of the user account in the directory used for identity management. */
  DirectoryUserId?: string;
  /**
   * The identifier of the hierarchy group for the user.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/agent-group/[-a-zA-Z0-9]*$
   */
  HierarchyGroupArn?: string;
  /**
   * The user name for the account.
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9\_\-\.\@]+
   */
  Username: string;
  /**
   * The password for the user account. A password is required if you are using Amazon Connect for
   * identity management. Otherwise, it is an error to include a password.
   * @pattern ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\S]{8,64}$
   */
  Password?: string;
  /**
   * The identifier of the routing profile for the user.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/routing-profile/[-a-zA-Z0-9]*$
   */
  RoutingProfileArn: string;
  /** The information about the identity of the user. */
  IdentityInfo?: {
    FirstName?: string;
    LastName?: string;
    Email?: string;
    SecondaryEmail?: string;
    Mobile?: string;
  };
  /** The phone settings for the user. */
  PhoneConfig: {
    AfterContactWorkTimeLimit?: number;
    AutoAccept?: boolean;
    DeskPhoneNumber?: string;
    PhoneType: "SOFT_PHONE" | "DESK_PHONE";
    PersistentConnection?: boolean;
  };
  /**
   * One or more security profile arns for the user
   * @minItems 1
   * @maxItems 10
   * @uniqueItems true
   */
  SecurityProfileArns: string[];
  /**
   * The Amazon Resource Name (ARN) for the user.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/agent/[-a-zA-Z0-9]*$
   */
  UserArn?: string;
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is maximum of 256 Unicode characters in length
     * and cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * One or more predefined attributes assigned to a user, with a level that indicates how skilled they
   * are.
   */
  UserProficiencies?: {
    AttributeName: string;
    AttributeValue: string;
    Level: number;
  }[];
};
