// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-gateway.json

/** Definition of AWS::BedrockAgentCore::Gateway Resource Type */
export type AwsBedrockagentcoreGateway = {
  AuthorizerConfiguration?: {
    CustomJWTAuthorizer: {
      /** @pattern ^.+/\.well-known/openid-configuration$ */
      DiscoveryUrl: string;
      /** @minItems 1 */
      AllowedAudience?: string[];
      /** @minItems 1 */
      AllowedClients?: string[];
    };
  };
  AuthorizerType: "CUSTOM_JWT" | "AWS_IAM";
  CreatedAt?: string;
  /**
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  ExceptionLevel?: "DEBUG";
  /** @pattern ^arn:aws(|-cn|-us-gov):bedrock-agentcore:[a-z0-9-]{1,20}:[0-9]{12}:gateway/([0-9a-z][-]?){1,100}-[a-z0-9]{10}$ */
  GatewayArn?: string;
  /** @pattern ^([0-9a-z][-]?){1,100}-[0-9a-z]{10}$ */
  GatewayIdentifier?: string;
  /**
   * @minLength 1
   * @maxLength 1024
   */
  GatewayUrl?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(|-cn|-us-gov):kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
   */
  KmsKeyArn?: string;
  /** @pattern ^([0-9a-zA-Z][-]?){1,100}$ */
  Name: string;
  ProtocolConfiguration?: {
    Mcp: {
      SupportedVersions?: string[];
      /**
       * @minLength 1
       * @maxLength 2048
       */
      Instructions?: string;
      SearchType?: "SEMANTIC";
    };
  };
  ProtocolType: "MCP";
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:iam::([0-9]{12})?:role/.+$
   */
  RoleArn: string;
  Status?: "CREATING" | "UPDATING" | "UPDATE_UNSUCCESSFUL" | "DELETING" | "READY" | "FAILED";
  /** @maxItems 100 */
  StatusReasons?: string[];
  Tags?: Record<string, string>;
  UpdatedAt?: string;
  WorkloadIdentityDetails?: {
    /**
     * @minLength 1
     * @maxLength 1024
     */
    WorkloadIdentityArn: string;
  };
};
