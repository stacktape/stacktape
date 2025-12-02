// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-publicrepository.json

/**
 * The ``AWS::ECR::PublicRepository`` resource specifies an Amazon Elastic Container Registry Public
 * (Amazon ECR Public) repository, where users can push and pull Docker images, Open Container
 * Initiative (OCI) images, and OCI compatible artifacts. For more information, see [Amazon ECR public
 * repositories](https://docs.aws.amazon.com/AmazonECR/latest/public/public-repositories.html) in the
 * *Amazon ECR Public User Guide*.
 */
export type AwsEcrPublicrepository = {
  /**
   * The name to use for the public repository. The repository name may be specified on its own (such as
   * ``nginx-web-app``) or it can be prepended with a namespace to group the repository into a category
   * (such as ``project-a/nginx-web-app``). If you don't specify a name, CFNlong generates a unique
   * physical ID and uses that ID for the repository name. For more information, see [Name
   * Type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * If you specify a name, you cannot perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   * @minLength 2
   * @maxLength 256
   * @pattern ^(?=.{2,256}$)((?:[a-z0-9]+(?:[._-][a-z0-9]+)*/)*[a-z0-9]+(?:[._-][a-z0-9]+)*)$
   */
  RepositoryName?: string;
  /**
   * The JSON repository policy text to apply to the public repository. For more information, see
   * [Amazon ECR Public repository
   * policies](https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-policies.html) in
   * the *Amazon ECR Public User Guide*.
   */
  RepositoryPolicyText?: Record<string, unknown> | string;
  Arn?: string;
  /**
   * The details about the repository that are publicly visible in the Amazon ECR Public Gallery. For
   * more information, see [Amazon ECR Public repository catalog
   * data](https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-catalog-data.html) in
   * the *Amazon ECR Public User Guide*.
   */
  RepositoryCatalogData?: {
    RepositoryDescription?: string;
    Architectures?: string[];
    OperatingSystems?: string[];
    AboutText?: string;
    UsageText?: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * One part of a key-value pair that make up a tag. A ``key`` is a general label that acts like a
     * category for more specific tag values.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * A ``value`` acts as a descriptor within a tag category (key).
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
