// This file is auto-generated. Do not edit manually.
// Source: aws-ram-permission.json

/** Resource type definition for AWS::RAM::Permission */
export type AwsRamPermission = {
  Arn?: string;
  /** The name of the permission. */
  Name: string;
  /** Version of the permission. */
  Version?: string;
  /** Set to true to use this as the default permission. */
  IsResourceTypeDefault?: boolean;
  PermissionType?: string;
  /** The resource type this permission can be used with. */
  ResourceType: string;
  /** Policy template for the permission. */
  PolicyTemplate: Record<string, unknown>;
  /** @uniqueItems false */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
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
};
