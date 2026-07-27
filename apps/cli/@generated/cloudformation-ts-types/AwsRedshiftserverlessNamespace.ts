// This file is auto-generated. Do not edit manually.
// Source: aws-redshiftserverless-namespace.json

/** Definition of AWS::RedshiftServerless::Namespace Resource Type */
export type AwsRedshiftserverlessNamespace = {
  /**
   * The ID of the AWS Key Management Service (KMS) key used to encrypt and store the namespace's admin
   * credentials secret. You can only use this parameter if manageAdminPassword is true.
   */
  AdminPasswordSecretKmsKeyId?: string;
  /**
   * The password associated with the admin user for the namespace that is being created. Password must
   * be at least 8 characters in length, should be any printable ASCII character. Must contain at least
   * one lowercase letter, one uppercase letter and one decimal digit. You can't use adminUserPassword
   * if manageAdminPassword is true.
   * @minLength 8
   * @maxLength 64
   * @pattern ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\x00-\x20\x22\x27\x2f\x40\x5c\x7f-\uffff]+
   */
  AdminUserPassword?: string;
  /**
   * The user name associated with the admin user for the namespace that is being created. Only
   * alphanumeric characters and underscores are allowed. It should start with an alphabet.
   * @pattern [a-zA-Z][a-zA-Z_0-9+.@-]*
   */
  AdminUsername?: string;
  /**
   * The database name associated for the namespace that is being created. Only alphanumeric characters
   * and underscores are allowed. It should start with an alphabet.
   * @maxLength 127
   * @pattern [a-zA-Z][a-zA-Z_0-9+.@-]*
   */
  DbName?: string;
  /** The default IAM role ARN for the namespace that is being created. */
  DefaultIamRoleArn?: string;
  /**
   * A list of AWS Identity and Access Management (IAM) roles that can be used by the namespace to
   * access other AWS services. You must supply the IAM roles in their Amazon Resource Name (ARN)
   * format. The Default role limit for each request is 10.
   */
  IamRoles?: string[];
  /**
   * The AWS Key Management Service (KMS) key ID of the encryption key that you want to use to encrypt
   * data in the namespace.
   */
  KmsKeyId?: string;
  /**
   * The collection of log types to be exported provided by the customer. Should only be one of the
   * three supported log types: userlog, useractivitylog and connectionlog
   * @minItems 0
   * @maxItems 16
   */
  LogExports?: ("useractivitylog" | "userlog" | "connectionlog")[];
  /**
   * If true, Amazon Redshift uses AWS Secrets Manager to manage the namespace's admin credentials. You
   * can't use adminUserPassword if manageAdminPassword is true. If manageAdminPassword is false or not
   * set, Amazon Redshift uses adminUserPassword for the admin user account's password.
   */
  ManageAdminPassword?: boolean;
  /** Definition of Namespace resource. */
  Namespace?: {
    NamespaceArn?: string;
    NamespaceId?: string;
    /**
     * @minLength 3
     * @maxLength 64
     * @pattern ^[a-z0-9-]+$
     */
    NamespaceName?: string;
    AdminUsername?: string;
    /** @pattern [a-zA-Z][a-zA-Z_0-9+.@-]* */
    DbName?: string;
    KmsKeyId?: string;
    DefaultIamRoleArn?: string;
    IamRoles?: string[];
    /**
     * @minItems 0
     * @maxItems 16
     */
    LogExports?: ("useractivitylog" | "userlog" | "connectionlog")[];
    Status?: "AVAILABLE" | "MODIFYING" | "DELETING";
    CreationDate?: string;
    AdminPasswordSecretArn?: string;
    AdminPasswordSecretKmsKeyId?: string;
  };
  /**
   * A unique identifier for the namespace. You use this identifier to refer to the namespace for any
   * subsequent namespace operations such as deleting or modifying. All alphabetical characters must be
   * lower case. Namespace name should be unique for all namespaces within an AWS account.
   * @minLength 3
   * @maxLength 64
   * @pattern ^[a-z0-9-]+$
   */
  NamespaceName: string;
  /**
   * The list of tags for the namespace.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The name of the namespace the source snapshot was created from. Please specify the name if needed
   * before deleting namespace
   * @maxLength 255
   * @pattern [a-z][a-z0-9]*(-[a-z0-9]+)*
   */
  FinalSnapshotName?: string;
  /**
   * The number of days to retain automated snapshot in the destination region after they are copied
   * from the source region. If the value is -1, the manual snapshot is retained indefinitely. The value
   * must be either -1 or an integer between 1 and 3,653.
   */
  FinalSnapshotRetentionPeriod?: number;
  /** The resource policy document that will be attached to the namespace. */
  NamespaceResourcePolicy?: Record<string, unknown>;
  /** The ARN for the Redshift application that integrates with IAM Identity Center. */
  RedshiftIdcApplicationArn?: string;
  /**
   * The snapshot copy configurations for the namespace.
   * @minItems 0
   * @maxItems 1
   */
  SnapshotCopyConfigurations?: {
    DestinationRegion: string;
    DestinationKmsKeyId?: string;
    SnapshotRetentionPeriod?: number;
  }[];
};
