// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-prompt.json

/** Definition of AWS::Bedrock::Prompt Resource Type */
export type AwsBedrockPrompt = {
  /**
   * ARN of a prompt resource possibly with a version
   * @minLength 1
   * @maxLength 2048
   * @pattern ^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:prompt/[0-9a-zA-Z]{10})$
   */
  Arn?: string;
  /** Time Stamp. */
  CreatedAt?: string;
  /**
   * Name for a variant.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  DefaultVariant?: string;
  /**
   * Name for a prompt resource.
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * Identifier for a Prompt
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  Id?: string;
  /**
   * Name for a prompt resource.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  Name: string;
  /** Time Stamp. */
  UpdatedAt?: string;
  /**
   * List of prompt variants
   * @minItems 0
   * @maxItems 1
   */
  Variants?: ({
    /**
     * Name for a variant.
     * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
     */
    Name: string;
    TemplateType: "TEXT" | "CHAT";
    TemplateConfiguration: {
      Text: {
        /**
         * Prompt content for String prompt template
         * @minLength 1
         * @maxLength 200000
         */
        Text?: string;
        TextS3Location?: {
          /**
           * A bucket in S3
           * @minLength 3
           * @maxLength 63
           * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
           */
          Bucket: string;
          /**
           * A object key in S3
           * @minLength 1
           * @maxLength 1024
           */
          Key: string;
          /**
           * The version of the the S3 object to use
           * @minLength 1
           * @maxLength 1024
           */
          Version?: string;
        };
        /**
         * List of input variables
         * @minItems 0
         * @maxItems 20
         */
        InputVariables?: {
          /**
           * Name for an input variable
           * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
           */
          Name?: string;
        }[];
        CachePoint?: {
          Type: "default";
        };
      };
    } | {
      Chat: {
        /**
         * List of messages for chat prompt template
         * @minItems 0
         */
        Messages: ({
          Role: "user" | "assistant";
          /**
           * List of Content Blocks
           * @minItems 1
           */
          Content: ({
            /**
             * Configuration for chat prompt template
             * @minLength 1
             */
            Text: string;
          } | {
            CachePoint: {
              Type: "default";
            };
          })[];
        })[];
        /**
         * Configuration for chat prompt template
         * @minItems 0
         */
        System?: ({
          /**
           * Configuration for chat prompt template
           * @minLength 1
           */
          Text: string;
        } | {
          CachePoint: {
            Type: "default";
          };
        })[];
        ToolConfiguration?: {
          /**
           * List of Tools
           * @minItems 1
           */
          Tools: ({
            ToolSpec: {
              /**
               * Tool name
               * @minLength 1
               * @maxLength 64
               * @pattern ^[a-zA-Z][a-zA-Z0-9_]*$
               */
              Name: string;
              /** @minLength 1 */
              Description?: string;
              InputSchema: {
                Json: Record<string, unknown>;
              };
            };
          } | {
            CachePoint: {
              Type: "default";
            };
          })[];
          ToolChoice?: {
            Auto: Record<string, unknown>;
          } | {
            Any: Record<string, unknown>;
          } | {
            Tool: {
              /**
               * Tool name
               * @minLength 1
               * @maxLength 64
               * @pattern ^[a-zA-Z][a-zA-Z0-9_]*$
               */
              Name: string;
            };
          };
        };
        /**
         * List of input variables
         * @minItems 0
         * @maxItems 20
         */
        InputVariables?: {
          /**
           * Name for an input variable
           * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
           */
          Name?: string;
        }[];
      };
    };
    /**
     * ARN or Id of a Bedrock Foundational Model or Inference Profile, or the ARN of a imported model, or
     * a provisioned throughput ARN for custom models.
     * @minLength 1
     * @maxLength 2048
     * @pattern ^(arn:aws(-[^:]{1,12})?:(bedrock|sagemaker):[a-z0-9-]{1,20}:([0-9]{12})?:([a-z-]+/)?)?([a-zA-Z0-9.-]{1,63}){0,2}(([:][a-z0-9-]{1,63}){0,2})?(/[a-z0-9]{1,12})?$
     */
    ModelId?: string;
    InferenceConfiguration?: {
      Text: {
        /**
         * Controls randomness, higher values increase diversity
         * @minimum 0
         * @maximum 1
         */
        Temperature?: number;
        /**
         * Cumulative probability cutoff for token selection
         * @minimum 0
         * @maximum 1
         */
        TopP?: number;
        /**
         * Maximum length of output
         * @minimum 0
         * @maximum 512000
         */
        MaxTokens?: number;
        /**
         * List of stop sequences
         * @minItems 0
         * @maxItems 4
         */
        StopSequences?: string[];
      };
    };
    GenAiResource?: {
      Agent: {
        /**
         * Arn representation of the Agent Alias.
         * @maxLength 2048
         * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:agent-alias/[0-9a-zA-Z]{10}/[0-9a-zA-Z]{10}$
         */
        AgentIdentifier: string;
      };
    };
    AdditionalModelRequestFields?: Record<string, unknown>;
    Metadata?: {
      Key: string;
      Value: string;
    }[];
  })[];
  Tags?: Record<string, string>;
  /**
   * A KMS key ARN
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(|-cn|-us-gov):kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
   */
  CustomerEncryptionKeyArn?: string;
  /**
   * Draft Version.
   * @minLength 5
   * @maxLength 5
   * @pattern ^DRAFT$
   */
  Version?: string;
};
