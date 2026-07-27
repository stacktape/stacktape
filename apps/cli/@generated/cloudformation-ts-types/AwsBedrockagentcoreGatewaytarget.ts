// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-gatewaytarget.json

/** Definition of AWS::BedrockAgentCore::GatewayTarget Resource Type */
export type AwsBedrockagentcoreGatewaytarget = {
  CreatedAt?: string;
  /**
   * @minItems 1
   * @maxItems 1
   */
  CredentialProviderConfigurations: ({
    CredentialProviderType: "GATEWAY_IAM_ROLE" | "OAUTH" | "API_KEY";
    CredentialProvider?: {
      OauthCredentialProvider: {
        /** @pattern ^arn:([^:]*):([^:]*):([^:]*):([0-9]{12})?:(.+)$ */
        ProviderArn: string;
        /** @maxItems 100 */
        Scopes: string[];
        CustomParameters?: Record<string, string>;
      };
    } | {
      ApiKeyCredentialProvider: {
        /** @pattern ^arn:([^:]*):([^:]*):([^:]*):([0-9]{12})?:(.+)$ */
        ProviderArn: string;
        /**
         * @minLength 1
         * @maxLength 64
         */
        CredentialParameterName?: string;
        /**
         * @minLength 1
         * @maxLength 64
         */
        CredentialPrefix?: string;
        CredentialLocation?: "HEADER" | "QUERY_PARAMETER";
      };
    };
  })[];
  /**
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /** @pattern ^arn:aws(|-cn|-us-gov):bedrock-agentcore:[a-z0-9-]{1,20}:[0-9]{12}:gateway/([0-9a-z][-]?){1,100}-[a-z0-9]{10}$ */
  GatewayArn?: string;
  /** @pattern ^([0-9a-z][-]?){1,100}-[0-9a-z]{10}$ */
  GatewayIdentifier?: string;
  LastSynchronizedAt?: string;
  /** @pattern ^([0-9a-zA-Z][-]?){1,100}$ */
  Name: string;
  Status?: "CREATING" | "UPDATING" | "UPDATE_UNSUCCESSFUL" | "DELETING" | "READY" | "FAILED" | "SYNCHRONIZING" | "SYNCHRONIZE_UNSUCCESSFUL";
  /** @maxItems 100 */
  StatusReasons?: string[];
  TargetConfiguration: {
    Mcp: {
      OpenApiSchema: {
        S3: {
          /** @pattern ^s3://.{1,2043}$ */
          Uri?: string;
          /** @pattern ^[0-9]{12}$ */
          BucketOwnerAccountId?: string;
        };
      } | {
        InlinePayload: string;
      };
    } | {
      SmithyModel: {
        S3: {
          /** @pattern ^s3://.{1,2043}$ */
          Uri?: string;
          /** @pattern ^[0-9]{12}$ */
          BucketOwnerAccountId?: string;
        };
      } | {
        InlinePayload: string;
      };
    } | {
      Lambda: {
        /**
         * @minLength 1
         * @maxLength 170
         * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:([a-z]{2}(-gov)?-[a-z]+-\d{1}):(\d{12}):function:([a-zA-Z0-9-_.]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?$
         */
        LambdaArn: string;
        ToolSchema: {
          S3: {
            /** @pattern ^s3://.{1,2043}$ */
            Uri?: string;
            /** @pattern ^[0-9]{12}$ */
            BucketOwnerAccountId?: string;
          };
        } | {
          InlinePayload: ({
            Name: string;
            Description: string;
            InputSchema: {
              Type: "string" | "number" | "object" | "array" | "boolean" | "integer";
              Properties?: Record<string, unknown>;
              Required?: string[];
              Items?: unknown;
              Description?: string;
            };
            OutputSchema?: {
              Type: "string" | "number" | "object" | "array" | "boolean" | "integer";
              Properties?: Record<string, unknown>;
              Required?: string[];
              Items?: unknown;
              Description?: string;
            };
          })[];
        };
      };
    } | {
      McpServer: {
        /** @pattern ^https://.* */
        Endpoint: string;
      };
    };
  };
  /** @pattern ^[0-9a-zA-Z]{10}$ */
  TargetId?: string;
  UpdatedAt?: string;
};
