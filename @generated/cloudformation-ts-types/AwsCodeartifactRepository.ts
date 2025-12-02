// This file is auto-generated. Do not edit manually.
// Source: aws-codeartifact-repository.json

/** The resource schema to create a CodeArtifact repository. */
export type AwsCodeartifactRepository = {
  /**
   * The name of the repository.
   * @minLength 2
   * @maxLength 100
   * @pattern ^([A-Za-z0-9][A-Za-z0-9._\-]{1,99})$
   */
  RepositoryName: string;
  /**
   * The name of the repository. This is used for GetAtt
   * @minLength 2
   * @maxLength 100
   * @pattern ^([A-Za-z0-9][A-Za-z0-9._\-]{1,99})$
   */
  Name?: string;
  /**
   * The name of the domain that contains the repository.
   * @minLength 2
   * @maxLength 50
   * @pattern ^([a-z][a-z0-9\-]{0,48}[a-z0-9])$
   */
  DomainName: string;
  /**
   * The 12-digit account ID of the AWS account that owns the domain.
   * @pattern [0-9]{12}
   */
  DomainOwner?: string;
  /**
   * A text description of the repository.
   * @maxLength 1000
   */
  Description?: string;
  /**
   * The ARN of the repository.
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
  /** A list of external connections associated with the repository. */
  ExternalConnections?: string[];
  /** A list of upstream repositories associated with the repository. */
  Upstreams?: string[];
  /**
   * The access control resource policy on the provided repository.
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
};
