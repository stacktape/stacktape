// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-domain.json

/** A domain is an organizing entity for connecting together assets, users, and their projects */
export type AwsDatazoneDomain = {
  /**
   * The ID of the root domain in Amazon Datazone.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_\-]+$
   */
  RootDomainUnitId?: string;
  /**
   * The ARN of the Amazon DataZone domain.
   * @pattern ^arn:aws(|-cn|-us-gov):datazone:\w+(?:-\w+)+:\d{12}:domain/dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  Arn?: string;
  /** The timestamp of when the Amazon DataZone domain was last updated. */
  CreatedAt?: string;
  /** The description of the Amazon DataZone domain. */
  Description?: string;
  /**
   * The domain execution role that is created when an Amazon DataZone domain is created. The domain
   * execution role is created in the AWS account that houses the Amazon DataZone domain.
   * @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$
   */
  DomainExecutionRole: string;
  /**
   * The service role of the domain that is created.
   * @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$
   */
  ServiceRole?: string;
  /**
   * The version of the domain.
   * @enum ["V1","V2"]
   */
  DomainVersion?: "V1" | "V2";
  /**
   * The id of the Amazon DataZone domain.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /**
   * The identifier of the AWS Key Management Service (KMS) key that is used to encrypt the Amazon
   * DataZone domain, metadata, and reporting data.
   * @minLength 1
   * @maxLength 1024
   * @pattern ^arn:aws(|-cn|-us-gov):kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
   */
  KmsKeyIdentifier?: string;
  /** The timestamp of when the Amazon DataZone domain was last updated. */
  LastUpdatedAt?: string;
  /** The identifier of the AWS account that manages the domain. */
  ManagedAccountId?: string;
  /** The name of the Amazon DataZone domain. */
  Name: string;
  /** The URL of the data portal for this Amazon DataZone domain. */
  PortalUrl?: string;
  /** The single-sign on configuration of the Amazon DataZone domain. */
  SingleSignOn?: {
    Type?: "IAM_IDC" | "DISABLED";
    UserAssignment?: "AUTOMATIC" | "MANUAL";
    IdcInstanceArn?: string;
  };
  /** The status of the Amazon DataZone domain. */
  Status?: "CREATING" | "AVAILABLE" | "CREATION_FAILED" | "DELETING" | "DELETED" | "DELETION_FAILED";
  /**
   * The tags specified for the Amazon DataZone domain.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
