// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationobjectstorage.json

/** Resource Type definition for AWS::DataSync::LocationObjectStorage. */
export type AwsDatasyncLocationobjectstorage = {
  /**
   * Optional. The access key is used if credentials are required to access the self-managed object
   * storage server.
   * @minLength 1
   * @maxLength 200
   * @pattern ^.+$
   */
  AccessKey?: string;
  /**
   * Specifies the Amazon Resource Names (ARNs) of the DataSync agents that can connect with your object
   * storage system. If you are setting up an agentless cross-cloud transfer, you do not need to specify
   * a value for this parameter.
   * @minItems 1
   * @maxItems 4
   */
  AgentArns?: string[];
  /**
   * The name of the bucket on the self-managed object storage server.
   * @minLength 3
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\$\p{Zs}]+$
   */
  BucketName?: string;
  /**
   * Optional. The secret key is used if credentials are required to access the self-managed object
   * storage server.
   * @minLength 8
   * @maxLength 200
   * @pattern ^.+$
   */
  SecretKey?: string;
  /**
   * X.509 PEM content containing a certificate authority or chain to trust.
   * @maxLength 32768
   */
  ServerCertificate?: string;
  /**
   * The name of the self-managed object storage server. This value is the IP address or Domain Name
   * Service (DNS) name of the object storage server.
   * @maxLength 255
   * @pattern ^(([a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9\-]*[A-Za-z0-9])$
   */
  ServerHostname?: string;
  /**
   * The port that your self-managed server accepts inbound network traffic on.
   * @minimum 1
   * @maximum 65536
   */
  ServerPort?: number;
  /**
   * The protocol that the object storage server uses to communicate.
   * @enum ["HTTPS","HTTP"]
   */
  ServerProtocol?: "HTTPS" | "HTTP";
  /**
   * The subdirectory in the self-managed object storage server that is used to read data from.
   * @maxLength 4096
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\p{Zs}]*$
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
   * The Amazon Resource Name (ARN) of the location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the object storage location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw|object-storage)://[a-zA-Z0-9./\-]+$
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
