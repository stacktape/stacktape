// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-server.json

/** Definition of AWS::Transfer::Server Resource Type */
export type AwsTransferServer = {
  /**
   * @minLength 20
   * @maxLength 1600
   * @pattern ^arn:\S+$
   */
  Arn?: string;
  /**
   * The list of egress IP addresses of this server. These IP addresses are only relevant for servers
   * that use the AS2 protocol. They are used for sending asynchronous MDNs. These IP addresses are
   * assigned automatically when you create an AS2 server. Additionally, if you update an existing
   * server and add the AS2 protocol, static IP addresses are assigned as well.
   */
  As2ServiceManagedEgressIpAddresses?: string[];
  /**
   * @minLength 0
   * @maxLength 1600
   */
  Certificate?: string;
  Domain?: "S3" | "EFS";
  EndpointDetails?: {
    AddressAllocationIds?: string[];
    SubnetIds?: string[];
    /**
     * @minLength 22
     * @maxLength 22
     * @pattern ^vpce-[0-9a-f]{17}$
     */
    VpcEndpointId?: string;
    VpcId?: string;
    SecurityGroupIds?: string[];
  };
  EndpointType?: "PUBLIC" | "VPC" | "VPC_ENDPOINT";
  IdentityProviderDetails?: {
    /**
     * @minLength 0
     * @maxLength 255
     */
    Url?: string;
    /**
     * @minLength 20
     * @maxLength 2048
     * @pattern ^arn:.*role/\S+$
     */
    InvocationRole?: string;
    /**
     * @minLength 12
     * @maxLength 12
     * @pattern ^d-[0-9a-f]{10}$
     */
    DirectoryId?: string;
    /**
     * @minLength 1
     * @maxLength 170
     * @pattern ^arn:[a-z-]+:lambda:.*$
     */
    Function?: string;
    SftpAuthenticationMethods?: "PASSWORD" | "PUBLIC_KEY" | "PUBLIC_KEY_OR_PASSWORD" | "PUBLIC_KEY_AND_PASSWORD";
  };
  IdentityProviderType?: "SERVICE_MANAGED" | "API_GATEWAY" | "AWS_DIRECTORY_SERVICE" | "AWS_LAMBDA";
  IpAddressType?: "IPV4" | "DUALSTACK";
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern ^(|arn:.*role/\S+)$
   */
  LoggingRole?: string;
  /**
   * @minLength 0
   * @maxLength 4096
   * @pattern ^[\x09-\x0D\x20-\x7E]*$
   */
  PostAuthenticationLoginBanner?: string;
  /**
   * @minLength 0
   * @maxLength 4096
   * @pattern ^[\x09-\x0D\x20-\x7E]*$
   */
  PreAuthenticationLoginBanner?: string;
  ProtocolDetails?: {
    /**
     * @minLength 0
     * @maxLength 15
     */
    PassiveIp?: string;
    TlsSessionResumptionMode?: "DISABLED" | "ENABLED" | "ENFORCED";
    SetStatOption?: "DEFAULT" | "ENABLE_NO_OP";
    /**
     * @minItems 1
     * @maxItems 1
     */
    As2Transports?: "HTTP"[];
  };
  /**
   * @minItems 1
   * @maxItems 4
   */
  Protocols?: ("SFTP" | "FTP" | "FTPS" | "AS2")[];
  S3StorageOptions?: {
    DirectoryListingOptimization?: "ENABLED" | "DISABLED";
  };
  /**
   * @minLength 0
   * @maxLength 100
   * @pattern ^TransferSecurityPolicy-.+$
   */
  SecurityPolicyName?: string;
  /**
   * @minLength 19
   * @maxLength 19
   * @pattern ^s-([0-9a-f]{17})$
   */
  ServerId?: string;
  State?: "OFFLINE" | "ONLINE" | "STARTING" | "STOPPING" | "START_FAILED" | "STOP_FAILED";
  /**
   * @minItems 0
   * @maxItems 1
   */
  StructuredLogDestinations?: string[];
  /**
   * @minItems 1
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 0
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  WorkflowDetails?: {
    /**
     * @minItems 0
     * @maxItems 1
     */
    OnUpload?: {
      /**
       * @minLength 19
       * @maxLength 19
       * @pattern ^w-([a-z0-9]{17})$
       */
      WorkflowId: string;
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:.*role/\S+$
       */
      ExecutionRole: string;
    }[];
    /**
     * @minItems 0
     * @maxItems 1
     */
    OnPartialUpload?: {
      /**
       * @minLength 19
       * @maxLength 19
       * @pattern ^w-([a-z0-9]{17})$
       */
      WorkflowId: string;
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:.*role/\S+$
       */
      ExecutionRole: string;
    }[];
  };
};
