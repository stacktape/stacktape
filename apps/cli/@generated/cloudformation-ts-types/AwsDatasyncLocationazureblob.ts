// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationazureblob.json

/** Resource Type definition for AWS::DataSync::LocationAzureBlob. */
export type AwsDatasyncLocationazureblob = {
  /**
   * Specifies the Amazon Resource Name (ARN) of the DataSync agent that can connect with your Azure
   * Blob Storage container. If you are setting up an agentless cross-cloud transfer, you do not need to
   * specify a value for this parameter.
   * @minItems 1
   * @maxItems 4
   */
  AgentArns?: string[];
  /**
   * The specific authentication type that you want DataSync to use to access your Azure Blob Container.
   * @default "SAS"
   * @enum ["SAS","NONE"]
   */
  AzureBlobAuthenticationType: "SAS" | "NONE";
  AzureBlobSasConfiguration?: {
    /**
     * Specifies the shared access signature (SAS) token, which indicates the permissions DataSync needs
     * to access your Azure Blob Storage container.
     * @minLength 1
     * @maxLength 255
     * @pattern (^.+$)
     */
    AzureBlobSasToken: string;
  };
  /**
   * The URL of the Azure Blob container that was described.
   * @maxLength 325
   * @pattern ^https://[A-Za-z0-9]((.|-+)?[A-Za-z0-9]){0,252}/[a-z0-9](-?[a-z0-9]){2,62}$
   */
  AzureBlobContainerUrl?: string;
  /**
   * Specifies a blob type for the objects you're transferring into your Azure Blob Storage container.
   * @default "BLOCK"
   * @enum ["BLOCK"]
   */
  AzureBlobType?: "BLOCK";
  /**
   * Specifies an access tier for the objects you're transferring into your Azure Blob Storage
   * container.
   * @default "HOT"
   * @enum ["HOT","COOL","ARCHIVE"]
   */
  AzureAccessTier?: "HOT" | "COOL" | "ARCHIVE";
  /**
   * The subdirectory in the Azure Blob Container that is used to read data from the Azure Blob Source
   * Location.
   * @maxLength 1024
   * @pattern ^[\p{L}\p{M}\p{Z}\p{S}\p{N}\p{P}\p{C}]*$
   */
  Subdirectory?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:/-]+$
     */
    Key: string;
    /**
     * The value for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
     */
    Value: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) of the Azure Blob Location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the Azure Blob Location that was described.
   * @maxLength 4356
   * @pattern ^(azure-blob)://[a-zA-Z0-9./\-]+$
   */
  LocationUri?: string;
  CmkSecretConfig?: {
    /**
     * Specifies the ARN for an AWS Secrets Manager secret, managed by DataSync.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z-0-9]+:[0-9]{12}:secret:.*|)$
     */
    SecretArn?: string;
    /**
     * Specifies the ARN for the customer-managed AWS KMS key used to encrypt the secret specified for
     * SecretArn. DataSync provides this key to AWS Secrets Manager.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):kms:[a-z-0-9]+:[0-9]{12}:key/.*|)$
     */
    KmsKeyArn?: string;
  };
  CustomSecretConfig?: {
    /**
     * Specifies the ARN for a customer created AWS Secrets Manager secret.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z-0-9]+:[0-9]{12}:secret:.*|)$
     */
    SecretArn: string;
    /**
     * Specifies the ARN for the AWS Identity and Access Management role that DataSync uses to access the
     * secret specified for SecretArn.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):iam::[0-9]{12}:role/.*|)$
     */
    SecretAccessRoleArn: string;
  };
  ManagedSecretConfig?: {
    /**
     * Specifies the ARN for an AWS Secrets Manager secret.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z-0-9]+:[0-9]{12}:secret:.*|)$
     */
    SecretArn: string;
  };
};
