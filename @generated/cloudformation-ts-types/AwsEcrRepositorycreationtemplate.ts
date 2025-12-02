// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-repositorycreationtemplate.json

/** The details of the repository creation template associated with the request. */
export type AwsEcrRepositorycreationtemplate = {
  /**
   * The repository namespace prefix associated with the repository creation template.
   * @minLength 1
   * @maxLength 256
   * @pattern ^((?:[a-z0-9]+(?:[._-][a-z0-9]+)*/)*[a-z0-9]+(?:[._-][a-z0-9]+)*/?|ROOT)$
   */
  Prefix: string;
  /**
   * The description associated with the repository creation template.
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * The tag mutability setting for the repository. If this parameter is omitted, the default setting of
   * ``MUTABLE`` will be used which will allow image tags to be overwritten. If ``IMMUTABLE`` is
   * specified, all image tags within the repository will be immutable which will prevent them from
   * being overwritten.
   * @enum ["MUTABLE","IMMUTABLE","IMMUTABLE_WITH_EXCLUSION","MUTABLE_WITH_EXCLUSION"]
   */
  ImageTagMutability?: "MUTABLE" | "IMMUTABLE" | "IMMUTABLE_WITH_EXCLUSION" | "MUTABLE_WITH_EXCLUSION";
  /**
   * A list of filters that specify which image tags are excluded from the repository creation
   * template's image tag mutability setting.
   * @minItems 1
   * @maxItems 5
   */
  ImageTagMutabilityExclusionFilters?: {
    /** @enum ["WILDCARD"] */
    ImageTagMutabilityExclusionFilterType: "WILDCARD";
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[0-9a-zA-Z._*-]{1,128}
     */
    ImageTagMutabilityExclusionFilterValue: string;
  }[];
  /**
   * The repository policy to apply to repositories created using the template. A repository policy is a
   * permissions policy associated with a repository to control access permissions.
   */
  RepositoryPolicy?: string;
  /**
   * The lifecycle policy to use for repositories created using the template.
   * @minLength 100
   * @maxLength 30720
   */
  LifecyclePolicy?: string;
  /** The encryption configuration associated with the repository creation template. */
  EncryptionConfiguration?: {
    /**
     * The encryption type to use.
     * If you use the ``KMS`` encryption type, the contents of the repository will be encrypted using
     * server-side encryption with KMSlong key stored in KMS. When you use KMS to encrypt your data, you
     * can either use the default AWS managed KMS key for Amazon ECR, or specify your own KMS key, which
     * you already created.
     * If you use the ``KMS_DSSE`` encryption type, the contents of the repository will be encrypted with
     * two layers of encryption using server-side encryption with the KMS Management Service key stored in
     * KMS. Similar to the ``KMS`` encryption type, you can either use the default AWS managed KMS key for
     * Amazon ECR, or specify your own KMS key, which you've already created.
     * If you use the ``AES256`` encryption type, Amazon ECR uses server-side encryption with Amazon
     * S3-managed encryption keys which encrypts the images in the repository using an AES256 encryption
     * algorithm.
     * For more information, see [Amazon ECR encryption at
     * rest](https://docs.aws.amazon.com/AmazonECR/latest/userguide/encryption-at-rest.html) in the
     * *Amazon Elastic Container Registry User Guide*.
     */
    EncryptionType: "AES256" | "KMS" | "KMS_DSSE";
    /**
     * If you use the ``KMS`` encryption type, specify the KMS key to use for encryption. The alias, key
     * ID, or full ARN of the KMS key can be specified. The key must exist in the same Region as the
     * repository. If no key is specified, the default AWS managed KMS key for Amazon ECR will be used.
     */
    KmsKey?: string;
  };
  /**
   * The metadata to apply to the repository to help you categorize and organize. Each tag consists of a
   * key and an optional value, both of which you define. Tag keys can have a maximum character length
   * of 128 characters, and tag values can have a maximum length of 256 characters.
   * @maxItems 50
   * @uniqueItems true
   */
  ResourceTags?: {
    /**
     * One part of a key-value pair that make up a tag. A ``key`` is a general label that acts like a
     * category for more specific tag values.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A ``value`` acts as a descriptor within a tag category (key).
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * A list of enumerable Strings representing the repository creation scenarios that this template will
   * apply towards. The two supported scenarios are PULL_THROUGH_CACHE and REPLICATION
   * @uniqueItems true
   */
  AppliedFor: ("REPLICATION" | "PULL_THROUGH_CACHE")[];
  /**
   * The ARN of the role to be assumed by Amazon ECR. Amazon ECR will assume your supplied role when the
   * customRoleArn is specified. When this field isn't specified, Amazon ECR will use the service-linked
   * role for the repository creation template.
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z0-9]*:iam::[0-9]{12}:role/[A-Za-z0-9+=,-.@_]*$
   */
  CustomRoleArn?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};
