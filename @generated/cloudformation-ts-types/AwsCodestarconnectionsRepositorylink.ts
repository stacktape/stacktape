// This file is auto-generated. Do not edit manually.
// Source: aws-codestarconnections-repositorylink.json

/**
 * Schema for AWS::CodeStarConnections::RepositoryLink resource which is used to aggregate repository
 * metadata relevant to synchronizing source provider content to AWS Resources.
 */
export type AwsCodestarconnectionsRepositorylink = {
  /**
   * The Amazon Resource Name (ARN) of the CodeStarConnection. The ARN is used as the connection
   * reference when the connection is shared between AWS services.
   * @pattern arn:(aws|aws-us-gov|aws-cn):.+:.+:[0-9]{12}:.+
   */
  ConnectionArn: string;
  /**
   * The name of the external provider where your third-party code repository is configured.
   * @enum ["GitHub","Bitbucket","GitHubEnterprise","GitLab","GitLabSelfManaged"]
   */
  ProviderType?: "GitHub" | "Bitbucket" | "GitHubEnterprise" | "GitLab" | "GitLabSelfManaged";
  /**
   * the ID of the entity that owns the repository.
   * @pattern [a-za-z0-9_\.-]+
   */
  OwnerId: string;
  /**
   * The repository for which the link is being created.
   * @pattern [a-za-z0-9_\.-]+
   */
  RepositoryName: string;
  /**
   * The ARN of the KMS key that the customer can optionally specify to use to encrypt RepositoryLink
   * properties. If not specified, a default key will be used.
   * @pattern arn:(aws|aws-us-gov|aws-cn):.+:.+:[0-9]{12}:.+
   */
  EncryptionKeyArn?: string;
  /**
   * A UUID that uniquely identifies the RepositoryLink.
   * @pattern [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
   */
  RepositoryLinkId?: string;
  /**
   * A unique Amazon Resource Name (ARN) to designate the repository link.
   * @pattern arn:(aws|aws-us-gov|aws-cn):.+:.+:[0-9]{12}:.+
   */
  RepositoryLinkArn?: string;
  /** Specifies the tags applied to a RepositoryLink. */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, , ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, , ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
