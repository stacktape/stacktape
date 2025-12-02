// This file is auto-generated. Do not edit manually.
// Source: aws-memorydb-acl.json

/** Resource Type definition for AWS::MemoryDB::ACL */
export type AwsMemorydbAcl = {
  /** Indicates acl status. Can be "creating", "active", "modifying", "deleting". */
  Status?: string;
  /**
   * The name of the acl.
   * @pattern [a-z][a-z0-9\\-]*
   */
  ACLName: string;
  /**
   * List of users associated to this acl.
   * @uniqueItems true
   */
  UserNames?: string[];
  /** The Amazon Resource Name (ARN) of the acl. */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this cluster.
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
