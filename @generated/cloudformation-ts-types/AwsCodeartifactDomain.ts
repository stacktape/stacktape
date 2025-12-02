// This file is auto-generated. Do not edit manually.
// Source: aws-codeartifact-domain.json

/** The resource schema to create a CodeArtifact domain. */
export type AwsCodeartifactDomain = {
  /**
   * The name of the domain.
   * @minLength 2
   * @maxLength 50
   * @pattern ^([a-z][a-z0-9\-]{0,48}[a-z0-9])$
   */
  DomainName: string;
  /**
   * The name of the domain. This field is used for GetAtt
   * @minLength 2
   * @maxLength 50
   * @pattern ^([a-z][a-z0-9\-]{0,48}[a-z0-9])$
   */
  Name?: string;
  /**
   * The 12-digit account ID of the AWS account that owns the domain. This field is used for GetAtt
   * @pattern [0-9]{12}
   */
  Owner?: string;
  /** The ARN of an AWS Key Management Service (AWS KMS) key associated with a domain. */
  EncryptionKey?: string;
  /**
   * The access control resource policy on the provided domain.
   * @minLength 2
   * @maxLength 5120
   */
  PermissionsPolicyDocument?: Record<string, unknown>;
  /** An array of key-value pairs to apply to this resource. */
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
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The ARN of the domain.
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
};
