// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-knowledgebase.json

/** Definition of AWS::Bedrock::KnowledgeBase Resource Type */
export type AwsBedrockKnowledgebase = {
  /**
   * Description of the Resource.
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  KnowledgeBaseConfiguration: {
    Type: "VECTOR" | "KENDRA" | "SQL";
    VectorKnowledgeBaseConfiguration?: {
      /**
       * The ARN of the model used to create vector embeddings for the knowledge base.
       * @minLength 20
       * @maxLength 2048
       * @pattern ^(arn:aws(-[^:]+)?:[a-z0-9-]+:[a-z0-9-]{1,20}:[0-9]{0,12}:[a-zA-Z0-9-:/._+]+)$
       */
      EmbeddingModelArn: string;
      EmbeddingModelConfiguration?: {
        BedrockEmbeddingModelConfiguration?: {
          /**
           * The dimensions details for the vector configuration used on the Bedrock embeddings model.
           * @minimum 0
           * @maximum 4096
           */
          Dimensions?: number;
          /**
           * The data type for the vectors when using a model to convert text into vector embeddings.
           * @enum ["FLOAT32","BINARY"]
           */
          EmbeddingDataType?: "FLOAT32" | "BINARY";
        };
      };
      SupplementalDataStorageConfiguration?: {
        SupplementalDataStorageLocations: {
          SupplementalDataStorageLocationType: "S3";
          S3Location?: {
            /**
             * The location's URI
             * @minLength 1
             * @maxLength 2048
             * @pattern ^s3://.{1,128}$
             */
            URI: string;
          };
        }[];
      };
    };
    KendraKnowledgeBaseConfiguration?: {
      KendraIndexArn: string;
    };
    SqlKnowledgeBaseConfiguration?: {
      Type: "REDSHIFT";
      RedshiftConfiguration?: {
        StorageConfigurations: ({
          Type: "REDSHIFT" | "AWS_DATA_CATALOG";
          AwsDataCatalogConfiguration?: {
            TableNames: string[];
          };
          RedshiftConfiguration?: {
            DatabaseName: string;
          };
        })[];
        QueryEngineConfiguration: {
          Type: "SERVERLESS" | "PROVISIONED";
          ServerlessConfiguration?: {
            WorkgroupArn: string;
            AuthConfiguration: {
              Type: "IAM" | "USERNAME_PASSWORD";
              UsernamePasswordSecretArn?: string;
            };
          };
          ProvisionedConfiguration?: {
            ClusterIdentifier: string;
            AuthConfiguration: {
              Type: "IAM" | "USERNAME_PASSWORD" | "USERNAME";
              /** Redshift database user */
              DatabaseUser?: string;
              UsernamePasswordSecretArn?: string;
            };
          };
        };
        QueryGenerationConfiguration?: {
          ExecutionTimeoutSeconds?: number;
          GenerationContext?: {
            Tables?: ({
              Name: string;
              Description?: string;
              Inclusion?: "INCLUDE" | "EXCLUDE";
              Columns?: ({
                Name?: string;
                Description?: string;
                Inclusion?: "INCLUDE" | "EXCLUDE";
              })[];
            })[];
            CuratedQueries?: {
              NaturalLanguage: string;
              Sql: string;
            }[];
          };
        };
      };
    };
  };
  /**
   * The unique identifier of the knowledge base.
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  KnowledgeBaseId?: string;
  /**
   * The ARN of the knowledge base.
   * @minLength 0
   * @maxLength 128
   * @pattern ^arn:aws(|-cn|-us-gov):bedrock:[a-zA-Z0-9-]*:[0-9]{12}:knowledge-base/[0-9a-zA-Z]+$
   */
  KnowledgeBaseArn?: string;
  /**
   * The name of the knowledge base.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  Name: string;
  Status?: "CREATING" | "ACTIVE" | "DELETING" | "UPDATING" | "FAILED" | "DELETE_UNSUCCESSFUL";
  /**
   * The ARN of the IAM role with permissions to invoke API operations on the knowledge base. The ARN
   * must begin with AmazonBedrockExecutionRoleForKnowledgeBase_
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:iam::([0-9]{12})?:role/.+$
   */
  RoleArn: string;
  /** The time at which the knowledge base was created. */
  CreatedAt?: string;
  /**
   * A list of reasons that the API operation on the knowledge base failed.
   * @maxItems 2048
   */
  FailureReasons?: string[];
  /** The time at which the knowledge base was last updated. */
  UpdatedAt?: string;
  StorageConfiguration?: unknown | unknown | unknown | unknown | unknown | unknown | unknown;
  Tags?: Record<string, string>;
};
