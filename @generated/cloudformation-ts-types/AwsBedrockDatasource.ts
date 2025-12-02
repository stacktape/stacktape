// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-datasource.json

/** Definition of AWS::Bedrock::DataSource Resource Type */
export type AwsBedrockDatasource = {
  DataSourceConfiguration: {
    Type: "S3" | "CONFLUENCE" | "SALESFORCE" | "SHAREPOINT" | "WEB" | "CUSTOM" | "REDSHIFT_METADATA";
    S3Configuration?: {
      /**
       * The ARN of the bucket that contains the data source.
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn:aws(-cn|-us-gov|-eusc|-iso(-[b-f])?)?:s3:::[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$
       */
      BucketArn: string;
      /**
       * A list of S3 prefixes that define the object containing the data sources.
       * @minItems 1
       * @maxItems 1
       */
      InclusionPrefixes?: string[];
      /**
       * The account ID for the owner of the S3 bucket.
       * @minLength 12
       * @maxLength 12
       * @pattern ^[0-9]{12}$
       */
      BucketOwnerAccountId?: string;
    };
    ConfluenceConfiguration?: {
      SourceConfiguration: {
        /**
         * The Confluence host URL or instance URL.
         * @minLength 1
         * @maxLength 2048
         * @pattern ^https://[A-Za-z0-9][^\s]*$
         */
        HostUrl: string;
        /**
         * The supported host type, whether online/cloud or server/on-premises.
         * @enum ["SAAS"]
         */
        HostType: "SAAS";
        /**
         * The supported authentication type to authenticate and connect to your Confluence instance.
         * @enum ["BASIC","OAUTH2_CLIENT_CREDENTIALS"]
         */
        AuthType: "BASIC" | "OAUTH2_CLIENT_CREDENTIALS";
        /**
         * The Amazon Resource Name of an AWS Secrets Manager secret that stores your authentication
         * credentials for your Confluence instance URL. For more information on the key-value pairs that must
         * be included in your secret, depending on your authentication type, see Confluence connection
         * configuration.
         * @pattern ^arn:aws(|-cn|-us-gov):secretsmanager:[a-z0-9-]{1,20}:([0-9]{12}|):secret:[a-zA-Z0-9!/_+=.@-]{1,512}$
         */
        CredentialsSecretArn: string;
      };
      CrawlerConfiguration?: {
        FilterConfiguration?: {
          /**
           * The crawl filter type.
           * @enum ["PATTERN"]
           */
          Type: "PATTERN";
          PatternObjectFilter?: {
            Filters: {
              /**
               * The supported object type or content type of the data source.
               * @minLength 1
               * @maxLength 50
               */
              ObjectType: string;
              InclusionFilters?: string[];
              ExclusionFilters?: string[];
            }[];
          };
        };
      };
    };
    SalesforceConfiguration?: {
      SourceConfiguration: {
        /**
         * The Salesforce host URL or instance URL.
         * @minLength 1
         * @maxLength 2048
         * @pattern ^https://[A-Za-z0-9][^\s]*$
         */
        HostUrl: string;
        /**
         * The supported authentication type to authenticate and connect to your Salesforce instance.
         * @enum ["OAUTH2_CLIENT_CREDENTIALS"]
         */
        AuthType: "OAUTH2_CLIENT_CREDENTIALS";
        /**
         * The Amazon Resource Name of an AWS Secrets Manager secret that stores your authentication
         * credentials for your Salesforce instance URL. For more information on the key-value pairs that must
         * be included in your secret, depending on your authentication type, see Salesforce connection
         * configuration.
         * @pattern ^arn:aws(|-cn|-us-gov):secretsmanager:[a-z0-9-]{1,20}:([0-9]{12}|):secret:[a-zA-Z0-9!/_+=.@-]{1,512}$
         */
        CredentialsSecretArn: string;
      };
      CrawlerConfiguration?: {
        FilterConfiguration?: {
          /**
           * The crawl filter type.
           * @enum ["PATTERN"]
           */
          Type: "PATTERN";
          PatternObjectFilter?: {
            Filters: {
              /**
               * The supported object type or content type of the data source.
               * @minLength 1
               * @maxLength 50
               */
              ObjectType: string;
              InclusionFilters?: string[];
              ExclusionFilters?: string[];
            }[];
          };
        };
      };
    };
    SharePointConfiguration?: {
      SourceConfiguration: {
        /**
         * A list of one or more SharePoint site URLs.
         * @minItems 1
         * @maxItems 100
         */
        SiteUrls: string[];
        /**
         * The supported host type, whether online/cloud or server/on-premises.
         * @enum ["ONLINE"]
         */
        HostType: "ONLINE";
        /**
         * The supported authentication type to authenticate and connect to your SharePoint site/sites.
         * @enum ["OAUTH2_CLIENT_CREDENTIALS","OAUTH2_SHAREPOINT_APP_ONLY_CLIENT_CREDENTIALS"]
         */
        AuthType: "OAUTH2_CLIENT_CREDENTIALS" | "OAUTH2_SHAREPOINT_APP_ONLY_CLIENT_CREDENTIALS";
        /**
         * The Amazon Resource Name of an AWS Secrets Manager secret that stores your authentication
         * credentials for your SharePoint site/sites. For more information on the key-value pairs that must
         * be included in your secret, depending on your authentication type, see SharePoint connection
         * configuration.
         * @pattern ^arn:aws(|-cn|-us-gov):secretsmanager:[a-z0-9-]{1,20}:([0-9]{12}|):secret:[a-zA-Z0-9!/_+=.@-]{1,512}$
         */
        CredentialsSecretArn: string;
        /**
         * The identifier of your Microsoft 365 tenant.
         * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
         */
        TenantId?: string;
        /**
         * The domain of your SharePoint instance or site URL/URLs.
         * @minLength 1
         * @maxLength 50
         */
        Domain: string;
      };
      CrawlerConfiguration?: {
        FilterConfiguration?: {
          /**
           * The crawl filter type.
           * @enum ["PATTERN"]
           */
          Type: "PATTERN";
          PatternObjectFilter?: {
            Filters: {
              /**
               * The supported object type or content type of the data source.
               * @minLength 1
               * @maxLength 50
               */
              ObjectType: string;
              InclusionFilters?: string[];
              ExclusionFilters?: string[];
            }[];
          };
        };
      };
    };
    WebConfiguration?: {
      SourceConfiguration: {
        UrlConfiguration: {
          SeedUrls: {
            /**
             * A web url.
             * @pattern ^https?://[A-Za-z0-9][^\s]*$
             */
            Url: string;
          }[];
        };
      };
      CrawlerConfiguration?: {
        CrawlerLimits?: {
          /**
           * Rate of web URLs retrieved per minute.
           * @minimum 1
           * @maximum 300
           */
          RateLimit?: number;
          /**
           * Maximum number of pages the crawler can crawl.
           * @minimum 1
           */
          MaxPages?: number;
        };
        InclusionFilters?: string[];
        ExclusionFilters?: string[];
        Scope?: "HOST_ONLY" | "SUBDOMAINS";
        /**
         * The suffix that will be included in the user agent header.
         * @minLength 15
         * @maxLength 40
         */
        UserAgent?: string;
        /**
         * The full user agent header, including UUID and suffix.
         * @minLength 61
         * @maxLength 86
         */
        UserAgentHeader?: string;
      };
    };
  };
  /**
   * Identifier for a resource.
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  DataSourceId?: string;
  /**
   * Description of the Resource.
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * The unique identifier of the knowledge base to which to add the data source.
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  KnowledgeBaseId: string;
  DataSourceStatus?: "AVAILABLE" | "DELETING" | "DELETE_UNSUCCESSFUL";
  /**
   * The name of the data source.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  Name: string;
  ServerSideEncryptionConfiguration?: {
    /**
     * The ARN of the AWS KMS key used to encrypt the resource.
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn:aws(-cn|-us-gov|-eusc|-iso(-[b-f])?)?:kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
     */
    KmsKeyArn?: string;
  };
  VectorIngestionConfiguration?: {
    ChunkingConfiguration?: {
      ChunkingStrategy: "FIXED_SIZE" | "NONE" | "HIERARCHICAL" | "SEMANTIC";
      FixedSizeChunkingConfiguration?: {
        /**
         * The maximum number of tokens to include in a chunk.
         * @minimum 1
         */
        MaxTokens: number;
        /**
         * The percentage of overlap between adjacent chunks of a data source.
         * @minimum 1
         * @maximum 99
         */
        OverlapPercentage: number;
      };
      HierarchicalChunkingConfiguration?: {
        /**
         * Token settings for each layer.
         * @minItems 2
         * @maxItems 2
         */
        LevelConfigurations: {
          /**
           * The maximum number of tokens that a chunk can contain in this layer.
           * @minimum 1
           * @maximum 8192
           */
          MaxTokens: number;
        }[];
        /**
         * The number of tokens to repeat across chunks in the same layer.
         * @minimum 1
         */
        OverlapTokens: number;
      };
      SemanticChunkingConfiguration?: {
        /**
         * The dissimilarity threshold for splitting chunks.
         * @minimum 50
         * @maximum 99
         */
        BreakpointPercentileThreshold: number;
        /**
         * The buffer size.
         * @minimum 0
         * @maximum 1
         */
        BufferSize: number;
        /**
         * The maximum number of tokens that a chunk can contain.
         * @minimum 1
         */
        MaxTokens: number;
      };
    };
    CustomTransformationConfiguration?: {
      IntermediateStorage: {
        S3Location: {
          /**
           * The location's URI
           * @minLength 1
           * @maxLength 2048
           * @pattern ^s3://.{1,128}$
           */
          URI: string;
        };
      };
      /**
       * A list of Lambda functions that process documents.
       * @minItems 1
       * @maxItems 1
       */
      Transformations: {
        /**
         * When the service applies the transformation.
         * @enum ["POST_CHUNKING"]
         */
        StepToApply: "POST_CHUNKING";
        TransformationFunction: {
          TransformationLambdaConfiguration: {
            /**
             * The function's ARN identifier.
             * @minLength 0
             * @maxLength 2048
             * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}(-gov)?-[a-z]+-\d{1}:\d{12}:function:[a-zA-Z0-9-_\.]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$
             */
            LambdaArn: string;
          };
        };
      }[];
    };
    ParsingConfiguration?: {
      ParsingStrategy: "BEDROCK_FOUNDATION_MODEL" | "BEDROCK_DATA_AUTOMATION";
      BedrockFoundationModelConfiguration?: {
        ModelArn: string;
        ParsingPrompt?: {
          /**
           * Instructions for interpreting the contents of a document.
           * @minLength 1
           * @maxLength 10000
           */
          ParsingPromptText: string;
        };
        ParsingModality?: "MULTIMODAL";
      };
      BedrockDataAutomationConfiguration?: {
        ParsingModality?: "MULTIMODAL";
      };
    };
    ContextEnrichmentConfiguration?: {
      Type: "BEDROCK_FOUNDATION_MODEL";
      BedrockFoundationModelConfiguration?: {
        EnrichmentStrategyConfiguration: {
          Method: "CHUNK_ENTITY_EXTRACTION";
        };
        ModelArn: string;
      };
    };
  };
  DataDeletionPolicy?: "RETAIN" | "DELETE";
  /** The time at which the data source was created. */
  CreatedAt?: string;
  /** The time at which the knowledge base was last updated. */
  UpdatedAt?: string;
  /**
   * The details of the failure reasons related to the data source.
   * @maxItems 2048
   */
  FailureReasons?: string[];
};
