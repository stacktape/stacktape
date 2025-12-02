// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-agent.json

/** Definition of AWS::Bedrock::Agent Resource Type */
export type AwsBedrockAgent = {
  /** List of ActionGroups */
  ActionGroups?: ({
    /**
     * Name of the action group
     * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
     */
    ActionGroupName: string;
    /**
     * Description of action group
     * @minLength 1
     * @maxLength 200
     */
    Description?: string;
    ParentActionGroupSignature?: "AMAZON.UserInput" | "AMAZON.CodeInterpreter";
    ActionGroupExecutor?: {
      /**
       * ARN of a Lambda.
       * @maxLength 2048
       * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:[a-z0-9-]{1,20}:\d{12}:function:[a-zA-Z0-9-_\.]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$
       */
      Lambda: string;
    } | {
      CustomControl: "RETURN_CONTROL";
    };
    ApiSchema?: {
      S3: {
        /**
         * A bucket in S3.
         * @minLength 3
         * @maxLength 63
         * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
         */
        S3BucketName?: string;
        /**
         * A object key in S3.
         * @minLength 1
         * @maxLength 1024
         * @pattern ^[\.\-\!\*\_\'\(\)a-zA-Z0-9][\.\-\!\*\_\'\(\)\/a-zA-Z0-9]*$
         */
        S3ObjectKey?: string;
      };
    } | {
      /** String OpenAPI Payload */
      Payload: string;
    };
    ActionGroupState?: "ENABLED" | "DISABLED";
    FunctionSchema?: {
      /** List of Function definitions */
      Functions: ({
        /**
         * Name for a resource.
         * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
         */
        Name: string;
        /**
         * Description of function
         * @minLength 1
         * @maxLength 1200
         */
        Description?: string;
        Parameters?: Record<string, {
          /**
           * Description of function parameter.
           * @minLength 1
           * @maxLength 500
           */
          Description?: string;
          Type: "string" | "number" | "integer" | "boolean" | "array";
          /** Information about if a parameter is required for function call. Default to false. */
          Required?: boolean;
        }>;
        RequireConfirmation?: "ENABLED" | "DISABLED";
      })[];
    };
    /**
     * Specifies whether to allow deleting action group while it is in use.
     * @default false
     */
    SkipResourceInUseCheckOnDelete?: boolean;
  })[];
  /**
   * Arn representation of the Agent.
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:agent/[0-9a-zA-Z]{10}$
   */
  AgentArn?: string;
  /**
   * Identifier for a resource.
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  AgentId?: string;
  /**
   * Name for a resource.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  AgentName: string;
  /**
   * ARN of a IAM role.
   * @maxLength 2048
   */
  AgentResourceRoleArn?: string;
  AgentStatus?: "CREATING" | "PREPARING" | "PREPARED" | "NOT_PREPARED" | "DELETING" | "FAILED" | "VERSIONING" | "UPDATING";
  /**
   * Draft Agent Version.
   * @minLength 5
   * @maxLength 5
   * @pattern ^DRAFT$
   */
  AgentVersion?: string;
  /**
   * Specifies whether to automatically prepare after creating or updating the agent.
   * @default false
   */
  AutoPrepare?: boolean;
  /** Time Stamp. */
  CreatedAt?: string;
  CustomOrchestration?: {
    Executor?: {
      /**
       * ARN of a Lambda.
       * @maxLength 2048
       * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:[a-z0-9-]{1,20}:\d{12}:function:[a-zA-Z0-9-_\.]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$
       */
      Lambda: string;
    };
  };
  /**
   * A KMS key ARN
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
   */
  CustomerEncryptionKeyArn?: string;
  /**
   * Specifies whether to allow deleting agent while it is in use.
   * @default false
   */
  SkipResourceInUseCheckOnDelete?: boolean;
  /**
   * Description of the Resource.
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * Failure Reasons for Error.
   * @maxItems 2048
   */
  FailureReasons?: string[];
  FoundationModel?: string;
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
  MemoryConfiguration?: {
    EnabledMemoryTypes?: "SESSION_SUMMARY"[];
    /** Maximum number of days to store session details */
    StorageDays?: number;
    SessionSummaryConfiguration?: {
      /** Maximum number of Sessions to Summarize */
      MaxRecentSessions?: number;
    };
  };
  /**
   * Max Session Time.
   * @minimum 60
   * @maximum 5400
   */
  IdleSessionTTLInSeconds?: number;
  AgentCollaboration?: "DISABLED" | "SUPERVISOR" | "SUPERVISOR_ROUTER";
  /**
   * Instruction for the agent.
   * @minLength 40
   */
  Instruction?: string;
  /** List of Agent Knowledge Bases */
  KnowledgeBases?: ({
    /**
     * Identifier for a resource.
     * @pattern ^[0-9a-zA-Z]{10}$
     */
    KnowledgeBaseId: string;
    /**
     * Description of the Resource.
     * @minLength 1
     * @maxLength 200
     */
    Description: string;
    KnowledgeBaseState?: "ENABLED" | "DISABLED";
  })[];
  /** List of Agent Collaborators */
  AgentCollaborators?: ({
    /** Agent descriptor for agent collaborator */
    AgentDescriptor: {
      /**
       * Alias ARN for agent descriptor
       * @pattern ^arn:(aws[a-zA-Z-]*)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:agent-alias/[0-9a-zA-Z]{10}/[0-9a-zA-Z]{10}$
       */
      AliasArn?: string;
    };
    /** Agent collaborator instruction */
    CollaborationInstruction: string;
    /** Agent collaborator name */
    CollaboratorName: string;
    RelayConversationHistory?: "TO_COLLABORATOR" | "DISABLED";
  })[];
  OrchestrationType?: "DEFAULT" | "CUSTOM_ORCHESTRATION";
  /** Time Stamp. */
  PreparedAt?: string;
  PromptOverrideConfiguration?: {
    /**
     * List of BasePromptConfiguration
     * @maxItems 10
     */
    PromptConfigurations: ({
      PromptType?: "PRE_PROCESSING" | "ORCHESTRATION" | "POST_PROCESSING" | "ROUTING_CLASSIFIER" | "MEMORY_SUMMARIZATION" | "KNOWLEDGE_BASE_RESPONSE_GENERATION";
      PromptCreationMode?: "DEFAULT" | "OVERRIDDEN";
      PromptState?: "ENABLED" | "DISABLED";
      /**
       * Base Prompt Template.
       * @minLength 1
       * @maxLength 100000
       */
      BasePromptTemplate?: string;
      InferenceConfiguration?: {
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
         * Sample from the k most likely next tokens
         * @minimum 0
         * @maximum 500
         */
        TopK?: number;
        /**
         * Maximum length of output
         * @minimum 0
         * @maximum 131072
         */
        MaximumLength?: number;
        /**
         * List of stop sequences
         * @minItems 0
         * @maxItems 4
         */
        StopSequences?: string[];
      };
      ParserMode?: "DEFAULT" | "OVERRIDDEN";
      FoundationModel?: string;
      AdditionalModelRequestFields?: Record<string, unknown>;
    })[];
    /**
     * ARN of a Lambda.
     * @maxLength 2048
     * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:[a-z0-9-]{1,20}:\d{12}:function:[a-zA-Z0-9-_\.]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$
     */
    OverrideLambda?: string;
  };
  /**
   * The recommended actions users can take to resolve an error in failureReasons.
   * @maxItems 2048
   */
  RecommendedActions?: string[];
  Tags?: Record<string, string>;
  TestAliasTags?: Record<string, string>;
  /** Time Stamp. */
  UpdatedAt?: string;
};
