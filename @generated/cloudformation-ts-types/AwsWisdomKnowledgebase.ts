// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-knowledgebase.json

/** Definition of AWS::Wisdom::KnowledgeBase Resource Type */
export type AwsWisdomKnowledgebase = {
  /**
   * @minLength 1
   * @maxLength 255
   */
  Description?: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$ */
  KnowledgeBaseArn?: string;
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
  KnowledgeBaseId?: string;
  KnowledgeBaseType: "EXTERNAL" | "CUSTOM" | "MESSAGE_TEMPLATES" | "MANAGED" | "QUICK_RESPONSES";
  /**
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  RenderingConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 4096
     */
    TemplateUri?: string;
  };
  ServerSideEncryptionConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 4096
     */
    KmsKeyId?: string;
  };
  SourceConfiguration?: {
    AppIntegrations: {
      /**
       * @minItems 1
       * @maxItems 100
       */
      ObjectFields?: string[];
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn:[a-z-]+?:[a-z-]+?:[a-z0-9-]*?:([0-9]{12})?:[a-zA-Z0-9-:/]+$
       */
      AppIntegrationArn: string;
    };
  } | {
    ManagedSourceConfiguration: {
      WebCrawlerConfiguration: {
        UrlConfiguration: {
          /**
           * @minItems 1
           * @maxItems 100
           */
          SeedUrls?: {
            /** @pattern ^https?://[A-Za-z0-9][^\s]*$ */
            Url?: string;
          }[];
        };
        CrawlerLimits?: {
          /**
           * @minimum 1
           * @maximum 3000
           */
          RateLimit?: number;
        };
        InclusionFilters?: string[];
        ExclusionFilters?: string[];
        /** @enum ["HOST_ONLY","SUBDOMAINS"] */
        Scope?: "HOST_ONLY" | "SUBDOMAINS";
      };
    };
  };
  VectorIngestionConfiguration?: {
    ChunkingConfiguration?: {
      /** @enum ["FIXED_SIZE","NONE","HIERARCHICAL","SEMANTIC"] */
      ChunkingStrategy: "FIXED_SIZE" | "NONE" | "HIERARCHICAL" | "SEMANTIC";
      FixedSizeChunkingConfiguration?: {
        /** @minimum 1 */
        MaxTokens: number;
        /**
         * @minimum 1
         * @maximum 99
         */
        OverlapPercentage: number;
      };
      HierarchicalChunkingConfiguration?: {
        /**
         * @minItems 2
         * @maxItems 2
         */
        LevelConfigurations: {
          /**
           * @minimum 1
           * @maximum 8192
           */
          MaxTokens: number;
        }[];
        /** @minimum 1 */
        OverlapTokens: number;
      };
      SemanticChunkingConfiguration?: {
        /** @minimum 1 */
        MaxTokens: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        BufferSize: number;
        /**
         * @minimum 50
         * @maximum 99
         */
        BreakpointPercentileThreshold: number;
      };
    };
    ParsingConfiguration?: {
      /** @enum ["BEDROCK_FOUNDATION_MODEL"] */
      ParsingStrategy: "BEDROCK_FOUNDATION_MODEL";
      BedrockFoundationModelConfiguration?: {
        /**
         * @minLength 1
         * @maxLength 2048
         * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}::foundation-model\/anthropic.claude-3-haiku-20240307-v1:0$
         */
        ModelArn: string;
        ParsingPrompt?: {
          /**
           * @minLength 1
           * @maxLength 10000
           */
          ParsingPromptText: string;
        };
      };
    };
  };
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
