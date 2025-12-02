// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-runtime.json

/** Resource Type definition for AWS::BedrockAgentCore::Runtime */
export type AwsBedrockagentcoreRuntime = {
  /** The Amazon Resource Name(ARN) that uniquely identifies the Agent */
  AgentRuntimeArn?: string;
  /** Identifier for a resource */
  AgentRuntimeId?: string;
  /** Name for a resource */
  AgentRuntimeName: string;
  /** Description of the resource */
  Description?: string;
  /** The artifact of the agent */
  AgentRuntimeArtifact: {
    ContainerConfiguration?: {
      ContainerUri: string;
    };
    CodeConfiguration?: {
      Code: {
        S3?: {
          /**
           * S3 bucket name
           * @pattern ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$
           */
          Bucket: string;
          /**
           * S3 object key prefix
           * @minLength 1
           * @maxLength 1024
           */
          Prefix: string;
          /**
           * S3 object version ID
           * @minLength 3
           * @maxLength 1024
           */
          VersionId?: string;
        };
      };
      Runtime: "PYTHON_3_10" | "PYTHON_3_11" | "PYTHON_3_12" | "PYTHON_3_13";
      EntryPoint: string[];
    };
  };
  /** Amazon Resource Name (ARN) of an IAM role */
  RoleArn: string;
  /** Network access configuration for the Agent */
  NetworkConfiguration: {
    NetworkMode: "PUBLIC" | "VPC";
    NetworkModeConfig?: {
      SecurityGroups: string[];
      Subnets: string[];
    };
  };
  /** Protocol configuration for the agent runtime */
  ProtocolConfiguration?: "MCP" | "HTTP" | "A2A";
  /** Environment variables for the agent runtime */
  EnvironmentVariables?: Record<string, string>;
  /** Authorizer configuration for the agent runtime */
  AuthorizerConfiguration?: {
    CustomJWTAuthorizer?: {
      DiscoveryUrl: string;
      AllowedAudience?: string[];
      AllowedClients?: string[];
    };
  };
  /** Lifecycle configuration for managing runtime sessions */
  LifecycleConfiguration?: {
    /**
     * Timeout in seconds for idle runtime sessions
     * @minimum 60
     * @maximum 28800
     */
    IdleRuntimeSessionTimeout?: number;
    /**
     * Maximum lifetime in seconds for runtime sessions
     * @minimum 60
     * @maximum 28800
     */
    MaxLifetime?: number;
  };
  /** Configuration for HTTP request headers */
  RequestHeaderConfiguration?: {
    RequestHeaderAllowlist?: string[];
  };
  /** Version of the Agent */
  AgentRuntimeVersion?: string;
  /** Workload identity details for the agent */
  WorkloadIdentityDetails?: {
    WorkloadIdentityArn: string;
  };
  /** Timestamp when the Agent was created */
  CreatedAt?: string;
  /** When resource was last updated */
  LastUpdatedAt?: string;
  /** Current status of the agent */
  Status?: "CREATING" | "CREATE_FAILED" | "UPDATING" | "UPDATE_FAILED" | "READY" | "DELETING";
  Tags?: Record<string, string>;
};
