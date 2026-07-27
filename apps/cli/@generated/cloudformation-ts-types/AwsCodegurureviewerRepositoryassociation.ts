// This file is auto-generated. Do not edit manually.
// Source: aws-codegurureviewer-repositoryassociation.json

/**
 * This resource schema represents the RepositoryAssociation resource in the Amazon CodeGuru Reviewer
 * service.
 */
export type AwsCodegurureviewerRepositoryassociation = {
  /**
   * Name of the repository to be associated.
   * @minLength 1
   * @maxLength 100
   * @pattern ^\S[\w.-]*$
   */
  Name: string;
  /**
   * The type of repository to be associated.
   * @enum ["CodeCommit","Bitbucket","GitHubEnterpriseServer","S3Bucket"]
   */
  Type: "CodeCommit" | "Bitbucket" | "GitHubEnterpriseServer" | "S3Bucket";
  /**
   * The owner of the repository. For a Bitbucket repository, this is the username for the account that
   * owns the repository.
   * @minLength 1
   * @maxLength 100
   * @pattern ^\S(.*\S)?$
   */
  Owner?: string;
  /**
   * The name of the S3 bucket associated with an associated S3 repository. It must start with
   * `codeguru-reviewer-`.
   * @minLength 3
   * @maxLength 63
   * @pattern ^\S(.*\S)?$
   */
  BucketName?: string;
  /**
   * The Amazon Resource Name (ARN) of an AWS CodeStar Connections connection.
   * @minLength 0
   * @maxLength 256
   * @pattern arn:aws(-[\w]+)*:.+:.+:[0-9]{12}:.+
   */
  ConnectionArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the repository association.
   * @minLength 0
   * @maxLength 256
   * @pattern arn:aws(-[\w]+)*:.+:.+:[0-9]{12}:.+
   */
  AssociationArn?: string;
  /**
   * The tags associated with a repository association.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. The allowed characters across services are: letters, numbers, and
     * spaces representable in UTF-8, and the following characters: + - = . _ : / @.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length. The
     * allowed characters across services are: letters, numbers, and spaces representable in UTF-8, and
     * the following characters: + - = . _ : / @.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
