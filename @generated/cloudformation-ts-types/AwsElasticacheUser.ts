// This file is auto-generated. Do not edit manually.
// Source: aws-elasticache-user.json

/** Resource Type definition for AWS::ElastiCache::User */
export type AwsElasticacheUser = {
  /** Indicates the user status. Can be "active", "modifying" or "deleting". */
  Status?: string;
  /**
   * The ID of the user.
   * @pattern [a-z][a-z0-9\\-]*
   */
  UserId: string;
  /** The username of the user. */
  UserName: string;
  /**
   * The target cache engine for the user.
   * @enum ["redis","valkey"]
   */
  Engine: "redis" | "valkey";
  /** Access permissions string used for this user account. */
  AccessString?: string;
  /** Indicates a password is not required for this user account. */
  NoPasswordRequired?: boolean;
  /**
   * Passwords used for this user account. You can create up to two passwords for each user.
   * @uniqueItems true
   */
  Passwords?: string[];
  /** The Amazon Resource Name (ARN) of the user account. */
  Arn?: string;
  AuthenticationMode?: {
    /**
     * Authentication Type
     * @enum ["password","no-password-required","iam"]
     */
    Type: "password" | "no-password-required" | "iam";
    /**
     * Passwords used for this user account. You can create up to two passwords for each user.
     * @uniqueItems true
     */
    Passwords?: string[];
  };
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
