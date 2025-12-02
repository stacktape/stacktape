// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-flow.json

/** Definition of AWS::Bedrock::Flow Resource Type */
export type AwsBedrockFlow = {
  /**
   * Arn representation of the Flow
   * @minLength 20
   * @maxLength 1011
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:flow/[0-9a-zA-Z]{10}$
   */
  Arn?: string;
  /** Time Stamp. */
  CreatedAt?: string;
  Definition?: {
    /**
     * List of nodes in a flow
     * @maxItems 40
     */
    Nodes?: ({
      /**
       * Name of a node in a flow
       * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
       */
      Name: string;
      Type: "Input" | "Output" | "KnowledgeBase" | "Condition" | "Lex" | "Prompt" | "LambdaFunction" | "Agent" | "Storage" | "Retrieval" | "Iterator" | "Collector" | "InlineCode" | "Loop" | "LoopInput" | "LoopController";
      Configuration?: {
        Input: Record<string, unknown>;
      } | {
        Output: Record<string, unknown>;
      } | {
        KnowledgeBase: {
          /**
           * Identifier of the KnowledgeBase
           * @maxLength 10
           * @pattern ^[0-9a-zA-Z]+$
           */
          KnowledgeBaseId: string;
          /**
           * ARN or Id of a Bedrock Foundational Model or Inference Profile, or the ARN of a imported model, or
           * a provisioned throughput ARN for custom models.
           * @minLength 1
           * @maxLength 2048
           * @pattern ^(arn:aws(-[^:]{1,12})?:(bedrock|sagemaker):[a-z0-9-]{1,20}:([0-9]{12})?:([a-z-]+/)?)?([a-zA-Z0-9.-]{1,63}){0,2}(([:][a-z0-9-]{1,63}){0,2})?(/[a-z0-9]{1,12})?$
           */
          ModelId?: string;
          GuardrailConfiguration?: {
            /**
             * Identifier for the guardrail, could be the id or the arn
             * @maxLength 2048
             * @pattern ^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$
             */
            GuardrailIdentifier?: string;
            /**
             * Version of the guardrail
             * @pattern ^(([0-9]{1,8})|(DRAFT))$
             */
            GuardrailVersion?: string;
          };
          /**
           * Number Of Results to Retrieve
           * @minimum 1
           * @maximum 100
           */
          NumberOfResults?: number;
          PromptTemplate?: {
            /**
             * @minLength 1
             * @maxLength 100000
             */
            TextPromptTemplate: string;
          };
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
               * @maximum 4096
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
          OrchestrationConfiguration?: {
            PromptTemplate?: {
              /**
               * @minLength 1
               * @maxLength 100000
               */
              TextPromptTemplate: string;
            };
            InferenceConfig?: {
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
                 * @maximum 4096
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
            AdditionalModelRequestFields?: Record<string, unknown>;
            PerformanceConfig?: {
              Latency?: "standard" | "optimized";
            };
          };
          RerankingConfiguration?: {
            Type: "BEDROCK_RERANKING_MODEL";
            BedrockRerankingConfiguration?: {
              ModelConfiguration: {
                ModelArn: string;
                AdditionalModelRequestFields?: Record<string, unknown>;
              };
              /**
               * Number Of Results For Reranking
               * @minimum 1
               * @maximum 100
               */
              NumberOfRerankedResults?: number;
              MetadataConfiguration?: {
                SelectionMode: "SELECTIVE" | "ALL";
                SelectiveModeConfiguration?: {
                  FieldsToInclude: {
                    /**
                     * Field name for reranking
                     * @minLength 1
                     * @maxLength 2000
                     */
                    FieldName: string;
                  }[];
                } | {
                  FieldsToExclude: {
                    /**
                     * Field name for reranking
                     * @minLength 1
                     * @maxLength 2000
                     */
                    FieldName: string;
                  }[];
                };
              };
            };
          };
        };
      } | {
        Condition: {
          /**
           * List of conditions in a condition node
           * @minItems 1
           * @maxItems 5
           */
          Conditions: {
            /**
             * Name of a condition in a flow
             * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
             */
            Name: string;
            /**
             * Expression for a condition in a flow
             * @minLength 1
             * @maxLength 64
             */
            Expression?: string;
          }[];
        };
      } | {
        Lex: {
          /**
           * ARN of a Lex bot alias
           * @maxLength 78
           * @pattern ^arn:aws(|-us-gov):lex:[a-z]{2}(-gov)?-[a-z]+-\d{1}:\d{12}:bot-alias/[0-9a-zA-Z]+/[0-9a-zA-Z]+$
           */
          BotAliasArn: string;
          /**
           * Lex bot locale id
           * @minLength 1
           * @maxLength 10
           */
          LocaleId: string;
        };
      } | {
        Prompt: {
          SourceConfiguration: {
            Resource: {
              /**
               * ARN of a prompt resource possibly with a version
               * @pattern ^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:prompt/[0-9a-zA-Z]{10}(?::[0-9]{1,5})?)$
               */
              PromptArn: string;
            };
          } | {
            Inline: {
              TemplateType: "TEXT";
              TemplateConfiguration: {
                Text: {
                  /**
                   * Prompt content for String prompt template
                   * @minLength 1
                   * @maxLength 200000
                   */
                  Text: string;
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
              ModelId: string;
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
                   * @maximum 4096
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
            };
          };
          GuardrailConfiguration?: {
            /**
             * Identifier for the guardrail, could be the id or the arn
             * @maxLength 2048
             * @pattern ^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$
             */
            GuardrailIdentifier?: string;
            /**
             * Version of the guardrail
             * @pattern ^(([0-9]{1,8})|(DRAFT))$
             */
            GuardrailVersion?: string;
          };
        };
      } | {
        LambdaFunction: {
          /**
           * ARN of a Lambda.
           * @maxLength 2048
           * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}(-gov)?-[a-z]+-\d{1}:\d{12}:function:[a-zA-Z0-9-_\.]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$
           */
          LambdaArn: string;
        };
      } | {
        Agent: {
          /**
           * Arn representation of the Agent Alias.
           * @maxLength 2048
           * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:agent-alias/[0-9a-zA-Z]{10}/[0-9a-zA-Z]{10}$
           */
          AgentAliasArn: string;
        };
      } | {
        Storage: {
          ServiceConfiguration: {
            S3?: {
              /**
               * bucket name of an s3 that will be used for storage flow node configuration
               * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
               */
              BucketName: string;
            };
          };
        };
      } | {
        Iterator: Record<string, unknown>;
      } | {
        Collector: Record<string, unknown>;
      } | {
        Retrieval: {
          ServiceConfiguration: {
            S3?: {
              /**
               * bucket name of an s3 that will be used for Retrieval flow node configuration
               * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
               */
              BucketName: string;
            };
          };
        };
      } | {
        InlineCode: {
          /**
           * The inline code entered by customers. max size is 5MB.
           * @maxLength 5000000
           */
          Code: string;
          Language: "Python_3";
        };
      } | {
        Loop: {
          Definition: unknown;
        };
      } | {
        LoopInput: Record<string, unknown>;
      } | {
        LoopController: {
          ContinueCondition: {
            /**
             * Name of a condition in a flow
             * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
             */
            Name: string;
            /**
             * Expression for a condition in a flow
             * @minLength 1
             * @maxLength 64
             */
            Expression?: string;
          };
          /**
           * Maximum number of iterations the loop can perform
           * @default 10
           * @minimum 1
           * @maximum 1000
           */
          MaxIterations?: number;
        };
      };
      /**
       * List of node inputs in a flow
       * @maxItems 20
       */
      Inputs?: ({
        /**
         * Name of a node input in a flow
         * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
         */
        Name: string;
        Type: "String" | "Number" | "Boolean" | "Object" | "Array";
        /**
         * Expression for a node input in a flow
         * @minLength 1
         * @maxLength 64
         */
        Expression: string;
        Category?: "LoopCondition" | "ReturnValueToLoopStart" | "ExitLoop";
      })[];
      /**
       * List of node outputs in a flow
       * @maxItems 5
       */
      Outputs?: ({
        /**
         * Name of a node output in a flow
         * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
         */
        Name: string;
        Type: "String" | "Number" | "Boolean" | "Object" | "Array";
      })[];
    })[];
    /**
     * List of connections
     * @maxItems 100
     */
    Connections?: ({
      Type: "Data" | "Conditional";
      /**
       * Name of a connection in a flow
       * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,100}$
       */
      Name: string;
      /**
       * Name of a node in a flow
       * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
       */
      Source: string;
      /**
       * Name of a node in a flow
       * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
       */
      Target: string;
      Configuration?: {
        Data: {
          /**
           * Name of a node output in a flow
           * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
           */
          SourceOutput: string;
          /**
           * Name of a node input in a flow
           * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
           */
          TargetInput: string;
        };
      } | {
        Conditional: {
          /**
           * Name of a condition in a flow
           * @pattern ^[a-zA-Z]([_]?[0-9a-zA-Z]){1,50}$
           */
          Condition: string;
        };
      };
    })[];
  };
  /**
   * A JSON string containing a Definition with the same schema as the Definition property of this
   * resource
   * @maxLength 512000
   */
  DefinitionString?: string;
  DefinitionS3Location?: {
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
  DefinitionSubstitutions?: Record<string, string | number | boolean>;
  /**
   * Description of the flow
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * ARN of a IAM role
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:iam::([0-9]{12})?:role/(service-role/)?.+$
   */
  ExecutionRoleArn: string;
  /**
   * Identifier for a Flow
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  Id?: string;
  /**
   * Name for the flow
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  Name: string;
  Status?: "Failed" | "Prepared" | "Preparing" | "NotPrepared";
  /** Time Stamp. */
  UpdatedAt?: string;
  /**
   * A KMS key ARN
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(|-cn|-us-gov):kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
   */
  CustomerEncryptionKeyArn?: string;
  Validations?: {
    /** validation message */
    Message: string;
  }[];
  /**
   * Draft Version.
   * @minLength 5
   * @maxLength 5
   * @pattern ^DRAFT$
   */
  Version?: string;
  Tags?: Record<string, string>;
  TestAliasTags?: Record<string, string>;
};
