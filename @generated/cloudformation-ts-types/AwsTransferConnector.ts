// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-connector.json

/** Resource Type definition for AWS::Transfer::Connector */
export type AwsTransferConnector = {
  /**
   * Specifies the access role for the connector.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:.*role/.*
   */
  AccessRole: string;
  /** Configuration for an AS2 connector. */
  As2Config?: {
    /**
     * A unique identifier for the local profile.
     * @minLength 19
     * @maxLength 19
     * @pattern ^p-([0-9a-f]{17})$
     */
    LocalProfileId?: string;
    /**
     * A unique identifier for the partner profile.
     * @minLength 19
     * @maxLength 19
     * @pattern ^p-([0-9a-f]{17})$
     */
    PartnerProfileId?: string;
    /**
     * The message subject for this AS2 connector configuration.
     * @minLength 1
     * @maxLength 1024
     * @pattern ^[\u0020-\u007E\t]+$
     */
    MessageSubject?: string;
    /**
     * Compression setting for this AS2 connector configuration.
     * @enum ["ZLIB","DISABLED"]
     */
    Compression?: "ZLIB" | "DISABLED";
    /**
     * Encryption algorithm for this AS2 connector configuration.
     * @enum ["AES128_CBC","AES192_CBC","AES256_CBC","NONE","DES_EDE3_CBC"]
     */
    EncryptionAlgorithm?: "AES128_CBC" | "AES192_CBC" | "AES256_CBC" | "NONE" | "DES_EDE3_CBC";
    /**
     * Signing algorithm for this AS2 connector configuration.
     * @enum ["SHA256","SHA384","SHA512","SHA1","NONE"]
     */
    SigningAlgorithm?: "SHA256" | "SHA384" | "SHA512" | "SHA1" | "NONE";
    /**
     * MDN Signing algorithm for this AS2 connector configuration.
     * @enum ["SHA256","SHA384","SHA512","SHA1","NONE","DEFAULT"]
     */
    MdnSigningAlgorithm?: "SHA256" | "SHA384" | "SHA512" | "SHA1" | "NONE" | "DEFAULT";
    /**
     * MDN Response setting for this AS2 connector configuration.
     * @enum ["SYNC","NONE"]
     */
    MdnResponse?: "SYNC" | "NONE";
    /**
     * ARN or name of the secret in AWS Secrets Manager which contains the credentials for Basic
     * authentication. If empty, Basic authentication is disabled for the AS2 connector
     * @minLength 0
     * @maxLength 2048
     */
    BasicAuthSecretId?: string;
    /**
     * Specifies whether to use the AWS S3 object content-type as the content-type for the AS2 message.
     * @enum ["ENABLED","DISABLED"]
     */
    PreserveContentType?: "ENABLED" | "DISABLED";
  };
  /** Specifies the egress type for the connector. */
  EgressType?: "SERVICE_MANAGED" | "VPC_LATTICE";
  /** Egress configuration for the connector. */
  EgressConfig?: {
    VpcLattice: {
      /**
       * ARN of the VPC Lattice resource configuration
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:resourceconfiguration/rcfg-[0-9a-z]{17}$
       */
      ResourceConfigurationArn: string;
      /**
       * Port to connect to on the target VPC Lattice resource
       * @minimum 1
       * @maximum 65535
       */
      PortNumber?: number;
    };
  };
  Status?: "ACTIVE" | "PENDING" | "ERRORED";
  /** Configuration for an SFTP connector. */
  SftpConfig?: {
    /**
     * ARN or name of the secret in AWS Secrets Manager which contains the SFTP user's private keys or
     * passwords.
     * @minLength 1
     * @maxLength 2048
     */
    UserSecretId?: string;
    /**
     * List of public host keys, for the external server to which you are connecting.
     * @maxItems 10
     * @uniqueItems false
     */
    TrustedHostKeys?: string[];
    /**
     * Specifies the number of active connections that your connector can establish with the remote server
     * at the same time.
     * @default 1
     * @minimum 1
     * @maximum 5
     */
    MaxConcurrentConnections?: number;
  };
  /**
   * Specifies the unique Amazon Resource Name (ARN) for the connector.
   * @minLength 20
   * @maxLength 1600
   * @pattern arn:.*
   */
  Arn?: string;
  /**
   * A unique identifier for the connector.
   * @minLength 19
   * @maxLength 19
   * @pattern ^c-([0-9a-f]{17})$
   */
  ConnectorId?: string;
  /**
   * Specifies the logging role for the connector.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:.*role/.*
   */
  LoggingRole?: string;
  /**
   * The list of egress IP addresses of this connector. These IP addresses are assigned automatically
   * when you create the connector.
   */
  ServiceManagedEgressIpAddresses?: string[];
  /**
   * Key-value pairs that can be used to group and search for connectors. Tags are metadata attached to
   * connectors for any purpose.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The name assigned to the tag that you create.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Contains one or more values that you assigned to the key name you create.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * URL for Connector
   * @maxLength 255
   */
  Url?: string;
  /**
   * Security policy for SFTP Connector
   * @maxLength 50
   * @pattern TransferSFTPConnectorSecurityPolicy-[A-Za-z0-9-]+
   */
  SecurityPolicyName?: string;
};
