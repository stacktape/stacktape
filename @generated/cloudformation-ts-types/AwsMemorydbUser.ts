// This file is auto-generated. Do not edit manually.
// Source: aws-memorydb-user.json

/** Resource Type definition for AWS::MemoryDB::User */
export type AwsMemorydbUser = {
  /** Indicates the user status. Can be "active", "modifying" or "deleting". */
  Status?: string;
  /**
   * The name of the user.
   * @pattern [a-z][a-z0-9\\-]*
   */
  UserName: string;
  /** Access permissions string used for this user account. */
  AccessString?: string;
  AuthenticationMode?: {
    /**
     * Type of authentication strategy for this user.
     * @enum ["password","iam"]
     */
    Type?: "password" | "iam";
    /**
     * Passwords used for this user account. You can create up to two passwords for each user.
     * @minItems 1
     * @maxItems 2
     * @uniqueItems true
     */
    Passwords?: string[];
  };
  /** The Amazon Resource Name (ARN) of the user account. */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this user.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with 'aws:'. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z0-9 _\.\/=+:\-@]*$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length. You
     * can use any of the following characters: the set of Unicode letters, digits, whitespace, _, ., /,
     * =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9 _\.\/=+:\-@]*$
     */
    Value?: string;
  }[];
};
