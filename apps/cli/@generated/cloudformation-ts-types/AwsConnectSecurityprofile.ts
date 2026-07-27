// This file is auto-generated. Do not edit manually.
// Source: aws-connect-securityprofile.json

/** Resource Type definition for AWS::Connect::SecurityProfile */
export type AwsConnectSecurityprofile = {
  /**
   * The list of tags that a security profile uses to restrict access to resources in Amazon Connect.
   * @maxItems 2
   * @uniqueItems true
   */
  AllowedAccessControlTags?: {
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
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The description of the security profile.
   * @minLength 0
   * @maxLength 250
   */
  Description?: string;
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * Permissions assigned to the security profile.
   * @maxItems 500
   * @uniqueItems true
   */
  Permissions?: string[];
  /**
   * The Amazon Resource Name (ARN) for the security profile.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/security-profile/[-a-zA-Z0-9]*$
   */
  SecurityProfileArn?: string;
  /**
   * The name of the security profile.
   * @minLength 1
   * @maxLength 127
   * @pattern ^[ a-zA-Z0-9_@-]+$
   */
  SecurityProfileName: string;
  /**
   * The list of resources that a security profile applies tag restrictions to in Amazon Connect.
   * @maxItems 10
   * @uniqueItems true
   */
  TagRestrictedResources?: string[];
  /**
   * The list of resources that a security profile applies hierarchy restrictions to in Amazon Connect.
   * @maxItems 10
   * @uniqueItems true
   */
  HierarchyRestrictedResources?: string[];
  /**
   * The identifier of the hierarchy group that a security profile uses to restrict access to resources
   * in Amazon Connect.
   * @minLength 0
   * @maxLength 127
   * @pattern ^[a-zA-Z0-9-]+$
   */
  AllowedAccessControlHierarchyGroupId?: string;
  /**
   * A list of third-party applications that the security profile will give access to.
   * @maxItems 10
   * @uniqueItems true
   */
  Applications?: {
    /**
     * The permissions that the agent is granted on the application
     * @maxItems 10
     * @uniqueItems true
     */
    ApplicationPermissions: string[];
    /**
     * Namespace of the application that you want to give access to.
     * @minLength 1
     * @maxLength 128
     */
    Namespace: string;
  }[];
  /**
   * The tags used to organize, track, or control access for this resource.
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
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The AWS Region where this resource was last modified.
   * @pattern [a-z]{2}(-[a-z]+){1,2}(-[0-9])?
   */
  LastModifiedRegion?: string;
  /** The timestamp when this resource was last modified. */
  LastModifiedTime?: number;
  GranularAccessControlConfiguration?: {
    DataTableAccessControlConfiguration?: {
      PrimaryAttributeAccessControlConfiguration?: {
        /**
         * An array of PrimaryAttributeValue objects.
         * @minItems 1
         * @maxItems 5
         * @uniqueItems true
         */
        PrimaryAttributeValues: {
          /**
           * Specifies the type of access granted. Currently, only "ALLOW" is supported
           * @enum ["ALLOW"]
           */
          AccessType: "ALLOW";
          /**
           * The name of the primary attribute.
           * @minLength 1
           * @maxLength 127
           * @pattern ^(?!aws:|connect:)[\p{L}\p{Z}\p{N}\-_.:=@'|]+$
           */
          AttributeName: string;
          /**
           * An array of allowed primary values for the specified primary attribute.
           * @minItems 1
           * @maxItems 2
           * @uniqueItems true
           */
          Values: string[];
        }[];
      };
    };
  };
};
