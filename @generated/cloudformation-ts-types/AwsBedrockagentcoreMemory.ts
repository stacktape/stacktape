// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-memory.json

/** Resource Type definition for AWS::BedrockAgentCore::Memory */
export type AwsBedrockagentcoreMemory = {
  Name: string;
  Description?: string;
  EncryptionKeyArn?: string;
  MemoryExecutionRoleArn?: string;
  /**
   * Duration in days until memory events expire
   * @minimum 7
   * @maximum 365
   */
  EventExpiryDuration: number;
  MemoryArn?: string;
  MemoryId?: string;
  Status?: "CREATING" | "ACTIVE" | "FAILED" | "DELETING";
  FailureReason?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  MemoryStrategies?: ({
    SemanticMemoryStrategy?: {
      Name: string;
      Description?: string;
      Namespaces?: string[];
      /**
       * Unique identifier for the memory strategy
       * @minLength 12
       * @pattern ^[a-zA-Z][a-zA-Z0-9-_]{0,99}-[a-zA-Z0-9]{10}$
       */
      StrategyId?: string;
      /**
       * Type of memory strategy
       * @enum ["SEMANTIC","SUMMARIZATION","USER_PREFERENCE","CUSTOM"]
       */
      Type?: "SEMANTIC" | "SUMMARIZATION" | "USER_PREFERENCE" | "CUSTOM";
      /**
       * Status of the memory strategy
       * @enum ["CREATING","ACTIVE","DELETING","FAILED"]
       */
      Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED";
      /** Creation timestamp of the memory strategy */
      CreatedAt?: string;
      /** Last update timestamp of the memory strategy */
      UpdatedAt?: string;
    };
    SummaryMemoryStrategy?: {
      Name: string;
      Description?: string;
      Namespaces?: string[];
      /**
       * Unique identifier for the memory strategy
       * @minLength 12
       * @pattern ^[a-zA-Z][a-zA-Z0-9-_]{0,99}-[a-zA-Z0-9]{10}$
       */
      StrategyId?: string;
      /**
       * Type of memory strategy
       * @enum ["SEMANTIC","SUMMARIZATION","USER_PREFERENCE","CUSTOM"]
       */
      Type?: "SEMANTIC" | "SUMMARIZATION" | "USER_PREFERENCE" | "CUSTOM";
      /**
       * Status of the memory strategy
       * @enum ["CREATING","ACTIVE","DELETING","FAILED"]
       */
      Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED";
      /** Creation timestamp of the memory strategy */
      CreatedAt?: string;
      /** Last update timestamp of the memory strategy */
      UpdatedAt?: string;
    };
    UserPreferenceMemoryStrategy?: {
      Name: string;
      Description?: string;
      Namespaces?: string[];
      /**
       * Unique identifier for the memory strategy
       * @minLength 12
       * @pattern ^[a-zA-Z][a-zA-Z0-9-_]{0,99}-[a-zA-Z0-9]{10}$
       */
      StrategyId?: string;
      /**
       * Type of memory strategy
       * @enum ["SEMANTIC","SUMMARIZATION","USER_PREFERENCE","CUSTOM"]
       */
      Type?: "SEMANTIC" | "SUMMARIZATION" | "USER_PREFERENCE" | "CUSTOM";
      /**
       * Status of the memory strategy
       * @enum ["CREATING","ACTIVE","DELETING","FAILED"]
       */
      Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED";
      /** Creation timestamp of the memory strategy */
      CreatedAt?: string;
      /** Last update timestamp of the memory strategy */
      UpdatedAt?: string;
    };
    CustomMemoryStrategy?: {
      Name: string;
      Description?: string;
      Namespaces?: string[];
      Configuration?: {
        SemanticOverride?: {
          Extraction?: {
            AppendToPrompt: string;
            ModelId: string;
          };
          Consolidation?: {
            AppendToPrompt: string;
            ModelId: string;
          };
        };
        SummaryOverride?: {
          Consolidation?: {
            AppendToPrompt: string;
            ModelId: string;
          };
        };
        UserPreferenceOverride?: {
          Extraction?: {
            AppendToPrompt: string;
            ModelId: string;
          };
          Consolidation?: {
            AppendToPrompt: string;
            ModelId: string;
          };
        };
        SelfManagedConfiguration?: {
          TriggerConditions?: {
            MessageBasedTrigger?: {
              /**
               * @minimum 1
               * @maximum 50
               */
              MessageCount?: number;
            };
            TokenBasedTrigger?: {
              /**
               * @minimum 100
               * @maximum 500000
               */
              TokenCount?: number;
            };
            TimeBasedTrigger?: {
              /**
               * @minimum 10
               * @maximum 3000
               */
              IdleSessionTimeout?: number;
            };
          }[];
          InvocationConfiguration?: {
            TopicArn?: string;
            /** @pattern ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ */
            PayloadDeliveryBucketName?: string;
          };
          /**
           * @minimum 0
           * @maximum 50
           */
          HistoricalContextWindowSize?: number;
        };
      };
      /**
       * Unique identifier for the memory strategy
       * @minLength 12
       * @pattern ^[a-zA-Z][a-zA-Z0-9-_]{0,99}-[a-zA-Z0-9]{10}$
       */
      StrategyId?: string;
      /**
       * Type of memory strategy
       * @enum ["SEMANTIC","SUMMARIZATION","USER_PREFERENCE","CUSTOM"]
       */
      Type?: "SEMANTIC" | "SUMMARIZATION" | "USER_PREFERENCE" | "CUSTOM";
      /**
       * Status of the memory strategy
       * @enum ["CREATING","ACTIVE","DELETING","FAILED"]
       */
      Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED";
      /** Creation timestamp of the memory strategy */
      CreatedAt?: string;
      /** Last update timestamp of the memory strategy */
      UpdatedAt?: string;
    };
  })[];
  Tags?: Record<string, string>;
};
